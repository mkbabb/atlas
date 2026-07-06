// platform/data/useFilteredRows.ts — THE GENERIC FILTER FOLD (K-FILTER-UNIFIED §4.F). ONE composable
// SUBSUMES every route's hand-rolled membership codec (`matchByLea`/`matchByFips`/`matchByCrn`) AND
// adds the CONTEXT tier + the disjunctive facet counts. The route DECLARES its dims (`key`/`arity`/
// `field`/`scope`); this fold does the rest off the ONE pure `composePredicate` algebra.
//
// THE TWO-TIER FOLD (the Tableau context filter, declarative — §4.F):
//   contextRows = rows ∩ composePredicate(context dims)   — the DOMAIN the rank/Top-N/aggregate compute
//                                                            over (applied FIRST, route-wide)
//   visibleRows = contextRows ∩ composePredicate(view dims) — the drawn membership (dims AFTER context)
//
// THE CROSS-HIGHLIGHT INVERSION (§4.G). The SELECTION is NOT a standing clause: a route appends the
// selection as a `set`-arity dim to its declared dims ONLY when `?fig=` is open (the route-wide
// `figOpen` gate). On the DEFAULT path (no expand) the selection is ABSENT from the fold — it
// cross-HIGHLIGHTS via the shipped veil, it never removes rows. Inside a `?fig=` fullscreen takeover
// the selection re-enters as a removal clause (where losing context is the intent). This composable
// owns the FOLD; the route owns the figOpen-gated dim list.
//
// PURE OVER ITS PASSED STORES (no internal Pinia). The cells resolve through the INJECTED `view` +
// `selection` readers (`resolveDimCell` — the `useFilterDimensions.cellFor` shape, made pure over the
// passed readers), so a route SECTION stays unit-testable WITHOUT mounting Pinia (the AR-5 purity the
// `usf-integrity-store-section.spec.ts` gate enforces). The running route store passes its live
// `useViewParams`/`useSelection`; a section spec passes a hand-built reader stub.
//
// H5a — `isMatch`/`dimMap` read the MEMOIZED `visibleSet` (O(1)), never an O(n) scan. H5b — each
// scope's specs derive DIRECTLY from its own dim subset (NOT by `.filter`-ing a shared union), and
// `disjunctiveCounts` SKIPS range targets (a continuous field is not a categorical facet).

import { computed, type ComputedRef, type Ref } from "vue";
import {
    type DimDeclaration,
    type DimCell,
} from "@/filter/composables/useFilterDimensions";
import {
    composePredicate,
    cellToConstraint,
    disjunctiveCounts,
    type DimPredicateSpec,
} from "@/charts/lib/filter-algebra";
import type { useViewParams } from "@/platform/stores/useViewParams";
import type { useSelection } from "@/platform/stores/useSelection";

/** ONE declared dim — the `DimDeclaration` (the per-DIMENSION state cell shape) NARROWED with the
    route's typed within-OR accessor + the `view`/`context` scope. `field` omitted ⇒ a panel-only dim
    (it projects into the unified panel but contributes NO row clause — the migration seam). */
export interface DeclaredDim<Row> extends DimDeclaration {
    /** The within-OR row accessor (a row → the value this dim tests, folded by `composePredicate`). */
    field?: (row: Row) => string | number | null;
    /** The dim's scope — `context` narrows the compute DOMAIN before the view fold; `view` dims after. */
    scope?: "view" | "context";
}

/** The minimal view-param reader the fold resolves cells through (the `useViewParams` subset). */
type ViewReader = Pick<
    ReturnType<typeof useViewParams>,
    "param" | "numberParam" | "listParam"
>;
/** The minimal selection reader the fold resolves the `set`-grain through (the `useSelection` subset). */
type SelectionReader = Pick<ReturnType<typeof useSelection>, "selectedIdsOf">;

/** The fold options — `idOf` is the row IDENTITY (the memoized `visibleSet` grain; H5a) + the INJECTED
    `view`/`selection` readers the cells resolve through (the AR-5 purity seam). */
export interface FilteredRowsOptions<Row> {
    idOf?: (row: Row) => string;
    /** The view-param reader (the running store's `useViewParams`, or a section-spec stub). */
    view: ViewReader;
    /** The selection reader (the running store's `useSelection`, or a section-spec stub). */
    selection: SelectionReader;
}

/** THE PURE CELL RESOLVER — map ONE declared dim to its `DimCell` off the INJECTED readers (the
    `useFilterDimensions.cellFor` shape, made pure over passed stores). The `range` branch carries the
    one-sided H3 widen (`[min ?? -∞, max ?? +∞]`), so a min-only / max-only window arrives well-formed. */
