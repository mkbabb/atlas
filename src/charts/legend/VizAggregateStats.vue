<script setup lang="ts">
// VizAggregateStats.vue — THE AGGREGATE-STATS PLACEMENT (J-STORY §13 · C44 · J-FEEDBACK-5 §2/§7).
//
// J-FRAME DECLARES the `aggregateStats` facet on the VizContract (the high-level aggregate figures a
// viz lifts — the total, the rate, the count); VizPlate READS it and ROUTES it to the J-STORY-owned
// `#aggregate-stats` scoped slot at BOTH the top AND the bottom of the plate, OUTSIDE the gridded
// chart body. THIS component is the PLACEMENT — it renders that band so the high-level numbers read
// OUTSIDE the graph-paper (the viz-area-is-viz-ONLY law: the gridded plate carries the data MARKS
// alone; every title/eyebrow/aggregate-stat is hoisted into the surrounding composition).
//
// THE NUMBERS-HIERARCHY (§13 · the §6 figure-ladder grammar): the band is NOT a flat equal-weight
// row. The LEAD stat (the thesis figure) rides the audacious `slug` FigureSlug rung at --attn-data —
// the loudest mark in the band, but BELOW the page cover's --attn-hero/1.00 (the FIC-2 no-double-
// thesis law: an aggregate band is not the page thesis); the supporting stats step beneath it at the
// `card` rung / --attn-legend. This is the SAME `FigureSlug` cap-box ladder the page hero rides (the
// loudest figure is the thesis), applied to the aggregate band — one lead figure, the rest stepped,
// never a co-equal KPI strip.
//
// THE TOP/BOTTOM ALTERNATION: VizPlate hands the slot a `placement` ("top" | "bottom"). The band
// reads the placement so the eye finds a RHYTHM down the beat ladder (stat-band → viz → stat-band),
// not a uniform header stack — the lead figure leads at the top, and the supporting register settles
// at the bottom. The data is identical at either pole; the COMPOSITION distinguishes them.
//
// It COMPOSES FigureSlug (the cap-boxed audacious register, the I2 recipe) — never re-rolling a
// number layout. Tinting is a CSS-var NAME off the facet's `colorVar` (the i0-colorkind-law: never a
// hex). The data is the contract's thunk off the store reducers (the live face) — J-STORY PLACES it,
// it never re-computes the magnitude (J-DATA's).
import { computed } from "vue";
import FigureSlug from "@/charts/frame/FigureSlug.vue";
import type { AggregateStat } from "@/charts/contract/viz-contract";

const props = withDefaults(
    defineProps<{
        /** The declared aggregate stats (J-FRAME's facet thunk output — the live numbers). */
        stats: AggregateStat[];
        /** The pole VizPlate placed this band at — "top" leads with the thesis figure, "bottom"
            settles the supporting register (the top/bottom-alternating rhythm). */
        placement?: "top" | "bottom";
    }>(),
    { placement: "top" },
);

/** The lead (thesis) stat — the FIRST declared, rendered at the audacious hero rung. */
const lead = computed<AggregateStat | undefined>(() => props.stats[0]);
/** The supporting stats — stepped beneath the lead at the card rung (the hierarchy). */
const supports = computed<AggregateStat[]>(() => props.stats.slice(1));
</script>

<template>
    <!-- THE OUTSIDE-THE-GRID AGGREGATE BAND (§13). It sits OUTSIDE the `.viz-plate__body` graph-paper
         (VizPlate routes this slot above the body on `top`, below it on `bottom`), so the gridded
         chart area carries the data marks ALONE. The `data-placement` marks the pole the band rode
         (the alternation tell); the band wears the numbers-HIERARCHY (lead audacious, supports
         stepped). -->
    <dl
        v-if="stats.length"
        class="viz-aggregate-stats"
        :data-placement="placement"
        data-testid="viz-aggregate-stats"
    >
        <!-- THE LEAD (thesis) figure — the loudest mark in the band, the audacious `slug` rung. It
             rides --attn-data (saturated), NOT --attn-hero/1.00 (the page cover owns the 1.00 rung —
             the FIC-2 no-double-thesis law: an aggregate band is not the page thesis). -->
        <div v-if="lead" class="agg-stat agg-stat--lead">
            <dd class="agg-stat__value">
                <FigureSlug
                    size="slug"
                    :style="
                        lead.colorVar ? { color: `var(${lead.colorVar})` } : undefined
                    "
                    >{{ lead.value }}</FigureSlug
                >
            </dd>
            <dt class="agg-stat__caption">{{ lead.caption }}</dt>
        </div>

        <!-- THE SUPPORTING figures — stepped beneath the lead at the card rung. -->
        <div
            v-for="(s, i) in supports"
            :key="i"
            class="agg-stat agg-stat--support"
        >
            <dd class="agg-stat__value">
                <FigureSlug
                    size="card"
                    :style="s.colorVar ? { color: `var(${s.colorVar})` } : undefined"
                    >{{ s.value }}</FigureSlug
                >
            </dd>
            <dt class="agg-stat__caption">{{ s.caption }}</dt>
        </div>
    </dl>
</template>

<style scoped>
/* THE AGGREGATE BAND — a figure-family row OUTSIDE the grid, the lead audacious + the supports
   stepped (the numbers-hierarchy). The lead claims its own line lead-in; the supports flow beside /
   below it, so the eye reads the thesis figure FIRST then the supporting register. Wraps gracefully
   at the narrow flank (the supports drop under the lead). */
.viz-aggregate-stats {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.75rem 2.5rem;
    margin: 0;
    padding: 0;
}
/* The TOP band leads the plate (a hair of breathing room beneath); the BOTTOM band settles after
   the marks (a hair above). The alternation rhythm — stat-band → viz → stat-band. */
.viz-aggregate-stats[data-placement="top"] {
    margin-block-end: 0.5rem;
}
.viz-aggregate-stats[data-placement="bottom"] {
    margin-block-start: 1rem;
}
.agg-stat {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-inline-size: 0;
}
/* THE LEAD claims the audacious rung — the loudest figure in the band (the thesis). It gets the
   whole first column lead-in so the supporting stats step beneath/beside it. */
.agg-stat--lead {
    flex: 0 0 auto;
}
.agg-stat__value {
    margin: 0;
    /* the lead rides at --attn-data (saturated, below the page cover's --attn-hero/1.00 — FIC-2);
       the tint is the facet's data hue. */
    opacity: var(--attn-data, 0.92);
}
/* The supporting figures recede to the legend register below the lead (the stepped hierarchy). */
.agg-stat--support .agg-stat__value {
    opacity: var(--attn-legend, 0.64);
}
.agg-stat__caption {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
</style>
