// charts/contract/index.ts — the CONTRACT family barrel (§A.1) · PARTIAL at O-B4.
//
// The chart-family type contracts. O-B4 landed the two SELF-CONTAINED clean members
// (`selection-contract`, `aggregate`); O-B4R (the SCC closure) lands `viz-contract`
// (motion/variant-spec + composables/useVizOptions) + `scene-contract` (stores + the top-level
// `@/contract`) once their stores/motion/composables closure lands. `chartRecipe` (→ `TimeSeries.vue`
// → the marks family) rides the marks-subtree landing; the barrel drops it until then.
export * from "./selection-contract.js";
export * from "./aggregate.js";
export * from "./viz-contract.js";
export * from "./scene-contract.js";
