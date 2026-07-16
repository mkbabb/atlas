// story/beat-template.ts — THE VARIATION-AXES ORCHESTRATOR (O-A15 · template-as-data algebra).
//
// "Cohesive but never uniform" GUARANTEED BY CONSTRUCTION: title L/C/R, reveal direction, rule variant,
// numbers pole vary within CLOSED registers by a phase cadence + a route seed — and ONE template
// declaration drives placement + reveal + rule + numbers + figure ladder + viz type, the beat read from
// ONE resolved facet, not three modules (`useBeatLayout` / `AnimatedRule` / `resolveVariant`).
//
// THE ORCHESTRATION LAW (story-sota §4.1): `resolveBeatTemplate` ORCHESTRATES the three scattered seams
// — it does NOT replace them. `useBeatLayout` still resolves the concrete grid sides; `AnimatedRule`
// still renders the divider; `resolveVariant` still folds the micro-grain. This resolver AUTHORS the
// per-beat tuple `(title-pole, reveal, rule-variant, numbers-pole, signature)` those seams consume.
//
// THE POLES ARE AUTHORED (animation-taxonomy §E1): the E3 per-route `BeatVariationPolicy.beats[]` tables
// ARE the design — a RESEED never changes them. The SEED owns ONLY the MICRO-GRAIN (stagger jitter,
// over/undershoot, cascade tie-breaks) via `seedStream`/`microGrain` mulberry32 — byte-identical reloads.
//
// PURE + TOTAL — no DOM, no Vue, no clock. Every (policy, phase, seed) yields a concrete
// `ResolvedBeatTemplate`, unit-testable without mounting.

import type { RevealSpec, ScrollDir, TitlePole } from "../contract/index.js";
import { rotateRuleVariant, type RuleVariant } from "../editorial/rule-register.js";
import { microGrain, hashSeed, type MicroGrain } from "../motion/seededVariety.js";
import type { Rank } from "../motion/variant-bounds.js";
import type { Superlative } from "./superlative.js";

// ── The declared template FIELDS (first-class, no longer derived from index / a string) ────────────

/** The aggregate-stats POLE — the vertical register (top/bottom). Authored per beat or cadence-derived. */
export type NumbersPole = "top" | "bottom";

/** THE FIGURE-LADDER FIELD (O-A15 ANSWERS Q-27) — first-class declared sizing, no longer derived from
    the chapter index. `index` is today's neutral rung (the position-derived default); `value-scaled`
    couples the TYPE SIZE to the figure's VALUE ("the typography IS the cliff"). The SIZE values are
    WG-C's (O-C1/O-C2's ladder); the LADDER MECHANISM is the template's — this field carries the value
    + its domain, and `figureLadderScalar` maps it to a 0..1 rung the host binds to a WG-C size var. */
export type FigureLadder =
    | { kind: "index" }
    | { kind: "value-scaled"; value: number; domain?: readonly [number, number] };

/** Map a figure ladder to its 0..1 sizing RUNG (the mechanism; the host multiplies WG-C's size range by
    it). `index` ⇒ 0.5 (the neutral middle rung); `value-scaled` ⇒ the value's position in its domain,
    clamped (a degenerate/absent domain ⇒ 0.5, never NaN). TOTAL — every ladder yields a finite rung. */
