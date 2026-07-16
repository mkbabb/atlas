// platform/motion/variant-bounds.ts — THE AMPLITUDE FENCE + THE RANK AMPLITUDE HOME + THE FACET
// REGISTER SHAPE (K-ANIM A3 · proto/A3-variation.md §3.5-3.6).
//
// `intensity ∈ [0,1]` scales each facet's amplitude within its OWN per-facet max (the per-facet maxima
// are the taste boundary, NOT a global scale). The seeded MICRO knobs are bounded + span-proportional
// (the rough.js/handmark `offset ∝ span` law) — the seed NEVER touches macro structure. ONE module
// carries `MICRO_BOUNDS`, `RANK_INTENSITY`/`Rank`, AND the `FacetRegister`/`VariantBundle` shapes + the
// `TITLE_LETTERING_REGISTER` data (the phantom `variant-bounds-bundles.ts` is RETIRED, H8).

import type { Direction, EaseToken, DurationToken, StaggerPace } from "./variant-spec.js";

/** The seeded MICRO sub-knob bounds (the tasteful reach). Each is a SMALL bounded delta the seed draws
    via `vary()`. The STRUCTURE (small, bounded, span-proportional) is the law; the magnitudes retune. */
export const MICRO_BOUNDS = {
    /** ± fraction of one stagger step the per-index reveal start jitters (±6% — alive, not sloppy). */
    delayFrac: 0.06,
    /** ± fraction of the facet's amplitude the per-index arrival jitters (±0.12). */
    ampFrac: 0.12,
    /** The phase the micro-grain reads from (full turn; the harmonic seed). */
    phase: Math.PI * 2,
} as const;

/** §5.3 — the RANK-keyed `intensity` default (the A5 seam): the lede animates MORE. Mirrors the
    `--attn-*` one-authority rung vocabulary. CONSUMES the K-C `rank` enum when landed; the minimal shape
    is declared here as the AMPLITUDE home (the ONE drift-free copy — A5's RANK_BAND owns ORDER+DURATION). */
export type Rank = "lede" | "support" | "ancillary";
export const RANK_INTENSITY: Record<Rank, number> = {
    lede: 1,
    support: 0.7,
    ancillary: 0.4,
};

/** A named bundle — a tasteful `{direction,ease,intensity,…}` triple (the Framer named state). */
export interface VariantBundle {
    direction?: Direction;
    ease?: EaseToken;
    duration?: DurationToken;
    stagger?: StaggerPace;
    intensity?: number;
    /** Some bundles turn seeded grain ON (e.g. "bold"); a fixed seed keeps it parity-stable. */
    seed?: number;
}

/** A facet's register — its defaults + its bundle table. The facet OWNS its idiosyncratic amplitudes
    (liftEm, blurPx, charset) as LOCAL constants; `intensity ∈ [0,1]` is the ONE cross-cutting scalar, and
    the facet scales its own resting amplitude by `intensity / defaults.intensity` so that at the register
    default it renders BYTE-EXACT to today (no 0.49≈0.5 drift). */
export interface FacetRegister {
    defaults: Required<
        Pick<VariantBundle, "direction" | "ease" | "duration" | "stagger" | "intensity">
    >;
    /** The named bundle table (a tasteful FEW — `runVarietyBundleCoverage` WARN-lints a facet that
        declares > 6). The quiet voice is the implicit default via `defaults` when `variant` is unset. */
    bundles: Record<string, VariantBundle>;
}

/** The title-lettering facet register (generalizes `useScrollLettering`'s hardcoded params). The
    `defaults.intensity 0.7` is the no-variant baseline: the facet's resting liftEm 0.5 / blurPx 6
    (today's EXACT hardcoded values) render unchanged at intensity 0.7, scaling up to ~0.71 / ~8.6 at the
    lede (intensity 1), down to ~0.29 / ~3.4 at the ancillary (intensity 0.4). */
export const TITLE_LETTERING_REGISTER: FacetRegister = {
    defaults: { direction: "up", ease: "soft", duration: "slow", stagger: "even", intensity: 0.7 },
    bundles: {
        crisp: { direction: "ltr", ease: "engrave", intensity: 1 },
        bold: { direction: "edges", ease: "overshoot", intensity: 1, seed: 7 },
    },
};
