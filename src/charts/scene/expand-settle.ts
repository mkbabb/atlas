// platform/charts/expand-settle.ts — the EXPAND-SETTLE seam (E3 §1.3 · e-hovers FIX-3 consume).
//
// glass-ui 3.11's <ExpandableContainer> is a SINGLE-SURFACE re-parent: it renders the default
// slot ONCE and Teleports that one surface in/out of <body> (the `disabled: !open` Teleport,
// dist-verified). So the ONE imperative ECharts instance physically MOVES into the fullscreen
// surface — it is never duplicated (the E14 double-renderSlot is gone at the library root). But
// an imperative canvas that re-parents into a larger box keeps its OLD internal layout
// (zrender's pixel↔data grid was computed at the resting size); its hit-test + `convertToPixel`
// anchor are then STALE, so a hover inside the expanded plate lands between marks — the E14
// "expand renders but hover is dead" tail. The deterministic cure is to `chart.resize()` the one
// instance AFTER the re-parent settles (never rely on a ResizeObserver-timing accident — the
// e-hovers ROOT-3 non-determinism the treemap "worked" by luck on).
//
// ChartFrame owns the <ExpandableContainer> and its `settle(fullscreen)` emit; useEChart owns
// the chart instance. They stay DECOUPLED through this provided signal: ChartFrame PROVIDES a
// monotonic settle tick (bumped on each `@settle`), and useEChart INJECTS it (OPTIONAL — a chart
// mounted outside a ChartFrame, e.g. a test harness, simply sees no provider and behaves exactly
// as before) and resizes the one instance on every tick. One seam, both states publish identically.

import { inject, type InjectionKey, type Ref } from "vue";

/** The expand-settle signal a ChartFrame provides to the chart(s) it wraps. */
export interface ExpandSettle {
    /** A monotonic counter bumped once per `ExpandableContainer` settle (open AND close). The
        chart watches it to `resize()` after the single-surface re-parent has landed in the DOM. */
    tick: Ref<number>;
    /** The live fullscreen state at the last settle — exposed for any consumer that wants it. */
    fullscreen: Ref<boolean>;
}

/** Optional inject (`inject(EXPAND_SETTLE_KEY, undefined)`): present only inside a ChartFrame. */
export const EXPAND_SETTLE_KEY: InjectionKey<ExpandSettle> = Symbol("platform:expand-settle");

/** Read the expand-settle signal, or `undefined` outside a providing `ChartFrame` (a chart
    mounted standalone — e.g. a test harness — sees no provider and behaves exactly as
    before). Never throws — this context's entire purpose is a befitting-silent default. */
export function useOptionalExpandSettle(): ExpandSettle | undefined {
    return inject(EXPAND_SETTLE_KEY);
}
