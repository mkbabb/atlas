<script setup lang="ts">
// FigureSlug.vue — the typeset-figure-slug primitive (C.W2.1; FD1 §1, FHV-1, master
// H-1/H-2/H-3/H-7). ONE contained audacious numeric the hero + HoverCard + axis all
// reach, so overflow/occlusion is STRUCTURALLY impossible and USF/SCI/ECF share ONE
// audacious register (the cohesion keystone, C2-4/HD-11).
//
// The four laws the slug enforces (FD1 §1.1) — each lives in the `figure-slug` recipe
// (recipes.css §1), NOT here; this SFC is a thin wrapper that slots a value into a
// recipe-bound cell:
//   L1 · the box reserves the ink   — line-box = cap-height (--slug-cap) + --slug-lead pad.
//   L2 · scales with its CONTAINER  — container-type:inline-size, size in cqw, not vw.
//   L3 · the box FITS its track     — contain:layout holds the box at t=0 (P-C2-10: a count-up
//                                     rolls digits INSIDE a reserved box, no mid-count reflow).
//                                     The `slug` register FITS its track (max-inline-size:100%,
//                                     not a static 9ch cap) so the `17cqw` font never overruns —
//                                     the inline shear that cut the unit `B` off dies at the root
//                                     (F6.4 / the scoped fit-to-track override below; §A.3 — the
//                                     unit suffix rides INSIDE the fitted box, never sheared).
//   L4 · tabular + aligned          — tnum/lnum/ss03 slashed-zero; the alignment IS the read.
//
// Three sizes (one VOICE, three rungs): `slug` is the audacious register itself (the
// $N.NNB hero / SCI / ECF figure); `axis` is the small tabular tick rung; `card` is the
// HoverCard fact figure. The numeric content is passed by slot (so a count-up directive
// or a plain string both seat in the reserved cell); an optional `unit` (the "B") and
// `sign` (the NET pole) ride at their own sub-rungs.
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        /** Which register: the audacious hero/SCI/ECF figure, the axis tick, or the card fact. */
        size?: "slug" | "axis" | "card";
        /** An optional unit suffix set at the small unit sub-rung (e.g. "B"). */
        unit?: string;
        /** An optional leading sign at the pole sub-rung (e.g. "−" / "+"). */
        sign?: string;
        /** The semantic element — `p` for a block figure, `span` to seat inline. */
        as?: "p" | "span" | "div";
    }>(),
    { size: "slug", unit: undefined, sign: undefined, as: "p" },
);

// The recipe class set: every variant carries `figure-slug` (the contained, tabular,
// cap-boxed cell); the axis/card sizes layer the smaller rung + their own measure.
const slugClass = computed(() => {
    switch (props.size) {
        case "axis":
            return "figure-slug figure-slug-axis";
        case "card":
            return "figure-slug figure-slug-card";
        default:
            return "figure-slug";
    }
});
</script>

<template>
    <component :is="props.as" :class="slugClass" data-figure-slug>
        <span v-if="props.sign" class="sign">{{ props.sign }}</span
        ><slot /><span v-if="props.unit" class="unit">{{ props.unit }}</span>
    </component>
</template>

<style scoped>
/* The unit + sign sub-rungs (FD1 §1.3). The unit (the "B") is a small recessive
   suffix; the sign rides the NET pole colour the call-site sets via --readout-sign-color
   (S1 §2.3) — defaulting to the inherited ink so a sign-less slug needs no token. */
.unit {
    font-size: 0.4em;
    font-weight: 400;
    letter-spacing: 0;
    /* THE UNIT INK (O-C2-TAIL — C7 residual). The unit is a SMALL suffix (0.4em ≈ 7.7px on a hero
       slug), so AA-NORMAL (4.5) governs it even when its parent rides the AA-large hero band. The
       prior flat `opacity: 0.58` STACKED on the parent's chromatic hero ink (a payer-red L0.62 that
       is only ~3.6:1 by design) sank the chromatic unit to 2.28 (usf 'B') — sub-AA. The recession
       is now carried by SIZE alone; the ink RE-CLAMPS the inherited hue into the body-legibility
       band (the §INK contract applied to currentColor: L≤0.47 light / ≥0.75 dark, chroma-guarded),
       so a chromatic unit clears AA-normal at its own small size while the NEUTRAL (foreground) case
       is a no-op. One derivation, both themes, no second token. */
    color: light-dark(
        oklch(from currentColor min(l, 0.47) min(c, 0.17) h),
        oklch(from currentColor max(l, 0.75) min(c, 0.15) h)
    );
}
.sign {
    color: var(--readout-sign-color, currentColor);
}

/* ── THE CH-4 ONE-REGISTER RECONCILE (I2.a · DESIGN §3.1 / I-PATH §5 CH-4) ──────────────────────
   The slug's fit-to-track + cap-box + H10 lifted clamp are now ONE register, AUTHORED IN THE
   RECIPE (recipes.css §1: `font-size: min(--type-figure-slug, <track-fit>)` + `max-inline-size:
   100%` + `overflow-x/y: visible`). The forked override that USED to live here — a scoped
   `max-inline-size:100%` + `overflow-x:visible` re-statement layered on top of the recipe's `9ch`
   + `overflow-x:clip` — is RETIRED: there is no longer a clip to override, because the recipe's
   `min(rung, track-fit)` term bounds the ink so the box fits BY CONSTRUCTION. ONE line-box regime,
   no fork. A figure's ink can neither SHEAR (the cap-box) nor COLLIDE with a sibling (the flex-
   track) at any viewport — the CH-4 chronic closed structurally.

   THE PER-ROW CAP-LINE (DESIGN §3.1 figure-row law). A consuming TRACK that renders a figure ROW
   (a hero triad / boundary pair) sets `--slug-num-track` to the LONGEST member's ch-count, so
   every member shares one cap-line and the leading number never shears smaller than its siblings.
   The recipe's track-fit term reads it; the default (9, fitted to "$8.92B") serves a lone slug. */

/* The phone register needs NO forked font rule — the recipe's `min(rung, track-fit)` term is
   already track-aware (`100cqi` resolves to the phone column's measure), so the figure scales down
   on a tight column from ONE rule, never a second @media font-size. The §A.2 mobile point-fix that
   USED to live here is folded into the one-register reconcile in recipes.css — no fork remains. */
</style>
