// story/index.ts — @mkbabb/atlas · THE STORY FACILITY BARREL (src-rearchitecture §A.6; O-B6).
//
// The `platform/story/` family moves as-is into the top-level `src/story/` home — the Variation-axes
// scroll facility. The `./story` export lifts from the O-B0 genesis `platform/story/` stub to this
// home (the O-B4/O-B5 lift precedent).
//
// ── O-B6 PARTIAL (curated to the COPY-stays-green closure) ─────────────────────────────────────
// This barrel exposes the self-contained compositor primitives — the corridor register, the
// centre-axis clock geometry, and the between-beat clone-overlay. DEFERRED (all blocked on the same
// upstream edge, with a named successor):
//   · `story-contract` → value-imports charts `scene-contract` (the entangled contract trio O-B4
//     deferred → O-B4R, itself blocked on `stores` → O-B9).
//   · `useStoryDirector` · `story-director-provide` · `StoryCorridor.vue` — all
//     transitively consume `story-contract`, so they land with it once scene-contract (O-B4R) lands.
// The monorepo import flip to this home is O-B11.

export * from "./centreAxis";
export * from "./corridor";
export * from "./clone-overlay";

// ── O-B4R (the SCC closure) — the deferred members now land ───────────────────────────────────
export * from "./story-contract";
export * from "./useStoryDirector";
export * from "./story-director-provide";
export { default as StoryCorridor } from "./StoryCorridor.vue";

// ── O-A15 · the variation-axes + template-as-data algebra ─────────────────────────────────────
export * from "./beat-template";
export * from "./superlative";
export * from "./viz-alternates";
export * from "./manifest";

// The canonical persistent stage is authored from the story surface as well as the charts surface;
// both routes resolve to the same contract and thin StickyScene adapter.
export type {
    ChapterStage,
    SceneOption,
    StageAnatomy,
    StageEvents,
    StageExport,
    StageSourcePanelProps,
} from "@/charts/contract/scene-contract";
export { stageEventsFromHub } from "@/charts/contract/scene-contract";
export { default as ChapterStageView } from "@/charts/scene/ChapterStage.vue";
