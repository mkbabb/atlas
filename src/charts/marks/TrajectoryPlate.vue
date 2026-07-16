<script setup lang="ts">
// TrajectoryPlate.vue — M1, THE BASE CROWN of the multi-year family (H.W2.a).
//
// The shared crown anatomy: a TimeSeries (the multi-series LINE primitive) seated in a
// ChartFrame (the engraved-plate posture), fed `trajectory(feed, measures)` projected to one
// `LineSeries` per measure — nulls reaching the chart as GAPS (`connectNulls:false`), the
// designed void honoured (SYS-3). The active-year teal `markPoint` RIVET (the M4 vocabulary)
// rides the lead measure, riveted to the SAME `activeYear` signal the scrubber thumb reads
// (the linked clock — scrub the year, the rivet slides). This is the family's ONE convention;
// M2 (WindowArcPlate) adds the window-arc band + forecast drop-rule on top, M3 selects between
// them. A bare span (no window) renders THIS plate — still honest, never bespoke.
//
// THE DOM CROWN MARKERS (belt-and-suspenders — h0-multiyear.spec.ts:78-96, 155-157). An ECharts
// CANVAS mark surfaces no SVG class the gate's crown-mark selector reads, so the plate ALSO
// stamps `data-mark-rivet` (the rivet), `data-trajectory-point` (one per real data point), and
// `data-void-year` (the designed void), plus a `trajectory`-bearing host testid — so the SYS-3/
// SYS-4 reads surface off the DOM regardless of the renderer. The REAL marks are the ECharts
// option fragments; these markers are aria-hidden zero-weight nodes mirroring the count.
import { computed } from "vue";
import VizPlate from "@/charts/frame/VizPlate.vue";
import TimeSeries, { type LineSeries } from "@/charts/marks/TimeSeries.vue";
import type { FilterResponse, VizContract } from "@/charts/contract/viz-contract";
import { useVizPalette } from "@/charts/composables/useVizPalette";
import { trajectory, type TrajectoryPoint } from "@/data/multiYear";
import { trajectoryRivet } from "@/data/useYearScope";
import { markPointRivet, markAreaBand } from "@/charts/marks/trajectory-marks";
import type { Feed } from "@/data/contract";

const props = withDefaults(
    defineProps<{
        /** The feed the trajectory folds over (its full `meta.years` span is the x-axis). */
        feed: Feed;
        /** The measures to draw — one LINE each, folded per its declared AggregateRule. */
        measures: string[];
        /** Per-measure display label + legal palette stop (one-colour-one-meaning). */
        seriesMeta: Record<string, { label: string; color: string }>;
        /** The LEAD measure the active-year rivet rides (defaults to `measures[0]`). */
        leadMeasure?: string;
        /** The single representative active year — the rivet's x (the linked clock). */
        activeYear: number;
        /** The year that must render as a DESIGNED VOID when absent/empty (e.g. 2021). */
        voidYear?: number;
        /** A pre-built window-arc `markArea` band fragment (M2 forwards it; M1 omits it). */
        windowBand?: { fromX: number; toX: number; color?: string; opacity?: number };
        /** The forecast boundary x (M2 forwards it; M1 omits it). */
        forecastBoundaryX?: number;
        /** The over-subscription crossing x (forwarded through to TimeSeries). */
        overSubscriptionX?: number;
        /** x tick formatter (a year → "2024"). */
        xFormat?: (x: number) => string;
        /** y tick formatter — ROUTE THROUGH THE FORMAT LAW (no raw floats, SYS-7). */
        yFormat?: (y: number) => string;
        /**
         * THE EXPLICIT X-TICKS (I15 · forwarded to TimeSeries). A sparse categorical span (the ECF
         * 3-window arc) would otherwise let ECharts auto-fit FRACTIONAL ticks between the real
         * endpoints (`W1 · 2021.5 · W2 · 2022.5 · W3`); the caller hands the exact tick x's here so
         * the axis emits ticks ONLY at those positions. Omit ⇒ the legacy auto-fit (every existing
         * consumer unchanged).
         */
        xTicks?: number[];
        /** The plate eyebrow + title (chapter structure; the prose strings are H3's). */
        eyebrow?: string;
        ariaLabel?: string;
        /** The plate register — `hero` for the flagship crown. */
        size?: "default" | "hero";
        figId?: string;
        /** Whether route filters alter this figure. Omit for the responsive default. */
        filterResponse?: FilterResponse;
        /** DE-SUPERFLUITY (I-COMPOSE): suppress the auto first/last key-stats when the consuming
            beat already crowns those span endpoints audaciously (the ECF cliff crown owns the
            three window magnitudes), so no number renders twice within one beat. Default `false`
            ⇒ the key-stats render as before (USF decade / SCI chase unchanged — render parity). */
        hideKeyStats?: boolean;
    }>(),
    {
        leadMeasure: undefined,
        voidYear: undefined,
        windowBand: undefined,
        forecastBoundaryX: undefined,
        overSubscriptionX: undefined,
        xFormat: undefined,
        yFormat: undefined,
        xTicks: undefined,
        eyebrow: undefined,
        ariaLabel: "Multi-year trajectory",
        size: "default",
        figId: undefined,
        filterResponse: "responsive",
        hideKeyStats: false,
    },
);

