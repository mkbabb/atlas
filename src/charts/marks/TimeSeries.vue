<script lang="ts">
// The module-scope script (a plain <script> block, not <script setup>): the named RUNTIME
// export (BOUNDARY_AXIS) + the public TYPE exports (SeriesPoint/LineSeries) live here so they
// are real module members StackedBar + the MultiYearFigure family import; <script setup> cannot carry
// named runtime exports, and an SFC re-exports the plain block's members (not setup's).
import { type TrendFit } from "../composables/useTrendline.js";

/** One observation on a series. */
export interface SeriesPoint {
    x: number;
    y: number | null;
}

/** One named line over the shared x-axis. */
export interface LineSeries {
    /** A stable series key (for the legend + the linked-highlight). */
    key: string;
    /** The series display label. */
    label: string;
    /** The line colour — a legal palette stop the caller picks (one-colour-one-meaning). */
    color: string;
    /** The ordered observations. Nulls break the line at a gap (a summer month excluded). */
    points: SeriesPoint[];
    /**
     * Draw a least-squares trend curve for this series. "log" fits y vs ln(x) (the
     * economies-of-scale bend); "linear" the straight regression. Omit for no trend.
     */
    trend?: TrendFit;
    /**
     * Fill the region under this line as a SHADED BAND (the SCI headroom encoding — the
     * contracted↔peak gap, FD4 §3.1's "one emotional read", C2-6/HD-D2). `opacity` is the
     * faint shading (default 0.1); `stack` rides the area on a stacked baseline so the band's
     * top edge sits on a sibling series (the headroom band stacks ON peak → top = ceiling).
     * The band is read, not legended (the lines own legend + hover): set `silent`/`hideInLegend`.
     */
    areaStyle?: { opacity?: number };
    /**
     * The shared stack id — series with the same id stack their `y`. The headroom band
     * carries the GAP (`ceiling − peak`) and stacks on the peak line so its top edge reaches
     * the ceiling (FD4 §3.1, B3.1). Omit for an un-stacked plain line.
     */
    stack?: string;
    /** Keep this series out of the legend strip (the band is read, never named). */
    hideInLegend?: boolean;
    /** Never steal the hover (the lines own interaction; the band is recessive). */
    silent?: boolean;
    /**
     * A HIDDEN stack base — drawn with no stroke and no fill, present ONLY to seat a band on a
     * non-zero baseline. The over-subscription band (E15b) stacks on a hidden `contracted` base
     * so it fills from the ceiling UP to peak; the base itself must not paint a second line over
     * the real contracted-ceiling line. Set with `stack` + no `areaStyle`.
     */
    hidden?: boolean;
    /**
     * THE BAND-EMPHASIS ROLE (fw-sci FW-III — figure/ground inversion fixed at the primitive).
     * A *single-derived-quantity-over-time* claim (a gap/headroom/delta band) is the SUBJECT,
     * not the lines that bound it. Set on the band series to promote it to FIRST-CLASS figure:
     * the band fills at figure weight (the named `--type` opacity floor, not a 0.1 ghost) and
     * every OTHER series on the same chart RECEDES to context (reference-line weight). The form
     * is no longer "three tangled lines + a faint area"; it is "the gap, drawn, with the bounding
     * lines as quiet reference." (the MultiYearFigure family opts in; E-ATLAS generalizes the role.)
     */
    bandEmphasis?: boolean;
    /**
     * THE NON-COLOUR SECONDARY ENCODING (WCAG 1.4.1 · viz-redundancy). The line's DASH pattern —
     * `"solid"` | `"dashed"` | `"dotted"` — so series stay distinguishable WITHOUT relying on hue
     * (warm terracotta vs umber-dead is confusable for red-deficient vision). Pairs with `endLabel`
     * (direct end-of-line naming) so the chart carries no colour-only key. Omit ⇒ the resolved
     * solid stroke (every existing consumer unchanged).
     */
    dash?: "solid" | "dashed" | "dotted";
    /**
     * THE DIRECT END-OF-LINE LABEL (the botanical-plate direct-labelling idiom · WCAG 1.4.1). The
     * text stamped at the line's TERMINAL datum (e.g. `"no smoke · 86%"`) so each line names itself
     * ON the plot — the period-correct alternative to a colour-keyed legend, and the strongest 1.4.1
     * read (name + colour + dash colocated on the mark). Colliding end labels are nudged apart
     * vertically (`labelLayout.moveOverlap`). Omit ⇒ no end label (every consumer unchanged).
     */
    endLabel?: string;
}

