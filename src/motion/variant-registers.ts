// platform/motion/variant-registers.ts — THE CLOSED REGISTERS (K-ANIM A3 · proto/A3-variation.md §3.1-3.4).
//
// The 5 register tables. Each axis is a SMALL named vocabulary → a resolved {css, fn} (or {cssVar, ms})
// pair so the T1 (CSS view()-timeline) and T2 (keyframes.js / .at(p) sampler) tiers read the SAME curve
// from ONE source. Mints NO new curve authority — it CONSUMES tokens.css:951-995 + keyframes.js springs +
// value.js `easeOutExpo` (the root-repo law: consume glass-ui's curve, never re-type its coefficients).

import { CubicBezier, easeOutExpo, type EasingFunction } from "@mkbabb/value.js/easing";
import {
    springTimingFunction,
    springLinearStops,
    type StaggerOrigin,
} from "@mkbabb/keyframes.js";
import type { Direction, EaseToken, DurationToken, StaggerPace } from "./variant-spec.js";

// ── §3.1 DIRECTION — origin (cadence) + axis/sign (slide) ───────────────────────────────────────

export interface ResolvedDirection {
    /** The keyframes.js cadence origin (the stagger distribution shape). */
    origin: StaggerOrigin;
    /** The slide transform axis. */
    axis: "x" | "y";
    /** The slide arrival sign: the mark enters FROM `sign·d`, settling to 0. `0` = NO directional slide
        (the cadence-origin IS the variety — a `center`/`edges` bloom is an origin, not a slide vector). */
    sign: 1 | -1 | 0;
}

/** The 6-name register → {origin, axis, sign}. The four VECTOR names (`ltr`/`rtl`/`up`/`down`) carry a
    real slide; the two ORIGIN names (`center`/`edges`) resolve to `sign:0` (bloom from the origin,
    fade-only, no slide) — the union stays ONE register but a `center`-as-a-slide-vector is no longer
    representable nonsense (a KISS fence, not a new axis). */
export const DIRECTION: Record<Direction, ResolvedDirection> = {
    ltr: { origin: "first", axis: "x", sign: -1 },
    rtl: { origin: "last", axis: "x", sign: 1 },
    up: { origin: "first", axis: "y", sign: 1 },
    down: { origin: "first", axis: "y", sign: -1 },
    center: { origin: "center", axis: "y", sign: 0 }, // bloom from middle, NO slide
    edges: { origin: "edges", axis: "y", sign: 0 }, // close inward, NO slide
};

// ── §3.2 EASE — the bezier tokens + the spring presets, ONE source, two tiers ───────────────────

export interface ResolvedEase {
    /** The CSS `animation-timing-function` value: `var(--ease-*)` for the bezier tokens, a sampled
        `linear(...)` string for the springs. The T1 tier reads this. */
    css: string;
    /** The JS sampler (the T2 `.at(p)` tier) — the SAME curve as `css`. */
    fn: EasingFunction;
}

// The verified tokens.css:951-995 state: `--ease-engrave: cubic-bezier(0.22,1,0.36,1)` (atlas-OWNED) and
// `--ease-overshoot: cubic-bezier(0.34,1.56,0.64,1)` (atlas-OWNED); `--ease-expo: var(--ease-out-expo)`
// (NO literal — ALIASED to glass-ui's own curve). So `expo` has no atlas-minted coefficient to mirror;
// the JS tier CONSUMES value.js `easeOutExpo` directly (ONE authority, zero atlas copy). The two OWNED
// literals are mirrored via CubicBezier; the k-variety-parity gate reconciles them against the LIVE
// tokens.css value (NOT a third hardcoded copy), so a tokens.css edit that drifts the curve RED-flags.
const BEZIER = {
    engrave: [0.22, 1, 0.36, 1], // ≡ --ease-engrave (ease-out-quint) — atlas-OWNED literal
    overshoot: [0.34, 1.56, 0.64, 1], // ≡ --ease-overshoot (ease-out-back) — atlas-OWNED literal
} as const;

// The 3 spring presets. `soft` ≡ the lettering default (response .42, ζ .62).
const SPRING = {
    soft: { response: 0.42, dampingFraction: 0.62 },
    crisp: { response: 0.3, dampingFraction: 0.85 },
    bouncy: { response: 0.5, dampingFraction: 0.42 },
} as const;

/** Unwrap a static, known-valid cubic-bezier. value.js 4's `CubicBezier` is failure-explicit
    (`Result<EasingFunction, EasingIssue>`); an OWNED literal that fails is an authoring error, so we
    throw at module load rather than mask it. */
const cubicBezier = (c: readonly [number, number, number, number]): EasingFunction => {
    const r = CubicBezier(...c);
    if (!r.ok) throw new Error(`variant-registers: invalid cubic-bezier ${c.join(",")}`);
    return r.value;
};

export const EASE: Record<EaseToken, ResolvedEase> = {
    // expo: CONSUME glass-ui's curve both tiers — `var(--ease-expo)` for CSS, value.js `easeOutExpo` for
    // the sampler. NO atlas-minted coefficient.
    expo: { css: "var(--ease-expo)", fn: easeOutExpo },
    engrave: { css: "var(--ease-engrave)", fn: cubicBezier(BEZIER.engrave) },
    overshoot: { css: "var(--ease-overshoot)", fn: cubicBezier(BEZIER.overshoot) },
    soft: { css: springLinearStops(SPRING.soft), fn: springTimingFunction(SPRING.soft).fn },
    crisp: { css: springLinearStops(SPRING.crisp), fn: springTimingFunction(SPRING.crisp).fn },
    bouncy: { css: springLinearStops(SPRING.bouncy), fn: springTimingFunction(SPRING.bouncy).fn },
};

// ── §3.3 DURATION — the glass-ui scale (name → {cssVar, ms}) ────────────────────────────────────

export interface ResolvedDuration {
    /** The CSS var (the T1 tier transition-duration). */
    cssVar: string;
    /** The canonical ms (the T2 keyframes.js wall-clock tier; ONLY the on:load/select/hover triggers read
        it — a scroll-scrubbed reveal IS the clock, duration-free). */
    ms: number;
}

// `base` maps to glass-ui's `--duration-normal`. The ms numbers MIRROR the glass-ui scale (the
// atlas-canonical mirror for the wall-clock tier). A register CONSTANT, not a free knob.
export const DURATION: Record<DurationToken, ResolvedDuration> = {
    instant: { cssVar: "var(--duration-instant)", ms: 120 },
    fast: { cssVar: "var(--duration-fast)", ms: 200 },
    base: { cssVar: "var(--duration-normal)", ms: 300 },
    slow: { cssVar: "var(--duration-slow)", ms: 500 },
};

// ── §3.4 STAGGER — pace → {eachMs, bandFrac} ────────────────────────────────────────────────────

export interface ResolvedStagger {
    /** The per-index delay (the keyframes.js `stagger({each})` register — the wall-clock tier). */
    eachMs: number;
    /** The simultaneity BAND fraction for the scrubbed cascade (the useScrollLettering band width: the
        fraction of the line revealing at once). A `tight` cadence packs items → a WIDE band; a `loose`
        cadence separates them → a NARROW band. */
    bandFrac: number;
}

export const STAGGER: Record<StaggerPace, ResolvedStagger> = {
    tight: { eachMs: 40, bandFrac: 0.85 },
    even: { eachMs: 80, bandFrac: 0.5 },
    loose: { eachMs: 140, bandFrac: 0.28 },
};
