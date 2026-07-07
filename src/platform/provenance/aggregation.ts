// platform/provenance/aggregation.ts — THE Q-43 AGGREGATION-LEVEL RESOLVER (O-A9b · the facility half
// of the O-A9 render family). [ANSWERS Q43] the provenance SCOPE rung reads the CURRENT aggregation
// level — year-grain × spatial-grain × entity-grain × the active reduce-op — and RE-RESOLVES LIVE as
// the filter/selection narrows ("FY2016–2026 · all states · pooled ×" ⇒ "FY2025 · NC · single district").
//
// THE SPLIT (CH-A H4/H5): O-B7 births the SHAPE (`AggregationLevel`), O-A11 IMPLEMENTS the reduce
// COMPUTE (the number), and THIS resolver POPULATES the level string off O-A11's resolved `op` + the
// live grain axes. It owns NEITHER the shape NOR the compute — only the fold to the label the surfaces
// read. The reduce-op VOCABULARY is the shared `aggregate-contract.ts` (the Phase-3 cycle-breaker).
//
// THE PURE-CORE PATTERN (mirrors `resolveProvenance`): `resolveAggregationLevel` is pure, TOTAL,
// framework-store-free (fixture-testable off plain values); `useAggregationLevel` is the thin Vue shell
// that binds the route's LIVE getters so the computed re-resolves on every migration.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import type { AggregationLevel } from "./provenance-contract";
import type { MeasureKind, ReduceOp } from "./aggregate-contract";

/** One aggregation AXIS the view spans — its POOLED label (many members are folded) and its SINGLE
    label (the view has narrowed to one member), plus whether the current view HAS narrowed. The
    resolver folds each axis to the grain string the SCOPE rung reads: it prints `pooled` until the
    view narrows the axis, then `single` ("FY2016–2026" ⇒ "FY2025"; "all states" ⇒ "NC"). A `null`
    axis is ABSENT from the level (an aspatial viz declares no `spatial` axis, a single-item viz no
    `entity` axis). */
export interface AxisGrain {
    /** the label while MANY members are folded on this axis ("FY2016–2026", "all states", "1,150 districts"). */
    pooled: string;
    /** the label once the view has NARROWED this axis to one member ("FY2025", "NC", "single district"). */
    single: string;
    /** whether the current live view has narrowed this axis to a single member (drives which label shows). */
    narrowed: boolean;
}

/** THE AGGREGATION-LEVEL INPUTS the resolver folds — the three grain axes + the active reduce-op
    (O-A11's resolved `AggregateResult.op`, or `reduceOpFor(kind)` when a route knows only the measure
    kind). Each field is ALREADY-RESOLVED off the live filter/selection (a getter's value), so the
    fold stays pure. */
export interface AggregationInputs {
    /** the YEAR axis; `null` when the viz has no temporal grain. */
    year: AxisGrain | null;
    /** the SPATIAL axis; `null` when aspatial. */
    spatial: AxisGrain | null;
    /** the ENTITY axis; `null` when the view has no entity roll-up. */
    entity: AxisGrain | null;
    /** the active reduce-op folding the members (O-A11's resolved `op`); `null` when unknown. */
    reduceOp: ReduceOp | null;
}

/** THE AGGREGATE LAW's pure op-selection (`aggregate-contract.ts` §law): an EXTENSIVE measure (dollars,
    counts) SUMS (`Σ`); an INTENSIVE ratio POOLS (`pooled`, Σnum/Σden) — NEVER a plain mean (the
    Simpson trap the law rejects). The label surface reads this to print the honest reduce token; O-A11's
    compute reduces the number under the SAME selection. */
export function reduceOpFor(kind: MeasureKind): ReduceOp {
    return kind === "extensive" ? "Σ" : "pooled";
}

/**
 * PURE — fold the live grain axes into the CURRENT `AggregationLevel` ([ANSWERS Q43]). Each axis prints
 * its POOLED label until the view NARROWS it to a single member, then its SINGLE label. The reduce-op
 * shows ONLY while a pool REMAINS (some axis un-narrowed): a view narrowed to a single member on EVERY
 * axis folds NOTHING, so `reduceOp` collapses to `null` (no false "pooled ×" printed over one item —
 * the aggregate-contract honesty fence). Returns `null` when the view carries NO aggregation axis at
 * all (a truly un-aggregated viz shows no SCOPE rung).
 */
export function resolveAggregationLevel(a: AggregationInputs): AggregationLevel | null {
    const axes = [a.year, a.spatial, a.entity];
    if (axes.every((x) => x == null)) return null;
    const grainOf = (x: AxisGrain | null): string | null =>
        x == null ? null : x.narrowed ? x.single : x.pooled;
    const pooling = axes.some((x) => x != null && !x.narrowed);
    return {
        yearGrain: grainOf(a.year),
        spatialGrain: grainOf(a.spatial),
        entityGrain: grainOf(a.entity),
        reduceOp: pooling ? a.reduceOp : null,
    };
}

/** The route-supplied LIVE seams `useAggregationLevel` reads. Every seam is a `MaybeRefOrGetter` off
    the route's filter/selection state, so the returned computed re-resolves whenever any narrows. Each
    DEFAULTS to inert (`null`), so a route wiring only the axes it has resolves an honest partial level. */
export interface AggregationSources {
    /** the YEAR axis getter (default `null` — no temporal grain). */
    year?: MaybeRefOrGetter<AxisGrain | null>;
    /** the SPATIAL axis getter (default `null` — aspatial). */
    spatial?: MaybeRefOrGetter<AxisGrain | null>;
    /** the ENTITY axis getter (default `null` — no entity roll-up). */
    entity?: MaybeRefOrGetter<AxisGrain | null>;
    /** the active reduce-op getter (O-A11's resolved `op`; default `null`). */
    reduceOp?: MaybeRefOrGetter<ReduceOp | null>;
}

/**
 * `useAggregationLevel(sources)` — the LIVE aggregation-level read a route binds to
 * `ProvenanceSources.aggregationLevel`. Every getter re-reads the filter/selection, so the returned
 * `ComputedRef` RE-RESOLVES on every migration (a multi-year·multi-state view narrowing to a single
 * year·single state re-resolves and the SCOPE rung repaints — the Q43 re-render, never a stale string).
 *
 * READ-ONLY — a pure fold over reactive reads; writes NOTHING (every single-writer gate holds).
 */
export function useAggregationLevel(
    sources: AggregationSources = {},
): ComputedRef<AggregationLevel | null> {
    return computed<AggregationLevel | null>(() =>
        resolveAggregationLevel({
            year: toValue(sources.year) ?? null,
            spatial: toValue(sources.spatial) ?? null,
            entity: toValue(sources.entity) ?? null,
            reduceOp: toValue(sources.reduceOp) ?? null,
        }),
    );
}
