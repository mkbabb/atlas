// platform/motion/variant-spec.ts — THE ONE DECLARATIVE VARIANT BAG (K-ANIM A3 · proto/A3-variation.md §2).
//
// Variety is a PURE RESOLVE of one small all-optional `VariantSpec`, not an imperative knob-twiddle. The
// bag rides the facet (the `RevealFacet.variant?`, a `MotionSegment.variant?`, the
// `UseCountUpOptions.variant?`) — inert-when-undeclared (byte-identical to
// today). It carries ONLY the CROSS-CUTTING axes; a facet owns its own idiosyncratic amplitudes (liftEm,
// blurPx, charset) as local constants. The type makes chaos un-representable: you cannot ask for an ugly
// curve (only a NAMED ease) or an unbounded wobble (intensity is clamped, the seed touches MICRO knobs only).

/** §3.1 — the ORIGIN/AXIS register (6 names). Resolves to a `StaggerOrigin` (cadence) + a transform
    axis+sign (slide). Subsumes the GSAP `from` AND the slide direction in ONE word. */
export type Direction = "ltr" | "rtl" | "up" | "down" | "center" | "edges";

/** §3.2 — the EASE register. The `tokens.css:951-995` bezier curves (`expo`/`engrave`/`overshoot`) + 3
    spring presets (`soft`/`crisp`/`bouncy`). NEVER a raw cubic-bezier (the SM-10 token law). */
export type EaseToken = "expo" | "engrave" | "overshoot" | "soft" | "crisp" | "bouncy";

/** §3.3 — the DURATION register — the glass-ui scale. NEVER a free ms (retunes `useCountUp`'s 1600). */
export type DurationToken = "instant" | "fast" | "base" | "slow";

/** §3.4 — the STAGGER pace register. `pace` sets the cadence density; `from` overrides the origin. */
export type StaggerPace = "tight" | "even" | "loose";

/** A stagger token — the cadence density + an optional origin override. */
export interface StaggerToken {
    pace: StaggerPace;
    from?: Direction;
}

/** §5.4 — the auto-vary host policy. `seed` (invisible-but-alive, the safe default axis) or `direction`
    (the loud zebra, named-only). `off` is the resting default (most surfaces want uniformity — KISS). */
export interface AutoVary {
    by: "index";
    /** Which axis the sequence varies. `seed` = per-index decorrelated micro-grain (default);
        `direction` = alternate ltr/rtl by parity (the deliberate loud move). */
    axis?: "seed" | "direction";
}

/** THE VARIANT BAG — all-optional, rides the facet. Inert-when-undeclared (byte-identical to today). */
export interface VariantSpec {
    /** A NAMED preset bundle per-animation ("soft"|"crisp"|"bold"|…) — resolves a `{direction,ease,
        intensity}` triple from the facet's small bundle table (§3.6). The quietest bundle is the default. */
    variant?: string;
    /** The origin/axis register (§3.1). */
    direction?: Direction;
    /** A NAMED curve from the register — NEVER a raw cubic-bezier (§3.2). */
    ease?: EaseToken;
    /** A NAMED slot from the glass-ui scale — NEVER a free ms (§3.3). */
    duration?: DurationToken;
    /** The stagger cadence (§3.4). */
    stagger?: StaggerToken;
    /** [0,1] amplitude scalar — the ONE continuous knob, clamped, scaling each facet's amplitude within
        its OWN max (§3.5). DEFAULT rank-keyed (lede 1 / support .7 / ancillary .4). */
    intensity?: number;
    /** Procedural micro-grain (deterministic; byte-identical reloads). `seed → mulberry32` on bounded
        MICRO sub-knobs ONLY (§3.5 / §4). Absent ⇒ zero grain (no jitter). */
    seed?: number;
    /** The host SEQUENCE policy — auto-vary a column of like marks by index (§5.4). Default off. */
    autoVary?: AutoVary;
}
