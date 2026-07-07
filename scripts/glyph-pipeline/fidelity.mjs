// scripts/glyph-pipeline/fidelity.mjs — STAGE 8: the FIDELITY metric (the user's 2026-06-17
// mandate — "the icon EXACTLY RESEMBLES its polygon" as a NUMBER, not a hope).
//
// THE LAW (I-GLYPH §4, Hard Gate 2 — the 2026-06-17 fidelity FIX): every committed `fine`-tier
// glyph is measured AS THE READER SEES IT. The honest object is the COMMITTED path (post-fit,
// post-2-decimal-quantize) — NOT the pre-fit smoothed geometry. The old gate measured the un-fit
// shape, so the fit's registration offset (a dropped bbox-extreme vertex re-centering the glyph)
// was invisible: the gate read ~5.4% while the committed artifact deviated ~2× worse. We now
// parse the committed `d`, fit the SOURCE feature into the SAME [0,100] frame, and measure there:
//
//   (a) symmetric-difference ratio — |committed △ source| / |source| ≤ ε, BOTH honestly fit to
//       [0,100] (the committed path is already in that frame; the source is fit by its own bbox +
//       aspect). Even-odd PIP, N≥512 raster. This is the HONEST "exactly resembles" number.
//   (b) aspect-fidelity — |glyphAspect − sourceAspect| / sourceAspect ≤ aspectTol (the fit held
//       the proportion, NO square-warp). Measured by the bake against the recorded fit.aspect.
//   (c) the NEG-CONTROLS — a square-warp, an over-smoothed Laplacian deflation, and an
//       over-simplified blob each TRIP the ε (the gate is born able to catch a distortion).

import { symmetricDifference, aspectOf } from "./geom.mjs";

// The raster resolution for the committed-vs-source symmetric-difference. N≥512 (the mandate):
// the [0,100] frame's 100-unit span sampled at 512 cells resolves ~0.2-unit features, fine
// enough that the gate number is faithful to the committed silhouette, not the raster.
export const FIDELITY_N = 512;

/**
 * Measure one COMMITTED glyph against its source — BOTH already fit into the SAME [0,100] frame.
 * `committedFitGeom` is `parsePath(fit.d)` (the post-quantize artifact, in [0,box]); `sourceFitGeom`
 * is the source feature fit into the same box by the same source bbox/aspect. The symmetric
 * difference is therefore the HONEST registration+shape error the reader perceives.
 * Returns { ratio, symDiff, sourceArea, glyphArea, glyphAspect, sourceAspect, aspectDelta }.
 */
export function measureFidelity(committedFitGeom, sourceFitGeom, n = FIDELITY_N) {
    const sd = symmetricDifference(committedFitGeom, sourceFitGeom, n);
    const glyphAspect = aspectOf(committedFitGeom);
    const sourceAspect = aspectOf(sourceFitGeom);
    const aspectDelta =
        sourceAspect > 0 && Number.isFinite(sourceAspect)
            ? Math.abs(glyphAspect - sourceAspect) / sourceAspect
            : 0;
    return {
        ratio: sd.ratio,
        symDiff: sd.symDiff,
        sourceArea: sd.sourceArea,
        glyphArea: sd.glyphArea,
        glyphAspect,
        sourceAspect,
        aspectDelta,
    };
}

/**
 * Run the fidelity gate over a tier: assert every feature's ratio ≤ ε and aspectDelta ≤
 * aspectTol. Returns { pass, worst: {key, ratio}, worstAspect: {key, aspectDelta}, perFeature }.
 * The bake REPORTS the worst feature + value (the user wants the number, not a boolean alone).
 */
export function fidelityGate(measures, { epsilon, aspectTol }) {
    let worst = { key: null, ratio: -Infinity };
    let worstAspect = { key: null, aspectDelta: -Infinity };
    const failures = [];
    for (const m of measures) {
        if (m.ratio > worst.ratio) worst = { key: m.key, ratio: m.ratio };
        if (m.aspectDelta > worstAspect.aspectDelta)
            worstAspect = { key: m.key, aspectDelta: m.aspectDelta };
        if (m.ratio > epsilon)
            failures.push({ key: m.key, kind: "symDiff", value: m.ratio });
        if (m.aspectDelta > aspectTol)
            failures.push({ key: m.key, kind: "aspect", value: m.aspectDelta });
    }
    return {
        pass: failures.length === 0,
        worst,
        worstAspect,
        failures,
        count: measures.length,
    };
}