function resolveDimCell<Row>(
    d: DeclaredDim<Row>,
    view: ViewReader,
    selection: SelectionReader,
): DimCell | null {
    if (d.arity === "set") {
        const kind = d.selectionKind;
        return {
            key: d.key,
            arity: "set",
            universe: d.universe,
            kind: kind ?? "district",
            value: kind ? selection.selectedIdsOf(kind) : new Set<string>(),
        };
    }
    if (d.arity === "multi") {
        const base = d.paramKey ?? d.key;
        return {
            key: d.key,
            arity: "multi",
            universe: d.universe,
            value: view.listParam(base),
        };
    }
    if (d.arity === "range") {
        const base = d.paramKey ?? d.key;
        const min = view.numberParam(`${base}Min`);
        const max = view.numberParam(`${base}Max`);
        const value: readonly [number, number] | null =
            min === undefined && max === undefined
                ? null
                : [min ?? -Infinity, max ?? Infinity];
        return { key: d.key, arity: "range", universe: d.universe, value };
    }
    const base = d.paramKey ?? d.key;
    return {
        key: d.key,
        arity: "single",
        universe: d.universe,
        value: view.param(base) ?? null,
    };
}

/** The named return surface — the context→view fold + the O(1) membership + the comparable facets. */
export interface UseFilteredRowsReturn<Row> {
    /** The CONTEXT-narrowed domain (the rank/Top-N/aggregate compute over THIS set). */
    contextRows: ComputedRef<Row[]>;
    /** The drawn membership — `contextRows ∩ view fold` (`visibleRows ⊆ contextRows`). */
    visibleRows: ComputedRef<Row[]>;
    /** The memoized id set of `visibleRows` (H5a — O(1) `isMatch`). */
    visibleSet: ComputedRef<Set<string>>;
    /** O(1) membership over the memoized set (true when no filter is active). */
    isMatch: (id: string) => boolean;
    /** The per-row membership MAP (the plates' dimming read — a presentation adapter over `isMatch`,
        NOT a hand-rolled codec). All-true when no filter is active. */
    dimMap: ComputedRef<Record<string, boolean>>;
    /** True when ANY declared dim carries an active constraint (a non-identity fold). */
    filterActive: ComputedRef<boolean>;
    /** The leave-one-out faceted counts over the VIEW specs (comparable while a facet is constrained;
        range targets SKIPPED — H5b). */
    facetCounts: ComputedRef<Map<string, Map<string, number>>>;
}

/**
 * THE GENERIC FILTER FOLD. Given the scoped `rows` + the route's declared dims + the injected
 * view/selection readers, fold the context→view predicate off the ONE pure algebra. The route
 * DECLARES; the algebra resolves. PURE over its passed readers (no internal Pinia).
 */
export function useFilteredRows<Row>(
    rows: ComputedRef<Row[]> | Ref<Row[]>,
    dims: ComputedRef<readonly DeclaredDim<Row>[]> | (() => readonly DeclaredDim<Row>[]),
    opts: FilteredRowsOptions<Row>,
): UseFilteredRowsReturn<Row> {
    const declared = computed<readonly DeclaredDim<Row>[]>(() =>
        typeof dims === "function" ? dims() : dims.value,
    );
    const idOf = opts.idOf ?? ((r: Row): string => String(r));

    // H5b — derive each scope's specs DIRECTLY from its own dim subset (NOT by `.filter`-ing a shared
    // union), so a VIEW-cell change can never invalidate the context fold's spec identity beyond the
    // shared URL-bag reactivity (the I17 starvation seam).
    function specsFor(scope: "view" | "context"): DimPredicateSpec<Row>[] {
        return declared.value
            .filter((d) => (d.scope ?? "view") === scope)
            .map((d) => ({
                key: d.key,
                constraint: cellToConstraint(
                    resolveDimCell(d, opts.view, opts.selection),
                ),
                accessor: d.field,
            }));
    }
    const contextSpecs = computed<DimPredicateSpec<Row>[]>(() => specsFor("context"));
    const viewSpecs = computed<DimPredicateSpec<Row>[]>(() => specsFor("view"));

    const contextRows = computed<Row[]>(() => {
        const pred = composePredicate(contextSpecs.value);
        return rows.value.filter(pred);
    });
    const visibleRows = computed<Row[]>(() => {
        const pred = composePredicate(viewSpecs.value);
        return contextRows.value.filter(pred);
    });
    const visibleSet = computed<Set<string>>(
        () => new Set(visibleRows.value.map(idOf)), // H5a — O(1) isMatch / dimMap
    );

    const filterActive = computed<boolean>(() =>
        [...contextSpecs.value, ...viewSpecs.value].some(
            (s) => s.constraint.kind !== "any",
        ),
    );

    function isMatch(id: string): boolean {
        return !filterActive.value || visibleSet.value.has(id);
    }

    const dimMap = computed<Record<string, boolean>>(() => {
        const active = filterActive.value;
        const set = visibleSet.value;
        const out: Record<string, boolean> = {};
        for (const r of rows.value) {
            const id = idOf(r);
            out[id] = !active || set.has(id);
        }
        return out;
    });

    const facetCounts = computed<Map<string, Map<string, number>>>(() =>
        disjunctiveCounts(contextRows.value, viewSpecs.value),
    );

    return {
        contextRows,
        visibleRows,
        visibleSet,
        isMatch,
        dimMap,
        filterActive,
        facetCounts,
    };
}
