// platform/filter/coordinator.ts — THE COORDINATOR (Mosaic-shaped, atlas-sized). ONE reactive graph
// re-homing the TWO already-co-folded stores (N.md §1.5 — the honest topology): `useViewParams`
// already folds year-scope + filter cells + view params into one URL-backed source; `useSelection` is
// the second. The coordinator is NOT a "4→1" store merge (that premise was stale); its payoff is the
// RESOLUTION ALGEBRA + client-scoped leave-one-out + derived domains + facet counts, none of which the
// two co-folded stores expressed. Clients (vizzes) CONNECT; the coordinator resolves each client's
// filtered rows, derived scale domains, and leave-one-out facet counts off ONE Selection algebra.
//
// THE GRAPH (all signals — pull-based, memoized on Vue reactivity):
//
//   params  ─┐
//   rows    ─┼─▶  a Selection's CLAUSES  ──▶  selection.predicate(client)  ──▶  filteredFor(client)
//   brushes ─┘         (predicate-as-data)         (leave-one-out)               │
//                                                                                ├─▶ domainFor(client, field)
//                                                                                └─▶ facetsFor(client, field)
//
// Everything downstream of a param write recomputes LAZILY on read (Vue `computed`). One
// `rows.filter(pred)` per settled read IS the "O(N) fold" tier — measurement-vindicated at the real
// atlas N (largest frame 3243 rows, 0.05ms/update; 300–2000× frame-budget headroom, so no Falcon/DuckDB
// tier is built — `filteredFor` carries only a documented swap-seam for a >~100K-row client frame).
//
// GETTER-BASED SOURCE (N.md §4.A1 — PASS3-DELTAS): `createCoordinator(rowsGetter)` takes the base frame
// as a REACTIVE GETTER, so the year-scoped frame flows in with no internal base-feed `watchEffect` (the
// one push edge the prototype needed is removed). An array is accepted too (the kernel tests pass one),
// normalized to a constant getter.
//
// ADOPT-THEN-HARDEN: a client contributes either a native `Predicate<Row>` (the tree algebra) or, via
// the EXISTING `DeclaredDim<Row>[]` → `DimCell` → predicate BRIDGE (`cellToClause`/`dimsToPredicate`),
// its current route dims fold UNCHANGED — no re-invention.

import { signal, computed, type Signal } from "./signals";
import {
    assertNever,
    isIdentity,
    type DimAccessor,
    type Predicate,
} from "./predicate";
import type { Selection, Clause } from "./selection";
import type { DimCell } from "@/filter/composables/useFilterDimensions";

// ── PARAMS-AS-SIGNALS: the one reactive param bag (≙ useViewParams, but a signal graph node) ─────

export interface Params {
    /** Read a param as a signal (string). */
    param(key: string): Signal<string | undefined>;
    /** Read a number param. */
    numberParam(key: string): Signal<number | undefined>;
    /** Read a list param. */
    listParam(key: string): Signal<readonly string[]>;
    /** Write (the URL round-trip edge in production). */
    set(key: string, value: string | number | readonly string[] | undefined): void;
    /** The whole bag (for the `?…` codec / deep-link). */
    snapshot(): Record<string, string | number | readonly string[] | undefined>;
}

/** The param bag as ONE signal-backed map. In production this is `useViewParams` (already the co-folded
    year-scope + cells + view-param source, N.md §1.5); here it is the node the year/dial/deep-link all
    read. Year scope is `param("year")`; a filter cell is `numberParam("popMin")`; a selection deep link
    is `listParam("sel")`. One graph, one write edge, one round-trip. */
export function createParams(
    initial: Record<string, string | number | readonly string[] | undefined> = {},
): Params {
    const bag = signal<Record<string, string | number | readonly string[] | undefined>>({
        ...initial,
    });
    return {
        param: (key) => computed(() => bag()[key] as string | undefined),
        numberParam: (key) =>
            computed(() => {
                const v = bag()[key];
                return v == null ? undefined : Number(v);
            }),
        listParam: (key) =>
            computed(() => {
                const v = bag()[key];
                if (v == null) return [];
                return Array.isArray(v) ? v : String(v).split(",").filter(Boolean);
            }),
        set: (key, value) => {
            const next = { ...bag.peek() };
            if (value == null || (Array.isArray(value) && value.length === 0)) delete next[key];
            else next[key] = value;
            bag.set(next);
        },
        snapshot: () => ({ ...bag.peek() }),
    };
}

// ── THE DIMCELL BRIDGE (adopt-then-harden — the existing declared dims fold unchanged) ───────────

/** A route's declared dim, carried through unchanged from the route's dim declaration. `field` is the
    within-OR accessor (also the codec's registry source — see filter-codec.ts `deriveRegistry`); `cell`
    resolves the current cell value (in production: `resolveDimCell(dim, view, selection)`). */
export interface DeclaredDim<Row> {
    key: string;
    arity: "single" | "multi" | "range" | "set";
    field?: DimAccessor<Row>;
    cell: () => DimCell | null;
}

