// platform/filter/predicate.ts — PREDICATE-AS-DATA: the boolean tree (and/or/not) that SUPERSEDES the
// algebra's AND-of-OR-only floor. A predicate is DATA — introspectable, serializable, and compilable
// to a row test — not an opaque closure. This is the Mosaic "filters are first-class query fragments,
// not booleans baked into an array fold" model, atlas-sized.
//
// THE TWO COMPOSITION LAYERS (kept DISTINCT — the whole point):
//   1. WITHIN one clause: this boolean TREE — arbitrary and/or/not over leaf constraints. This is
//      what a single interactor/dim can now express (e.g. "region ∈ {W,S} AND NOT pop<1000").
//      The OLD algebra (`composePredicate`) only did AND-across-dims / OR-within-dim — a strict
//      SUBSET of this tree (see `fromDimSpecs` below, which reproduces it exactly).
//   2. ACROSS clauses: the RESOLUTION strategy (single/union/intersect/crossfilter) — owned by
//      selection.ts, one layer up. This file owns layer 1 only.
//
// TOTALITY: `compile(null)` and `compile({op:"any"})` ⇒ the identity `() => true`, exactly like
// the algebra's empty-spec case. Every branch returns a function (proof by the exhaustive switch
// + `assertNever`). The leaf constraints REUSE the algebra's `oneOf`/`range` semantics verbatim
// (stringified `oneOf` membership; inclusive `[lo,hi]` with ±Infinity no-op bounds) — so a tree
// of pure leaves is behaviourally identical to `composePredicate` on the same constraints.

import {
    assertNever,
    type DimAccessor,
    type DimPredicateSpec,
} from "@/charts/lib/filter-algebra";

/** A leaf constraint bound to the field it tests. `oneOf` = within-OR membership; `range` =
    inclusive interval. `field` null-return ⇒ the row fails `oneOf` / no-ops `range` (algebra rule). */
export type Leaf<Row> =
    | { op: "any" }
    | { op: "oneOf"; field: DimAccessor<Row>; values: ReadonlySet<string>; key?: string }
    | { op: "range"; field: DimAccessor<Row>; lo: number; hi: number; key?: string };

/** THE PREDICATE TREE — a leaf, or an arbitrary boolean composition. Data, not a closure. */
export type Predicate<Row> =
    | Leaf<Row>
    | { op: "and"; kids: readonly Predicate<Row>[] }
    | { op: "or"; kids: readonly Predicate<Row>[] }
    | { op: "not"; kid: Predicate<Row> };

/** Compile a predicate tree to its total row test. `null`/`any` ⇒ identity. Pure; no allocation
    per-row beyond the closures captured at compile. */
export function compile<Row>(p: Predicate<Row> | null): (row: Row) => boolean {
    if (p == null) return () => true;
    switch (p.op) {
        case "any":
            return () => true;
        case "oneOf": {
            const { field, values } = p;
            if (values.size === 0) return () => true; // rest ⇒ identity (algebra parity)
            return (row: Row): boolean => {
                const v = field(row);
                return v != null && values.has(String(v));
            };
        }
        case "range": {
            const { field, lo, hi } = p;
            if (lo === -Infinity && hi === Infinity) return () => true;
            return (row: Row): boolean => {
                const v = field(row);
                return typeof v === "number" && v >= lo && v <= hi;
            };
        }
        case "and": {
            const tests = p.kids.map(compile);
            if (tests.length === 0) return () => true;
            return (row: Row): boolean => tests.every((t) => t(row));
        }
        case "or": {
            const tests = p.kids.map(compile);
            // An empty OR is the EMPTY set (nothing matches) — the dual of AND's identity.
            if (tests.length === 0) return () => false;
            return (row: Row): boolean => tests.some((t) => t(row));
        }
        case "not": {
            const inner = compile(p.kid);
            return (row: Row): boolean => !inner(row);
        }
        default:
            return assertNever(p);
    }
}

/** THE BRIDGE — reproduce the LEGACY `composePredicate(specs)` (AND-across-dims / OR-within-dim)
    as a tree, proving the new algebra is a strict SUPERSET. Each spec becomes a leaf; the specs
    AND together. `any`/accessor-less specs drop (algebra rule). Used by selection.ts so a
    declared-dim `DimPredicateSpec[]` (today's `useFilteredRows` input) folds unchanged. */
export function fromDimSpecs<Row>(
    specs: readonly DimPredicateSpec<Row>[],
): Predicate<Row> {
    const kids: Predicate<Row>[] = [];
    for (const s of specs) {
        if (s.constraint.kind === "any" || !s.accessor) continue;
        if (s.constraint.kind === "oneOf") {
            kids.push({
                op: "oneOf",
                field: s.accessor,
                values: s.constraint.values,
                key: s.key,
            });
        } else {
            kids.push({
                op: "range",
                field: s.accessor,
                lo: s.constraint.lo,
                hi: s.constraint.hi,
                key: s.key,
            });
        }
    }
    if (kids.length === 0) return { op: "any" };
    if (kids.length === 1) return kids[0];
    return { op: "and", kids };
}

/** True when the tree is the identity (no active constraint) — the coordinator's `filterActive`
    negation. Cheap structural walk; does not touch rows. */
export function isIdentity<Row>(p: Predicate<Row> | null): boolean {
    if (p == null) return true;
    switch (p.op) {
        case "any":
            return true;
        case "oneOf":
            return p.values.size === 0;
        case "range":
            return p.lo === -Infinity && p.hi === Infinity;
        case "and":
            return p.kids.every(isIdentity);
        case "or":
            return p.kids.length > 0 && p.kids.every(isIdentity);
        case "not":
            return false; // NOT(identity) = empty set, which is NOT the identity
        default:
            return assertNever(p);
    }
}

/** Structural pretty-print — the introspectability payoff (predicate-as-data): a filter state is
    a readable STRING, not an opaque closure. Drives debug + the `?filter=` deep-link codec (GP10). */
export function explain<Row>(p: Predicate<Row> | null): string {
    if (p == null) return "⊤";
    switch (p.op) {
        case "any":
            return "⊤";
        case "oneOf":
            return `${p.key ?? "?"} ∈ {${[...p.values].join(",")}}`;
        case "range": {
            const lo = p.lo === -Infinity ? "-∞" : p.lo;
            const hi = p.hi === Infinity ? "+∞" : p.hi;
            return `${p.key ?? "?"} ∈ [${lo},${hi}]`;
        }
        case "and":
            return `(${p.kids.map(explain).join(" ∧ ")})`;
        case "or":
            return `(${p.kids.map(explain).join(" ∨ ")})`;
        case "not":
            return `¬${explain(p.kid)}`;
        default:
            return assertNever(p);
    }
}
