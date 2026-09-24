<script setup lang="ts">
// platform/editorial/AnimatedRule.vue — ⑤ the animated divider (SUBSUMES SectionDivider). F3a /
// design-interstitial-system §3.5 · f6-hero-interstitials §2.B-⑤.
//
// THE SUBSUMPTION (the R-SUBSUME decision): `<AnimatedRule variant="rule">` IS today's
// `<SectionDivider>` — the static drawn hand rule. Since glass-ui 9.0.0 `<HandMark>` marks slotted
// TEXT only, so the rule inks through `InkStroke` over glass's exported pen (`handLine` +
// `strokeRibbon`) — the atlas still authors NO stroke cubic; the hand and the ribbon are glass's. It carries SectionDivider's `full`/`short` weight
// tiers + a NEW `hero` tier (heavier — the page-cover rule below `<DashboardHero>`). The variants
// ESCALATE expression, restraint-first (most junctions stay the static `rule`):
//   · rule    — the static drawn hand rule (today's default; boil FORBIDDEN — the frame-guard).
//   · draw    — the rule draws-on on scroll-entry, un-draws on scroll-up (the bidirectional
//               view() draw the underlines already use; clock="scroll" semantics).
//   · numeral — the `text-ghost-numeral` chapter watermark wipes in behind the next beat as the
//               junction passes (the existing recipe, now scroll-scrubbed).
//
// (The actual file MOVE — SectionDivider → editorial/, the call-site re-points — is a phase-2
// integration edit OUTSIDE this lane's write-bound; SPEC'd in the lane's blockers. AnimatedRule
// composes the SAME glass hand pen here, so the subsumption is real, not a fork: one divider
// component, escalating variants, the `clock` precedent — two divider components
// would be a seam that drifts.)
//
// THE RUNG — ④ chrome (rule/draw) → ⑤ atmosphere (numeral, the recessive ghost). The ink is the
// PAGE ink (`--foreground` for full, `--engrave` for short) — L1 frame chrome, NEVER a data color
// (the existing SectionDivider law). It binds --attn-chrome via the SUFFUSION contract.
//
// THE BOIL STAYS FORBIDDEN: a permanent structural mark costs ZERO rAF (the pencil-boil
// frame-guard, the E1/E4 root law); the `draw`/`numeral` reveals are ONE-SHOT scroll-scrubs, not
// continuous boil. PRM: ALL three render STATIC (the rule drawn, the numeral set, no wipe — the
// library snaps it; token-register eases only, never a bespoke transition). a11y: role="separator"
// (today's SectionDivider semantics); `aria-hidden` on the ink (the numeral is decorative — the
// chapter SEMANTICS live in the `<h2>` headings, not the rule).
import { computed } from "vue";
import InkStroke from "@/charts/glyph/InkStroke.vue";
import { toRoman } from "@/platform/composables/useRomanNumeral";
import type { RuleVariant } from "./rule-register";

const props = withDefaults(
    defineProps<{
        /** The escalating expression (default "rule" — the static drawn divider). The CLOSED register
            is `rule-register.ts`'s `RuleVariant`; the beat-template orchestrator resolves it per beat. */
        variant?: RuleVariant;
        /** The demarcation tier — `full` (chapter rule) · `short` (figure rule) · `hero`
            (the heavier page-cover rule below the DashboardHero). */
        weight?: "full" | "short" | "hero" | "seam";
        /** The ghost chapter figure (variant="numeral") → the Roman watermark. */
        numeral?: number;
        /** The hand's seed (the SectionDivider seed law — pixel-identical reloads). */
        seed?: number;
    }>(),
    { variant: "rule", weight: "full", numeral: undefined, seed: 1 },
);

const isShort = computed(() => props.weight === "short");
const isSeam = computed(() => props.weight === "seam");
// Every divider is a HAIRLINE ribbon: chapter/hero at the pen nib (hero a touch heavier — the
// cover cut); the figure rule at a thinner whisper nib. (glass 9.0.0 retired the pen/pencil brush
// presets for one pen whose only knob is the nib `weight`.)
const nib = computed<number>(() =>
    isShort.value ? 0.7 : props.weight === "hero" ? 1.25 : 1,
);
// The ink: the chapter/hero rule in the page ink, the figure rule in the faint engrave hairline.
// THE SILVER RULE FINISH (H.W4.b · §SILVER) — the FIGURE rule (the short pencil whisper, the
// structural section divider) wears the brushed-metal finish: --silver-rule mixes a faint cool-
// steel tint INTO the --engrave hairline ink, so the rule reads as a struck-metal section cut, not
// flat graphite. ADDITIVE (the --engrave fallback survives if silver is unset); NEUTRAL (it does
// not fight the route accent). The CHAPTER/HERO rule stays full page ink (a loud cut earns no tint).
const ink = computed<string>(() =>
    isShort.value
        ? "color-mix(in oklab, var(--engrave, var(--muted-foreground)), var(--silver-rule) 40%)"
        : "var(--foreground)",
);

// THE DRAW CLOCK — `rule` is static (drawn-but-still); `draw` fires the bidirectional scroll draw
// (the underlines' Clock B — InkStroke's `view()` wipe); `numeral` is the scroll-scrubbed ghost
// watermark (no ink — the recipe text, scrubbed). PRM collapses every arm to static (the wipe never
// attaches; the numeral is simply set).
const clock = computed<"static" | "scroll">(() =>
    props.variant === "draw" ? "scroll" : "static",
);

