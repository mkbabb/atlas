// charts/scale/render-tier.ts — THE RENDERER-TIER LADDER (N.WF2 · G-N5/§4.F2 · B5 → O-F19/G-N5b).
//
// A DECLARATIVE documentary ladder: it names the ONE real renderer-tier boundary a figure's mark
// count implies (SVG ≤~1000 marks → canvas-2D — echarts' `CanvasRenderer` already carries the
// dense mid-band). The densest live frame is the /sci all-year scatter at 3243 marks (2.0 ms on
// canvas); every geo figure is SVG ≤~300. WebGPU marks never pay at our sizes.
//
// PRUNED (O-F19, G-N5b): the `canvas-large`/`webgl`/`progressive` bands + the `large`/
// `largeThreshold` advisory fields described a transport nothing uses — parked behind a
// nationwide-raw-FRN beat that does not exist, no consumer ever read them (the L22 SPEC-THEATER
// class). Removed, not stubbed; if that beat ever ships, it re-mints its own tier, not this one.
//
// ORTHOGONAL to `markPolicyForCount` (scatter-dials.ts): that hook owns PERCEPTUAL DENSITY — whether
// a mark draws as a typeset glyph, a thinned glyph, or a dot in a cloud (a SYMBOL-geometry decision
// WITHIN one renderer). THIS hook owns the RENDERER TIER — svg vs canvas. The two never conflate: a
// 3243-mark scatter is `dot-cloud` (density) AND `"canvas"` (tier) independently. They read the
// same `n` and answer two different questions.

/** The renderer tier a figure's mark count implies. `svg` (crisp, low-count, DOM-hit-tested) ·
    `canvas` (the live default for every dense figure — the whole corpus tops out here). */
export type RenderTier = "svg" | "canvas";

/** The ONE real tier boundary (mark count): SVG stays crisp + DOM-hit-testable at low counts;
    canvas absorbs the dense mid-band every live figure lands in. Named so the ladder is
    inspectable, not a bare literal. */
export const RENDER_TIER_SVG_CEIL = 1_000;

/** The renderer tier a mark count implies. */
export function tierForMarkCount(n: number): RenderTier {
    return n <= RENDER_TIER_SVG_CEIL ? "svg" : "canvas";
}

/** A figure's renderer-tier policy — the DECLARATIVE record a plate MAY carry. */
export interface VizRenderPolicy {
    /** the figure's mark count (the sole input the tier derives from). */
    markCount: number;
    /** the renderer tier `markCount` implies (`tierForMarkCount`). */
    tier: RenderTier;
}

/** Build the `VizRenderPolicy` for a mark count. */
export function renderPolicyForCount(n: number): VizRenderPolicy {
    return { markCount: n, tier: tierForMarkCount(n) };
}