export function figureLadderScalar(ladder: FigureLadder): number {
    if (ladder.kind === "index") return 0.5;
    const [lo, hi] = ladder.domain ?? [0, 1];
    if (!Number.isFinite(ladder.value) || !Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo)
        return 0.5;
    const t = (ladder.value - lo) / (hi - lo);
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

// ── The AUTHORED policy (the E3 per-route tables — the design) ─────────────────────────────────────

/** ONE AUTHORED BEAT — the route-designed tuple for a masthead phase. Every field OPTIONAL: an omitted
    pole falls to the cadence default (L/R alternation, top/bottom, `rule`); a SET pole is the authored
    design a reseed never touches. The `signature`/`marquee` flags mark the route's one distinctive beat. */
export interface AuthoredBeat {
    /** The authored title pole (L/C/R). Omit ⇒ the zebra cadence (even=left, odd=right; `center` is
        AUTHORED only — spent sparingly, ≤2 per corridor). */
    title?: TitlePole;
    /** The authored reveal register. Omit ⇒ the reveal FOLLOWS the resolved title pole (Q-21). */
    reveal?: RevealSpec;
    /** The authored rule variant. Omit ⇒ the tier-rotated fallback (`rotateRuleVariant`). */
    rule?: RuleVariant;
    /** The authored numbers pole. Omit ⇒ the cadence (even=top, odd=bottom). */
    numbers?: NumbersPole;
    /** Marks this beat the route SIGNATURE — the ONE distinctive treatment per route (E2: exactly 1). */
    signature?: boolean;
    /** The MARQUEE beat — it breaks from its neighbors (E2: the marquee never shares a neighbor's pole). */
    marquee?: boolean;
    /** The figure-ladder sizing field (Q-27). Omit ⇒ `{ kind: "index" }` (the neutral rung). */
    figure?: FigureLadder;
    /** The declared viz surface id, resolved by the figure's canonical `VizSetContract`. */
    viz?: string;
    /** The optional superlative register (Q-48) — a deft per-item badge/caption. Omit ⇒ none. */
    superlative?: Superlative;
    /** The beat's motion RANK (drives the rule-variant tier + the resolveVariant intensity). Omit ⇒
        `support`. */
    rank?: Rank;
}

/** ONE `BeatVariationPolicy` PER ROUTE — the authored per-phase tuples (the E3 design) + the route base
    seed (owns the MICRO-GRAIN only — the poles are immutable to a reseed). Indexed by MASTHEAD PHASE
    (the sentinels — hero/colophon — never consume a phase slot, so `beats[0]` is the first real beat). */
export interface BeatVariationPolicy {
    /** The route id (decorrelates the seed streams; the default seed when none is passed). */
    id: string;
    /** The authored per-phase tuples (E3). `beats[phase]` is the design for masthead phase `phase`. */
    beats: readonly AuthoredBeat[];
    /** The route base seed — the MICRO-GRAIN source (byte-identical reloads). Omit ⇒ `hashSeed(id)`. */
    seed?: number;
}

// ── THE REVEAL-SHAPE AXIS (P-CF06 — mirrors `RULE_VARIANTS`/`rotateRuleVariant`) ───────────────────

/** THE CLOSED REVEAL-SHAPE REGISTER — the beat-reveal transform variety `Beat`'s
    `data-reveal-shape` stamp selects (scroll-driven.css's `reveal-beat` keyframe). Restraint-first:
    `lift` is today's translate+opacity rise (the majority default); `settle` layers a `scale` term
    onto that SAME keyframe. A shape can ONLY be one of these two (no free variant) — the
    RevealSpec.shape field literal union this register mirrors. */
export const REVEAL_SHAPES = ["lift", "settle"] as const;

/** The beat-reveal transform-shape register — the variety a beat's rise wears. */
export type RevealShape = (typeof REVEAL_SHAPES)[number];

/** The per-tier rotation OFFSET for the shape cadence — modelled BYTE-FOR-BYTE on
    `rule-register.ts`'s own `TIER_OFFSET` (duplicated, not imported: this is an independent closed
    register mirroring that one's shape, not a shared dependency). */
const SHAPE_TIER_OFFSET: Record<Rank, number> = {
    lede: 0,
    support: 1,
    ancillary: 2,
};

/** THE ROTATION — resolve a beat's reveal shape from its tier + its running index, mirroring
    `rotateRuleVariant` BYTE-FOR-BYTE (rule-register.ts:37-42): the SAME period-4, tier-offset
    cadence over a 2-name register, restraint-biased (`lift` wins three of every four slots). The
    AUTHORED `RevealSpec.shape` field ALWAYS wins over this fallback (the
    resolver below only reaches it when a beat leaves `shape` unset). Deterministic + total: same
    (tier, index) ⇒ same shape, never random. */
export function rotateRevealShape(tier: Rank, index: number): RevealShape {
    const step = ((index + SHAPE_TIER_OFFSET[tier]) % 4 + 4) % 4;
    return step === 1 ? "settle" : "lift";
}

// ── A pure resolved variation utility ─────────────────────────────────────────────────────────────

/** A concrete, total variation tuple carrying authored poles and seed micro-grain. */
export interface ResolvedBeatTemplate {
    /** The resolved title pole (L/C/R) — `useBeatLayout` stamps it as `data-title`. */
    title: TitlePole;
    /** The resolved reveal facet — the pole-following layout merged UNDER the authored reveal. Its
        `layout.title`/`layout.scrollIn` carry the pole so `resolveLayout` produces the same sides. */
    reveal: RevealSpec;
    /** The resolved rule variant — `AnimatedRule` renders it (authored ?? tier-rotated). */
    rule: RuleVariant;
    /** The resolved numbers pole. */
    numbers: NumbersPole;
    /** The route SIGNATURE flag (exactly one per route — E2). */
    signature: boolean;
    /** The MARQUEE flag (breaks from neighbors — E2). */
    marquee: boolean;
    /** The figure-ladder field (Q-27). */
    figure: FigureLadder;
    /** The declared viz-type id (Q-30). */
    viz?: string;
    /** The optional superlative (Q-48). */
    superlative?: Superlative;
    /** The SEED-OWNED micro-grain (stagger jitter / over-undershoot / phase). The ONLY reseed-varying
        facet — the poles above are authored + reseed-invariant (the E1 law). */
    grain: MicroGrain;
    /** The masthead phase this template resolves (the beats[] index). */
    phase: number;
}

/** The reveal-in axis FOLLOWS the title pole (Q-21): left slides from left, right from right, a `center`
    beat RISES vertically (no margin to slide from — the same rule `resolveLayout` applies). */
function revealDirForPole(pole: TitlePole): ScrollDir {
    return pole === "center" ? "up" : pole === "right" ? "right" : "left";
}

/**
 * THE RESOLVER — `resolveBeatTemplate(policy, phase, routeSeed, rank)`. Reads the AUTHORED beat for a
 * masthead phase and fills each unauthored pole from the cadence, then attaches the seed micro-grain.
 * PURE + TOTAL: a phase past the authored table ({} ⇒ pure cadence) still yields a concrete template.
 *
 *   · title  — authored ?? zebra cadence (even=left, odd=right; center is authored-only)
 *   · reveal — the pole-following layout MERGED UNDER the authored reveal (authored overrides win)
 *   · rule   — authored ?? tier-rotated (`rotateRuleVariant`, restraint-first)
 *   · numbers— authored ?? cadence (even=top, odd=bottom)
 *   · grain  — `microGrain(routeSeed, "<id>:beat", phase)` — the reseed-varying MICRO texture only
 */
export function resolveBeatTemplate(
    policy: BeatVariationPolicy,
    phase: number,
    routeSeed: number,
    rank?: Rank,
): ResolvedBeatTemplate {
    const authored: AuthoredBeat = policy.beats[phase] ?? {};
    const tier: Rank = rank ?? authored.rank ?? "support";

    const title: TitlePole = authored.title ?? (phase % 2 === 0 ? "left" : "right");
    const numbers: NumbersPole = authored.numbers ?? (phase % 2 === 0 ? "top" : "bottom");
    const rule: RuleVariant = authored.rule ?? rotateRuleVariant(tier, phase);

    // The reveal FOLLOWS the title pole by default (Q-21). The pole-derived layout is the FLOOR; the
    // authored reveal (and its own `layout`) overrides ON TOP — so a route may author a bespoke reveal
    // while the pole still governs any field it leaves unset (the merge is field-granular).
    // O-A26 · the SHAPE field resolves the SAME way `rule` does above: authored ?? tier-rotated
    // fallback (`rotateRevealShape`) — deterministic, restraint-biased, never random.
    const reveal: RevealSpec = {
        ...authored.reveal,
        shape: authored.reveal?.shape ?? rotateRevealShape(tier, phase),
        layout: {
            title,
            scrollIn: revealDirForPole(title),
            ...authored.reveal?.layout,
        },
    };

    // The seed owns ONLY the micro-grain (the E1 law) — decorrelated per (route id, phase).
    const grain: MicroGrain = microGrain(routeSeed >>> 0, `${policy.id}:beat`, phase);

    return {
        title,
        reveal,
        rule,
        numbers,
        signature: authored.signature ?? false,
        marquee: authored.marquee ?? false,
        figure: authored.figure ?? { kind: "index" },
        viz: authored.viz,
        superlative: authored.superlative,
        grain,
        phase,
    };
}

/** Resolve the WHOLE policy — one `ResolvedBeatTemplate` per authored beat. The `routeSeed` defaults to
    `policy.seed ?? hashSeed(policy.id)` (byte-identical reloads); a caller passes an EXPLICIT seed to
    A/B the micro-grain (the poles stay fixed — the reseed-invariance assert). */
export function resolveBeatTemplates(
    policy: BeatVariationPolicy,
    routeSeed?: number,
    rank?: Rank,
): ResolvedBeatTemplate[] {
    const seed = (routeSeed ?? policy.seed ?? hashSeed(policy.id)) >>> 0;
    return policy.beats.map((_, phase) => resolveBeatTemplate(policy, phase, seed, rank));
}

// ── THE E2 CONSTRAINT SET (the "cohesive but never uniform" guarantee, checked on the resolved tuples) ──

/** THE CONSTRAINT REPORT (animation-taxonomy §E2 / §G AG15) — the E2 invariants MEASURED on a route's
    resolved templates. `ok` iff all three hold: 0 consecutive shared title poles, ≤2 center beats, and
    exactly 1 signature. The evidence pack reads this off the resolved tuples (not asserted — measured). */
export interface BeatConstraintReport {
    /** The count of ADJACENT beat pairs sharing a title pole (E2: MUST be 0). */
    consecutiveSharedPoles: number;
    /** The count of `center` title beats (E2: ≤2 per corridor). */
    centerBeats: number;
    /** The count of SIGNATURE beats (E2: exactly 1). */
    signatureBeats: number;
    /** All three invariants hold. */
    ok: boolean;
}

/** MEASURE the E2 constraints on a route's resolved templates. TOTAL — an empty route is vacuously
    non-ok on the signature count (a route with beats declares exactly one signature). */
export function checkBeatConstraints(
    resolved: readonly ResolvedBeatTemplate[],
): BeatConstraintReport {
    let consecutiveSharedPoles = 0;
    for (let i = 1; i < resolved.length; i++) {
        if (resolved[i]!.title === resolved[i - 1]!.title) consecutiveSharedPoles += 1;
    }
    const centerBeats = resolved.filter((r) => r.title === "center").length;
    const signatureBeats = resolved.filter((r) => r.signature).length;
    const ok = consecutiveSharedPoles === 0 && centerBeats <= 2 && signatureBeats === 1;
    return { consecutiveSharedPoles, centerBeats, signatureBeats, ok };
}
