// charts/scene/index.ts — @mkbabb/atlas · the SCENE family — the scroll/sticky scene primitives (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export * from "./expand-settle.js";
export * from "./stage-morph.js";
export * from "./usePaperCallout.js";
export { default as PaperCallout } from "./PaperCallout.vue";
export { default as ScrollLetteringHeading } from "./ScrollLetteringHeading.vue";
export { default as ScrollTimeline } from "./ScrollTimeline.vue";
export { default as ChapterStageView } from "./ChapterStage.vue";
export { default as StickyScene } from "./StickyScene.vue";