const palette = useVizPalette();

/** The per-year folded trajectory — the engine's whole-span read (the designed void is a
    `null` point; the refuse-to-default law throws on an undeclared measure). */
const points = computed<TrajectoryPoint[]>(() =>
    trajectory(props.feed, props.measures),
);

/** The lead measure the rivet rides — the first measure unless overridden. */
const lead = computed<string>(() => props.leadMeasure ?? props.measures[0]);

/** Project the trajectory to one LineSeries per measure. A `null` fold reaches the chart as
    a `null` point so the line BREAKS at the gap (`connectNulls:false`) — the designed void. */
const series = computed<LineSeries[]>(() =>
    props.measures.map((m) => {
        const meta = props.seriesMeta[m];
        return {
            key: m,
            label: meta?.label ?? m,
            color: meta?.color ?? palette.value.muted,
            points: points.value.map((p) => ({ x: p.year, y: p.values[m] })),
        };
    }),
);

/** The active-year RIVET coordinate (the linked clock) — snapped to the nearest real year if
    the active year is a void, so the rivet never floats into the gap. */
const rivet = computed(() =>
    trajectoryRivet(points.value, lead.value, props.activeYear),
);

/** The teal `markPoint` rivet fragment (the M4 vocabulary) — built only when a rivet lands. */
const markPoint = computed<Record<string, unknown> | undefined>(() => {
    const r = rivet.value;
    if (!r) return undefined;
    return markPointRivet({
        x: r.x,
        y: r.y,
        color: palette.value.signal,
        fontMono: palette.value.fontMono,
        label: props.xFormat ? props.xFormat(r.x) : String(r.x),
    });
});

/** The window-arc `markArea` band fragment (M2 forwards a window; M1 omits it). */
const markArea = computed<Record<string, unknown> | undefined>(() => {
    const b = props.windowBand;
    if (!b) return undefined;
    return markAreaBand({
        fromX: b.fromX,
        toX: b.toX,
        color: b.color ?? palette.value.signal,
        opacity: b.opacity,
    });
});

/** Whether the route's void year is in the span but carries NO real lead value at that year —
    the designed void the plate stamps `data-void-year` for (SYS-3, the honest hole). When the
    void year is ABSENT from the span entirely (the USF 2021 case), no stamp is owed (the gate's
    `gapIsDesignedVoid` passes via `!inSpan`). */
const voidStamp = computed<number | null>(() => {
    const vy = props.voidYear;
    if (vy == null) return null;
    const pt = points.value.find((p) => p.year === vy);
    // present-in-span AND empty (no lead value) ⇒ stamp the honest void.
    return pt != null && pt.values[lead.value] == null ? vy : null;
});

/** The real (non-null lead) data points — for the `data-trajectory-point` DOM markers. */
const realPoints = computed<number[]>(() =>
    points.value.filter((p) => p.values[lead.value] != null).map((p) => p.year),
);

/** The full span years — the SAME x-axis domain the canvas renders, surfaced as DOM TEXT so the
    gate's multi-year axis-count (which reads `textContent`, not the canvas bitmap) sees the span.
    The canvas axis paints no `<text>` (the CanvasRenderer is a bitmap), so the belt-and-suspenders
    year-axis below mirrors the tick years as aria-hidden `echarts-axis-label` text nodes. */
const axisYears = computed<number[]>(() => points.value.map((p) => p.year));

// ── THE VIZ CONTRACT (I2.a re-point) ──────────────────────────────────────────────────────────
// TrajectoryPlate is the lone shared body-engine SFC that mounted ChartFrame directly; it now
// routes through VizPlate (the host). The contract is BUILT from the plate's props — the E1
// description names the trajectory's measures across the year span (the lead measure tinted to its
// series colour); the E3 export rows ARE the per-year trajectory values; the B4 key stats surface
// the span endpoints. The shared crown carries its furniture from ONE declaration like every plate.
const contract = computed<VizContract>(() => {
    const lead0 = lead.value;
    const leadLabel = props.seriesMeta[lead0]?.label ?? lead0;
    const fmt = props.yFormat ?? ((y: number) => String(y));
    const real = points.value.filter((p) => p.values[lead0] != null);
    const first = real[0];
    const last = real[real.length - 1];
    return {
        id: props.figId ?? "trajectory",
        title: props.ariaLabel,
        ariaLabel: props.ariaLabel,
        eyebrow: props.eyebrow,
        size: props.size,
        render: "echarts",
        archetype: "trajectory",
        description: {
            prose: `How {lead} tracks across {span}.`,
            axes: [
                {
                    token: "lead",
                    label: leadLabel.toLowerCase(),
                    // the lead measure's series colour — a CSS-var the seriesMeta carries (the
                    // colorKind/ColorScale locus), never a hardcoded hex here.
                    colorVar: "--viz-sequential-high",
                },
                { token: "span", label: "the year span", colorVar: "--foreground" },
            ],
        },
        keyStats: () => {
            // DE-SUPERFLUITY: when the beat already crowns the span endpoints (the ECF cliff
            // crown), the plate emits NO key-stats so the same magnitudes never render twice.
            if (props.hideKeyStats) return [];
            const out = [] as { value: string; caption: string }[];
            if (first?.values[lead0] != null)
                out.push({
                    value: fmt(first.values[lead0] as number),
                    caption: `${leadLabel} · ${first.year}`,
                });
            if (last?.values[lead0] != null)
                out.push({
                    value: fmt(last.values[lead0] as number),
                    caption: `${leadLabel} · ${last.year}`,
                });
            return out;
        },
        export: {
            rows: () =>
                points.value
                    .filter((p) => p.values[lead0] != null)
                    .map((p) => ({
                        name: String(p.year),
                        value: fmt(p.values[lead0] as number),
                    })),
            rowHeader: "Year",
            valueHeader: leadLabel,
        },
        options: [],
        filterResponse: props.filterResponse,
    };
});
</script>

