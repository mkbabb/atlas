<script setup lang="ts">
// RankedBar.vue — the platform HORIZONTAL RANKED-BAR primitive (I13 · design-ecf §148-188
// VIZ 3). The sibling of <Treemap> for a distribution too SKEWED to lay out as boxes: where a
// treemap of a top-heavy field collapses into a two-box monolith with a right-edge of illegible
// rubble (the ECF consultants), a ranked bar renders the WHOLE field legibly — the whale at the
// top, every tail row name-readable, the magnitude carried by BAR LENGTH (the encoding the flat
// treemap fill failed to deliver). One row per entity, descending by value; the bar length is the
// loud channel, the sequential ramp FILL carries a second magnitude (the $/student pole).
//
// A useEChart bar like the rest of the platform's charts. The canvas tooltip is OFF — the Vue
// HoverCard is the hover (INV-6, kill the canvas string) — and hover/select emit the row key
// upward so the shared selection lights the same datum across the dashboard (the SAME
// SelectionEmits contract the Treemap / StackedBar / choropleths speak).
//
// THE LONG-TAIL FOLD (design §148): a `topN` budget shows the top-N named rows + ONE rolled
// "…and M more" residual row (area = Σ tail, label = the true folded count) — the ranked-bar
// analogue of the treemap's "…and M more" cap tile, so no sub-name-width rubble ever renders.
//
// THE GLASS-INDEPENDENT BUILD (H-ROOT-1 · FALLBACK-FIRST): the bar is composed entirely on the
// shipped 4.0.1 primitives (ECharts canvas + the resolved-rgb palette bridge). The published-4.1.0
// polish (the glass-hover rim-tint via `--glass-accent`, the liquid-reveal bar-grow curve) is NOT
// shimmed here — the raise rides a plain resolved-ink stroke (the design control), and the grow is
// ECharts' own PRM-fenced tween. The published-4.1.0 rim-tint lands as a later pass over this clean base.
import { computed, ref, watch } from "vue";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import type { EChartsOption } from "echarts";
import { useEChart } from "../composables/useEChart.js";
import { useVizPalette } from "../composables/useVizPalette.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { RAISE_ONLY } from "../scale/emphasis-policy.js";
import { VIZ_GRID_BAR } from "../lib/grid.js";
import {
    isMultiSelect,
    type SelectionEmits,
} from "../contract/selection-contract.js";
import type { RankHue } from "../scale/ColorScale.js";

// Bar + grid; the TooltipComponent is registered but every option keeps it OFF (the modular
// registration law — the bundle carries the bar renderer only when a dashboard draws one).
use([BarChart, GridComponent, TooltipComponent]);

/** One ranked row — an entity sized by `value` (the bar length), stained by `hue(item)`. */
export interface RankedRow {
    /** A stable join key (an applicant id, a firm name) for the linked-highlight + selection. */
    key: string;
    /** The row's display label (the y-axis tick). */
    name: string;
    /** The magnitude the BAR LENGTH encodes (e.g. brokered funding). */
    value: number;
}

const ROLLUP_KEY = "__rankedbar_rollup__"; // the sentinel key the "…and M more" residual row carries

const props = withDefaults(
    defineProps<{
        /** The rows to rank — order is irrelevant, the primitive sorts descending by value. */
        rows: RankedRow[];
        /**
         * THE ONE HUE CHANNEL (K-PAPER §5) — a row's bar-fill, keyed by the item, as a `RankHue`
         * discriminated union: a binned ordinal MAGNITUDE (`{ mode: "tier"; fill }` — a resolved
         * stop from `tierHue` / any `Scale<V>`, the LENGTH-paired loud hue) XOR a coordinated
         * categorical TERRITORY (`{ mode: "region"; category }` — the J-COLOR §5.1 bar↔choropleth
         * pair, a `--viz-category-{1..4}` quad INDEX bound 1:1 to a same-hued `<GeoChoropleth
         * :category>` territory). Tier XOR region — a consumer CANNOT bind both (the union makes
         * "both-set" un-representable; the prior silent `category`-wins-`fill`-fallback ambiguity is
         * gone). The canvas cannot read `var(--…)`, so `mode: "region"` resolves its quad stop to rgb
         * off `:root` and re-resolves on a theme flip (the resolved-rgb canvas bridge the palette ink
         * rides); `mode: "tier"` carries the already-resolved fill string the caller's scale emitted.
         */
        hue: (item: RankedRow) => RankHue;
        /** A formatted value face for the bar-tip label (e.g. `$1.2M`); omit ⇒ no tip label. */
        valueLabel?: (item: RankedRow) => string;
        /** THE TOP-N BUDGET (design §148) — when set, the field shows the top-N rows by value and
            rolls the tail into ONE "…and M more" residual row (the ranked-bar analogue of the
            treemap cap tile). `undefined` (the default) ranks the full field. */
        topN?: number;
        ariaLabel?: string;
    }>(),
    {
        valueLabel: undefined,
        topN: undefined,
        ariaLabel: "Ranked bar",
    },
);

