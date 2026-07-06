// charts/readout/index.ts — @mkbabb/atlas · the READOUT family — the viz-plate-internal readout surfaces (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export { default as ReadoutFacts } from "./ReadoutFacts.vue";
export { default as ReadoutSheet } from "./ReadoutSheet.vue";

// v1.0.1 (O-B10 re-cut) — the `Fact` readout row contract. It is authored in the interaction family
// (`HoverCard.vue`, the hover-card surface) but the readout family + every consumer readout builder
// speak it, so the charts surface re-exports it here beside the readout components that render it.
export type { Fact } from "@/interaction/HoverCard.vue";