// ── The ONE boundary-equal axis preset (FHV-6 / B3, §5.2) ───────────────────────────────
// StackedBar consumes the SAME preset: every tick — first, interior, last — renders at the
// SAME tabular rung (the Fira Code figure voice, one fontSize), the boundary tick reserving
// its box via `margin` + the `grid.left` inset; `showMinLabel`/`showMaxLabel` keep the
// boundary ticks from being dropped, `hideOverlap` thins only on true collision. TimeSeries +
// StackedBar both consume this so the numeric register is shared (the SCI trend + the rainbow
// stack axes read alike).
// NON-REGRESSION (C2-2/HD-6): the chrome color is the RESOLVED `palette.muted` the caller
// passes — NEVER a raw `var(--)` (the C1 grep-guard stays green; this preset re-introduces
// none). `gridLeft` is the gutter inset reserving the origin glyph (B3).
export const BOUNDARY_AXIS = {
    gridLeft: 64,
    /** The shared `axisLabel` — `color` is the resolved chrome ink, never a `var()`. `figurePx`
        is the resolved AXIS-SLUG rung (the figure-slug-axis voice, pv-c2): the caller hands the
        live computed px off `--type-figure-axis` (via `useVizPalette().figureAxisPx`) so the tick
        wears the slug register the hero + HoverCard reach, never the frozen `12` it was stuck at.
        Omit ⇒ the legacy 12px rung (the canvas cannot read a var/clamp, so the fallback is a
        literal number, not the token). */
    label(color: string, fontMono: string, figurePx?: number) {
        return {
            showMinLabel: true,
            showMaxLabel: true,
            margin: 12,
            hideOverlap: true,
            fontFamily: fontMono,
            fontSize: figurePx ?? 12,
            color,
        };
    },
};
</script>

<script setup lang="ts">
// TimeSeries.vue — the multi-series LINE primitive (SCI-PAGES §2, the Utilization plate:
// contracted ceiling vs 95th-pctile actual over the months, summers excluded — the second-
// largest design-parity gap after the map). N series over a shared x-axis, each an ordered
// `{x, y}[]`; an optional per-series TREND fit (linear | log via `useTrendline`) draws the
// guide curve the workbook puts on the headroom line. ECharts via `useEChart`, the sole
// lifecycle composable; the canvas tooltip is OFF — the Vue HoverCard is the hover (INV-6).
//
// The plate is flat: TimeSeries renders the chart body; the caller seats it inside a
// ChartFrame for the engraved frame + the kicker→title triad (the StackedBar posture).
import { computed, ref } from "vue";
import { useElementSize } from "@vueuse/core";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
    GridComponent,
    TooltipComponent,
    MarkPointComponent,
    MarkAreaComponent,
    MarkLineComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import type { EChartsOption } from "echarts";
import { useEChart } from "../composables/useEChart.js";
import { useVizPalette } from "../composables/useVizPalette.js";
import {
    buildTimeSeriesOption,
    endLabelGutterCollapsed,
} from "../composables/useTimeSeriesOption.js";
import ChartLegend, { type LegendChip } from "../legend/ChartLegend.vue";

// Line + grid; the TooltipComponent is registered but every option keeps it OFF. The canvas
// LegendComponent is RETIRED (DV-8) — the legend is the shared <ChartLegend> DOM strip.
use([
    LineChart,
    GridComponent,
    TooltipComponent,
    MarkPointComponent,
    MarkAreaComponent,
    MarkLineComponent,
    // The label de-collision feature (DIRECT END-OF-LINE LABELS, 1.4.1) — `labelLayout.moveOverlap`
    // pushes near-coincident `endLabel`s apart vertically (the no-smoke 86% / smoke 80% terminals).
    // Additive: a consumer that declares no `endLabel` registers the feature but emits no labels.
    LabelLayout,
]);

