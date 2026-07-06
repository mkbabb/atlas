// charts/marks/index.ts — @mkbabb/atlas · the MARKS family — the ECharts/SVG mark primitives (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export * from "./mark-tokens";
export * from "./trajectory-marks";
export { default as MultiYearFigure } from "./MultiYearFigure.vue";
export { default as RankedBar } from "./RankedBar.vue";
export { default as ScatterPlate } from "./ScatterPlate.vue";
export { default as StackedBar } from "./StackedBar.vue";
export { default as TimeSeries } from "./TimeSeries.vue";
export { default as TrajectoryPlate } from "./TrajectoryPlate.vue";
export { default as Treemap } from "./Treemap.vue";

// v1.0.1 (O-B10 re-cut) — the mark component-script TYPES. A `default`-only re-export drops the
// named `<script>` type exports, so a consumer authoring a mark's data payload had no contract to
// import. Re-exported by name from each owning SFC.
export type { RankedRow } from "./RankedBar.vue";
export type { LineSeries, SeriesPoint } from "./TimeSeries.vue";
export type { StackSeries } from "./StackedBar.vue";
export type { TreemapItem, TreemapRichLabel } from "./Treemap.vue";