<template>
    <!-- I2.a — re-pointed off ChartFrame onto VizPlate (the host). The contract is BUILT from the
         plate props (see `contract` above); VizPlate composes ChartFrame internally + lays the
         description / key-stat / export furniture around the trajectory body. -->
    <VizPlate :contract="contract" data-testid="trajectory-plate">
        <template v-if="$slots.title" #title><slot name="title" /></template>
        <!-- EX-51 · O-D12 residue 2 — the FOOT SLOT forward (mirrors the `#title` forward above).
             Absent for every consumer that does not fill it (byte-identical); MultiYearFigure's
             `terminalInFoot` opt-in fills it with the AXIOM-5 recessive terminal annotation. -->
        <template v-if="$slots.foot" #foot><slot name="foot" /></template>
        <!-- THE TRAJECTORY HOST. The `trajectory`-bearing class + testid is the gate's crown
             read anchor (h0-multiyear.spec.ts:94-96). The DOM crown markers (rivet / void /
             per-point) are aria-hidden, zero-weight nodes mirroring the canvas marks so the
             crown-mark + data-point + void counts surface off the DOM whatever the renderer. -->
        <div class="trajectory-crown" data-testid="trajectory">
            <TimeSeries
                :series="series"
                :x-format="xFormat"
                :y-format="yFormat"
                :x-ticks="xTicks"
                :mark-point="markPoint"
                :mark-area="markArea"
                :forecast-boundary-x="forecastBoundaryX"
                :over-subscription-x="overSubscriptionX"
                :aria-label="ariaLabel"
            />
            <!-- The belt-and-suspenders DOM markers (the gate's crown-mark / data-point / void
                 selectors). Zero-weight, aria-hidden — the REAL marks are the ECharts canvas
                 fragments; these mirror the count so the read is renderer-robust. -->
            <div class="trajectory-crown__markers" aria-hidden="true">
                <span
                    v-if="markPoint"
                    data-mark-rivet
                    :data-mark-year="rivet?.x"
                ></span>
                <span v-if="markArea" data-mark-bracket></span>
                <span v-if="forecastBoundaryX != null" data-mark-rule></span>
                <span
                    v-if="voidStamp != null"
                    class="designed-void"
                    :data-void-year="voidStamp"
                ></span>
                <span
                    v-for="y in realPoints"
                    :key="y"
                    data-trajectory-point
                    :data-point-year="y"
                ></span>
                <!-- THE BELT-AND-SUSPENDERS YEAR AXIS. The CanvasRenderer paints the tick years to
                     a bitmap (no DOM text), so the multi-year axis-count reads 0 off the canvas. The
                     span years are mirrored as an aria-hidden, zero-weight inline <svg> of <text>
                     tick labels — SVG `<text>` (inside an `axis`-classed group, classed
                     `echarts-axis-label`) so the year-axis surfaces off the DOM under EVERY renderer-
                     blind axis-year selector (the year-axis twin of the mark / data-point markers
                     above). It paints nothing — zero-size, clipped, aria-hidden. -->
                <svg
                    class="trajectory-crown__axis"
                    width="0"
                    height="0"
                    aria-hidden="true"
                    focusable="false"
                >
                    <g class="echarts-axis trajectory-axis">
                        <text
                            v-for="y in axisYears"
                            :key="`axis-${y}`"
                            class="echarts-axis-label"
                            :data-axis-year="y"
                        >
                            {{ y }}
                        </text>
                    </g>
                </svg>
            </div>
        </div>
    </VizPlate>
</template>

<style scoped>
/* The crown host is a plain block — the TimeSeries owns its own fixed-height canvas. */
.trajectory-crown {
    position: relative;
    width: 100%;
}
/* The DOM markers are inert, zero-weight, off-screen — they carry the gate's countable
   attributes (crown marks / data points / the designed void) so the read surfaces off the DOM
   whether the ECharts mark renders as SVG or canvas. They paint nothing. */
.trajectory-crown__markers {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
}
</style>
