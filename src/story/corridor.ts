// platform/story/corridor.ts — THE CORRIDOR REGISTER LAW (compositor-only, D7-safe · N.md §4.B1).
//
// The corridor is FELT (breathing room + receded type), never SEEN (no runway rules, no band tint —
// a drawn corridor promotes chrome over data). Derived ENTIRELY from the already-declared
// `Chapter.transition` facet — zero new authored layout state (D7's zero-per-beat-props law holds).
// The PURE laws here (P2-B Ruling 2, values verbatim) are the single source the `--corridor-*` tokens
// mirror and the `StoryCorridor` overlay + the `n0-render-corridor` gate arm read.
//
// Plus the P193 TITLE-before-centre timing offset (G-N13 · N.md §4.B1): the title reveal COMPLETES
// before the count's cover-0.50 centre (the title leads the count). The count half is proven live
// (`reveal-register.ts` `countAt`); THIS module lands the un-demonstrated title half.

import { clamp } from "@mkbabb/value.js/math";
import { smoothStep3 } from "@mkbabb/value.js/easing";
import { COVER_CENTRE } from "./centreAxis.js";

// ── The corridor register values (P2-B Ruling 2, verbatim) ────────────────────────────────────────

/** The prose-recede FLOOR — the arriving masthead cluster damps to this opacity mid-flight (one rung
    below `--attn-chrome` 0.46). Receded type reads as margin-class structure while marks hold
    `--attn-data` 0.92. */
export const CORRIDOR_PROSE_FLOOR = 0.35;
/** The plateau tent RISE edge — the recede has fully engaged by scrub `t = 0.12`. */
export const CORRIDOR_RECEDE_IN = 0.12;
/** The plateau tent FALL edge — the recede releases from scrub `t = 0.88`. */
export const CORRIDOR_RECEDE_OUT = 0.88;
/** The settle translate cap (rem) — a `≤0.25rem` compositor-only nudge, PRM-stripped. */
export const CORRIDOR_TRANSLATE_REM = 0.25;
/** The occlusion floor tolerance — a clone over the masthead may exceed the floor by at most this
    (mirrors the gate's `CLUSTER_OPACITY_EPS`). */
export const CORRIDOR_OCCLUSION_EPS = 0.02;

// ── The recede law (pure in t — scrub-reversal byte-identical, no state machine) ──────────────────

/** A general smoothstep between two edges: 0 below `e0`, 1 above `e1`, the Hermite S-curve between —
    edges may be REVERSED (`e0 > e1`) to ramp DOWN (the FALL leg `smoothstep(1, 0.88, t)`). */
export function smoothstep(e0: number, e1: number, x: number): number {
    if (e0 === e1) return x < e0 ? 0 : 1;
    return smoothStep3(clamp((x - e0) / (e1 - e0), 0, 1));
}

/** THE PLATEAU TENT — `smoothstep(0, 0.12, t) · smoothstep(1, 0.88, t)`: 0 at the poles, a flat 1
    across the mid-flight plateau (0.12 ≤ t ≤ 0.88), pure in `t`. The recede engages for the WHOLE
    flight (P2-B honest-edge #1: stateless, conservative — never wrong, only occasionally
    conservative; do NOT add a per-edge crossing test, the D7 zero-props law forbids it). */
export function tent(t: number): number {
    return (
        smoothstep(0, CORRIDOR_RECEDE_IN, t) *
        smoothstep(1, CORRIDOR_RECEDE_OUT, t)
    );
}

/** THE PROSE-RECEDE opacity — `1 − (1 − floor)·tent(t)`: 1 at the poles, `floor` across the plateau.
    ONE opacity write on the arriving masthead cluster (compositor-only). */
export function recedeOpacity(t: number, floor = CORRIDOR_PROSE_FLOOR): number {
    return 1 - (1 - floor) * tent(t);
}

/** The `≤0.25rem` settle translate (rem) — `tent(t)·0.25`, the compositor-only nudge. */
export function recedeTranslateRem(t: number): number {
    return tent(t) * CORRIDOR_TRANSLATE_REM;
}

/** The compositor-only recede STYLE for the masthead cluster — opacity + a `≤0.25rem` translateY,
    NO layout write at any `t`. PRM ⇒ `{}` (the recede never engages, prose never dims). Scrub-reversal
    is byte-identical (the law is pure in `t`, no state machine). */
