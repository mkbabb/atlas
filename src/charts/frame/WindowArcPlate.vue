<script setup lang="ts">
// WindowArcPlate.vue — M2, THE WINDOW-ARC CROWN of the multi-year family (H.W2.a).
//
// M1 (TrajectoryPlate) PLUS the window-arc grammar: the cycle-bracket `markArea` band spanning
// the measured window (first real year → last real year) AND the forecast drop-rule at the
// measured→projected seam (the M4 vocabulary). Rendered by M3 (MultiYearFigure) ONLY when the
// `years≥6 ∧ continues` discriminator (`isTrajectoryWindow`) is true — a wide, continuous
// trajectory earns the bracket + forecast; a short/stale one degrades to the bare M1 plate.
// This is the family's ONE convention: the same primitives, the same discriminator, every
// route — never a bespoke per-route window.
//
// It is a THIN composition over M1: it computes the window span + the forecast boundary off the
// trajectory and forwards them as the `windowBand` + `forecastBoundaryX` props M1 already wires
// into TimeSeries' markArea / markLine. The crown anatomy (the rivet, the void stamp, the DOM
// markers, the ChartFrame posture) is M1's — M2 adds only the window grammar.
import { computed } from "vue";
import TrajectoryPlate from "@/charts/marks/TrajectoryPlate.vue";
import { useVizPalette } from "@/charts/composables/useVizPalette";
import { trajectory, type TrajectoryPoint } from "@/data/multiYear";
import { forecastBoundaryX as forecastBoundary } from "@/charts/marks/trajectory-marks";
import type { Feed } from "@/data/contract";

const props = withDefaults(
    defineProps<{
        feed: Feed;
        measures: string[];
        seriesMeta: Record<string, { label: string; color: string }>;
        leadMeasure?: string;
        activeYear: number;
        voidYear?: number;
        /** Draw the forecast drop-rule at the measured→projected seam (default true for a window). */
        showForecast?: boolean;
        overSubscriptionX?: number;
        xFormat?: (x: number) => string;
        yFormat?: (y: number) => string;
        /** THE EXPLICIT X-TICKS (I15 · forwarded through M1). See `TrajectoryPlate`'s `xTicks`. */
        xTicks?: number[];
        eyebrow?: string;
        ariaLabel?: string;
        size?: "default" | "hero";
        figId?: string;
    }>(),
    {
        leadMeasure: undefined,
        voidYear: undefined,
        showForecast: true,
        overSubscriptionX: undefined,
        xFormat: undefined,
        yFormat: undefined,
        xTicks: undefined,
        eyebrow: undefined,
        ariaLabel: "Multi-year window trajectory",
        size: "default",
        figId: undefined,
    },
);

const palette = useVizPalette();

const points = computed<TrajectoryPoint[]>(() =>
    trajectory(props.feed, props.measures),
);

const lead = computed<string>(() => props.leadMeasure ?? props.measures[0]);

/** The real (non-null lead) years — the measured window the bracket spans. */
const realYears = computed<number[]>(() =>
    points.value.filter((p) => p.values[lead.value] != null).map((p) => p.year),
);

/** The cycle-bracket band over the measured window (first real year → last real year). */
const windowBand = computed(() => {
    const ys = realYears.value;
    if (ys.length < 2) return undefined;
    return {
        fromX: Math.min(...ys),
        toX: Math.max(...ys),
        color: palette.value.signal,
        opacity: 0.08,
    };
});

/** The forecast boundary — one year past the last real year (the measured→projected seam). */
const forecastX = computed<number | undefined>(() => {
    if (!props.showForecast) return undefined;
    const ys = realYears.value;
    if (ys.length === 0) return undefined;
    return forecastBoundary(Math.max(...ys));
});
</script>

<template>
    <TrajectoryPlate
        :feed="feed"
        :measures="measures"
        :series-meta="seriesMeta"
        :lead-measure="leadMeasure"
        :active-year="activeYear"
        :void-year="voidYear"
        :window-band="windowBand"
        :forecast-boundary-x="forecastX"
        :over-subscription-x="overSubscriptionX"
        :x-format="xFormat"
        :y-format="yFormat"
        :x-ticks="xTicks"
        :eyebrow="eyebrow"
        :aria-label="ariaLabel"
        :size="size"
        :fig-id="figId"
    >
        <template v-if="$slots.title" #title><slot name="title" /></template>
        <template v-if="$slots.foot" #foot><slot name="foot" /></template>
    </TrajectoryPlate>
</template>
