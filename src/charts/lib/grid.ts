// platform/charts/lib/grid.ts — the FOUR ECharts grid margin shapes (the K-F grid-standard source).
//
// The live census found the margin declared 14 ways across the option-builders + 2 shared constants,
// every value an ad-hoc literal (K-FEEDBACK-3 §A.2). The family CLOSES at four — there is no genuine
// fifth (the demand + speedtest plates carry ZERO own ECharts grids: ContractCliff/ProductMixPlate
// are render:"svg"; CrossoverPlate mounts <TimeSeries> whose margin IS VIZ_GRID_CROWN; speedtest is
// geo/svg). This is the single named, late-bound source; the grid-standard gate fences every other
// `grid:`-literal out of the tree (re-pointed builders reference these names, never re-open a literal).
//
// The literal pixels are the §7 fenced signables (the beeswarm VIZ_GRID_BAR_WIDE + the BreakEven
// crown-fold are decided-by-pixel at the live render); the named-export identifiers + the four-shape
// closure are the load-bearing contract.

import type { GridComponentOption } from "echarts";

/** The WORKHORSE — `containLabel` lets ECharts reserve the axis-label gutter itself; the small fixed
    insets only frame the plot. The base for every label-bounded chart (the usf-integrity
    biplot/benford spread their x-title bottom over this). */
export const VIZ_GRID: GridComponentOption = {
    left: 8,
    right: 24,
    top: 8,
    bottom: 8,
    containLabel: true,
} as const;

/** VALUE-axis variant — a wider FIXED left inset (64) for a y-VALUE axis whose tick labels are wide
    and NOT `containLabel`-reserved (the scatter/strip family; folds the two SCATTER_GRID copies). The
    `left:64` is the retuned `70→64` the scatter migration adopts. */
export const VIZ_GRID_VALUE: GridComponentOption = {
    left: 64,
    right: 24,
    top: 16,
    bottom: 52,
} as const;

/** CROWN variant — a lifted TOP gutter (30) so a rising-ceiling line + the top tick clear the bezel
    (the E15a crown). The TimeSeries/StackedBar register (each layers `containLabel` for its wide
    y-value ticks); CrossoverPlate rides this via <TimeSeries>; BreakEven folds its bottom over it. */
export const VIZ_GRID_CROWN: GridComponentOption = {
    left: 64,
    right: 24,
    top: 30,
    bottom: 40,
} as const;

/** BAR variant — a wide RIGHT gutter (80) for a horizontal-bar value-label run; collapses the
    right-gutter spread `{64,88,96,120}` onto one inset. The L→R wipe K-B's drawIn rides is
    load-bearing here. The beeswarm `right:120` earns a `_WIDE` variant ONLY on an observed clip
    (§7 fenced signable) — a variant of THIS shape, never a fifth shape. */
export const VIZ_GRID_BAR: GridComponentOption = {
    left: 8,
    right: 80,
    top: 8,
    bottom: 8,
    containLabel: true,
} as const;
