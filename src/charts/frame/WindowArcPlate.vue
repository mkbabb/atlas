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
// O-X12 D6 — THE BAND ONLY PAINTS WHEN IT BRACKETS SOMETHING (the full-bleed wash fix). The
// CONTINUES gate guarantees the real run's trailing edge always reaches the feed's own latest
// year, so the bracket can only ever encode a genuine distinction on its LEADING edge (a
// soft-start ramp-up). A dense trajectory (real from the very first year — the USF decade, the
// SCI chase) has nothing to bracket; the band is suppressed rather than washing the entire
// plotted domain at zero information (see `windowBand` below).
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

/** The cycle-bracket band over the measured window (first real year → last real year) — but ONLY
    when that window is a PROPER SUBSET of the feed's own full span (O-X12 D6: the full-bleed
    wash). `isTrajectoryWindow`'s own CONTINUES gate (the family's ONE routing discriminator into
    this plate, `MultiYearFigure`) already guarantees the real run's TRAILING edge always reaches
    the feed's latest year — a stale tail can never route here. So the ONLY genuine window/forecast
    distinction this bracket can ever draw is a LEADING one: the real run starting LATER than the
    feed's own first year (a soft-start ramp-up). When the real run is dense from the very first
    year (the USF decade's 2021 splice is an INTERNAL void, not a leading one; the SCI chase is
    fully continuous), the band's rectangle would span the ENTIRE plotted domain — a wash encoding
    nothing — so it is suppressed rather than painted. No prop: the distinction is derivable
    entirely from the trajectory's own shape, so /usf beat V + /sci beat III clear without a
    consumer-side opt-out. */
const windowBand = computed(() => {
    const ys = realYears.value;
    if (ys.length < 2) return undefined;
    const fromX = Math.min(...ys);
    const toX = Math.max(...ys);
    const fullYears = points.value.map((p) => p.year);
    const fullMin = fullYears.length > 0 ? Math.min(...fullYears) : fromX;
    if (fromX <= fullMin) return undefined;
    return {
        fromX,
        toX,
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
