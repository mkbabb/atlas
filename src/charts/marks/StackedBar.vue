<script setup lang="ts">
// StackedBar.vue — the generic stacked-bar primitive, the platform's band-cake
// (DL3 §4, the L5 RainbowStack). Given a set of `series` (one per ordinal tier)
// over shared `categories` (the time buckets) and an ordinal `colorScale`, it
// renders Σ(value) over (category × tier) — the SCI 22-tier rainbow stack when
// fed the rainbow scale, or any generic stack when fed another series set.
//
// The tier → hue binding is DISCRETE: each series asks the ColorScale for its
// tier's verbatim stop, with ZERO render-time interpolation (the ordinal kind is
// a fixed map, FD1 §3.3 — `mixOklab` only re-authors the stops in tokens.css,
// never blends between them here). `tierOrder` (base → apex) is explicit, so the
// stack order is durable and not an accident of input order.
//
// ECharts via `useEChart` — the SOLE lifecycle composable. The chart's tooltip
// is OFF (`show: false`); hover is the Vue HoverCard (INV-6, kill the canvas
// string). The bar/grid/legend modules register here (modular registration).
//
// THE PRODUCER (C.W4.2 S1, contract symmetry): a tier `select`s on the ECHARTS CANVAS
// click (NOT an SVG `@click` — RP-4), `key = String(tier)`. The same event shape the maps
// + treemap emit; selecting a TIER, not an entity, is the one allowed key-grain shift.
import { computed, ref, watch } from "vue";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, MarkLineComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import { useEChart } from "@/charts/composables/useEChart";
import { useVizPalette } from "@/charts/composables/useVizPalette";
import { boundedBlur } from "@/charts/scale/emphasis-policy";
import { BOUNDARY_AXIS } from "@/charts/marks/TimeSeries.vue";
import { VIZ_GRID_CROWN } from "@/charts/lib/grid";
import { isMultiSelect, type SelectEvent } from "@/charts/contract/selection-contract";
import type { FeedRow } from "@/data/contract";

// A category is one bucket on the stack's x-axis — typically a feed's `year` (the
// `FeedRow` grain) or an entity label. Binding to the shared contract keeps the
// band-cake's buckets aligned with the feed every dashboard reduces over.
type CategoryKey = FeedRow["year"] | string;

// Bar + grid; the TooltipComponent is registered but every option keeps it OFF.
use([BarChart, GridComponent, TooltipComponent, MarkLineComponent]);

/** One ordinal tier's contribution across the category axis. */
export interface StackSeries {
    /** The ordinal tier key — looked up in `colorScale` for its discrete stop. */
    tier: number;
    /** A human label for the tier (legend / hover). */
    label?: string;
    /** One value per category, same order as `categories`. */
    values: (number | null)[];
}

const props = withDefaults(
    defineProps<{
        /** The shared x-axis buckets — a feed's years or entity labels. */
        categories: CategoryKey[];
        /** One series per tier — order here is overridden by `tierOrder`. */
        series: StackSeries[];
        /** Discrete ordinal scale: tier key → its verbatim CSS stop. */
        colorScale: (tier: number) => string;
        /** Explicit stack order, base → apex (mandatory for the rainbow). */
        tierOrder: number[];
        /** Reverse the category axis (e.g. newest year on top). */
        reverseCategories?: boolean;
        ariaLabel?: string;
    }>(),
    { reverseCategories: false, ariaLabel: "Stacked bar" },
);

// `hover` carries the tier (number) — the band-cake's own grain — while `select` carries
// the contract's string key (`String(tier)`); the consumer maps it back to a tier.
const emit = defineEmits<{ hover: [tier: number | null]; select: [ev: SelectEvent] }>();

const host = ref<HTMLElement | null>(null);

// The canvas-colour bridge (T-4): the gridline ink is a CSS token the canvas cannot
// read, so the resolved `palette.grid` rgb is injected into the option — re-resolved on
// a theme flip (the same `useColorMode` signal `useEChart` re-paints on), never a raw
// `var(--…)` string that would fall to black-on-graphite in dark.
const palette = useVizPalette();