/** Map one declared dimension directly to its normalized query leaf. Resting and panel-only
    dimensions contribute no clause. */
export function cellToClause<Row>(dim: DeclaredDim<Row>): Predicate<Row> | null {
    const cell = dim.cell();
    if (!dim.field || cell == null) return null;
    switch (cell.arity) {
        case "single":
            return cell.value == null
                ? null
                : {
                      op: "oneOf",
                      field: dim.field,
                      values: new Set([String(cell.value)]),
                      key: dim.key,
                  };
        case "multi":
        case "set": {
            const values = new Set([...cell.value].map(String));
            return values.size === 0
                ? null
                : { op: "oneOf", field: dim.field, values, key: dim.key };
        }
        case "range":
            return cell.value == null
                ? null
                : {
                      op: "range",
                      field: dim.field,
                      lo: cell.value[0],
                      hi: cell.value[1],
                      key: dim.key,
                  };
        default:
            return assertNever(cell);
    }
}

/** Fold a route's declared dims into one AND-of-dim query. */
export function dimsToPredicate<Row>(dims: readonly DeclaredDim<Row>[]): Predicate<Row> {
    const kids = dims
        .map(cellToClause)
        .filter((p): p is Predicate<Row> => p !== null);
    if (kids.length === 0) return { op: "any" };
    if (kids.length === 1) return kids[0];
    return { op: "and", kids };
}

// ── THE DRILL-AND-FILTER CLAUSE ([ANSWERS Q-45] · the promote / un-filter seam) ──────────────────
//
// The drill panel's `[Filter to these ▸]` promotes the current spatial selection into the fleet's
// filter state AS a coordinator clause — the SAME `source`-authored `Selection.update` edge a dim or a
// brush writes, so the promoted filter is crossfilter-safe (leave-one-out omits it for its own client)
// and reversible by a single `clear(source)` (the persistent `[✕ un-filter]` affordance). This is the
// LIBRARY half the route needs so it never re-derives the clause shape (nor overloads an unrelated URL
// param): `drilldownClause(field, ids)` builds the `oneOf` leaf over the grain's accessor, stamped with
// the shared `DRILLDOWN_SOURCE`; the un-filter is `selection.clear(DRILLDOWN_SOURCE)`.

/** The shared `source` id the drill-AND-filter clause is authored under — ONE constant so the promote
    (`update`) and the un-filter (`clear`) name the exact same clause (never a drifting string literal). */
export const DRILLDOWN_SOURCE = "drilldown";

/** Build the DRILL-AND-FILTER clause — the promoted set of native-grain `ids` as a `source:"drilldown"`
    `oneOf` leaf over the grain's `field` accessor (the same accessor the route folds on). `key` labels
    the leaf for `explain`/introspection (defaults to the source). An EMPTY `ids` yields the identity
    `{op:"any"}` predicate — the CLEAR form (`Selection.update` drops an identity clause), so promoting an
    empty set is the un-filter by construction. Feed the result to `selection.update(…)`; reverse with
    `selection.clear(DRILLDOWN_SOURCE)`. Grain-agnostic (the caller owns the accessor + the id extraction),
    so it serves every co-filterable grain the panel promotes. */
export function drilldownClause<Row>(
    field: DimAccessor<Row>,
    ids: Iterable<string>,
    key: string = DRILLDOWN_SOURCE,
): Omit<Clause<Row>, "seq"> {
    const values = new Set(ids);
    const predicate: Predicate<Row> =
        values.size === 0 ? { op: "any" } : { op: "oneOf", field, values, key };
    return { source: DRILLDOWN_SOURCE, predicate, value: [...values] };
}

// ── THE CLIENT + THE COORDINATOR ─────────────────────────────────────────────────────────────

export interface Client<Row> {
    id: string;
    /** The selection this client FILTERS BY. Crossfilter omits this client's own clauses. */
    filterBy: Selection<Row>;
    /** Fields this client wants derived DOMAINS / facet counts for (scale domains, dim dials). */
    fields?: Record<string, DimAccessor<Row>>;
    /** P196 — the dimension KEY this viz's slice of the shared filter surface presents. The active
        viz (the argmin-centred figure, `activeViz.ts`) drives which dim the surface shows via
        `presentedFieldFor`; a viz that presents nothing omits it. */
    presents?: string;
}

