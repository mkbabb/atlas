// charts/contract/index.ts — the CONTRACT family barrel (§A.1) · PARTIAL at O-B4.
//
// The chart-family type contracts. This wave lands the two SELF-CONTAINED, clean members
// (`selection-contract`, `aggregate`); the entangled trio — `viz-contract` (motion/variant-spec
// + composables/useVizOptions), `scene-contract` (stores), `chartRecipe` (TimeSeries.vue) — is
// DEFERRED to the wave that lands its stores/motion/composables closure (see the O-B4 PACK
// deferral ledger). The barrel drops the deferred members, exactly as the O-B3 data barrel did.
export * from "./selection-contract";
export * from "./aggregate";
