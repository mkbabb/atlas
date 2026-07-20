<script lang="ts">
// The module-scope block carries the public datum TYPE (a `<script setup>` cannot export runtime
// members; the family barrel re-exports this by name, like `LineSeries` on TimeSeries).

/** One discrete magnitude — a filing window, a cycle, a phase. `value: null` is a designed void
    (the column is absent, its slot kept: an honest hole, never a zero). */
export interface ColumnDatum {
    /** A stable key (the window x, the cycle index) — the active-column match reads it. */
    key: string;
    /** The axis word the column stands under ("W1", "FY26"). */
    label: string;
    /** The magnitude the column HEIGHT encodes. */
    value: number | null;
}
</script>

<script setup lang="ts">
// DiscreteColumns.vue — M0, THE DISCRETE MAGNITUDE MARK of the multi-year family (D-10's atlas
// rider). The M-family's line marks answer "how does this track?"; a field of THREE filing windows
// asks nothing of the kind — there is no between. An interpolated line across three discrete
// windows draws values that were never measured (the ECF window arc's false slope: a reading at
// "W1.6" that no window ever filed). The honest form for a sparse categorical span is a COLUMN per
// magnitude — the discrete figure, each column stating its own value, nothing drawn between them.
//
// The family seat is TrajectoryPlate's discriminator (a sparse window set renders THIS instead of
// the line); the crown's value-scaled magnitudes ride above, as they do for the line form.
//
// ECharts via `useEChart` — the SOLE lifecycle composable. The canvas tooltip is OFF (the Vue
// HoverCard is the platform hover, INV-6); the y-ceiling reserve is the SAME `niceCeil` the line
// primitive's crown reserve rounds through (one numeric register across the family).
import { computed, ref } from "vue";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import { useEChart } from "../composables/useEChart.js";
import { useVizPalette } from "../composables/useVizPalette.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { niceCeil } from "../composables/timeSeriesAxis.js";
import { BOUNDARY_AXIS } from "./TimeSeries.vue";
import { VIZ_GRID_CROWN } from "../lib/grid.js";

// Bar + grid; the TooltipComponent is registered but the option keeps it OFF (modular
// registration — the bundle carries the bar renderer only where a dashboard draws one).
use([BarChart, GridComponent, TooltipComponent]);

const props = withDefaults(
    defineProps<{
        /** The discrete magnitudes, in reading order (never re-sorted — a window sequence IS its
            order; the mark states the field it is handed). */
        columns: ColumnDatum[];
        /** The measure's palette stop — the column fill (one-colour-one-meaning). */
        color: string;
        /** The magnitude face — ROUTE THROUGH THE FORMAT LAW (no raw floats). Omit ⇒ no stamped
            value (the axis alone carries the read). */
        valueFormat?: (v: number) => string;
        /** The active column's key — the discrete form's RIVET (the line's active-year rivet has no
            meaning without a continuum, so the ACTIVE COLUMN carries the signal ink instead). */
        activeKey?: string;
        ariaLabel?: string;
    }>(),
    {
        valueFormat: undefined,
        activeKey: undefined,
        ariaLabel: "Discrete magnitudes",
    },
);

const host = ref<HTMLElement | null>(null);

// The canvas-colour bridge (T-4) — the axis/label inks are CSS tokens the canvas cannot read, so
// the resolved rgb is injected and re-resolved on a theme flip.
const palette = useVizPalette();
const reduced = useReducedMotion();

const option = computed<EChartsOption>(() => {
    const p = palette.value;
    const drawn = props.columns.filter((c) => c.value != null);
    const ceiling = niceCeil(Math.max(0, ...drawn.map((c) => c.value as number)) * 1.08);
    return {
        // The columns GROW on a data/filter re-feed (the same tuned enter/update register the line
        // rides); ECharts fences it under reduced motion itself.
        animation: !reduced.value,
        animationDuration: 600,
        animationEasing: "cubicOut",
        backgroundColor: "transparent",
        tooltip: { show: false },
        grid: { ...VIZ_GRID_CROWN, containLabel: true },
        xAxis: {
            type: "category",
            data: props.columns.map((c) => c.label),
            axisTick: { show: false },
            axisLine: { lineStyle: { color: p.grid } },
            axisLabel: BOUNDARY_AXIS.label(p.muted, p.fontMono, p.figureAxisPx),
        },
        yAxis: {
            type: "value",
            min: 0,
            max: ceiling > 0 ? ceiling : undefined,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: p.grid } },
            // The tick face is the caller's own magnitude format (the FORMAT LAW — the same
            // formatter the stamped column values wear, so the plate speaks ONE numeral register).
            axisLabel: {
                ...BOUNDARY_AXIS.label(p.muted, p.fontMono, p.figureAxisPx),
                ...(props.valueFormat
                    ? { formatter: (v: number) => props.valueFormat!(v) }
                    : {}),
            },
        },
        series: [
            {
                type: "bar",
                id: "discrete",
                // Wide columns — three magnitudes read as three BLOCKS, not three hairlines.
                barMaxWidth: 96,
                barWidth: "52%",
                data: props.columns.map((c) => ({
                    value: c.value,
                    id: c.key,
                    itemStyle: {
                        // The ACTIVE column wears the signal ink (the discrete rivet); the rest
                        // carry the measure's own stop.
                        color: c.key === props.activeKey ? p.signal : props.color,
                        borderColor: p.border,
                        borderWidth: 1,
                    },
                    // The magnitude stamped over its own column — the discrete figure states each
                    // value in the tabular figure voice, so no reading is inferred from a slope.
                    label: props.valueFormat
                        ? {
                              show: c.value != null,
                              position: "top" as const,
                              color: p.foreground,
                              fontFamily: p.fontMono,
                              fontSize: 12,
                              fontWeight: 500,
                              formatter: () => props.valueFormat!(c.value as number),
                          }
                        : { show: false },
                })),
            },
        ],
    };
});

// D6 — the cheap re-paint fingerprint: the drawn magnitudes + the active column. It moves on a
// data/filter re-scope or an active-window step, and stays still otherwise.
const seriesFingerprint = computed<string>(
    () =>
        props.columns.map((c) => `${c.key}:${c.value ?? "·"}`).join("|") +
        `#${props.activeKey ?? ""}`,
);

useEChart({
    host,
    option: () => option.value,
    fingerprint: () => seriesFingerprint.value,
    // T-PERF-4 — defer init+paint to first viewport; the host reserves its box via `chart-h-lg`.
    lazyMount: true,
});
</script>

<template>
    <!-- A fixed-height host — the canvas collapses to 0 without it (chart-h-lg, the large-plate
         rung the sibling marks share). -->
    <div
        ref="host"
        class="chart-h-lg w-full"
        role="img"
        :aria-label="ariaLabel"
        data-testid="discrete-columns"
    />
</template>
