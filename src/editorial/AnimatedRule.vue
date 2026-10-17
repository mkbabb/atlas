<script setup lang="ts">
// platform/editorial/AnimatedRule.vue — ⑤ the animated divider (SUBSUMES SectionDivider). F3a /
// design-interstitial-system §3.5 · f6-hero-interstitials §2.B-⑤.
//
// THE SUBSUMPTION (the R-SUBSUME decision): `<AnimatedRule variant="rule">` IS today's
// `<SectionDivider>` — a static hand-drawn rule inked with glass-ui's own pen (the atlas authors NO
// stroke cubic: the centreline is glass's `handLine`, the nib its `strokeRibbon`, via `InkStroke`).
// glass 9 re-cut `<HandMark>` into a pen that marks SLOTTED TEXT and retired the free-standing
// `strikethrough` rule and the brush continuum, so a wordless rule inks through `InkStroke`.
// It carries SectionDivider's `full`/`short` weight
// tiers + a `hero` tier (the page-cover rule below `<DashboardHero>`). The variants escalate
// expression, restraint-first (most junctions stay the static `rule`):
//   · rule    — the static drawn hand rule (today's default; boil FORBIDDEN — the frame-guard).
//   · draw    — the rule draws-on on scroll-entry, un-draws on scroll-up (the bidirectional
//               view() draw the underlines already use; clock="scroll" semantics).
//
// (The actual file MOVE — SectionDivider → editorial/, the call-site re-points — is a phase-2
// integration edit OUTSIDE this lane's write-bound; SPEC'd in the lane's blockers. AnimatedRule
// composes the SAME glass pen here, so the subsumption is real, not a fork: one divider
// component, escalating variants, the `clock` precedent — two divider components
// would be a seam that drifts.)
//
// THE RUNG — ④ chrome (rule/draw). The ink is the
// PAGE ink (`--foreground` for full, `--engrave` for short) — L1 frame chrome, NEVER a data color
// (the existing SectionDivider law). It binds --attn-chrome via the SUFFUSION contract.
//
// THE BOIL STAYS FORBIDDEN: a permanent structural mark costs ZERO rAF (the pencil-boil
// frame-guard, the E1/E4 root law); the `draw` reveal is a ONE-SHOT scroll-scrub, not
// continuous boil. PRM: BOTH render STATIC (the rule drawn, no wipe — the
// library snaps it; token-register eases only, never a bespoke transition). a11y: role="separator"
// (today's SectionDivider semantics); `aria-hidden` on the ink (the mark is decorative — the
// chapter SEMANTICS live in the `<h2>` headings, not the rule).
import { computed } from "vue";
import InkStroke from "../charts/glyph/InkStroke.vue";
import type { RuleVariant } from "./rule-register.js";

const props = withDefaults(
    defineProps<{
        /** The escalating expression (default "rule" — the static drawn divider). The CLOSED register
            is `rule-register.ts`'s `RuleVariant`; the beat-template orchestrator resolves it per beat. */
        variant?: RuleVariant;
        /** The demarcation tier — `full` (chapter rule) · `short` (figure rule) · `hero`
            (the page-cover rule below the DashboardHero). */
        weight?: "full" | "short" | "hero" | "seam";
        /** The hand's seed (the SectionDivider seed law — pixel-identical reloads). */
        seed?: number;
    }>(),
    { variant: "rule", weight: "full", seed: 1 },
);

const isShort = computed(() => props.weight === "short");
const isSeam = computed(() => props.weight === "seam");
// Every divider is a HAIRLINE ribbon (a stroke, never a filled almond): chapter/hero ink at glass's
// pen nib (weight 1), the figure rule at a lighter 0.7 nib, the whisper the retired `pencil` brush
// carried.
const nib = computed<number>(() => (isShort.value ? 0.7 : 1));
// The ink: the chapter/hero rule in the page ink, the figure rule in the faint engrave hairline.
// THE SILVER RULE FINISH (H.W4.b · §SILVER) — the FIGURE rule (the short pencil whisper, the
// structural section divider) wears the brushed-metal finish: --silver-rule mixes a faint cool-
// steel tint INTO the --engrave hairline ink, so the rule reads as a struck-metal section cut, not
// flat graphite. ADDITIVE (the --engrave fallback survives if silver is unset); NEUTRAL (it does
// not fight the route accent). The CHAPTER/HERO rule stays in page ink at the same recessive rung.
const ink = computed<string>(() =>
    isShort.value
        ? "color-mix(in oklab, var(--engrave, var(--muted-foreground)), var(--silver-rule) 40%)"
        : "var(--foreground)",
);