// `SeriesPoint` / `LineSeries` / `BOUNDARY_AXIS` are declared in the sibling <script> block
// (module scope) so they are real module exports; setup references them directly.

const props = withDefaults(
    defineProps<{
        /** The N series to draw. */
        series: LineSeries[];
        /** Format an x tick (e.g. a month index → "Sep", a year → "2024"). */
        xFormat?: (x: number) => string;
        /** Format a y tick (e.g. Mbps). */
        yFormat?: (y: number) => string;
        /**
         * Whether to show the legend strip. The built-in ECharts CANVAS legend is RETIRED
         * (DV-8): when `true` (the default) TimeSeries renders the shared `<ChartLegend>`
         * (discrete chips, one per named line) in its own header — the canvas `legend.show`
         * stays OFF unconditionally, so the platform reads through ONE legend mechanism (the
         * a11y `<dl>`, theme-retuned from the locus), never the canvas string the dark flip
         * left invisible (the B2 leak). Set `false` to suppress the strip entirely.
         */
        showLegend?: boolean;
        /**
         * THE NYT DIRECT-LABEL REGISTER (K-PAPER-CHART · P3 · the `chartRecipe` opt-in dial). When
         * `true`, the plate reads in the editorial register: each line carries a TERMINAL DIRECT
         * label riding its OWN colour (the eye decodes identity IN PLACE), the Y-grid dashes to a
         * `width:1` recessive hairline + the baseline recesses (all `palette.grid` AS-IS), and the
         * visual `<ChartLegend>` strip is BLOCK-WRAPPED `sr-only` — replaced by the in-place labels,
         * but NEVER unmounted, so the a11y `<dl>` series key STAYS in the accessibility tree (the
         * canvas labels are `role="img"`-opaque to AT). **Defaults FALSE** — every existing consumer
         * reads BYTE-UNCHANGED (the recipe is opt-IN, landed with its consumer sweep in one change).
         */
        directLabels?: boolean;
        /**
         * THE PARTIAL-YEAR GATE (AUGMENT 5 · fw-sci FW-III "the 2025 terminal spike"). When
         * the terminal x of the series is a PARTIAL year (a data-completeness artifact — the
         * 2025 funding year is not yet whole, so a Σ-line dives toward the floor), the caller
         * hands its x here. The trend then CLAMPS the x-domain to the last WHOLE year (the
         * partial point is dropped from the drawn lines, never silently averaged into the
         * trend) and draws a faint annotated rule at the partial boundary ("2025 · partial")
         * so the gate is SEEN, not hidden. Omit ⇒ no gate (every existing consumer unchanged).
         */
        partialYearX?: number;
        /**
         * THE OVER-SUBSCRIPTION MARKER (E15b · the band-sign honest story). The x at which a
         * headroom band's sign crosses — the year aggregate peak first met/exceeded the contracted
         * ceiling. Draws a DECLARED annotated rule at that boundary so the regime change is SEEN,
         * named, never a silent downward wedge. Omit ⇒ no marker (the fleet never crossed, or the
         * consumer carries no headroom band).
         */
        overSubscriptionX?: number;
        /**
         * THE CROSSING'S OWN WORDS (A-03). The crossing rule's eyebrow run was HARDWIRED to
         * "over ceiling" — SCI's contracted-capacity semantics narrating every route's crossing,
         * so a demand-composition story announced a ceiling it has no notion of. The run is the
         * declarer's now. Omit ⇒ "over ceiling" (SCI's own default — its render is unmoved).
         */
        overSubscriptionLabel?: string;
        /**
         * THE CROWN PEAK-RIVET (H.W2.a M1 — the multi-year crown's identity mark). A ready
         * ECharts `markPoint` option fragment (built by `trajectory-marks.markPointRivet`): the
         * teal active-year rivet riding the trajectory at the active year. Rides the FIRST drawn
         * series. Omit ⇒ no rivet (every existing line consumer unchanged). The MarkPoint
         * component is registered above (SEAM-3), so the rivet PAINTS.
         */
        markPoint?: Record<string, unknown>;
        /**
         * THE CROWN CYCLE-BRACKET (H.W2.a M2 — the window-arc's shaded span). A ready ECharts
         * `markArea` option fragment (built by `trajectory-marks.markAreaBand`): the faint band
         * bracketing the measured window. Rides the FIRST drawn series. Omit ⇒ no bracket.
         */
        markArea?: Record<string, unknown>;
        /**
         * THE FORECAST BOUNDARY x (H.W2.a M2 — the measured→projected seam). When set, a dashed
         * `forecast →` drop-rule (the M4 dropRule recipe) joins the partial/over-subscription
         * rules on the boundary markLine. Omit ⇒ no forecast boundary.
         */
        forecastBoundaryX?: number;
        /**
         * THE EXPLICIT X-TICKS (I15 · the scissors two-endpoint axis). The x-axis stays
         * `type:"value"` so the line GEOMETRY interpolates honestly between the data x's, but a
         * sparse two-point domain (the FY21–25 → FY26–30 cycle index `[0, 1]`) would otherwise let
         * ECharts auto-fit FRACTIONAL ticks (0.2 / 0.4 / 0.6 / 0.8) BETWEEN the real endpoints — a
         * two-cycle comparison has no "0.4 of a cycle". When the caller hands the exact tick x's
         * here, the axis emits ticks ONLY at those positions (the `interval` is pinned to the even
         * spacing + `min`/`max` to the bounds), so the categorical endpoints are the sole ticks.
         * Omit ⇒ the legacy auto-fit (every dense-year consumer unchanged). Requires evenly-spaced
         * ticks (the cycle index is 0,1,…); an irregular set falls back to the union x's.
         */
        xTicks?: number[];
        /**
         * THE BAND-FOCUS Y-DOMAIN (the crossing-legibility dial). By default the primitive floors
         * at 0 and reserves the ceiling at `dataMax × 1.08` (the honest full-scale magnitude read).
         * A consumer whose SUBJECT is a crossing — two near-parallel lines whose meaning is the
         * moment one passes the other — hands an explicit tightened `[yMin, yMax]` band so the
         * crossing is not drowned against the empty zero floor. `yMin` overrides the 0 floor; `yMax`
         * overrides the ceiling reserve. Omit BOTH ⇒ the zero-anchored default (every existing
         * consumer unchanged). The caller MUST derive the band from the data min/max (never clip it).
         */
        yMin?: number;
        yMax?: number;
        /**
         * THE END-LABEL GUTTER (the direct-labelling reserve). When a series carries `endLabel`, its
         * text extends RIGHT of the terminal datum, but `containLabel` reserves only AXIS labels —
         * never series end labels. A direct-labelling consumer hands the right gutter px here so the
         * names clear the bezel. Omit ⇒ 24 (every existing consumer unchanged).
         */
        gridRight?: number;
        /**
         * THE AXIS NUMERAL FACE (the per-route technical-numeral register). `BOUNDARY_AXIS` defaults
         * the tick face to "Fira Code" (the atlas figure voice); a route with its OWN tabular numeral
         * face (the VFT journal's "IBM Plex Mono") hands the family here so the axis ticks read
         * in-register. Omit ⇒ the "Fira Code" default (every existing consumer unchanged).
         */
        axisFontFamily?: string;
        /**
         * A READY ECharts `markLine` OPTION FRAGMENT — the sibling of `markPoint`/`markArea`,
         * completing the annotation trio (the boundary-rule machinery was platform-internal only).
         * Rides the FIRST drawn series (its `data` merged with any internal boundary rule when both
         * are present). The VFT keystone hands its survival-analysis overlay here — the T50 caliper
         * rules + the "delay, not death" measurement bracket, in the engraving hand. Omit ⇒ no extra
         * markLine (every existing consumer unchanged).
         */
        markLine?: Record<string, unknown>;
        /**
         * THE CURVE-LATCH (W-VFT · the CurvePersist hallmark — "click on the curves… persist that").
         * When `true`, each real drawn line becomes CLICK-SELECTABLE: a click LATCHES that curve (a
         * persistent thickened `select` state — ORTHOGONAL to the hover emphasis, so it survives a
         * stray hover), emits `@curve-select` with the picked series key, and re-clicking the same
         * curve (or clicking another) toggles/moves the latch — ONE curve latched at a time. The
         * consumer listens to `@curve-select` to drive its own persistent read (the VFT survival
         * overlay expands on the latched cohort, its auto-sweep pauses). **Defaults FALSE** — the
         * option is BYTE-IDENTICAL and no click listener is registered when omitted (every existing
         * consumer unchanged).
         */
        selectableCurves?: boolean;
        ariaLabel?: string;
    }>(),
    {
        xFormat: undefined,
        yFormat: undefined,
        showLegend: true,
        directLabels: false,
        partialYearX: undefined,
        overSubscriptionX: undefined,
        overSubscriptionLabel: undefined,
        markPoint: undefined,
        markArea: undefined,
        forecastBoundaryX: undefined,
        xTicks: undefined,
        yMin: undefined,
        yMax: undefined,
        gridRight: undefined,
        axisFontFamily: undefined,
        markLine: undefined,
        selectableCurves: false,
        ariaLabel: "Time series",
    },
);

