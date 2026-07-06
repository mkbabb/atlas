// @mkbabb/atlas · ./provenance barrel — the provenance family HOME (O-B7 structural birth).
//
// The oldest unserved declared seam (L7 / CD-10) finally has a module: the declared-provenance
// shape (`ProvenanceFacet`, lifted from `viz-contract`) + the resolved runtime shape
// (`ResolvedProvenance` ⊕ `VintageLine` ⊕ `AggregationLevel`) + the shared reduce-op cycle-breaker
// (`ReduceOp` · `MeasureKind` · `AggregateResult` · `AggregateResolver`). B7 births the CONTRACT
// ONLY; the RENDER primitive (`ProvenanceBar.vue` / `ProvenanceChip.vue` / `useProvenance.ts` /
// `humanizePredicate()`) is the NAMED WG-A successor (O-A9 / O-A10), carried on the exec RED-LEDGER
// `provenance-render` row — this barrel claims NO render [src-rearchitecture §A.4; CD-10].
export * from "./provenance-contract";
export * from "./aggregate-contract";

// ── v1.0.4 (O-A9) — THE RENDER FAMILY lands: the seam is finally SERVED ─────────────────────────
// The WG-A successor the B7 barrel named. `humanizePredicate` (the reader-facing formatter) +
// `useProvenance` (the static ⊕ vintage ⊕ algebra resolver) + `ProvenanceBar`/`ProvenanceChip` (the
// `#provenance` slot filler + the at-viz leave-one-out chip). The filter-view `AlgebraReadout` band
// lands in the `filter/ui` barrel (filter-panel chrome consuming this family's `humanizePredicate`).
export * from "./predicate-prose";
export * from "./useProvenance";
export { default as ProvenanceBar } from "./ProvenanceBar.vue";
export { default as ProvenanceChip } from "./ProvenanceChip.vue";
