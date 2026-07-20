<script setup lang="ts">
// editorial/CrownFigure.vue — THE THESIS-CROWN PRIMITIVE (A-01 · the P-03 lift wave).
//
// The chapter's ONE audacious lead figure, declared instead of hand-wired. Six sites across five
// routes hand-rolled the SAME idiom — a MotionDeclaration carrying `RevealUp` + `CountDial`, a
// `useVizContext`/`useMotionDirector` pair to resolve one cover scalar, `countAt` off that scalar,
// a `FigureSlug` value, an eyebrow unit, an optional record pill, a gloss — and the duplication
// self-documented (`ContractCliff.vue:166-168`: "the SAME `countAt` idiom `CrossoverPlate`'s
// crown-count rides"). This is that idiom, once. Each adopting touch DELETES its hand-rolled twin.
//
// THE RUNG — ②, the thesis crown. It sits ABOVE the river `PullFigure` (rung ③½) and at or below
// the page cover: the ladder reads hero ≥ thesis-crown > river (design-hierarchy FIC-3 / §13), and
// the `ladder` face below is what makes that ordering a DECLARED quantity rather than an accident.
//
// THE FOUR FACES, total: the `value` is the `figure-slug` cap-box (the Fira audacious crown —
// crowns never shear); the `unit` is the Fira eyebrow that NAMES it; the `pill` is the optional
// ≤1-per-view record badge; the `gloss` is the Newsreader sentence beneath (a slot, so a route may
// sweep its verdict clause with a HandMark). The figure tints via `colorKind` (the page palette, on
// the FIGURE only — never colored body text, the ramp-ink ban).
//
// THE MULTIPLIER-GLOSS CONVENTION (A-01) rides the `format`/`gloss` pair: a multiplier crown reads
// "1.16× **as wide**", never "1.16× wider" — the × already carries the comparison, so the gloss
// names the dimension, not a second comparative. The primitive cannot enforce a sentence; it makes
// the two faces adjacent so the convention is visible where the copy is written.
//
// THE REVEAL CLOCK — SCROLL, off ONE scalar. `useCoverProgress` walks to the nearest [data-scroll-tl]
// beat host and reads the page's live cover position; `revealHostStyle` fades + lifts the figure and
// `countAt` dials the value, both P193-timed to COMPLETE at cover 0.50 (viewport centre) — the
// ratified count arm. No director, no viz id, no second clock. PRM: `useCoverProgress` pins to 1, so
// the figure mounts terminal and the value renders at its final digits (information parity, total) —
// the guard is the SUBSTRATE's, never a per-component reduced-motion fence.
//
// PRECISION: the `format` function owns it. A formatted crown counts FRACTIONALLY (`7.36×` must not
// collapse to `7×` mid-dial — the DemandRidge float-math the hand-rolled sites open-coded); a bare
// numeric crown counts in whole steps (a YEAR, a filing count). One rule, no dial.
//
// a11y: a `<figure>` whose value is the figure content (selectable, in the reading order) and whose
// unit/pill/gloss are the `<figcaption>`.
import { computed, ref } from "vue";
import FigureSlug from "../charts/frame/FigureSlug.vue";
import { countAt, revealHostStyle } from "../motion/reveal-register.js";
import { useCoverProgress } from "../motion/useCoverProgress.js";
import { figureLadderScalar, type FigureLadder } from "../story/beat-template.js";
import type { ColorKind } from "../charts/scale/colorKind.js";

/** The ≤1-per-view record badge (the §EMPHASIS-RECORD scarcity law) — a superlative the crown
    carries beside its unit ("2020 · peak year", "FY2026 · first crossing"). */
export interface CrownPill {
    /** The record's own figure (a year, a rank, a share). */
    value: string;
    /** What the record IS — the Fira-caps word beside it. */
    label: string;
}

const props = withDefaults(
    defineProps<{
        /** The datum. A NUMBER dials up on scroll-entry; a pre-formatted STRING renders verbatim. */
        value: number | string;
        /** The formatter the dialing value passes through (`formatMultiplier`, `formatUsdCompact`,
            `formatCount`). Present ⇒ the count runs fractional and the formatter owns precision;
            absent ⇒ the value dials in whole steps and renders bare. */
        format?: (n: number) => string;
        /** The Fira eyebrow that NAMES the figure (never a bare crown). */
        unit?: string;
        /** The Newsreader sentence beneath. The default slot overrides it when a route needs marked
            prose (a HandMark verdict clause) rather than a plain string. */
        gloss?: string;
        /** The optional record badge (≤1 per view — the §EMPHASIS-RECORD scarcity law). */
        pill?: CrownPill;
        /** THE FIGURE-LADDER FACE (A-08 · dial 12) — the crown's SIZE couples to its declared
            magnitude. Omit ⇒ the crown inherits the rung its BEAT declares (`DashboardEssay`
            publishes `--crown-rung` off the chapter's `figure` ladder), and an undeclared beat
            rests at the full audacious measure. */
        ladder?: FigureLadder;
        /** Tints the figure via the page palette (echoes the FigureInitial). */
        colorKind?: ColorKind;
        /** River-centered (default) or margin-anchored (the asymmetric lede inset). */
        align?: "center" | "lede";
    }>(),
    {
        format: undefined,
        unit: undefined,
        gloss: undefined,
        pill: undefined,
        ladder: undefined,
        colorKind: "diverging",
        align: "center",
    },
);