const emit = defineEmits<{
    hover: [key: string | null];
    /** W-VFT · the CurvePersist latch — the currently latched series key, or `null` when the last
        latch was toggled off. Fires only when `selectableCurves` is set (see the click handler). */
    "curve-select": [key: string | null];
}>();

const host = ref<HTMLElement | null>(null);

// W-VFT · THE CURVE-LATCH STATE (the CurvePersist hallmark). The key of the currently latched curve,
// or null when nothing is latched. It feeds the option (the matched line thickens — the persistent
// read) AND the re-paint fingerprint (so a latch deterministically re-paints), and it is the value
// `@curve-select` emits. Only mutated by `onCurveClick`, wired ONLY when `selectableCurves` is set.
const latchedKey = ref<string | null>(null);

// The canvas-colour bridge (T-4): the legend ink + gridline tokens the canvas cannot
// read are injected as resolved rgb (the muted caption ink, the gridline hairline) —
// re-resolved on a theme flip, never a raw `var(--…)` the canvas would mis-paint.
const palette = useVizPalette();

// A-04 · THE MARK'S OWN MEASURE — the host box the end-label gutter floor reads (the ResizeObserver
// `useEChart` already runs for the canvas resize; this is the same box, read as a number). The floor
// keys on the MARK, never the viewport: a line seated in a narrow column collapses its gutter
// exactly as one seated on a phone. 0 before the first measure (SSR/jsdom) ⇒ the declared gutter.
const { width: hostWidth } = useElementSize(host);

