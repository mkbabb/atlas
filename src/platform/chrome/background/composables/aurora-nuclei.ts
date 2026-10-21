// platform/chrome/background/composables/aurora-nuclei.ts — the NUCLEUS GEOMETRY extracted from
// useAuroraConfig (O-B8a altitude-split). The pure half of the aurora brain: the 2+2+1
// rule-of-thirds nucleus specs and the at-rest resolver (U/B7 · PLAN §5.6: no Tide, no lean).

import type { AuroraNucleus } from "@mkbabb/glass-ui/aurora";
import type { DepositionProfile } from "../../../../contract/index.js";

// ── THE NUCLEUS GEOMETRY — each nucleus's rest position and value (fd-atmosphere-suffusion §3) ──

interface NucleusSpec {
    x: number;
    yRest: number;
    radius: number;
    paletteBias: number;
    valueRest: number;
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
        // warm nuclei — seated low
        {
            x: 0.28, yRest: 0.65, radius: 0.5, paletteBias: warmBias,
            valueRest: 0.04, driftRadius: 0.045, driftPhase: 0.0,
            elongation: warmElong, angle: warmAngle,
        },
        {
            x: 0.18, yRest: 0.78, radius: 0.42, paletteBias: warmBias,
            valueRest: 0.02, driftRadius: 0.04, driftPhase: 1.1,
            elongation: warmElong, angle: warmAngle,
        },
        // cool nuclei — seated high
        {
            x: 0.74, yRest: 0.4, radius: 0.5, paletteBias: coolBias,
            valueRest: -0.04, driftRadius: 0.045, driftPhase: 2.4,
            elongation: 1.0, angle: 0,
        },
        {
            x: 0.86, yRest: 0.3, radius: 0.42, paletteBias: coolBias,
            valueRest: -0.02, driftRadius: 0.04, driftPhase: 3.6,
            elongation: 1.0, angle: 0,
        },
        // the hinge nucleus — the dark-neutral centre, static (no Tide travel)
        {
            x: 0.5, yRest: 0.55, radius: 0.6, paletteBias: 0.5,
            valueRest: 0.0, driftRadius: 0.02, driftPhase: 5.0,
            elongation: 1.0, angle: 0,
        },
    ];
}

/** Resolve one nucleus spec AT REST (U/B7 · PLAN §5.6): the rest position and value, the spec's
    own palette bias. The field reads no scroll and no selection, so nothing here moves. */
export function nucleusAt(s: NucleusSpec): AuroraNucleus {
    return {
        x: s.x,
        y: s.yRest,
        radius: s.radius,
        paletteBias: s.paletteBias,
        valueBias: s.valueRest,
        driftRadius: s.driftRadius,
        driftPhase: s.driftPhase,
        // The per-route deposition signature (f6-atmosphere §2.4): the warm currents carry the
        // route's aspect (USF horizontal currents; SCI/ECF isotropic). Defaults (1.0/0°) reduce to
        // the isotropic Gaussian, so an unset profile renders identically.
        elongation: s.elongation,
        angle: s.angle,
    };
}