// Index the series by tier so `tierOrder` drives the stack, not input order.
const byTier = computed<Map<number, StackSeries>>(() => {
    const m = new Map<number, StackSeries>();
    for (const s of props.series) m.set(s.tier, s);
    return m;
});

/** Is this a COMPOSITION stack — every category's column sums to ≤ 1 (a share-stack, Σ≤1)?
    The band-cake's DEFAULT `share` measure normalizes each year column to fractions summing to
    1.0; the `count`/`capacity` measures sum to a fleet count / Σ Mbps (≫ 1). When the stack is a
    composition, its domain IS [0, 1] — the y-axis must CLOSE on 1 (no dead headroom above Σ=1),
    else ECharts auto-fits a "nice" 1.2 ceiling and the share-stack reads as if it could exceed
    100% (the F2 `stack-domain` defect; the perceptibility trap — a filter re-mixes the tiers but
    the silhouette never moves under a 1.2 ceiling). Detected from the data (Σ per category ≤ 1+ε)
    so the primitive stays GENERIC — a count/capacity stack keeps the auto domain, no consumer
    flag, no share-mode coupling. ε absorbs float rounding in the normalized shares. */
const isShareStack = computed<boolean>(() => {
    const EPS = 1e-3;
    let sawColumn = false;
    const cols = props.categories.length;
    for (let i = 0; i < cols; i++) {
        let sum = 0;
        let any = false;
        for (const s of props.series) {
            const v = s.values[i];
            if (v != null && Number.isFinite(v)) {
                sum += v;
                any = true;
            }
        }
        if (!any) continue;
        sawColumn = true;
        // A single column over 1 (+ε) ⇒ NOT a composition stack (count/capacity) → auto domain.
        if (sum > 1 + EPS) return false;
    }
    // Every populated column sums to ≤ 1 (and at least one column exists) ⇒ a share-stack.
    return sawColumn;
});

const option = computed<EChartsOption>(() => {
    // The category axis renders labels as strings; a feed year coerces cleanly.
    const labels = props.categories.map(String);
    const cats = props.reverseCategories ? [...labels].reverse() : labels;

    const series = props.tierOrder
        .map((tier) => byTier.value.get(tier))
        .filter((s): s is StackSeries => s != null)
        .map((s) => {
            const values = props.reverseCategories ? [...s.values].reverse() : s.values;
            return {
                type: "bar" as const,
                stack: "tiers",
                name: s.label ?? String(s.tier),
                // The discrete ordinal binding — the tier's fixed stop, never a blend.
                itemStyle: { color: props.colorScale(s.tier) },
                // E4-integration (F6): the raw focus:"series" 10% plate-ghost dies — the series
                // raise keeps its scope but the de-emphasis floor is the DESIGNED bounded recede
                // (emphasis-policy, the one home; the config tripwire holds raw focus out).
                emphasis: { focus: "series" as const, ...boundedBlur() },
                data: values,
            };
        });

    // THE CROWN MARGIN — the shared lifted-top register (lib/grid.ts, the K-F grid-standard source),
    // folded to top:16 for the stacked-band masthead; `containLabel` reserves the boundary-equal
    // y-ticks so the first/last category tick clears the y-axis and stays inside the frame (B3).
    const grid = { ...VIZ_GRID_CROWN, top: 16, containLabel: true };

    return {
        // `animation: false` is the DELIBERATE band-RISE contract (C.W5.2, ch-viz-sci D4):
        // ECharts does NO tweening of its own, so the SCI hero's per-tier `NumericAnimation`
        // (RainbowStack's band-RISE) OWNS the rise by scrubbing the `series` VALUES and
        // re-feeding them here each frame — `useEChart` re-paints on the deep `series` change.
        // Flipping this to `true` would double-animate (ECharts tween fighting the scrub);
        // the single writer is the external NumericAnimation, never ECharts.
        animation: false,
        backgroundColor: "transparent",
        grid,
        // Tooltip OFF — the Vue HoverCard is the hover (INV-6, kill the canvas string).
        tooltip: { show: false },
        xAxis: {
            type: "category",
            data: cats,
            axisLine: { lineStyle: { color: palette.value.grid } },
            axisTick: { show: false },
            // The ONE boundary-equal preset — first + last category tick render at the
            // SAME tabular rung as the interior (B3 parity); the resolved `palette.muted`
            // chrome ink, never a raw `var(--)` (the C1 grep-guard stays green, C2-2/HD-6).
            axisLabel: BOUNDARY_AXIS.label(palette.value.muted),
        },
        yAxis: {
            type: "value",
            // THE SHARE-DOMAIN (F2 `stack-domain`): a composition stack (Σ≤1) CLOSES its domain
            // on 1 — the band-cake's 1.2 dead ceiling dies, the share-stack reads as a true 100%
            // stack (the band top sits AT the grid ceiling). A count/capacity stack keeps the
            // auto domain (isShareStack false → no max). min:0 anchors the floor either way.
            min: 0,
            ...(isShareStack.value ? { max: 1 } : {}),
            splitLine: { lineStyle: { color: palette.value.grid } },
            axisLabel: BOUNDARY_AXIS.label(palette.value.muted),
        },
        series,
    };
});

