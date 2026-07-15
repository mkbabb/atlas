// platform/story/centreAxis.ts — storyT, THE CENTRE-SEQUENCE LAW (the keystone · N.md §4.B1).
//
// `centreAxis` is the pure, unit-testable law that unifies the whole story clock: the viewport
// centre's PIECEWISE-LINEAR position through the ordered stage centres, ∈ [0, N−1]. Beat i settles
// exactly when its stage centre sits at the viewport centre — the SAME law as `activeViz`
// centre-argmin and the `REVEAL_BANDS` cover-0.50 terminal, promoted to the story grain. ONE function
// subsumes the FOUR uses (NP1 spec delta):
//   · beat activation      — `round(storyT)` (the centre-argmin winner)
//   · edge scrub           — `frac(storyT)` (the corridor scrub 0..1)
//   · scene transitionT    — the same law over a scene's STEP blocks (`sceneTransitionT`)
//   · cover-0.50 terminal  — a beat settled at `storyT = i` ≡ its cover host at 0.50 (viewport centre)
//
// FENCE (NP1): `centreAxis` assumes VERTICALLY ORDERED anchors — side-by-side / non-monotone act
// layouts are out of scope (the wave-1 routes are vertical scroll essays).

/** The cover-progress a beat settles at — 0.50 ≡ the host's geometric-centre crossing (viewport
    centre). storyT = i ⇔ beat i's cover host reads 0.50 (the reveal cover-0.50 terminal). */
export const COVER_CENTRE = 0.5;

/**
 * THE CENTRE-SEQUENCE PARAMETERIZATION. Given the ordered document-space centres of the story's
 * stages and the viewport centre's document position, return the continuous story position:
 * piecewise-linear through the centre sequence, clamped to [0, N−1]. Pure — the one-clock keystone.
 */
export function centreAxis(
    centres: readonly number[],
    viewportCentre: number,
): number {
    const n = centres.length;
    if (n === 0) return 0;
    if (n === 1 || viewportCentre <= centres[0]!) return 0;
    const last = centres[n - 1]!;
    if (viewportCentre >= last) return n - 1;
    let i = 0;
    while (i < n - 1 && centres[i + 1]! < viewportCentre) i++;
    const a = centres[i]!;
    const b = centres[i + 1]!;
    const seg = b - a;
    return seg > 0 ? i + (viewportCentre - a) / seg : i;
}

/** Beat activation — the settled beat index `round(storyT)` (the centre-argmin winner). */
export function activeIndexAt(storyT: number): number {
    return Math.round(storyT);
}

/** The edge scrub across the corridor into `round(storyT)+…` — the fractional part `frac(storyT)`,
    ∈ [0,1) (0 ⇒ settled on a beat; →1 ⇒ arriving at the next). The corridor scrub reads THIS. */
export function edgeFracAt(storyT: number): number {
    return storyT - Math.floor(storyT);
}

/**
 * The SCENE transitionT law (Open Q5 · ~the same function over STEP blocks). Continuous 0..1 scrub
 * between the active scene step and the next, derived from the SAME step-centre geometry the
 * IntersectionObserver band discretizes. `prm` pins it to 0 (information parity — the discrete
 * `apply()` boundary is unchanged; the scrub is the enhancement, never the information). ~20 lines.
 */
export function sceneTransitionT(
    stepCentres: readonly number[],
    viewportCentre: number,
    prm = false,
): number {
    if (prm) return 0;
    return edgeFracAt(centreAxis(stepCentres, viewportCentre));
}

/** The story-grain continuous position `(activeIndex + transitionT) / (N−1)`. N≤1 ⇒ 0. */
export function sceneScrubT(
    activeIndex: number,
    transitionT: number,
    stepCount: number,
): number {
    if (stepCount <= 1) return 0;
    return (activeIndex + transitionT) / (stepCount - 1);
}