const emit = defineEmits<SelectionEmits>();

const host = ref<HTMLElement | null>(null);

// The canvas-colour bridge (T-4): the gridline / axis / label ink are CSS tokens the canvas
// cannot read, so the resolved-rgb palette is injected into the option — re-resolved on a theme
// flip, never a raw `var(--…)` that would fall to black-on-graphite in dark.
const palette = useVizPalette();

// THE RE-RANK MORPH FENCE (D7.c M9) — under reduce the top-N re-rank is a HARD-CUT (animation
// off, instant re-layout); with motion ECharts tweens the bars to their new lengths/positions.
const reduced = useReducedMotion();

// The budgeted, descending-sorted row set: the full field by default; the top-N named rows + one
// rolled "…and M more" residual when `topN` is set. The residual's VALUE is the honest Σ tail
// (a ranked bar can show the true summed length without inverting the plate — unlike the treemap,
// whose box AREA had to be clamped — so the residual bar reads the tail's real mass). Its label
// announces the true folded count.
const budgetedRows = computed<RankedRow[]>(() => {
    const sorted = [...props.rows].sort((a, b) => b.value - a.value);
    if (props.topN == null) return sorted;
    const n = Math.min(props.topN, sorted.length);
    if (sorted.length <= n + 1) return sorted;
    const head = sorted.slice(0, n);
    const tail = sorted.slice(n);
    const tailSum = tail.reduce((acc, it) => acc + it.value, 0);
    return [
        ...head,
        { key: ROLLUP_KEY, name: `…and ${tail.length} more`, value: tailSum },
    ];
});

// J-COLOR §5.1 — THE COORDINATED CATEGORICAL QUAD (canvas half of the VC bar↔map pair). The quad
// is FOUR stops (`--viz-category-1..4`, the RWB-emergent-plus-one); an index outside 1..4 is clamped
// into the quad (>4 classes is the band-cake rainbow's role, §5.4 role-separation). The ECharts
// canvas cannot read `var(--…)`, so the stop is resolved to its computed rgb off `:root` — the SAME
// resolved-token bridge the axis/grid/label ink rides (`useVizPalette`), re-read each option rebuild
// (the option recomputes on the palette epoch, so a theme flip re-resolves the quad). The coordinated
// SVG choropleth reads the cascade `var(--viz-category-{k})` directly; both halves resolve the SAME
// token — index-bound, never two private palettes that drift.
const VIZ_CATEGORY_STOPS = 4;
function resolveCategory(idx: number): string | null {
    const k = Math.min(VIZ_CATEGORY_STOPS, Math.max(1, Math.round(idx)));
    if (typeof document === "undefined") return null; // SSR/jsdom floor — no `:root` to read
    const v = getComputedStyle(document.documentElement)
        .getPropertyValue(`--viz-category-${k}`)
        .trim();
    return v || null;
}

