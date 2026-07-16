// motion/index.ts — @mkbabb/atlas · THE MOTION FAMILY BARREL (src-rearchitecture §A.6/§A.7; O-B6).
//
// The `platform/motion/` family + the 10 scroll/motion composables dispersed from the flat
// `platform/composables/` bag (§A.7) converge into ONE top-level `src/motion/` home — the
// Scroll-animation-law + Variation-axes home the WG-A scroll/reveal successors land on. The `./motion`
// export lifts from the O-B0 genesis `platform/motion/` stub to this top-level home (the O-B4 charts /
// O-B5 filter precedent).
//
// ── O-B6 PARTIAL (curated to the COPY-stays-green closure) ─────────────────────────────────────
// Under the COPY-into-library model (the library MUST stay typecheck-green — NO dangling imports),
// this barrel exposes the maximal clean surface: the variant grammar, the trigger taxonomy, the
// reveal/rank registers, and the base scroll/reveal composables. DEFERRED (each blocked on a
// not-yet-landed upstream, with a named successor):
//   · `motion-director` — value-imports `useCoverProgress` → `composables/activeViz` (a charts
//     composable, O-B4R). Re-homes here AS-IS at HEAD (carries the O-A1 compose + O-DIR-1 PRM
//     taxonomy); lands GREEN once activeViz lands. **Its >500-LOC split stays O-B18.**
//   · `useScrollTimeline` (523) + `useCoverProgress` — same activeViz edge (O-B4R). useScrollTimeline's
//     split is the named successor **O-B18**.
//   · `useMarkMorphology` (→ charts `mark-tokens`, O-B4R) · `useHandMarkClock` (→ `useThemeKey`,
//     the global composable residue, O-B9).
// The monorepo import flip to this home is O-B11.

// — the variant grammar: spec vocabulary + resolved registers + micro-bounds + the resolver —
export * from "./variant-spec.js";
export * from "./variant-registers.js";
export * from "./variant-bounds.js";
export * from "./resolveVariant.js";
export * from "./seededVariety.js";

// — the closed trigger taxonomy (the KEPT vocabulary every declaration keys off) —
export * from "./triggers.js";

// — the lean catalog: the mechanism set + presets + per-preset triggers (the post-purge register) —
export * from "./lean-catalog.js";

// — the reveal register: host-style + count-at-progress + the KEPT reveal bindings —
export * from "./reveal-register.js";
export * from "./reveal-score.js";

// — the rank band: the lede/support/ancillary beat budget + reparameterization —
export * from "./rankMotionBand.js";

// — the dispersed scroll/reveal composables (§A.7) — the base tier (director/timeline defer) —
export * from "./useReducedMotion.js";
export * from "./useScrollProgress.js";
export * from "./useScrollLettering.js";
export * from "./useRankMotion.js";
export * from "./useLoadSequence.js";

// ── O-B4R (the SCC closure) — the deferred members now land ───────────────────────────────────
// motion-director re-exports ./buildMarkAnimation; useScrollTimeline re-exports ./useSectionReveal.
export * from "./motion-director.js";
export * from "./useCoverProgress.js";
export * from "./useScrollTimeline.js";
export * from "./useMarkMorphology.js";
// useHandMarkClock's `MarkAnimation` string-union clashes by NAME with buildMarkAnimation's handle
// interface (two distinct concepts); the union is deep-imported where needed, so the barrel omits it.
export {
    type MarkClock,
    type MarkAppear,
    type DarkLiftPair,
    RED_INK,
    clockAppear,
    clockAnimation,
    useHandMarkClock,
} from "./useHandMarkClock.js";
