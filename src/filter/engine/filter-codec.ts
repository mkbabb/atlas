// platform/filter/filter-codec.ts — THE `?filter=` DEEP-LINK CODEC (GP10 closed). The round-trippable
// pair: `encodeFilter(predicate) → string` (EMIT) and `parseFilter(string, registry) → predicate`
// (PARSE), so `/usf?filter=…` reconstructs the exact crossfilter clause on reload.
//
// ── THE ACCESSOR-REBIND LAW (the load-bearing finding) ────────────────────────────────────────────
// "predicate-as-data" is NOT fully serializable: a leaf holds a LIVE accessor CLOSURE
// (`field: (r) => r.population`) that cannot cross the wire. So the codec round-trips the DATA
// (key · op · values/bounds) and REBINDS the accessor on parse from a route-supplied `DimRegistry`
// (key → accessor). The wire form is keyed by dim; the accessor re-attaches at the consuming route,
// never transported.
//
// ── THE DIMREGISTRY-DERIVATION LAW (RC2-R3 — the WA1 teeth) ────────────────────────────────────────
// The registry is DERIVED from the route's `DeclaredDim[]` (`deriveRegistry` below — the ONE accessor
// source, the same `field`s the coordinator folds on), NEVER hand-authored beside `coord.connect`. A
// second hand-written accessor literal would let parse-vs-filter accessors DRIFT silently; the single
// derivation site is the fix (a gate arm greps for a second literal).
//
// ── SCOPE (honest, v1) ────────────────────────────────────────────────────────────────────────────
// The declared-dim fold only ever emits an AND-of-leaves — the shipped filter shape. So v1's wire
// grammar targets that: `key:op:payload` clauses joined by `;`. The internal tree's `or`/`not` (no
// shipped consumer — N.md §8) are OUT of the `?filter=` surface until a consumer lands; `encodeFilter`
// THROWS a NAMED error on them rather than silently lying (N1: no dead affordance). Value escaping (a
// region token containing `;:,`) is a v2 concern — NC region tokens carry none.

import type { DimAccessor, Predicate, Leaf } from "./predicate";

/** key → accessor: the route's declared-dim fields, the ONLY thing parse cannot carry over the wire.
    Built ONCE from the route's `DeclaredDim[]` via `deriveRegistry` (never a second hand-written map). */
export type DimRegistry<Row> = Record<string, DimAccessor<Row>>;

/** THE SINGLE DERIVATION SITE (RC2-R3) — build the codec's registry from the route's declared dims'
    `field` accessors. ONE accessor source shared by the coordinator fold AND the codec parse, so they
    cannot drift. A dim without a `field` (panel-only) contributes no registry entry. */
export function deriveRegistry<Row>(
    dims: readonly { key: string; field?: DimAccessor<Row> }[],
): DimRegistry<Row> {
    const registry: DimRegistry<Row> = {};
    for (const d of dims) if (d.field) registry[d.key] = d.field;
    return registry;
}

const enc = (n: number): string =>
    n === Infinity ? "*" : n === -Infinity ? "-*" : String(n);
const dec = (s: string): number => (s === "*" ? Infinity : s === "-*" ? -Infinity : Number(s));

/** ONE leaf → its wire clause. `oneOf` → `key:in:v1,v2`; `range` → `key:rng:lo..hi` (`*`/`-*` = ±∞). */
function leafToWire<Row>(p: Leaf<Row>): string {
    switch (p.op) {
        case "any":
            return "";
        case "oneOf":
            return `${p.key ?? "?"}:in:${[...p.values].join(",")}`;
        case "range":
            return `${p.key ?? "?"}:rng:${enc(p.lo)}..${enc(p.hi)}`;
    }
}

/** EMIT — a predicate tree → the `?filter=` value. `null`/`any` ⇒ "" (no param). A top-level `and`
    flattens to `;`-joined clauses; a bare leaf is one clause. `or`/`not` are refused by name (v1). */
export function encodeFilter<Row>(p: Predicate<Row> | null): string {
    if (p == null || p.op === "any") return "";
    if (p.op === "and") return p.kids.map((k) => encodeFilter(k)).filter(Boolean).join(";");
    if (p.op === "or" || p.op === "not")
        throw new Error(
            `?filter= v1 encodes AND-of-leaves only; got op="${p.op}" (no consumer yet — N.md §8)`,
        );
    return leafToWire(p);
}

/** PARSE — the `?filter=` value → a predicate tree, REBINDING each leaf's accessor from `registry`.
    Empty/absent ⇒ `{op:"any"}` (the identity — the migration guard: a garbled value never crashes,
    it degrades to no-filter). Unknown keys / malformed clauses are SKIPPED (forward-compatible). */
export function parseFilter<Row>(
    raw: string | undefined,
    registry: DimRegistry<Row>,
): Predicate<Row> {
    if (!raw) return { op: "any" };
    const kids: Predicate<Row>[] = [];
    for (const clause of raw.split(";")) {
        if (!clause) continue;
        const firstColon = clause.indexOf(":");
        const secondColon = clause.indexOf(":", firstColon + 1);
        if (firstColon < 0 || secondColon < 0) continue; // malformed → skip (guard)
        const key = clause.slice(0, firstColon);
        const op = clause.slice(firstColon + 1, secondColon);
        const payload = clause.slice(secondColon + 1);
        const field = registry[key];
        if (!field) continue; // unknown dim → skip (a route that dropped a dim ignores its stale param)
        if (op === "in") {
            const values = new Set(payload.split(",").filter(Boolean));
            if (values.size > 0) kids.push({ op: "oneOf", field, values, key });
        } else if (op === "rng") {
            const [loS, hiS] = payload.split("..");
            const lo = dec(loS);
            const hi = dec(hiS);
            if (!(lo === -Infinity && hi === Infinity)) kids.push({ op: "range", field, lo, hi, key });
        }
    }
    if (kids.length === 0) return { op: "any" };
    if (kids.length === 1) return kids[0];
    return { op: "and", kids };
}
