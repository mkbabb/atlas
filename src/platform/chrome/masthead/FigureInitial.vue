<script setup lang="ts">
// FigureInitial.vue — THE illuminated dropped-capital (FD3 §0, the platform's one
// unforgettable shared signature; FD1 §2.1 / §3.1). An oversized Fraunces figure-glyph
// (`I.` `II.` `III.` `IV.` `V.`) set in the left margin like a manuscript initial, its
// fill a VERTICAL diverging gradient (orange payer at the foot ↔ teal receiver at the
// crown) that is simultaneously three things at once:
//
//   · a CHAPTER MARKER — the Roman figure-number naming the beat (a stepper rung);
//   · a BRAND MARK     — the atlas's recognition glyph, the thing people screenshot;
//   · a LIVE LEGEND    — the diverging key itself, painted INTO the letterform.
//
// The signature move (FD3 §0): the gradient re-weights its hinge to the on-screen data
// distribution — pass `hinge` (a 0..1 fraction of the diverging domain) and the
// orange→teal break-even slides up or down the glyph as the country's balance shifts.
// Omit it and the glyph sits at the neutral 50% split (a static key). So the same
// component opens any dashboard's beat: USF binds its net-retention distribution, SCI
// or ECF bind theirs, and the initial becomes that plate's living legend.
//
// It breaks the grid: a negative margin lets the glyph OVERLAP the plate's upper-left
// corner (the manuscript-initial gesture, FD3 §0). The fill-stops are read from the design
// tokens (one source of truth) — and which KIND's stops depends on the dashboard:
//
//   · diverging  (default) — the 3 diverging poles (orange payer foot ↔ neutral hinge ↔
//                            teal receiver crown); USF's net-retention key. Unchanged.
//   · sequential          — the single-hue magnitude ramp (--viz-sequential-low→high);
//                            ECF's funding-magnitude key.
//   · rainbow             — a sampling of the --rainbow-tier-* ordinal ramp (base green →
//                            apex violet); SCI's bandwidth-tier key.
//
// The `colorKind` prop selects the kind so ANY dashboard adopts the signature in ITS OWN
// color (K1 / FD1 §3) — default `diverging`, so USF is unaffected. Every kind stays
// distribution-weightable: the `hinge` (0..1 up the glyph) slides the diverging break-even,
// and re-weights where the sequential/rainbow ramp's knee sits, so the initial is the
// plate's LIVING legend, not a static swatch.
import { computed } from "vue";
import { colorKindStops, type ColorKind } from "../../../charts/scale/colorKind.js";
import { toRoman } from "../../composables/useRomanNumeral.js";

const props = withDefaults(
    defineProps<{
        /** The chapter figure-number, 1..5 → I..V (the stepper rung this beat owns). */
        figure: number;
        /** The break-even hinge as a 0..1 fraction up the glyph (0 = foot, 1 = crown).
            Drives the diverging orange→teal split, or the sequential/rainbow ramp's knee —
            re-weight it to the on-screen distribution to make the initial a live legend.
            Default 0.5 (the neutral static key). */
        hinge?: number;
        /** Which color KIND the fill paints in (FD1 §3) — `diverging` (the default, so USF
            is unaffected), `sequential`, or `rainbow`. Each reads the matching kind's
            design tokens, so the initial and that dashboard's plates share ONE color. */
        colorKind?: ColorKind;
        /** The accessible chapter label (announced in place of the decorative glyph). */
        label?: string;
    }>(),
    { hinge: 0.5, colorKind: "diverging", label: undefined },
);

/** The Roman figure-number off the ONE platform converter (V-W2 · correct past X). */
const roman = computed(() => toRoman(props.figure));

/** A stable gradient id so two initials on one page never share a paint server. */
const gradientId = computed(() => `figure-initial-grad-${props.figure}`);

/** The ordered gradient stops the SVG paints, from the ONE `colorKind → stops` keystone
    (DV-1, `colorKind.ts`). The dropped-cap glyph + the shared `<ChartLegend>` now read the
    SAME source, so a kind's gradient is identical wherever it appears (no hardcoded
    RAINBOW_SAMPLE / per-kind branch re-derived here). `colorKindStops` emits crown(0)→foot
    (100), the live hinge sliding the diverging mid / the sequential-rainbow knee. */
