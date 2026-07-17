<script setup lang="ts">
// platform/editorial/AnimatedRule.vue — ⑤ the animated divider (SUBSUMES SectionDivider). F3a /
// design-interstitial-system §3.5 · f6-hero-interstitials §2.B-⑤.
//
// THE SUBSUMPTION (the R-SUBSUME decision): `<AnimatedRule variant="rule">` IS today's
// `<SectionDivider>` — the static drawn `HandMark` (`animation="none"`), the same thin-consumer of
// `@mkbabb/glass-ui/handmark` (the atlas authors NO stroke cubic; the brush, the wobble, the
// seeded-static grain are ALL library-rendered). It carries SectionDivider's `full`/`short` weight
// tiers + a `hero` tier (the page-cover rule below `<DashboardHero>`). The variants escalate
// expression, restraint-first (most junctions stay the static `rule`):
//   · rule    — the static drawn HandMark (today's default; boil FORBIDDEN — the frame-guard).
//   · draw    — the HandMark draws-on on scroll-entry, un-draws on scroll-up (the bidirectional
//               view() draw the underlines already use; clock="scroll" semantics).
//
// (The actual file MOVE — SectionDivider → editorial/, the call-site re-points — is a phase-2
// integration edit OUTSIDE this lane's write-bound; SPEC'd in the lane's blockers. AnimatedRule
// composes the SAME HandMark primitive here, so the subsumption is real, not a fork: one divider
// component, escalating variants, the `<HandMark clock>` precedent — two divider components
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
import { HandMark } from "@mkbabb/glass-ui/handmark";
import type { RuleVariant } from "./rule-register.js";

const props = withDefaults(
    defineProps<{
        /** The escalating expression (default "rule" — the static drawn divider). The CLOSED register
            is `rule-register.ts`'s `RuleVariant`; the beat-template orchestrator resolves it per beat. */
        variant?: RuleVariant;
        /** The demarcation tier — `full` (chapter rule) · `short` (figure rule) · `hero`
            (the page-cover rule below the DashboardHero). */
        weight?: "full" | "short" | "hero" | "seam";
        /** The HandMark grain determinism (the SectionDivider seed law — pixel-identical reloads). */
        seed?: number;
    }>(),
    { variant: "rule", weight: "full", seed: 1 },
);

const isShort = computed(() => props.weight === "short");
const isSeam = computed(() => props.weight === "seam");
// Every divider is a HAIRLINE: chapter/hero use the clean pen stroke; figure uses the pencil
// whisper. Both Glass presets are stroke ribbons, so a separator can never become a filled almond.
const brush = computed<"pen" | "pencil">(() =>
    isShort.value ? "pencil" : "pen",
);
const HAIRLINE_BRUSH = { weight: 1 } as const;
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

// THE DRAW CLOCK — `rule` is static (drawn-but-still, `animation="none"`, `appear="mount"`); `draw`
// fires the bidirectional scroll draw (the underlines' Clock B — `animation="draw-on"` on the
// library's view-timeline arm via the `data-rule-clock="scroll"` binding below). PRM collapses the
// draw arm to static (the library snaps the draw).
const animation = computed<"none" | "draw-on">(() =>
    props.variant === "draw" ? "draw-on" : "none",
);
const appear = computed<"mount" | "visible">(() =>
    props.variant === "draw" ? "visible" : "mount",
);
</script>

<template>
    <!-- The host keeps the `<hr>`-EQUIVALENT a11y semantics — role="separator" IS the ARIA role an
         `<hr>` maps to, on a `<div>` so it can hold the HandMark child. It binds --attn-chrome (the
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

        <!-- variant="rule" | "draw" — the drawn HandMark rule. STATIC for `rule` (drawn-but-still,
             no boil — the frame-guard); the bidirectional scroll draw for `draw` (Clock B, the
             view() draw the underlines use). The brush, grain, and clip-path wipe are ALL
             library-rendered (the thin-consumer contract; no atlas stroke cubic). -->
        <HandMark
            v-else
            class="animated-rule__ink"
            shape="strikethrough"
            :brush="brush"
            :overrides="HAIRLINE_BRUSH"
            :color="ink"
            :seed="seed"
            :animation="animation"
            :appear="appear"
            :data-rule-clock="variant === 'draw' ? 'scroll' : 'static'"
        />
    </div>
</template>

<style scoped>
/* Every non-seam rule is one recessive HandMark hairline. The weight tiers retain only their
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
/* The HandMark `.hm` root is inline-block (the library's scoped default); the rule host needs it
   to STRETCH the full measure. The descendant selector (two classes) out-specifies the library's
   `.hm[data-v]` (one class + one attribute), so the block override wins deterministically. We only
   restyle the BOX (display/size) — the library still owns the stroke markup (the thin-consumer
   contract; no CSS touches the rendered path). */
.animated-rule .animated-rule__ink {
    display: block;
    width: 100%;
    height: 100%;
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
   while this bounded weight deliberately skips the tapered HandMark. */
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

/* THE SCRUBBED DRAW-ON (variant="draw") — the rule draws/un-draws BIDIRECTIONALLY under real
   scroll, binding the `crayon-wipe` @keyframes (the clip-path inset wipe) to the mark's OWN view()
   timeline — the SAME mechanism the HandMark scroll arm uses. The `@keyframes crayon-wipe` is
   DEFINED in the atlas-owned, index-imported `platform/design/map-draw.css` (`@keyframes` are
   document-global; it is NOT a glass-ui global — 4.2.0 has a `crayon` brush KIND, no `crayon-wipe`
   @keyframes). The fences are the standard scroll-mark pair: the
   OUTER `prefers-reduced-motion: no-preference` + the INNER `@supports (animation-timeline: view())`
   so under PRM (or a non-supporting engine) the wipe NEVER attaches and the rule rests at its
   terminal DRAWN state (token-register eases only — no bespoke transition; the boil stays
   forbidden). */
@media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
        .animated-rule[data-variant="draw"] :deep(.hm__svg) {
            animation: crayon-wipe auto linear both;
            animation-timeline: view(block);
            animation-range: entry 0% cover 40%;
        }
    }
}
</style>
