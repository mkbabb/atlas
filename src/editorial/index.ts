// editorial/index.ts — @mkbabb/atlas · THE EDITORIAL FAMILY BARREL (src-rearchitecture §A.6; O-B6).
//
// The `platform/editorial/` connective tissue of the data-essay (the narrator's voice between
// figures) moves as-is into the top-level `src/editorial/` home. The `./editorial` export lifts from
// the O-B0 genesis `platform/editorial/` stub to this home (the O-B4/O-B5 lift precedent).
//
// ── O-B6 PARTIAL (curated to the COPY-stays-green closure) ─────────────────────────────────────
// Exposes the ONE self-contained leaf — the `EasterEgg` margin discovery (glass-ui only). DEFERRED
// (each blocked on a not-yet-landed upstream, with a named successor):
//   · `useBeatLayout` — the PURE placement resolver; type-imports `BeatLayout`/`Chapter` from the
//     `@atlas/core/contract` keystone, which is STILL a genesis stub in the library (the top-level
//     `src/contract/` deferred by O-B3 on the charts-type-import ordering bug → the O-B4R contract
//     closure). Lands with the contract.
//   · `DashboardEssay` · `Beat` · `PullFigure` · `StoryBeat` · `DataAside` · `AnimatedRule` ·
//     `DashboardHero` · `editorial-contract` — value-import charts leaves (FigureSlug/StickyScene/
//     VizPlate/beat-title/HandUnderline/viz-contract/scene-contract → O-B4R), chrome
//     (FigureInitial/SiteColophon → O-B8), the story facility (→ this wave's story defer), and the
//     global composable residue (useRomanNumeral/useCountUp → O-B9).
//   · **`DashboardHero` (574) re-homes AS-IS and stays >500 — its split is the named successor
//     O-B18** (the god-split tail; the composite ban: B6 claims no split).
// The monorepo import flip to this home is O-B11.

export { default as EasterEgg } from "./EasterEgg.vue";

// ── O-B4R (the SCC closure) — the deferred members now land ───────────────────────────────────
export * from "./useBeatLayout";
export { default as AnimatedRule } from "./AnimatedRule.vue";
export { default as DataAside } from "./DataAside.vue";
export { default as PullFigure } from "./PullFigure.vue";
export { default as StoryBeat } from "./StoryBeat.vue";
export { default as DashboardHero } from "./DashboardHero.vue";

// ── O-B8a (the chrome-blocked residue closes) — Beat/DashboardEssay/editorial-contract land ────
// These value-imported the chrome family (Beat → masthead/FigureInitial · DashboardEssay →
// background/Atmosphere + masthead/SiteColophon · editorial-contract → masthead/SiteColophon); the
// O-B8a chrome split homed them, so the editorial essay surface is now whole.
export { default as Beat } from "./Beat.vue";
export { default as DashboardEssay } from "./DashboardEssay.vue";
export * from "./editorial-contract";