const stops = computed(() => colorKindStops(props.colorKind, props.hinge));

/** The announced label — an explicit prop, else "Chapter <roman>". */
const ariaLabel = computed(() => props.label ?? `Chapter ${roman.value}`);
</script>

<template>
    <div class="figure-initial" role="img" :aria-label="ariaLabel" data-testid="figure-initial">
        <svg
            class="figure-initial__svg"
            viewBox="0 0 100 120"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <!-- The kind's key, painted INTO the glyph (FD3 §0, K1): the saturated end at
                     the crown, the base/payer at the foot. The stops read the SAME tokens the
                     dashboard's plates fill with — diverging poles, the sequential ramp, or
                     the rainbow sampling — so the initial and the plates share one color. -->
                <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
                    <stop
                        v-for="(s, i) in stops"
                        :key="i"
                        :offset="`${s.offset}%`"
                        :stop-color="s.color"
                    />
                </linearGradient>
            </defs>
            <!-- The Roman figure-number set in Fraunces with the WONK/SOFT wink, filled by
                 the kind's gradient. The period is the manuscript-initial full stop. -->
            <text
                class="figure-initial__glyph"
                x="50"
                y="50%"
                text-anchor="middle"
                dominant-baseline="central"
                :fill="`url(#${gradientId})`"
            >
                {{ roman }}.
            </text>
        </svg>
    </div>
</template>

<style scoped>
/* The dropped-capital breaks the grid: it overlaps the plate corner via a negative
   margin (the manuscript gesture, FD3 §0). Sized by the --type-display-mega rung so it
   reads at the figure-number scale; the SVG host is square-ish to give the glyph room.

   OF-22 — THE NUMERAL YIELDS TO ATMOSPHERE (exactly ONE register carries the numeral at reading
   size — the eyebrow is that honest seat). At full ink the ~287px illuminated cap is a SECOND
   numeral at reading prominence, competing with the eyebrow. The overlay permits at most ONE quiet
   echo that earns its seat, and the platform's one unforgettable signature (FD3 §0) is exactly it:
   so the cap keeps its glyph + live-legend gradient + its announced chapter label (role="img",
   SR-unchanged) but its INK recedes to `--attn-atmosphere` (the §HIERARCHY perceptual floor). It
   reads as a sub-threshold watermark echo of the eyebrow's numeral, never a co-equal reading register
   — the diverging gradient stays as a ghosted brand presence, the eyebrow does the reading. */
.figure-initial {
    width: var(--type-display-mega);
    aspect-ratio: 100 / 120;
    margin-inline-start: -0.25em;
    margin-block-start: -0.5em;
    opacity: var(--attn-atmosphere);
    pointer-events: none;
    user-select: none;
}
.figure-initial__svg {
    /* THE FIRST-PAINT HEIGHT RESERVE (R7 CLS · the drop-cap seat). `height: 100%` deferred the SVG's
       block-size to the container, so it contributed 0 height until layout resolved — the cap mounted
       0→86px and shoved the lead beat down. A `display:block` replaced SVG with `height: auto` derives
       its block-size from its OWN viewBox ratio (100/120) against the definite inline-size, so the box
       reserves its full extent at first paint (no growth). The container's `aspect-ratio` agrees; the
       SVG now sizes the box it fills. The consumer's reserve on this seat was out-specified by this
       scoped rule, so the cure lives here (the platform seat). */
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
}
/* Fraunces display optics + the editorial WONK/SOFT axes (FD1 §2.0). The font-size is
   in the SVG's 120-unit user space, so the glyph fills the viewBox; opsz self-tunes via
   the global font-optical-sizing (fonts.css). */
.figure-initial__glyph {
    font-family: var(--font-display);
    font-variation-settings: var(--font-display-vs);
    font-weight: 340;
    font-size: 96px;
    letter-spacing: -0.02em;
}
</style>
