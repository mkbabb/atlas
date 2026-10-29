<script setup lang="ts">
// platform/editorial/AnimatedRule.vue — ⑤ the animated divider (SUBSUMES SectionDivider). F3a /
// design-interstitial-system §3.5 · f6-hero-interstitials §2.B-⑤.
//
// THE SUBSUMPTION (the R-SUBSUME decision): `<AnimatedRule>` IS today's
// `<SectionDivider>` — a static hand-drawn rule inked with glass-ui's own pen (the atlas authors NO
// stroke cubic: the centreline is glass's `handLine`, the nib its `strokeRibbon`, via `InkStroke`).
// glass 9 re-cut `<HandMark>` into a pen that marks SLOTTED TEXT and retired the free-standing
// `strikethrough` rule and the brush continuum, so a wordless rule inks through `InkStroke`.
// It carries SectionDivider's `full`/`short` weight
// tiers + a `hero` tier (the page-cover rule below `<DashboardHero>`). It has one expression: the
// static drawn hand rule (boil FORBIDDEN — the frame-guard). U/B7b retired the `variant` prop and its
// `draw` name: PLAN §4.2 deleted the scroll-scrubbed draw, which left `draw` painting as `rule`.
//
// (The actual file MOVE — SectionDivider → editorial/, the call-site re-points — is a phase-2
// integration edit OUTSIDE this lane's write-bound; SPEC'd in the lane's blockers. AnimatedRule
// composes the SAME glass pen here, so the subsumption is real, not a fork: one divider
// component — two divider components
// would be a seam that drifts.)
//
// THE RUNG — ④ chrome. The ink is the
// PAGE ink (`--foreground` for full, `--engrave` for short) — L1 frame chrome, NEVER a data color
// (the existing SectionDivider law). It binds --attn-chrome via the SUFFUSION contract.
//
// THE BOIL STAYS FORBIDDEN: a permanent structural mark costs ZERO rAF (the pencil-boil
// frame-guard, the E1/E4 root law). a11y: role="separator" (today's SectionDivider semantics);
// `aria-hidden` on the ink (the mark is decorative — the chapter SEMANTICS live in the `<h2>`
// headings, not the rule).
//
// T-10 (U/B7c M2 · RQ-054, RB-050): the rule is THIN and UNTAPERED — the hand's centreline inked as
// an even stroke (InkStroke `even`), not glass's ribbon, whose ends narrowed to a quarter of its
// body — and it DRAWS IN ONCE on entry (PLAN §4.2 scroll row): a rule below the fold at mount waits
// `pending`, and the first time it intersects the viewport it draws over --duration-slow on
// --ease-engrave (stroke-dashoffset on the ink, a start-edge scaleX on the seam; both compositor-
// friendly, not scrubbed, never reversed), then holds `drawn`. A rule in view at mount, or any rule
// under reduced motion, is painted at `rest`: no draw at load (the load row allows the lead figure
// only). One IntersectionObserver per rule, disconnected on its first entry; no rAF.
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import InkStroke from "../charts/glyph/InkStroke.vue";

const props = withDefaults(
    defineProps<{
        /** The demarcation tier — `full` (chapter rule) · `short` (figure rule) · `hero`
            (the page-cover rule below the DashboardHero). */
        weight?: "full" | "short" | "hero" | "seam";
        /** The hand's seed (the SectionDivider seed law — pixel-identical reloads). */
        seed?: number;
    }>(),
    { weight: "full", seed: 1 },
);

const host = ref<HTMLElement | null>(null);
/** `rest` — painted, no draw (in view at mount, or reduced motion) · `pending` — below the fold,
    not yet entered · `drawn` — entered once; the draw ran and the rule holds. */
const draw = ref<"rest" | "pending" | "drawn">("rest");
let io: IntersectionObserver | null = null;
onMounted(() => {
    const el = host.value;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) return;
    draw.value = "pending";
    io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        draw.value = "drawn";
        io?.disconnect();
        io = null;
    });
    io.observe(el);
});
onBeforeUnmount(() => io?.disconnect());

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

</script>

<template>
    <!-- The host keeps the `<hr>`-EQUIVALENT a11y semantics — role="separator" IS the ARIA role an
         `<hr>` maps to, on a `<div>` so it can hold the ink child. It binds --attn-chrome (the
         SUFFUSION rung). The `data-weight` is the tier probe (full/short/hero). -->
    <div
        ref="host"
        class="animated-rule"
        :class="`animated-rule--${weight}`"
        role="separator"
        aria-hidden="true"
        data-attn="chrome"
        :data-weight="weight"
        :data-draw="draw"
        data-testid="animated-rule"
    >
        <!-- A StoryCard seam is literal chrome. -->
        <span v-if="isSeam" class="animated-rule__seam" />

        <!-- The drawn hand rule, still (no boil — the frame-guard). The
             centreline and the nib are glass's pen (no atlas stroke cubic). -->
        <InkStroke
            v-else
            class="animated-rule__ink"
            kind="line"
            even
            :weight="nib"
            :color="ink"
            :seed="seed"
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
    transform-origin: 0 50%;
}
[dir="rtl"] .animated-rule__seam {
    transform-origin: 100% 50%;
}

/* T-10 · THE DRAW-ON-ENTRY. The ink's path carries pathLength 1, so a dash of 1 is the whole rule:
   `pending` holds it undrawn, `drawn` transitions it to whole once. */
.animated-rule__ink :deep(path) {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
}
.animated-rule[data-draw="pending"] .animated-rule__ink :deep(path) {
    stroke-dashoffset: 1;
}
.animated-rule[data-draw="pending"] .animated-rule__seam {
    transform: scaleX(0);
}
.animated-rule[data-draw="drawn"] .animated-rule__ink :deep(path) {
    transition: stroke-dashoffset var(--duration-slow) var(--ease-engrave);
}
.animated-rule[data-draw="drawn"] .animated-rule__seam {
    transition: transform var(--duration-slow) var(--ease-engrave);
}
@media (prefers-reduced-motion: reduce) {
    .animated-rule .animated-rule__ink :deep(path),
    .animated-rule .animated-rule__seam {
        transition: none;
    }
}

</style>