// THE OPTION (I-ARCH.AR-8) — the pure (series, dials, palette) → EChartsOption derivation, lifted
// to platform/charts/composables/useTimeSeriesOption (the SHARED-primitive arm of the §Y law). The
// host hands the series + the boundary/crown dials + the resolved palette; the composable owns the
// option SHAPE (the E15a ceiling reserve, the band-emphasis inversion, the partial-year clamp, the
// over-subscription crossing, the forecast boundary, the band-sign invariant). The chart-BODY
// render stays byte-identical (the option is equal pre/post for the same series + dials).
const option = computed<EChartsOption>(() =>
    buildTimeSeriesOption(
        props.series,
        {
            xFormat: props.xFormat,
            yFormat: props.yFormat,
            partialYearX: props.partialYearX,
            overSubscriptionX: props.overSubscriptionX,
            overSubscriptionLabel: props.overSubscriptionLabel,
            markPoint: props.markPoint,
            markArea: props.markArea,
            forecastBoundaryX: props.forecastBoundaryX,
            xTicks: props.xTicks,
            yMin: props.yMin,
            yMax: props.yMax,
            gridRight: props.gridRight,
            axisFontFamily: props.axisFontFamily,
            markLine: props.markLine,
            directLabels: props.directLabels,
            latchedKey: latchedKey.value,
            // F-CP1 — thread the opt-in so the builder makes the real line strokes event targets
            // (`triggerLineEvent`) EXACTLY when the SFC wires the click seam; else byte-identical.
            selectableCurves: props.selectableCurves,
            hostWidth: hostWidth.value,
        },
        palette.value,
    ),
);