// THE DRAW CLOCK — `rule` is static (drawn, still); `draw` scrubs the ink on under the rule's own
// `view()` timeline, bidirectionally (InkStroke's `scroll` clock, the atlas `crayon-wipe`). PRM
// collapses the draw arm to static (the wipe never attaches).
const clock = computed<"static" | "scroll">(() => (props.variant === "draw" ? "scroll" : "static"));
</script>

<template>
    <!-- The host keeps the `<hr>`-EQUIVALENT a11y semantics — role="separator" IS the ARIA role an
         `<hr>` maps to, on a `<div>` so it can hold the ink child. It binds --attn-chrome (the
         SUFFUSION rung). The `data-weight` is the tier probe (full/short/hero). -->
    <div
        class="animated-rule"
        :class="`animated-rule--${weight}`"
        role="separator"
        aria-hidden="true"
        data-attn="chrome"
        :data-weight="weight"
        :data-variant="variant"
        data-testid="animated-rule"
    >
        <!-- A StoryCard seam is literal chrome, irrespective of the authored chapter variant. -->
        <span v-if="isSeam" class="animated-rule__seam" />

        <!-- variant="rule" | "draw" — the drawn hand rule. STATIC for `rule` (drawn-but-still,
             no boil — the frame-guard); the bidirectional scroll draw for `draw` (Clock B, the
             view() draw the word marks use). The centreline and the nib are glass's pen (no atlas
             stroke cubic). -->
        <InkStroke
            v-else
            class="animated-rule__ink"
            kind="line"
            :weight="nib"
            :color="ink"
            :seed="seed"
            :clock="clock"
        />
    </div>
</template>

<style scoped>
/* Every non-seam rule is one recessive hand-drawn hairline. The weight tiers retain only their
   editorial breathing rhythm; the shared story/figure track owns inline proportion. */
.animated-rule {
    width: 100%;
    max-inline-size: var(--measure-figure, 92rem);
    margin-inline: auto;
    display: block;
    padding: 0;
    overflow: visible;
    border: 0;
    background: none;
    /* The shared chrome rung keeps the one-pixel mark recessive in both themes. */
    opacity: var(--attn-chrome);
}
.animated-rule:not(.animated-rule--seam) {
    block-size: 1px;
}
/* The ink spans the full measure; InkStroke fits glass's centreline to this box and lets the
   wobble overflow the 1px host (the stroke is never stretched taller). The scroll draw window is
   the rule's own: it settles over `cover 40%`, later than a word mark. */
.animated-rule .animated-rule__ink {
    --ink-scrub-range: entry 0% cover 40%;
}

/* TIER ① the CHAPTER rule — the confident drawn `pen` line between beats (the wide margin parts
   whole story beats). */
.animated-rule--full {
    margin-block: clamp(2.5rem, 6vw, 5rem);
}
/* TIER ② the FIGURE rule — the faint `pencil` graphite whisper within a beat (a tighter margin;
   never louder than a whisper, the stopping rule). */
.animated-rule--short {
    margin-block: clamp(1.5rem, 3.5vw, 2.5rem);
}
/* The page-cover tier keeps its distinct breathing rhythm, not a distinct stroke weight. */
.animated-rule--hero {
    margin-block-start: clamp(1.5rem, 4vw, 3rem);
    margin-block-end: clamp(3rem, 7vw, 6rem);
}
/* StoryCard's literal one-pixel silver seam: the existing divider owns separator semantics,
   while this bounded weight deliberately skips the tapered hand rule. */
.animated-rule--seam {
    block-size: 1px;
    margin-block: 1rem;
    opacity: 1;
}
.animated-rule__seam {
    display: block;
    inline-size: 100%;
    block-size: 1px;
    background: var(--silver-rule, var(--border));
}

</style>
