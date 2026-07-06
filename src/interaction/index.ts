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

// ── v1.0.4 (O-A9) — THE ACTIVE-VIZ HOOK: the scrolled-to/selected viz as a NAMED READ-ONLY event
// source (provenance-surface §4). A thin subscription façade over `useActiveBeat` + the route
// coordinator + `useSelection`; writes NOTHING (the single-writer gates hold). Consumed by the
// provenance ProvenanceChip binding + O-A11 drill-down.
export * from "./useActiveViz";
export { default as HoverCard } from "./HoverCard.vue";
export { default as ReadoutDrill } from "./ReadoutDrill.vue";

// ── v1.0.1 (O-B10 re-cut) — THE VIZ-CONTEXT HUB PROVIDER SURFACE ───────────────────────────────
// The N.WD1 hub (`platform/context/hub.ts`) rides no barrel of its own, so v1.0.0 tree-shook the
// provider factory out of dist (only `VIZ_HUB_KEY` + `useOptionalVizContext` survived, dragged in by
// `charts/frame/useVizPlate`). A route body provides the hub at `VIZ_HUB_KEY` (`DashboardView`) and
// binds its facets through `useVizHub()` (`DashboardBody`); a plate reads it through the hub's
// `useVizContext`. This barrel is the home the O-B11 flip routes those symbols to.
//
// The hub's per-viz reader is ALSO named `useVizContext`, colliding with the O-A6 motion
// `useVizContext` exported above (two distinct composables that shared a name at distinct source
// paths pre-flip). A bare `export *` would make the name ambiguous and DROP it from this barrel
// (breaking BOTH), so the hub surface is re-exported by NAME, omitting its `useVizContext` — the
// motion export above holds the bare name. (The route-facing hub accessors — `useVizHub` /
// `createVizContextHub` — are unambiguous and land here.)
export {
    createVizContextHub,
    useVizHub,
    useOptionalVizHub,
    useOptionalVizContext,
    VIZ_HUB_KEY,
} from "@/platform/context/hub";
export type {
    C,
    ResolvedAtmosphere,
    FilterFacet,
    SelectionFacet,
    ReadoutFacet,
    VizContext,
    VizContextHub,
    VizContextHubDeps,
} from "@/platform/context/hub";

// ── v1.0.2 (O-B10 re-cut) — THE HUB PER-VIZ READER, UNDER AN HONEST DISTINCT NAME ──────────────
// v1.0.1 re-exported the hub PROVIDER surface (above) but had to OMIT the hub's own per-viz reader,
// `useVizContext(vizId, opts)`, because a bare re-export collides with the O-A6 MOTION `useVizContext`
// (`vizId, host, sources`) exported at the top of this barrel — two DISTINCT composables that shared a
// name at distinct source paths. The two are NOT complements to fold (different signatures, different
// return surfaces — the motion one feeds `useMotionDirector` with the six `MotionDrivers` edges; the
// hub one is the ONE injected plate context: `.route/.accent/.colorKind/.palette/.selection/.readout/
// .filter/.readiness/.isActive/.isExpanded`). So the hub reader lands here under a NON-colliding name,
// `useVizHubContext` — additive (v1.0.1 consumers still resolve every prior symbol; the bare
// `useVizContext` name stays the motion export). A plate reading the N-era hub context imports
// `useVizHubContext` from `@mkbabb/atlas/interaction` (its silent SSR/gallery half, `useOptionalVizContext`,
// already lands unaliased above). RankedStrip / RainbowStack / ConsultantsRankedBar re-point to this.
export { useVizContext as useVizHubContext } from "@/platform/context/hub";

// The readiness contract the hub folds each source phase through (`SourcePhase` — a route store's
// per-source `{loading, error, resolved}` shape it registers via `hub.registerSource`).
export type { Readiness, SourcePhase } from "@/platform/context/readiness";
export { foldReadiness, aggregateReadiness, mayEvaluateEmpty } from "@/platform/context/readiness";