// The legend chips (DV-8) — one discrete chip per NAMED line (the real series, never the
// "… trend" twins NOR the read-only headroom band), each the verbatim line colour + label.
// The shared <ChartLegend> renders them as one a11y <dl>, theme-retuned from the locus.
const legendChips = computed<LegendChip[]>(() =>
    props.series
        .filter((s) => !s.hideInLegend)
        .map((s) => ({ key: s.key, color: s.color, label: s.label })),
);

/** Resolve an ECharts mouseover/click params to the series key (by the drawn series NAME =
    `s.label`; the trend twin is `"<label> trend"` and never matches a real key, so a click on a
    trend curve resolves to null — correct, only real lines latch). */
function keyOf(params: unknown): string | null {
    const name = (params as { seriesName?: string }).seriesName;
    if (name == null) return null;
    const match = props.series.find((s) => s.label === name);
    return match?.key ?? null;
}

// ── W-VFT · THE CURVE-LATCH (the CurvePersist hallmark) ───────────────────────────────────────────
// `useEChart` carries the clicked series key up here (resolved via `keyOf`); the SFC owns the latch
// STATE, single at a time: re-clicking the latched curve toggles it OFF, any other click MOVES the
// latch. The new latch flows back into the option (the matched line thickens) via `latchedKey` and is
// emitted on `@curve-select` so a consumer drives its own persistent read (the VFT survival overlay
// expands on the latched cohort, its auto-sweep pauses). A click that misses every line is a no-op.
function onCurveClick(key: string | null): void {
    if (key == null) return; // a click that missed every line — the latch is unchanged
    latchedKey.value = latchedKey.value === key ? null : key;
    emit("curve-select", latchedKey.value);
}

// D6 (F-filters §4.4) — the cheap re-paint FINGERPRINT. A compact string of the DRAWN data
// (per series: key + the joined y-values, plus the partial-year gate). It changes ONLY when a
// real re-paint is owed — a data/filter re-scope OR a band-RISE scrub frame (the scrub re-feeds
// values, so the digest moves per frame and the rise repaints; a hover that re-evals the option
// without touching the data leaves the digest still, so no `notMerge` full re-raster fires). The
// theme flip is owned separately by the E9b retint guard (not in this digest). Wiring it greens
// the no-dead-fastpath gate AND spares the legacy deep option-walk on every reactive tick.
// A-04 — the gutter FLOOR crossing is a real re-paint (the grid + the terminal-label seat both
// change), so the collapse state rides the digest; a resize that never crosses the floor leaves it
// still (no notMerge storm per pixel while a window drags).
const seriesFingerprint = computed<string>(
    () =>
        props.series
            .map((s) => `${s.key}:${s.points.map((p) => p.y ?? "·").join(",")}`)
            .join("|") +
        `#${props.partialYearX ?? ""}` +
        `#${endLabelGutterCollapsed(hostWidth.value, props.gridRight) ? "floor" : ""}` +
        // W-VFT — the curve-latch is a real re-paint (the latched line thickens), so it rides the
        // digest; the option-driven visual only paints when this string moves.
        `#${latchedKey.value ?? ""}`,
);

