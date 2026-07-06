<script setup lang="ts">
// platform/editorial/PullFigure.vue — ① the audacious BETWEEN-PLATE figure (the pull-quote, in
// numbers). F3a / design-interstitial-system §3.1 · f6-hero-interstitials §2.B-① · the
// design-hierarchy §13 rung ③½ correction.
//
// The magazine pull-quote, set in numbers: a single big Fira figure with a one-line gloss,
// PULLED from the next plate's data to fore-shadow it ("33 states pay in more than they draw
// out" before the break-even scatter). It sits in the RIVER between plates — NO plate, NO grid,
// NO glass (DESIGN §2 BREAK-OUT: thesis figures live OFF the gridded plate); it is the page-scale
// echo of the hero series, mid-scroll.
//
// THE RUNG — ③½, the river-never-out-weighs-the-chapter law (design-hierarchy FIC-3 / §13): a
// PullFigure recedes from a PLATE thesis figure on BOTH axes — by OPACITY (--attn-pull, 0.80) AND
// by SIZE (--type-figure-pull, the dedicated SUB-thesis register, NOT the page-cover slug rung).
// I13 (design-ecf §0/§CROSS-VIZ) found opacity-only recession insufficient: the river figure still
// inherited the FULL --type-display-audacious slug rung, so the ECF `98` rendered ~176px and OUT-
// shouted the cliff thesis crown (72px) + the hero cover triplet (64px) — the ladder inverted. The
// value now re-points the slug rung to --type-figure-pull (the cap-box min(rung,track-fit) term is
// unchanged — it still cannot shear), so a river figure reads clearly BELOW every chapter thesis.
// A page-level figure in the river must NOT out-weigh the very plate it foreshadows — so it NEVER
// binds --attn-thesis and never wears the cover slug rung. The ladder: hero ≥ thesis-crown > river.
//
// THE THREE FACES, total (DESIGN §6): the value is `figure-slug` (the Fira audacious cap-box —
// crowns never shear, the F6.4 close); the unit is the Fira eyebrow caption (it NAMES the unit);
// the gloss is Newsreader. No fourth face. The figure tints via `colorKind` (the page palette,
// on the FIGURE only — never colored body text, the ramp-ink ban). THE RING-KILL (H.W1.b · F7.3 ·
// AXIOM-4 morphology): the editorial DatumRing the `ring` prop once mounted is RETIRED — the
// hand-circle was wrong at any weight; the river figure's SIZE is its sole emphasis (the inversion
// law made literal). No ring, no `ring` prop.
//
// THE REVEAL CLOCK — SCROLL: the value count-ups on scroll-ENTRY via the count-up engine, gated
// on the beat's re-entry (a number you scroll back to arrives afresh — `retriggerOnReentry`), NOT
// scrubbed per scroll-frame (a number is a VALUE, not a position — the MC-6 anti-move). PRM: the
// value renders at its FINAL figure (the count snaps — `useCountUp` short-circuits under reduce);
// information parity total. a11y: a `<figure>` with the value as the figure content (selectable,
// in the reading order), the unit + gloss as `<figcaption>`; the count never changes the
// accessible name (the rendered text IS the final value).
import { computed, ref } from "vue";
import FigureSlug from "@/charts/frame/FigureSlug.vue";
import { useCountUp } from "@/platform/composables/useCountUp";
import type { ColorKind } from "@/charts/scale/colorKind";

const props = withDefaults(
    defineProps<{
        /** The datum — pre-formatted via format.ts at the call site / manifest (INV-E1). A
            string renders verbatim; a number counts up on scroll-entry. */
        value: string | number;
        /** The Fira eyebrow caption — NAMES the unit (the F6.4 close; never a bare figure). */
        unit: string;
        /** The Newsreader one-line gloss beneath (the "why this matters"). */
        gloss: string;
        /** Tints the figure via the page palette (echoes the FigureInitial). */
        colorKind?: ColorKind;
        /** River-centered (default) or margin-offset (the asymmetric inset). */
        align?: "center" | "lede";
    }>(),
    { colorKind: "diverging", align: "center" },
);

