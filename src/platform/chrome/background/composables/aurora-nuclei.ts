// platform/chrome/background/composables/aurora-nuclei.ts — the Tide/drift NUCLEUS GEOMETRY
// extracted from useAuroraConfig (O-B8a altitude-split; byte-faithful). The pure, side-effect-free
// half of the aurora brain: the 2+2+1 rule-of-thirds nucleus specs, the f(p) Tide + M11 section-drift
// resolver, and the drift/selection lean constants. useAuroraConfig owns the reactive wiring; this
// module owns the geometry it maps over.

import { lerp } from "@mkbabb/value.js";
import type { AuroraNucleus } from "@mkbabb/glass-ui/aurora";
import type { DepositionProfile } from "../../../../contract/index.js";

/** Clamp a scalar into [0,1] — a valid `paletteBias` / fraction (local, no import churn). */
function clamp01(t: number): number {
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

// ── THE TIDE GEOMETRY — the nucleus rest/lifted y endpoints (fd-atmosphere-suffusion §3) ──
// Warm nuclei seat LOW at rest and RISE toward the top as p→1; cool nuclei seat HIGH at
// rest and SINK toward the bottom. The lerp(rest, lifted, p) is the f(p) coupling point —
// reversing exactly on scroll-up because p is a position, not a one-shot toggle.

interface NucleusSpec {
    x: number;
    yRest: number;
    yLift: number;
    radius: number;
    paletteBias: number;
    valueRest: number;
    valueLift: number;
    driftRadius: number;
    driftPhase: number;
    /** The per-nucleus Gaussian aspect (1 = isotropic). The per-route deposition signature
        (f6-atmosphere §2.4) stretches the WARM pair into horizontal currents on USF; the cool/hinge
        stay isotropic so only the directional read is shaped. */
    elongation: number;
    /** The major-axis orientation (deg, CSS-top-origin). USF 0° = horizontal currents. */
    angle: number;
}

/** The 2 warm + 2 cool + 1 hinge rule-of-thirds nuclei (S3 §4.2). The warm pair pulls
    toward palette stop 1 (paletteBias→~0.25) and the Tide LIFTS their y + brightens;
    the cool pair pulls toward stop 3 (~0.75) and the Tide SINKS their y + deepens; the
    hinge nucleus is the static dark-neutral centre. The route's `deposition` shapes the WARM
    pair's aspect (the directional "flair" — USF two horizontal currents, SCI/ECF isotropic). */
export function nucleiSpecs(biasCap: number, deposition: DepositionProfile): NucleusSpec[] {
    // The pole bias is scaled by the surface's bias-cap: 0.30 leans (USF/SCI), 0.0 is
    // neutral (ECF — both pairs read the bg-leaning centre, no directional lean).
    const warmBias = 0.5 - biasCap * 0.5 * (5 / 6); // ~0.25 at cap .30, 0.5 at cap 0
    const coolBias = 0.5 + biasCap * 0.5 * (5 / 6); // ~0.75 at cap .30, 0.5 at cap 0
    // The warm pair carries the route's directional signature (USF horizontal currents; SCI/ECF
    // near-isotropic). The cool pair + the hinge stay isotropic — the field's DIRECTION is the warm
    // currents' read, kept subtle and recessive behind the data.
    const warmElong = deposition.elongation;
    const warmAngle = deposition.angle;
    return [
        // warm nuclei — RISE (yRest 0.65 → yLift 0.25) + brighten (valueBias +)
        {
            x: 0.28, yRest: 0.65, yLift: 0.25, radius: 0.5, paletteBias: warmBias,
            valueRest: 0.04, valueLift: 0.14, driftRadius: 0.045, driftPhase: 0.0,
            elongation: warmElong, angle: warmAngle,
        },
        {
            x: 0.18, yRest: 0.78, yLift: 0.34, radius: 0.42, paletteBias: warmBias,
            valueRest: 0.02, valueLift: 0.1, driftRadius: 0.04, driftPhase: 1.1,
            elongation: warmElong, angle: warmAngle,
        },
        // cool nuclei — SINK (yRest 0.40 → yLift 0.80) + deepen (valueBias −)
        {
            x: 0.74, yRest: 0.4, yLift: 0.8, radius: 0.5, paletteBias: coolBias,
            valueRest: -0.04, valueLift: -0.14, driftRadius: 0.045, driftPhase: 2.4,
            elongation: 1.0, angle: 0,
        },
        {
            x: 0.86, yRest: 0.3, yLift: 0.72, radius: 0.42, paletteBias: coolBias,
            valueRest: -0.02, valueLift: -0.1, driftRadius: 0.04, driftPhase: 3.6,
            elongation: 1.0, angle: 0,
        },
        // the hinge nucleus — the dark-neutral centre, static (no Tide travel)
        {
            x: 0.5, yRest: 0.55, yLift: 0.55, radius: 0.6, paletteBias: 0.5,
            valueRest: 0.0, valueLift: 0.0, driftRadius: 0.02, driftPhase: 5.0,
            elongation: 1.0, angle: 0,
        },
    ];
}

/** THE SECTION-AWARE POLE DRIFT (D2.d / ds2-motion-field M11). Beyond the Tide (the nuclei
    rising/sinking off `p`), the aurora's POLE EMPHASIS follows the argument down the page:
    early (`p`→0, the "money IN" section) the WARM payer pole leads; late (`p`→1, the "money
    OUT" section) the COOL receiver pole leads. We do NOT add a second scroll listener — this
    reads the SAME `useDocumentScrollProgress` scalar the Tide already rides (the D1 single-
    writer law; this composable is a READER). The drift is a SLOW, bounded re-weighting of each
    nucleus's `paletteBias` toward/away from its pole, scaled by the surface `biasCap` so ECF
    (cap 0.0, magnitude has no direction) gets ZERO drift — the field stays neutral, never
    inventing a lean the data isn't encoding. The emphasis is centred at p=0.5 (the document
    middle is the balanced hinge) and swings ±`SECTION_DRIFT` over the page; deft — the
    `opacityCeiling` keeps the whole field recessive, so the drift is felt, never garish. */
const SECTION_DRIFT = 0.16; // the max paletteBias swing per pole over the document (deft)

/** THE SELECTION LEAN (D7.c M12 / ds2-motion-field M12) — the field answers the SELECTION, not
    only the scroll. When a datum is pinned (the D1 `useSelection` set is non-empty), the page glow
    DEEPENS toward the data (cool) pole — page-glow IS data-glow, concluded: the glow commits to the
    half of the diverging field the reader has chosen to interrogate. The lean is a bounded ADD to
    the document emphasis (it composes with M11's section drift), scaled by the surface `biasCap` so
    ECF (cap 0.0 — magnitude has no direction) gets ZERO selection lean, and clamped so a selection
    NUDGES the glow, never floods it (the `opacityCeiling` keeps the whole field recessive). This is
    a pure READER of the `useSelection` set (the D1 single store channel) — never a second writer,
    never a new scroll listener. The lean is presence-keyed (any pin commits the field toward the
    data pole); it returns to the section default on deselect. */
export const SELECTION_LEAN = 0.5; // the emphasis swing a live selection adds (pre-biasCap), deft

/** Resolve one nucleus spec at scroll scalar `p` — the f(p) Tide (`y` + `valueBias` lerp on
    `p`, so warm rises+brightens and cool sinks+deepens as p→1 and reverses on scroll-up) AND
    the M11 section-aware pole drift: the nucleus's `paletteBias` leans toward its pole as the
    page argues toward that pole's section. `lean` ∈ [-1,1] is the document emphasis (−1 = full
    warm lead at top, +1 = full cool lead at bottom), `biasCap` gates the swing (0 → no drift,
    the ECF neutral). Warm nuclei (paletteBias < 0.5) deepen toward their pole as `lean`→−1;
    cool nuclei (paletteBias > 0.5) deepen toward theirs as `lean`→+1. */
export function nucleusAt(s: NucleusSpec, p: number, lean: number, biasCap: number): AuroraNucleus {
    // The page-level lean shifts every nucleus through the palette in the same direction: negative
    // deepens the warm half, positive deepens the cool half. A per-nucleus direction multiplier
    // would cross the warm pair into the cool half at page top. Bias-cap 0 keeps neutral fields still.
    const driftedBias = clamp01(
        s.paletteBias + lean * SECTION_DRIFT * (biasCap / 0.3),
    );
    return {
        x: s.x,
        y: lerp(s.yRest, s.yLift, p),
        radius: s.radius,
        paletteBias: driftedBias,
        valueBias: lerp(s.valueRest, s.valueLift, p),
        driftRadius: s.driftRadius,
        driftPhase: s.driftPhase,
        // The per-route deposition signature (f6-atmosphere §2.4): the warm currents carry the
        // route's aspect (USF horizontal currents; SCI/ECF isotropic). Defaults (1.0/0°) reduce to
        // the isotropic Gaussian, so an unset profile renders identically.
        elongation: s.elongation,
        angle: s.angle,
    };
}