export interface Coordinator<Row> {
    /** The shared params bag (the ONE graph node the year/dial/deep-link all read). */
    params: Params;
    /** Register a client; returns a disconnect. */
    connect(client: Client<Row>): () => void;
    /** THE FOLD — the client's visible rows = base ∩ selection.predicate(client). The O(N)-fold tier;
        reactive + memoized. */
    filteredFor(clientId: string): Signal<readonly Row[]>;
    /** True when the client's resolved predicate is non-identity. */
    filterActive(clientId: string): Signal<boolean>;
    /** DERIVED DOMAIN — the numeric extent OR category set of `field` over the client's filtered rows
        (leave-one-out): a viz's scale that grows/shrinks as OTHER views filter but not its own brush. */
    domainFor(clientId: string, field: string): Signal<[number, number] | readonly string[]>;
    /** LEAVE-ONE-OUT FACET COUNTS — `disjunctiveCounts` generalized: the count of each value of
        `field` over the client's crossfiltered domain (the dim dial's comparable buckets). */
    facetsFor(clientId: string, field: string): Signal<Map<string, number>>;
    /** P196 — the dim key the shared filter surface presents for the CURRENT active viz. Reads
        `activeVizId` (a getter — `activeViz.ts`'s argmin id) and re-scopes to that viz's declared
        `presents`; `undefined` when the active viz is unregistered or presents nothing. Coordinator-
        side (not a per-route splice), falsifiable by a scroll drive (change the active id → the
        presented dim flips). */
    presentedFieldFor(activeVizId: () => string): Signal<string | undefined>;
}

export function createCoordinator<Row>(
    rows: readonly Row[] | (() => readonly Row[]),
    params: Params = createParams(),
): Coordinator<Row> {
    // GETTER-BASED base frame: a reactive source flows in with no push edge (the base-feed watchEffect
    // the prototype needed is gone). An array normalizes to a constant getter (the kernel-test path).
    const rowsGetter: () => readonly Row[] =
        typeof rows === "function" ? (rows as () => readonly Row[]) : () => rows;
    const clients = new Map<string, Client<Row>>();

    // Per-(client[/field]) memo of the derivation computeds — a stable reactive node per read, so a
    // plate reading `filteredFor(id)` every render reuses one `computed` (no per-render churn).
    const filteredCache = new Map<string, Signal<readonly Row[]>>();
    const activeCache = new Map<string, Signal<boolean>>();
    const domainCache = new Map<string, Signal<[number, number] | readonly string[]>>();
    const facetsCache = new Map<string, Signal<Map<string, number>>>();

    function connect(client: Client<Row>): () => void {
        clients.set(client.id, client);
        return () => clients.delete(client.id);
    }

    function filteredFor(clientId: string): Signal<readonly Row[]> {
        const cached = filteredCache.get(clientId);
        if (cached) return cached;
        const sig = computed<readonly Row[]>(() => {
            const c = clients.get(clientId);
            const base = rowsGetter();
            if (!c) return base;
            const pred = c.filterBy.predicate(clientId)(); // leave-one-out for THIS client
            return base.filter(pred);
        });
        filteredCache.set(clientId, sig);
        return sig;
    }

    function filterActive(clientId: string): Signal<boolean> {
        const cached = activeCache.get(clientId);
        if (cached) return cached;
        const sig = computed<boolean>(() => {
            const c = clients.get(clientId);
            if (!c) return false;
            return !isIdentity(c.filterBy.resolved(clientId)());
        });
        activeCache.set(clientId, sig);
        return sig;
    }

    function domainFor(
        clientId: string,
        field: string,
    ): Signal<[number, number] | readonly string[]> {
        const key = `${clientId} ${field}`;
        const cached = domainCache.get(key);
        if (cached) return cached;
        const sig = computed<[number, number] | readonly string[]>(() => {
            const c = clients.get(clientId);
            const accessor = c?.fields?.[field];
            const rowsNow = filteredFor(clientId)();
            if (!accessor) return [];
            let lo = Infinity;
            let hi = -Infinity;
            let numeric = true;
            const cats = new Set<string>();
            for (const r of rowsNow) {
                const v = accessor(r);
                if (v == null) continue;
                if (typeof v === "number") {
                    if (v < lo) lo = v;
                    if (v > hi) hi = v;
                } else {
                    numeric = false;
                    cats.add(String(v));
                }
            }
            if (numeric && lo <= hi) return [lo, hi];
            return [...cats].sort();
        });
        domainCache.set(key, sig);
        return sig;
    }

    function facetsFor(clientId: string, field: string): Signal<Map<string, number>> {
        const key = `${clientId} ${field}`;
        const cached = facetsCache.get(key);
        if (cached) return cached;
        const sig = computed<Map<string, number>>(() => {
            const c = clients.get(clientId);
            const accessor = c?.fields?.[field];
            const rowsNow = filteredFor(clientId)();
            const out = new Map<string, number>();
            if (!accessor) return out;
            for (const r of rowsNow) {
                const v = accessor(r);
                if (v == null) continue;
                const k = String(v);
                out.set(k, (out.get(k) ?? 0) + 1);
            }
            return out;
        });
        facetsCache.set(key, sig);
        return sig;
    }

    function presentedFieldFor(activeVizId: () => string): Signal<string | undefined> {
        return computed(() => clients.get(activeVizId())?.presents);
    }

    return {
        params,
        connect,
        filteredFor,
        filterActive,
        domainFor,
        facetsFor,
        presentedFieldFor,
    };
}

// Re-exports for consumers/tests.
export { createSelection } from "./selection";
export type { Selection, Resolution, Clause } from "./selection";
export { compile, explain, isIdentity } from "./predicate";
export type { DimAccessor, Predicate, Leaf } from "./predicate";
