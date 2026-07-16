// platform/filter/route-fold.ts — THE ROUTE FOLD (N.WA1-T2 · the coordinator bridge every route
// store SECTION calls). It re-homes the three routes onto the ONE Selection algebra, replacing the
// retired `useFilteredRows` membership fold + the deleted `SELECTION_DIM` dim-list splice.
//
// ONE Selection carries TWO clauses:
//   · the FILTER clause  — authored under a NON-client source (`${vizId}:filter`), so crossfilter
//     NEVER omits it: the URL dials always apply.
//   · the SELECTION clause — authored under the CLIENT'S OWN source (`vizId`), so the resolution
//     decides whether the client sees it (the leave-one-out primitive, first-class).
//
// THE RESOLUTION FLIP (the mechanism change): the figOpen cross-highlight ↔ crossfilter switch is a
// `Resolution` flip, NOT a dim-list splice — `crossfilter` by DEFAULT (the client omits its OWN
// selection clause: a click cross-HIGHLIGHTS via the veil, it never removes rows) and `intersect`
// inside a `?fig=` fullscreen expand (EVERY clause applies: the selection removes non-selected rows,
// where losing context is the intent). The DEFAULT semantics are BYTE-EQUAL to the retired fold:
//   · no filter active  ⇒ the resolved predicate is identity ⇒ all-match.
//   · `?fig=` open       ⇒ the full-clause predicate (filter ∩ selection).
//   · the client read    ⇒ leave-one-out (the client's own selection clause is folded out).
//
// PORT FRICTION #3 (the ONE imperative edge, flush PER EDGE): predicate-as-data cannot push itself
// INTO the selection, so a `watch(..., {flush:"sync"})` re-issues `sel.update` when the derived
// predicate changes — the coarse write-then-read determinism edge. Each `filter`/`selection` getter
// is a route computed reading the live view/selection stores; the fold owns the coordinator + the
// three imperative edges, nothing route-specific.

import { computed, watch, watchEffect, type ComputedRef } from "vue";
import { createCoordinator, createSelection } from "./coordinator.js";
import type { Predicate } from "./predicate.js";

/** The fold's observable surface — the client's leave-one-out rows, the filter-active flag, and the
    O(1) membership predicate every plate's dimming reads (a presentation adapter over the memoized
    visible set, NOT a hand-rolled codec). Byte-equal to the retired `useFilteredRows` return. */
export interface RouteFold<Row> {
    /** The client's filtered rows (`coordinator.filteredFor(vizId)` — leave-one-out on the default). */
    visibleRows: ComputedRef<Row[]>;
    /** True when the client's RESOLVED predicate is non-identity (the selection clause folded out on
        the default path, so a bare click never flips this — the cross-highlight inversion). */
    filterActive: ComputedRef<boolean>;
    /** O(1) membership over the memoized visible set (true when no filter is active). */
    isMatch: (id: string) => boolean;
    /** Row membership through the coordinator's memoized compiled predicate. Consumers with a
        wider base frame reuse the sovereign query rather than compiling a parallel matcher. */
    matchesRow: (row: Row) => boolean;
    /** LEAVE-ONE-OUT FACET COUNTS for a declared `fields` accessor — `coord.facetsFor(vizId, field)`:
        the count of each value of `field` over the client's crossfiltered domain (the panel's
        comparable dim buckets). Empty until the client declares `fields` (the 3 pre-existing routes
        omit them ⇒ an empty map; a panel that wants counts declares the accessors — N.WA2). Stable
        per field (the underlying coordinator signal is cached; the wrapping computed is memoized). */
    facetsFor: (field: string) => ComputedRef<Map<string, number>>;
}

export interface RouteFoldOptions<Row> {
    /** The scoped base frame as a reactive getter (the year-scoped rows flow in with no push edge). */
    rows: () => readonly Row[];
    /** The URL-dial predicate (source ≠ client ⇒ always applies). Identity ⇒ no dial active. */
    filter: () => Predicate<Row>;
    /** The click-selection predicate (source === client ⇒ leave-one-out / figOpen-gated). */
    selection: () => Predicate<Row>;
    /** `?fig=` open ⇒ `intersect` (every clause applies); else `crossfilter` (leave-one-out). */
    figOpen: () => boolean;
    /** The client id every plate reads through (`filteredFor(vizId)`). */
    vizId: string;
    /** The row identity (the memoized visible-set grain; H5a — O(1) `isMatch`). */
    idOf: (row: Row) => string;
    /** OPTIONAL — the dim accessors the coordinator derives leave-one-out facet counts (+ domains)
        over. The panel's comparable counts read `facetsFor(field)`; omitted ⇒ `facetsFor` returns an
        empty map (the pre-existing routes' behaviour, unchanged). The accessors MUST be the SAME
        closures the route's `DeclaredDim.field`s use (one accessor source — no facet-vs-filter drift). */
    fields?: Record<string, (row: Row) => string | number | null>;
}

