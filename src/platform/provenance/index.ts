// @mkbabb/atlas · ./provenance barrel — the provenance family HOME (O-B7 structural birth).
//
// The oldest unserved declared seam (L7 / CD-10) finally has a module: the declared-provenance
// shape (`ProvenanceFacet`, lifted from `viz-contract`) + the resolved runtime shape
// (`ResolvedProvenance` ⊕ `VintageLine` ⊕ `AggregationLevel`) + the shared reduce-op cycle-breaker
// (`ReduceOp` · `MeasureKind` · `AggregateResult` · `AggregateResolver`). B7 births the CONTRACT
// ONLY; the RENDER primitive (`ProvenanceBar.vue` / `ProvenanceChip.vue` / `useProvenance.ts` /
// `humanizePredicate()`) is the NAMED WG-A successor (O-A9 / O-A10), carried on the exec RED-LEDGER
// `provenance-render` row — this barrel claims NO render [src-rearchitecture §A.4; CD-10].
export * from "./provenance-contract.js";
export * from "./aggregate-contract.js";

// ── v1.0.4 (O-A9) — THE RENDER FAMILY lands: the seam is finally SERVED ─────────────────────────
// The WG-A successor the B7 barrel named. `humanizePredicate` (the reader-facing formatter) +
// `useProvenance` (the static ⊕ vintage ⊕ algebra resolver) + `ProvenanceBar`/`ProvenanceChip` (the
// `#provenance` slot filler + the at-viz leave-one-out chip). The filter-view `AlgebraReadout` band
// lands in the `filter/ui` barrel (filter-panel chrome consuming this family's `humanizePredicate`).
export * from "./predicate-prose.js";
export * from "./useProvenance.js";
export { default as ProvenanceBar } from "./ProvenanceBar.vue";
export { default as ProvenanceChip } from "./ProvenanceChip.vue";

// ── v1.0.8 (O-A9b) — THE Q-43 FACILITY: the aggregation-level resolver + the per-route appendix +
// the all-items coverage census (the MECHANISM). The resolver POPULATES `ResolvedProvenance.
// aggregationLevel` off the live filter/selection (year × spatial × entity × reduce-op); the appendix
// renders a route's full provenance reference, the inline bar cross-linking to it via `appendixAnchorId`;
// the census holds the WG-D route covers accountable to "0 un-sourced items on EVERY route" [CH-A H2/H4/H5].
export * from "./aggregation.js";
export * from "./coverage.js";
export * from "./appendix.js";
export * from "./provenance-lines.js";
export { default as ProvenanceAppendix } from "./ProvenanceAppendix.vue";
export { default as SourceLink } from "./SourceLink.vue";
export { default as VizAppendixDock } from "./VizAppendixDock.vue";