/** The Roman ghost numeral (variant="numeral") off the ONE platform converter (V-W2). */
const roman = computed(() => (props.numeral != null ? toRoman(props.numeral) : ""));
</script>

<template>
    <!-- The host keeps the `<hr>`-EQUIVALENT a11y semantics — role="separator" IS the ARIA role an
         `<hr>` maps to, on a `<div>` so it can hold the ink / ghost-numeral child. It binds
         --attn-chrome (the SUFFUSION rung; the numeral arm recesses to atmosphere via its own
         ghost ink). The `data-weight` is the tier probe (full/short/hero). -->
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

        <!-- variant="numeral" — the ghost chapter watermark (text-ghost-numeral, the recessive ⑤
             atmosphere ink). Decorative + aria-hidden (the chapter label lives in the <h2>). -->
        <span
            v-else-if="variant === 'numeral'"
            class="animated-rule__numeral text-ghost-numeral"
            :data-rule-clock="'scroll'"
        >
            {{ roman }}
        </span>

        <!-- variant="rule" | "draw" — the drawn hand rule. STATIC for `rule` (drawn-but-still);
             the bidirectional scroll draw for `draw` (Clock B, the view() draw the underlines
             use). The hand and the ribbon are glass's pen (no atlas stroke cubic). -->
        <InkStroke
            v-else
            class="animated-rule__ink"
            kind="line"
            :weight="nib"
            :color="ink"
            :seed="seed"
            :clock="clock"
            :data-rule-clock="clock"
        />
    </div>
</template>

<style scoped>
/* Both ink variants are DRAWN rules — the host is a sized BOX (no background, no border; the ink
   is the inked ribbon / the ghost glyph, not a CSS fill). The chapter/hero rule breathes wide; the
   figure rule breathes tighter. The host carries the measured HEIGHT the ribbon is fitted into + the full
   reading measure, so InkStroke has a box to fill. (This mirrors SectionDivider's geometry exactly — the subsumption is real.) */
.animated-rule {
    border: 0;
    background: none;
    /* THE READING MEASURE (the N.LIVE-DEFECTS full-bleed-rule fix). The rule is EDITORIAL SPINE —
       a chapter/figure divider (role="separator"), not a data mark — so it reads at the PROSE
       measure, NOT the wide `--measure-figure` figure track its `.dashboard-body` host provides
       (the §13 viz-area-is-viz-ONLY law: high-level text/furniture stays at the reading measure;
       only the marks break out). Before this, `width:100%` stretched the tapered rule across
       the whole ~1280px figure track — the "wildly long dividing rule". `min(100%, --measure-prose)`
       + `margin-inline:auto` centres it in the reading column at every width (the phone column
       still fills, the 100% term winning below 72ch). */
    width: 100%;
    max-inline-size: var(--measure-prose, 72ch);
    margin-inline: auto;
    display: block;
    padding: 0;
    overflow: visible;
    /* THE SUFFUSION RUNG (DESIGN §13 / HIER-SUFFUSION · rung ④). The drawn rule declares its
       recession from --attn-chrome (0.46) — the ONE source of truth, NEVER the brush's intrinsic
       opacity (the marker/pencil presets carry their own alpha; the rung recedes the whole rendered
       mark uniformly to the chrome register, as the inversion law demands of frame chrome). The
       numeral arm recesses further via its own ghost ink (the ⑤ atmosphere floor), so its
       additional fade composes on top of this chrome floor. */
    opacity: var(--attn-chrome);
}
/* The ink fills the rule's sized box (InkStroke measures the box it is given). */
.animated-rule .animated-rule__ink {
    display: block;
    width: 100%;
    height: 100%;
}

/* TIER ① the CHAPTER rule — the confident drawn `pen` line between beats (the wide margin parts
   whole story beats). */
.animated-rule--full {
    height: 18px;
    margin-block: clamp(2.5rem, 6vw, 5rem);
}
/* TIER ② the FIGURE rule — the faint `pencil` graphite whisper within a beat (a tighter margin;
   never louder than a whisper, the stopping rule). */
.animated-rule--short {
    height: 14px;
    margin-block: clamp(1.5rem, 3.5vw, 2.5rem);
}
/* THE NEW HERO TIER — the heavier page-cover rule below the DashboardHero (the band ends, the lead
   beat begins). Taller than the chapter rule so the marker draws a heavier cut; a tighter top
   margin (it sits against the cover) and a wider bottom (it parts the cover from the first plate). */
.animated-rule--hero {
    height: 22px;
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

/* THE GHOST NUMERAL — the recessive ⑤ atmosphere watermark (text-ghost-numeral owns the
   face/ink/size). It wipes in behind the next beat as the junction passes (scroll-scrubbed, the
   existing recipe). Centered in the rule's measure; decorative (aria-hidden). The opacity is the
   ghost ink's own (the recipe's `--ghost-numeral-ink`) — the ⑤ atmosphere floor. */
.animated-rule__numeral {
    display: block;
    text-align: center;
    line-height: 0.8;
}

/* THE SCRUBBED DRAW-ON (variant="draw") — the rule draws/un-draws BIDIRECTIONALLY under real
   scroll: InkStroke binds the atlas `crayon-wipe` clip to its own view() timeline (PRM- and
   @supports-fenced there); the rule only widens the scrub window to its junction register. */
.animated-rule[data-variant="draw"] {
    --ink-scrub-range: entry 0% cover 40%;
}
</style>
