// interaction/index.ts — @mkbabb/atlas · THE INTERACTION FAMILY BARREL (src-rearchitecture §A.6/§A.7;
// O-B6). Born by this wave (the source family had no barrel).
//
// The `platform/interaction/` pointer/keyboard machines + the 3 affordance/selection composables
// dispersed from the flat `composables/` bag (§A.7) converge into the top-level `src/interaction/`
// home — the home where the drill-down gesture (L36), the gold-shimmer hover-outline (L38 Hover law),
// and the drill-down surfaces LAND as NAMED WG-A successors. This wave RE-HOMES the structural
// surface; the WG-A successor wires the behaviour (the composite ban: B6 claims no feature).
//
// ── O-B6 PARTIAL (curated to the COPY-stays-green closure) ─────────────────────────────────────
// Exposes the self-contained gesture/affordance primitives. DEFERRED (each blocked, with a named
// successor):
//   · `useVizContext` — the O-A6 hub, re-homed here AS-IS at HEAD; value-imports `stores/{useActiveBeat,
//     useSelection,useViewParams}` (O-B9) + motion-director (O-B4R activeViz edge). Lands with O-B9.
//   · `useSelectionTreatment` → `stores/useSelection` (O-B9).
//   · `HoverCard.vue` + `ReadoutDrill.vue` — the drill-down SURFACES re-homed here from the flat
//     charts bag [ANSWERS Q68]; value-import `stores/{useHoverReadout,useSelection,useViewParams}`
//     (O-B9) + charts `ReadoutFacts`/`useCardPlacement` (O-B4R). Land with O-B9; the WG-A drill-down
//     successor then wires the gesture.
// The monorepo import flip to this home is O-B11.

export * from "./keyboard";
export * from "./pointer-machine";
export * from "./usePointerGestures";
export * from "./useAffordance";
export * from "./useAffordanceHint";

// ── O-B4R (the SCC closure) — the deferred members now land ───────────────────────────────────
export * from "./useVizContext";
export * from "./useSelectionTreatment";
export { default as HoverCard } from "./HoverCard.vue";
export { default as ReadoutDrill } from "./ReadoutDrill.vue";