export function recedeStyle(
    t: number,
    { floor = CORRIDOR_PROSE_FLOOR, prm = false }: { floor?: number; prm?: boolean } = {},
): Record<string, string> {
    if (prm) return {};
    return {
        opacity: recedeOpacity(t, floor).toFixed(4),
        transform: `translateY(${recedeTranslateRem(t).toFixed(4)}rem)`,
        willChange: "opacity",
    };
}

// ── The G-N1 occlusion arm (the two sub-arms, pure predicates) ────────────────────────────────────

/** A corridor occlusion sample — the SAME shape the `n0-render-corridor` gate reads off a live
    clone/masthead intersection. */
export interface CorridorSample {
    /** the clone's minimum on-screen x (px). */
    cloneMinX: number;
    /** the resolved `--cp-dock-reserve` gutter (px) — no clone ink may sit left of it. */
    dockReserve: number;
    /** true iff the clone's rect intersects the masthead band. */
    overlapsMasthead: boolean;
    /** the cluster's applied opacity while over the masthead. */
    clusterOpacity: number;
    /** the occlusion floor the cluster damps to under the masthead. */
    occlusionFloor: number;
}

/** Build the occlusion sample the corridor guarantees at a sampled `t`: the cluster opacity is the
    recede law's value, the gutter floor is the dock reserve (arm b: the overlay is seated IN the
    content stage, so `cloneMinX ≥ dockReserve` by construction). */
export function corridorSampleAt(
    t: number,
    { cloneMinX, dockReserve, overlapsMasthead }: {
        cloneMinX: number;
        dockReserve: number;
        overlapsMasthead: boolean;
    },
    floor = CORRIDOR_PROSE_FLOOR,
): CorridorSample {
    return {
        cloneMinX,
        dockReserve,
        overlapsMasthead,
        clusterOpacity: recedeOpacity(t, floor),
        occlusionFloor: floor,
    };
}

// ── The P193 title-before-centre offset (G-N13 title arm) ─────────────────────────────────────────

/** The cover progress the TITLE reveal COMPLETES at — STRICTLY BEFORE the count's 0.50 centre (the
    title leads the count · P193). The title has read its terminal by the time the figure is a third
    of the way to centre, so it settles ahead of the dial. `< COVER_CENTRE` by construction. */
export const TITLE_COMPLETE_AT = 0.32;

/** THE TITLE reveal progress off the cover scalar — AFFINE in cover so it COMPLETES at
    `TITLE_COMPLETE_AT` (0.32), i.e. BEFORE cover 0.50. The count dial (`countAt`, reveal-register)
    completes AT 0.50; the title leads it. This is the un-demonstrated half of P193, landed.

    WHY LINEAR, not `easeOutExpo` (the N-batch3 consult tune, measured live): the lettering
    cascade ALREADY carries its easing — `useScrollLettering`'s cap'd sliding band distributes
    the glyphs across this span and springs each glyph individually. An exponential OUTER remap
    double-eases: measured on the live /usf title, 31/45 glyphs had inked by cover 0.04 and all
    45 by 0.12 — the write-on collapsed into the entry edge, never seen. The affine remap spreads
    the band evenly across cover 0→0.32 (the cascade visibly writes as the beat rises); the
    COUNT keeps its expo (a dial decelerating onto its terminal digits IS the count-up feel). */
export function titleRevealProgress(
    scroll: number,
    { completeAt = TITLE_COMPLETE_AT }: { completeAt?: number } = {},
): number {
    return clamp(scroll / completeAt, 0, 1);
}

/** The P193 reveal-timing sample the `n0-timing-offsets` gate reads — the title completes at
    `TITLE_COMPLETE_AT` (before centre), the count at `COVER_CENTRE` (the proven `countAt` law). */
export function storyRevealTiming(): { titleAt: number; countAt: number } {
    return { titleAt: TITLE_COMPLETE_AT, countAt: COVER_CENTRE };
}

// ── The corridor route coverage (the sweep binds the arm on EVERY essay route) ────────────────────

/** The routes the corridor arm binds — the render sweep covers ALL of them, not only the three
    `render-matrix` MOTION cells {usf,sci,ecf} (mirrors the gate's `CORRIDOR_ROUTES`). The corridor
    band + recede are DERIVED from `Chapter.transition`, so every essay route inherits the arm. */
export const CORRIDOR_ROUTES = [
    "usf",
    "sci",
    "ecf",
    "speedtest",
    "demand",
] as const;