/** Map an ECharts mouseover params to the hovered tier key. */
function tierOf(params: unknown): string | null {
    const name = (params as { seriesName?: string }).seriesName;
    return name ?? null;
}

/** Resolve a series name (the seriesName the canvas carries) back to its tier number. */
function tierFromName(name: string | null): number | null {
    if (name == null) return null;
    const match = props.series.find((s) => (s.label ?? String(s.tier)) === name);
    return match?.tier ?? null;
}

// D6 (F-filters §4.4) — the cheap re-paint FINGERPRINT. A compact digest of the DRAWN data
// (categories + per-tier values + the share-domain flag). It moves on a data/filter re-scope OR
// a band-RISE scrub frame (the rise re-feeds values), and stays still on a hover-driven option
// re-eval — so the data path repaints only when a real re-paint is owed (no `notMerge` storm on
// every reactive tick). Wiring it greens the no-dead-fastpath gate (INV-C6 zero-deferral).
const seriesFingerprint = computed<string>(
    () =>
        props.categories.map(String).join(",") +
        "#" +
        props.tierOrder
            .map(
                (t) =>
                    `${t}:${(byTier.value.get(t)?.values ?? []).map((v) => v ?? "·").join(",")}`,
            )
            .join("|") +
        (isShareStack.value ? "@share" : ""),
);

const { chart } = useEChart({
    host,
    option: () => option.value,
    fingerprint: () => seriesFingerprint.value,
    onHover: (key) => emit("hover", tierFromName(key)),
    keyOf: tierOf,
    // T-PERF-4 (I-PERF-DATA.c) — defer init+paint to first viewport. The host below reserves
    // its box via `chart-h-lg` (a fixed 560/640px), so the deferred canvas mounts into an
    // already-sized slot — no scroll-in layout shift (the ≤0.038 CLS floor holds). A below-fold
    // band-cake therefore costs ZERO echarts evaluation until scrolled into view, off the /sci
    // hydration critical path (the TBT lever).
    lazyMount: true,
});

// The select producer — the ECharts CANVAS click (RP-4). The bar's series name resolves to
// its tier; `key = String(tier)` is the contract wire form. Modifier off the native event.
watch(chart, (c) => {
    if (!c) return;
    c.on("click", (params: unknown) => {
        const tier = tierFromName(tierOf(params));
        if (tier == null) return;
        const native = (params as { event?: { event?: MouseEvent } }).event?.event;
        emit("select", {
            key: String(tier),
            multi: native ? isMultiSelect(native) : false,
        });
    });
});
</script>

<template>
    <!-- A fixed-height host — the canvas collapses to 0 without it (chart-h-lg is
         the ranked-bar / rainbow-stack rung, FD1 §5/recipes). -->
    <div
        ref="host"
        class="chart-h-lg w-full"
        role="img"
        :aria-label="ariaLabel"
        data-testid="stacked-bar"
    />
</template>
