// editorial/rule-register.ts — THE ANIMATED-RULE BOUNDED REGISTER (O-A15 · the tier-rotated
// rule-variant resolver the beat-template orchestrator drives).
//
// `AnimatedRule` (⑤ the animated divider, SUBSUMES SectionDivider) escalates its expression across a
// CLOSED three-name register — `rule` (the static drawn InkMark, today's restraint-first default) →
// `draw` (the bidirectional scroll draw) → `numeral` (the ghost chapter watermark). This module is the
// SINGLE SOURCE of that closed set + the ROTATION law the orchestrator resolves a per-beat rule from:
// rule variants ROTATE BY TIER (animation-taxonomy §E2), restraint-first (most junctions stay `rule`).
//
// PURE + total — no DOM, no Vue, no clock; the AnimatedRule SFC consumes `RuleVariant` for its prop
// type, the orchestrator (`beat-template.ts`) consumes `rotateRuleVariant` for the fallback texture.

import type { Rank } from "../motion/variant-bounds.js";

/** THE CLOSED RULE-VARIANT REGISTER — the escalating expression AnimatedRule renders. Restraint-first:
    `rule` is the static drawn divider (the boil-forbidden default); `draw`/`numeral` are the one-shot
    scroll-scrubs. Chaos is un-representable: a rule can ONLY be one of these three (no free variant). */
export const RULE_VARIANTS = ["rule", "draw", "numeral"] as const;

/** The AnimatedRule expression register — the divider variant a junction wears. */
export type RuleVariant = (typeof RULE_VARIANTS)[number];

/** The per-tier rotation OFFSET — each rank starts the escalation cadence at a different phase, so the
    junction texture never marches in lockstep across a route (the E2 "rule variants rotate by tier"
    constraint). The lede leads the cadence; the ancillary trails it. */
const TIER_OFFSET: Record<Rank, number> = {
    lede: 0,
    support: 1,
    ancillary: 2,
};

/** THE ROTATION — resolve a junction's rule variant from its tier + its running index. RESTRAINT-FIRST:
    half the junctions stay the static `rule`; the tier-offset cadence escalates the rest (a quarter
    `draw`, a quarter `numeral`), so the divider register reads as a quiet rhythm, never a loud march.
    The AUTHORED policy tuple ALWAYS wins over this fallback (the poles are the design — this is only
    the texture a route leaves unauthored). Deterministic + total: same (tier,index) ⇒ same variant. */
export function rotateRuleVariant(tier: Rank, index: number): RuleVariant {
    // A period-4 cadence over the 3-name register biases `rule` to two of every four slots (the
    // restraint floor); the tier offset phases the cadence so adjacent tiers escalate on different beats.
    const step = ((index + TIER_OFFSET[tier]) % 4 + 4) % 4;
    return step === 1 ? "draw" : step === 3 ? "numeral" : "rule";
}