/**
 * `useRouteFold` — connect a route's ONE client to the coordinator, drive the filter + selection
 * clauses, and flip the resolution on `?fig=`. Returns the byte-equal `visibleRows`/`filterActive`/
 * `isMatch` surface. PURE over its passed getters (no Pinia) — a store SECTION spec drives it with
 * hand-built refs exactly like the retired fold.
 */
export function useRouteFold<Row>(opts: RouteFoldOptions<Row>): RouteFold<Row> {
    const { vizId } = opts;
    const coord = createCoordinator<Row>(opts.rows);
    const sel = createSelection<Row>("crossfilter");
    // `fields` (optional) lets the client draw leave-one-out facet counts / derived domains off the
    // coordinator — the capability the 3 shipped routes never wired but ECF's panel needs (N.WA2).
    coord.connect({ id: vizId, filterBy: sel, fields: opts.fields });

    // THE FILTER CLAUSE — a NON-client source, so crossfilter never omits it (the dials always apply).
    const filterP = computed<Predicate<Row>>(() => opts.filter());
    watch(filterP, (p) => sel.update({ source: `${vizId}:filter`, predicate: p }), {
        immediate: true,
        flush: "sync",
    });

    // THE SELECTION CLAUSE — the CLIENT'S OWN source, so `crossfilter` (default) folds it out for this
    // client (the click cross-HIGHLIGHTS, never removes) and `intersect` (?fig=) applies it. The FLIP.
    const selectionP = computed<Predicate<Row>>(() => opts.selection());
    watch(selectionP, (p) => sel.update({ source: vizId, predicate: p }), {
        immediate: true,
        flush: "sync",
    });

    // THE RESOLUTION FLIP (replaces the SELECTION_DIM dim-list splice): crossfilter (leave-one-out) by
    // default, intersect (every clause applies) inside a ?fig= fullscreen expand.
    watchEffect(() => sel.resolution.set(opts.figOpen() ? "intersect" : "crossfilter"));

    const rowsSig = coord.filteredFor(vizId);
    const rowMatcher = sel.predicate(vizId);
    const activeSig = coord.filterActive(vizId);
    const visibleRows = computed<Row[]>(() => [...rowsSig()]);
    const filterActive = computed<boolean>(() => activeSig());
    const visibleSet = computed<Set<string>>(() => new Set(rowsSig().map(opts.idOf)));
    const isMatch = (id: string): boolean =>
        !filterActive.value || visibleSet.value.has(id);
    const matchesRow = (row: Row): boolean => rowMatcher()(row);

    // Leave-one-out facet counts, memoized per field (the coordinator caches the underlying signal;
    // this wraps it ONCE as a Vue computed so a panel binds a stable ref). Empty when `fields` absent.
    const facetCache = new Map<string, ComputedRef<Map<string, number>>>();
    const facetsFor = (field: string): ComputedRef<Map<string, number>> => {
        let ref = facetCache.get(field);
        if (!ref) {
            const sig = coord.facetsFor(vizId, field);
            ref = computed(() => sig());
            facetCache.set(field, ref);
        }
        return ref;
    };

    return { visibleRows, filterActive, isMatch, matchesRow, facetsFor };
}

// ── SHARED CLAUSE BUILDERS — the tiny route-agnostic bits every section's dim declaration reuses ──

/** The click-selection CLAUSE — the native-grain id set as ONE `oneOf` leaf (empty ⇒ identity, so
    the fold folds it out). The `field` reads the row's native grain (I5 §10 — a foreign-kind key
    cannot dim this route's field). Fed to `useRouteFold`'s `selection` getter. */
export function selectionClause<Row>(
    ids: ReadonlySet<string>,
    field: (row: Row) => string | number | null,
): Predicate<Row> {
    return ids.size === 0
        ? { op: "any" }
        : { op: "oneOf", field, values: ids, key: "selFold" };
}

/** The `<key>Min`/`<key>Max` URL pair → a `RangeValue` cell value, carrying the one-sided H3 widen
    (`[min ?? -∞, max ?? +∞]`) so a min-only / max-only window arrives well-formed; both absent ⇒
    null (no constraint). The SAME resolution the retired `resolveDimCell` range branch used. */
export function rangeValue(
    view: { numberParam(key: string): number | undefined },
    minKey: string,
    maxKey: string,
): readonly [number, number] | null {
    const min = view.numberParam(minKey);
    const max = view.numberParam(maxKey);
    return min === undefined && max === undefined
        ? null
        : [min ?? -Infinity, max ?? Infinity];
}