const host = ref<HTMLElement | null>(null);

// THE ONE SCALAR — the nearest beat host's live cover position (1 under PRM / a host-less mount).
const { t } = useCoverProgress(host);

/** The composed host style: the reveal fade+lift, plus the DECLARED rung when the crown carries its
    own `ladder` (an inline custom property, so it wins over the beat's inherited publication). */
const hostStyle = computed<Record<string, string>>(() => ({
    ...revealHostStyle(t.value),
    ...(props.ladder ? { "--crown-rung": String(figureLadderScalar(props.ladder)) } : {}),
}));

/** The dialing value — fractional under a formatter (the formatter owns precision), whole otherwise. */
const display = computed<string>(() => {
    if (typeof props.value === "string") return props.value;
    return props.format
        ? props.format(countAt(props.value, t.value, { round: false }))
        : String(countAt(props.value, t.value));
});
</script>

<template>
    <!-- The thesis crown — a <figure> at rung ②, on bare paper. NO plate, NO grid, NO glass. -->
    <figure
        ref="host"
        class="crown-figure"
        :class="`crown-figure--${align}`"
        :style="hostStyle"
        data-attn="thesis"
        data-testid="crown-figure"
        :data-color-kind="colorKind"
    >
        <!-- THE LADDER TRACK — the rung is a TRACK ladder, not a second font register: the slug
             recipe already sizes `min(rung, track-fit)` against its container, so narrowing the
             container narrows BOTH terms and the declared magnitude becomes the crown's measure. -->
        <span class="crown-figure__track">
            <FigureSlug as="span" class="crown-figure__value" data-attn-mark="plate-figure">{{
                display
            }}</FigureSlug>
        </span>

        <figcaption class="crown-figure__caption">
            <span v-if="unit" class="crown-figure__unit eyebrow-plain">{{ unit }}</span>
            <span v-if="pill" class="crown-figure__record" data-testid="crown-figure-record">
                <span class="crown-figure__record-value">{{ pill.value }}</span>
                <span class="crown-figure__record-label">{{ pill.label }}</span>
            </span>
            <span v-if="gloss || $slots.default" class="crown-figure__gloss text-prose-muted">
                <slot>{{ gloss }}</slot>
            </span>
        </figcaption>
    </figure>
</template>

<style scoped>
/* THE THESIS CROWN — the chapter's audacious lead figure. The value is the Fira `figure-slug`
   cap-box; the unit is the Fira eyebrow; the record is the ONE superlative; the gloss is
   Newsreader. Every size term is the platform's own — this SFC adds no type register. */
.crown-figure {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin: 0;
}
.crown-figure--center {
    align-items: center;
    text-align: center;
}
.crown-figure--lede {
    align-items: flex-start;
    text-align: start;
}
/* THE LADDER TRACK (A-08 · dial 12 — the wire's paint). `--crown-rung` is the 0..1 rung
   `figureLadderScalar` resolves; the track takes that share of the crown's measure and the slug
   recipe's container terms (the `39cqw` rung AND the `100cqi / (num-track × 0.62)` track-fit)
   follow it down — a REAL size ladder, not a nudge, because on any wide track the track-fit term
   is what binds (measured at :5173/sci: a 1246px crown track paints 251px of figure).
   The `max()` FLOOR is derived, not guessed: it holds the crown's font above the river
   `--type-figure-pull` cap (3.5rem), so a low rung recedes toward the interstitial register but
   never below it — the hero ≥ thesis-crown > river ladder survives every rung by construction.
   No rung declared anywhere ⇒ the fallback 1 ⇒ the full measure (an undeclared crown is
   byte-unchanged). */
.crown-figure__track {
    display: block;
    inline-size: max(18rem, calc(var(--crown-rung, 1) * 100%));
    max-inline-size: 100%;
    /* the container the slug's `cqw`/`cqi` terms resolve against (the L2 cohesion keystone). */
    container-type: inline-size;
}
.crown-figure--center .crown-figure__track {
    margin-inline: auto;
}
.crown-figure__value {
    display: block;
}
.crown-figure__caption {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    align-items: inherit;
}
.crown-figure__unit {
    margin: 0;
}
/* THE RECORD BADGE — the ONE superlative (§EMPHASIS-RECORD, ≤1 per view). The token is the route's
   OWN warm pole at raised chroma, clamped into the body-legibility band, so the badge reads as
   text at its small rung in both themes — never the retired hardcoded brass. */
.crown-figure__record {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35em;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: var(--emphasis-record);
}
.crown-figure__record-value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}
.crown-figure__record-label {
    text-transform: uppercase;
    opacity: 0.85;
}
/* The gloss holds a CAPTION measure, not a body one: 46ch is the low end of the classic 45–75ch
   band, so the sentence reads as the figure's caption rather than as a column of prose that happens
   to sit under it. It is deliberately WIDER than the river `PullFigure`'s 40ch one-liner — a chapter
   thesis carries an argument, a river figure carries a remark. */
.crown-figure__gloss {
    margin: 0;
    max-inline-size: 46ch;
}
</style>
