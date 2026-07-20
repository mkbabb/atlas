// charts/legend/index.ts — @mkbabb/atlas · the LEGEND family — the KEY-zone strips, ledgers, and viz furniture rungs (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export * from "./beat-title.js";
export { default as AxisNameLockup } from "./AxisNameLockup.vue";
export { default as ChartDataTable } from "./ChartDataTable.vue";
export { default as ChartLegend } from "./ChartLegend.vue";
export { default as VizAggregateStats } from "./VizAggregateStats.vue";
export { default as VizAnnotation } from "./VizAnnotation.vue";
export { default as VizDescription } from "./VizDescription.vue";
export { default as VizKeyStats } from "./VizKeyStats.vue";
export { default as VizOptions } from "./VizOptions.vue";
export { default as VizTextOverlay } from "./VizTextOverlay.vue";

// v1.0.1 (O-B10 re-cut) — the legend/furniture component-script TYPES (the `default`-only
// re-export dropped the named `<script>` type contracts). Re-exported by name from each owning SFC.
export type { ChartDataRow } from "./ChartDataTable.vue";
export type { LegendChip, LegendClamp } from "./ChartLegend.vue";