const option = computed<EChartsOption>(() => {
    // The palette ref is read so this rebuild re-runs on a theme flip — which is ALSO when the
    // resolved `--viz-category-{k}` rgb below must be re-read (the canvas keeps no live `var`).
    void palette.value;
    // ECharts category axes paint bottom→top, so to read #1 at the TOP the categories + values
    // are reversed (the largest sits at the visual top of the column).
    const ordered = [...budgetedRows.value].reverse();
    const categories = ordered.map((r) => r.name);
    // THE ONE HUE RESOLVE (K-PAPER §5) — a clean `switch (hue.mode)`: `"tier"` paints the caller's
    // already-resolved fill string directly; `"region"` resolves the `--viz-category-{k}` quad stop
    // off `:root` (the J-COLOR §5.1 bar↔choropleth pair), falling to the muted ground only at the
    // SSR/jsdom floor where `:root` cannot be read. No silent precedence — the union is exclusive.
    const hueColor = (r: RankedRow): string => {
        const h = props.hue(r);
        return h.mode === "tier"
            ? h.fill
            : (resolveCategory(h.category) ?? palette.value.muted);
    };
    const data = ordered.map((r) => {
        const isRollup = r.key === ROLLUP_KEY;
        // The rolled residual is an AFFORDANCE, not a datum: the engraved muted ground (a quiet
        // recessive bar distinct from the data hues), never routed through the caller's `hue` — it
        // short-circuits BEFORE the hue resolve (a residual is not a datum).
        const color = isRollup ? palette.value.muted : hueColor(r);
        return {
            value: r.value,
            // A stable `id` (the join key) so universalTransition matches a survivor across a
            // top-N re-rank and slides it, instead of the whole field re-popping.
            id: r.key,
            key: r.key,
            itemStyle: {
                color,
                borderColor: palette.value.border,
                borderWidth: 1,
                borderRadius: 2,
            },
            // THE STROKE RAISE (emphasis-policy F6) — the bar's emphasis PRESERVES its own fill
            // (no brighten) and raises a heavier `--foreground` stroke on the ONE bar, the
            // SVG-choropleth raise-the-one idiom routed through the platform constant.
            emphasis: {
                itemStyle: {
                    color,
                    borderColor: palette.value.foreground,
                    borderWidth: 2,
                },
            },
            // The bar-tip value label (the formatted face); the rolled residual carries none.
            label:
                !isRollup && props.valueLabel
                    ? {
                          show: true,
                          position: "right" as const,
                          color: palette.value.muted,
                          fontFamily: palette.value.fontMono,
                          fontSize: 11,
                          formatter: () => props.valueLabel!(r),
                      }
                    : { show: false },
        };
    });

    return {
        // ECharts tween fences the re-rank (M9) — survivors slide to their new lengths on the GPU
        // between option pushes; under reduce it is an instant hard-cut. No external value-scrub
        // fights it (unlike the SCI band-cake), so the library tween is the single writer.
        animation: !reduced.value,
        backgroundColor: "transparent",
        // Tooltip OFF — the Vue HoverCard is the hover (INV-6, kill the canvas string).
        tooltip: { show: false },
        // THE BAR MARGIN — the wide right-gutter register (lib/grid.ts) for the horizontal-bar
        // value-label run; `containLabel` reserves the category labels (the K-F grid-standard source).
        grid: VIZ_GRID_BAR,
        xAxis: {
            type: "value",
            min: 0,
            axisLine: { show: false },
            axisTick: { show: false },
            // The value gridlines recede to the engraved grid ink (resolved rgb, T-4).
            splitLine: { lineStyle: { color: palette.value.grid } },
            axisLabel: { show: false },
        },
        yAxis: {
            type: "category",
            data: categories,
            axisLine: { lineStyle: { color: palette.value.grid } },
            axisTick: { show: false },
            // The row-name ticks — the legible names a treemap monolith could not carry. The
            // resolved foreground ink (T-4), Newsreader to match the in-plate prose voice.
            axisLabel: {
                color: palette.value.foreground,
                fontFamily: palette.value.fontSerif,
                fontSize: 12,
                // Keep the gutter bounded so the longest firm name never eats the bars; ECharts
                // truncates with an ellipsis past the width (the gutter is wide via containLabel).
                width: 168,
                overflow: "truncate",
            },
        },
        series: [
            {
                type: "bar",
                // A stable id so universalTransition matches the series across pushes.
                id: "ranked",
                barWidth: "62%",
                // THE RE-RANK MORPH OPT-IN (M9) — match bars by their datum `id` across pushes and
                // morph the survivors; PRM fences it via `animation` above.
                universalTransition: { enabled: !reduced.value },
                // THE EMPHASIS LAW (emphasis-policy F6) — RAISE the hovered bar, never WASH the
                // field (no `focus:"self"`); routed through the platform constant so a raw focus
                // can never re-enter.
                emphasis: RAISE_ONLY,
                data,
            },
        ],
    };
});

/** Resolve an ECharts bar mouseover params to its row key (carried on the datum). */
function keyOf(params: unknown): string | null {
    const d = (params as { data?: { key?: string } }).data;
    return d?.key ?? null;
}

// D6 — the cheap re-paint fingerprint: the drawn rows + values. It moves on a data/filter
// re-scope (or a top-N re-rank) and stays still on a hover-driven option re-eval, so the data
// path repaints only when a real re-paint is owed (no notMerge storm on every reactive tick).
const seriesFingerprint = computed<string>(() =>
    budgetedRows.value.map((r) => `${r.key}:${r.value}`).join("|"),
);

const { chart } = useEChart({
    host,
    option: () => option.value,
    fingerprint: () => seriesFingerprint.value,
    // The rolled residual is an affordance, not a datum: never emit a linked-highlight hover for
    // it (it has no real item key, so it cannot light a datum across the dashboard).
    onHover: (key) => emit("hover", key === ROLLUP_KEY ? null : key),
    keyOf,
    // T-PERF-4 — defer init+paint to first viewport; the host reserves its box via `chart-h-lg`
    // so the deferred canvas mounts into an already-sized slot (no scroll-in CLS).
    lazyMount: true,
});

// The select producer — the ECharts CANVAS click (RP-4: not an SVG `@click`). The native event
// rides `params.event.event`, so the cmd/ctrl/shift modifier reads at the canvas edge, mirroring
// the Treemap / StackedBar producers. The rolled residual never selects (no real key).
watch(chart, (c) => {
    if (!c) return;
    c.on("click", (params: unknown) => {
        const key = keyOf(params);
        if (key == null || key === ROLLUP_KEY) return;
        const native = (params as { event?: { event?: MouseEvent } }).event?.event;
        emit("select", { key, multi: native ? isMultiSelect(native) : false });
    });
});
</script>

<template>
    <!-- A fixed-height host — the canvas collapses to 0 without it (chart-h-lg is the large-plate
         rung, matching the Treemap / StackedBar host). -->
    <div
        ref="host"
        class="chart-h-lg w-full"
        role="img"
        :aria-label="ariaLabel"
        data-testid="ranked-bar"
    />
</template>
