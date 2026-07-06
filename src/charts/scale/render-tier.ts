// platform/charts/render-tier.ts — THE RENDERER-TIER FORWARD HOOK (N.WF2 · G-N5/§4.F2 · B5).
//
// A DECLARATIVE, FORWARD-ONLY hook: it names the renderer tier a figure's mark count implies, so a
// future figure that DOES cross a boundary has ONE seam to consult. NO figure crosses a boundary
// today — the densest live frame is the /sci all-year scatter at 3243 marks (single-year default
// ≈297); every geo figure is SVG ≤~300; the consortia ranked bars top out at 3052 DOM marks
// (N.WP `marks-census`). So `tierForMarkCount` returns `"canvas"` for the whole live corpus and the
// hook is inert — it DECLARES the ladder, it does not switch a transport. Nothing here mounts a
// WebGL renderer or a progressive stream.
//
// PARKED behind the NATIONWIDE-RAW-FRN TRIGGER (§8): the `canvas-large` / `webgl` / `progressive`
// plumbing is the SOLE scenario that flips BOTH the tier AND the transport (a usf-integrity beat
// drawing raw FRNs — a client frame >~100K rows). Until that beat exists, `large`/`largeThreshold`/
// `progressive` on `VizRenderPolicy` stay ADVISORY flags a consumer MAY read; no plate wires them.
// Do NOT build an index tier for data that does not exist (KILLED: Arrow / Falcon / DuckDB-WASM at
// shipped sizes — §8).
//
// ORTHOGONAL to `markPolicyForCount` (scatter-dials.ts): that hook owns PERCEPTUAL DENSITY — whether
// a mark draws as a typeset glyph, a thinned glyph, or a dot in a cloud (a SYMBOL-geometry decision
// WITHIN one renderer). THIS hook owns the RENDERER TIER — svg vs canvas vs a parked large/webgl
// transport. The two never conflate: a 3243-mark scatter is `dot-cloud` (density) AND `"canvas"`
// (tier) independently. They read the same `n` and answer two different questions.

/** The renderer tier a figure's mark count implies. `svg` (crisp, low-count, DOM-hit-tested) ·
    `canvas` (the live default for any dense figure) · `canvas-large` + `webgl` are PARKED behind
    the nationwide-raw-FRN trigger — no live figure reaches them. */
export type RenderTier = "svg" | "canvas" | "canvas-large" | "webgl";

/** The tier boundaries (mark count). SVG stays crisp + DOM-hit-testable at low counts; canvas
    absorbs the dense mid-band (every live figure); the large/webgl bands are the parked
    nationwide-raw-FRN transport. Named so the ladder is inspectable, not a chain of literals. */
export const RENDER_TIER_SVG_CEIL = 1_000;
export const RENDER_TIER_CANVAS_CEIL = 10_000;
export const RENDER_TIER_CANVAS_LARGE_CEIL = 100_000;

/** The mark count above which the parked `large`/`progressive` transport WOULD engage (the
    nationwide-raw-FRN re-trigger, §8). Advisory only — no live plate wires it. */
export const RENDER_LARGE_THRESHOLD = RENDER_TIER_CANVAS_CEIL;

/** DECLARATIVE forward hook: the renderer tier a mark count implies. Returns `"canvas"` for the
    whole live corpus (densest 3243 marks); the `canvas-large`/`webgl` bands are forward-only. */
export function tierForMarkCount(n: number): RenderTier {
    if (n <= RENDER_TIER_SVG_CEIL) return "svg";
    if (n <= RENDER_TIER_CANVAS_CEIL) return "canvas";
    if (n <= RENDER_TIER_CANVAS_LARGE_CEIL) return "canvas-large";
    return "webgl";
}

/** A figure's renderer-tier policy — the DECLARATIVE forward record a plate MAY carry. `tier` is
    the resolved tier; `large`/`largeThreshold`/`progressive` are the PARKED nationwide-raw-FRN
    knobs (advisory until that beat exists — no live plate reads them). */
export interface VizRenderPolicy {
    /** the figure's mark count (the sole input the tier derives from). */
    markCount: number;
    /** the renderer tier `markCount` implies (`tierForMarkCount`). */
    tier: RenderTier;
    /** PARKED: whether the large-data transport WOULD engage (markCount > largeThreshold). */
    large?: boolean;
    /** PARKED: the mark count above which `large` engages (default `RENDER_LARGE_THRESHOLD`). */
    largeThreshold?: number;
    /** PARKED: whether progressive rendering WOULD stream this figure (nationwide-raw-FRN only). */
    progressive?: boolean;
}

/** Build the forward-only `VizRenderPolicy` for a mark count. The `large`/`progressive` flags are
    computed but ADVISORY — they flip only past the parked nationwide-raw-FRN threshold, which no
    live figure reaches; no consumer switches transport on them today. */
export function renderPolicyForCount(
    n: number,
    largeThreshold: number = RENDER_LARGE_THRESHOLD,
): VizRenderPolicy {
    const large = n > largeThreshold;
    return {
        markCount: n,
        tier: tierForMarkCount(n),
        large,
        largeThreshold,
        progressive: large,
    };
}