useEChart({
    host,
    option: () => option.value,
    fingerprint: () => seriesFingerprint.value,
    onHover: (key) => emit("hover", key),
    // W-VFT · the CurvePersist latch — wire the click seam ONLY when the consumer opts in, so a
    // non-selecting chart registers no click listener (byte-identical). `onCurveClick` owns the
    // toggle + single-latch + the `@curve-select` emit; `useEChart` resolves the key via `keyOf`.
    onSelect: props.selectableCurves ? onCurveClick : undefined,
    keyOf,
    // T-PERF-4 (I-PERF-DATA.c) — defer init+paint to first viewport. The host below reserves its
    // box via `chart-h-lg` (a fixed 560/640px), so the deferred canvas mounts into an already-sized
    // slot — no scroll-in shift (the ≤0.038 CLS floor holds). Off the route hydration critical path.
    lazyMount: true,
});
</script>

<template>
    <!-- The over-subscription DECLARATION stamp (E15b · the band-sign gate's lawful exit):
         when the consumer passes `overSubscriptionX`, the host declares the zero-crossing
         year machine-readably. The gate accepts negative feed headroom IFF this declaration
         matches the feed's own first negative year — a declared split, never a silent clamp. -->
    <div class="w-full" :data-over-subscription-x="overSubscriptionX">
        <!-- The legend (DV-8) — the shared <ChartLegend> discrete strip, the ONE legend
             mechanism (never the retired canvas legend). Sits above the host, right-aligned.
             K-PAPER-CHART: when `directLabels` is on, the strip BLOCK-WRAPS `sr-only` — the visual
             key is replaced by the in-place terminal labels, but the a11y `<dl>` series key STAYS
             MOUNTED (never `v-if="false"`; the canvas labels are `role="img"`-opaque to AT, so the
             `<dl>` is the screen-reader's only key). The `data-testid` + `aria-label` are untouched. -->
        <ChartLegend
            v-if="showLegend && legendChips.length"
            mode="discrete"
            :chips="legendChips"
            class="time-series__legend"
            :class="{ 'sr-only': directLabels }"
            :aria-label="`${ariaLabel} — series key`"
            data-testid="time-series-legend"
        />
        <!-- A fixed-height host — the canvas collapses to 0 without it (chart-h-lg, the
             large-plate rung matching StackedBar).
             C.W5.4 — the LINE draw-on bind. The line is an ECharts CANVAS (animation:false — the
             W4 geometry untouched), so a per-path `stroke-dashoffset` draw cannot ride a CSS
             `view()` timeline (a canvas has no per-path DOM node). The faithful realization is the
             plate-level reveal: the chart fades + lifts in on the beat's `view()` timeline
             (`data-reveal-fan` → the scoped keyframe below), drawing as the plate enters and
             UN-drawing on scroll-up (bidirectional, free, zero per-frame JS). Bound to the SAME
             `--beat-tl` the map draw-on + the beat reveal ride. PRM → the line present (terminal). -->
        <div
            ref="host"
            class="chart-h-lg w-full"
            role="img"
            :aria-label="ariaLabel"
            data-testid="time-series"
            data-reveal-fan
        />
    </div>
</template>

<style scoped>
/* The legend strip sits above the canvas, right-aligned with a small gap (the C2 header
   posture). The shared <ChartLegend> owns the swatch/label recipe; this only places it. */
.time-series__legend {
    margin-bottom: 0.5rem;
    justify-content: flex-end;
    max-width: none;
}

/* C.W5.4 — the LINE draw-on bind, keyed to the beat's `view()` timeline. A canvas line has no
   per-path DOM, so the "draw-on" is the plate-level reveal: the chart fades + lifts in as the
   beat enters — compositor-only `{opacity, transform}`, zero JS, bound to the SAME `--beat-tl`
   the map draw-on + the beat reveal ride. The OUTER PRM `@media` is the structural fence (under
   reduced motion the line rests terminal, present); the keyframe is Vue-scoped, no collision. */
@media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
        @keyframes line-draw-fan {
            from {
                opacity: 0;
                transform: translate3d(0, 2.5vh, 0) scale(0.985);
            }
            to {
                opacity: 1;
                transform: translate3d(0, 0, 0) scale(1);
            }
        }
        [data-reveal-fan] {
            animation: line-draw-fan auto linear both;
            animation-timeline: --beat-tl;
            animation-range: entry 6% entry 24%;
        }
    }
}
</style>