/** Parse the value for the scroll-entry count; a formatted string renders verbatim (no count). */
function numericOf(v: string | number): number {
    if (typeof v === "number") return v;
    const m = v.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : 0;
}

const figureEl = ref<HTMLElement | null>(null);

// The scroll-entry count — re-fires on viewport re-entry (the page-turn arrival), never scrubbed
// per frame. The RENDERED text is always the figure's own formatted string at its final value, so
// a pre-formatted slug never loses its unit/grouping. PRM: snaps on entry (information parity).
const target = computed(() => ({ v: numericOf(props.value) }));
useCountUp(() => target.value, {
    autoRecount: false,
    retriggerOnReentry: true,
    reentryTarget: () => figureEl.value,
});

const display = computed(() => String(props.value));
</script>

<template>
    <!-- The pull-quote in numbers — a <figure> in the river. It binds --attn-pull (the river
         rung ③½, recessed from a plate thesis). NO plate, NO grid, NO glass: the bare paper. -->
    <figure
        ref="figureEl"
        class="pull-figure"
        :class="`pull-figure--${align}`"
        data-attn="pull"
        data-testid="pull-figure"
        :data-color-kind="colorKind"
    >
        <!-- THE RING-KILL (H.W1.b): the bare audacious slug — its SIZE is its emphasis (no ring). -->
        <FigureSlug as="span" class="pull-figure__value">{{ display }}</FigureSlug>

        <figcaption class="pull-figure__caption">
            <span class="pull-figure__unit eyebrow">{{ unit }}</span>
            <span class="pull-figure__gloss text-prose-muted">{{ gloss }}</span>
        </figcaption>
    </figure>
</template>

<style scoped>
/* THE RIVER PULL-FIGURE — the page-scale echo of the hero series, mid-scroll, on bare paper. The
   value is the audacious `figure-slug` cap-box (the recipe owns the Fira crown); the unit is the
   Fira eyebrow; the gloss is Newsreader. The rung ③½ recession multiplier rides the host. */
.pull-figure {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin: 0;
    /* a container so the slug's `17cqw` resolves against the figure's own track (L2). */
    container-type: inline-size;
}
.pull-figure--center {
    align-items: center;
    text-align: center;
}
.pull-figure--lede {
    align-items: flex-start;
    text-align: start;
    /* the margin-offset asymmetric inset (a desktop composition move; reflows on phone). */
    margin-inline-start: clamp(0rem, 6%, 4rem);
}
.pull-figure__value {
    display: block;
    /* the rung ③½ recession (the SUFFUSION contract — never a brush-intrinsic alpha).
       Scoped to the VALUE's ink mass: the rung governs the figure's visual weight; the
       unit/gloss CAPTION TEXT stays full-ink — WCAG 1.4.3 AA (4.5:1) is the floor no
       recession may cross (the host-level fade read the captions at 3.58:1 on the warm
       wash — the convergence-pass axe finding, fixed at this root). */
    opacity: var(--attn-pull);
    /* THE ③½ SIZE RECESSION (I13 figure-ladder · design-ecf §0/§CROSS-VIZ). The river rung
       was inheriting the FULL --type-display-audacious slug register (the page-cover size — the
       ECF `98` rendered ~176px, OUT-shouting both the cliff thesis crown (72px) and the hero
       cover triplet (64px), inverting the ladder). The pull-figure recesses by SIZE as well as
       opacity now: re-point the slug recipe's rung to the dedicated SUB-thesis --type-figure-pull
       register, so the cap-box `min(rung, track-fit)` term (unchanged — the figure still cannot
       shear) seats the river figure clearly BELOW every chapter thesis. The ladder reads
       hero ≥ thesis-crown > interstitial by construction. */
    --type-figure-slug: var(--type-figure-pull);
}
.pull-figure__caption {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    align-items: inherit;
}
.pull-figure__unit {
    margin: 0;
}
.pull-figure__gloss {
    margin: 0;
    max-inline-size: 40ch;
}
</style>
