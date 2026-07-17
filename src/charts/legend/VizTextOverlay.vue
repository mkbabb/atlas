<script setup lang="ts">
// platform/charts/VizTextOverlay.vue — THE DOM-OVER-CANVAS OVERLAY PRIMITIVE (F6.9 ·
// f6-viz-text-rich §2.4). The platform seam that hoists the `convertToPixel`-anchor logic out
// of the plates that hand-roll it: it takes a list of `{ x, y, slot }` data coordinates and
// paints positioned DOM (the annotation chips + the axis-name lockups) over the ECharts canvas,
// re-anchored on the `expand-settle` tick (the chart's `convertToPixel` is valid only
// post-layout) — NEVER per mousemove.
//
// THE SHAPE. A plate wraps its `<div ref=host>` chart in a `.relative`, mounts ONE
// `<VizTextOverlay :chart :placements>` as a sibling, and names a `#slot` per placement. The
// overlay projects each placement's `[x, y]` data coord through `chart.convertToPixel` (the
// grid transform) into the host's local pixel box and seats the slot absolutely there — the
// EXACT seam the HoverCard's datum-anchor already uses, now a reusable primitive (the audit-
// desirable transposition that collapses the three triplicated `convertToPixel` anchors to ONE).
//
// THE RE-ANCHOR CLOCK. The pixel positions recompute on: the chart instance arriving, the
// placements changing, a resize, and the `expand-settle` tick (the plate re-parenting into the
// fullscreen surface invalidates the grid transform — the same signal `useEChart` resizes on).
// A ResizeObserver on the host catches a layout reflow; no per-frame polling.

import { computed, inject, onBeforeUnmount, ref, watch } from "vue";
import type { ECharts } from "echarts/core";
import { EXPAND_SETTLE_KEY } from "../scene/expand-settle.js";
import type { VizAnnotationPlacement } from "../contract/viz-contract.js";

const props = withDefaults(
    defineProps<{
        /** The host ECharts instance (the plate's `useEChart().chart`). Null until mounted. */
        chart: ECharts | null;
        /** The grid index the coords project against (default grid 0 — the single-grid plates). */
        gridIndex?: number;
        /** The placements to seat (each names a `#<id>` slot). */
        placements: VizAnnotationPlacement[];
        /**
         * T-PERF-4 (I-PERF-DATA.c) — the overlay's lazy-mount pairing. When the parent chart opts
         * into `useEChart({ lazyMount: true })`, its `chart` ref stays null until the host scrolls
         * into view, so the overlay's `convertToPixel` re-anchor cannot run until then anyway. With
         * this flag the overlay also HOLDS OFF wiring its ResizeObserver until the chart arrives —
         * a below-fold overlay therefore costs ZERO observer + re-anchor work at route hydration
         * (off the TBT critical path), matching its chart's deferral. The reserved box is the
         * parent's `chart-h-*` host (the overlay absolutely fills it), so nothing shifts. Omit
         * (the default) and the overlay wires eagerly exactly as before — backward-compatible.
         */
        lazyMount?: boolean;
    }>(),
    { gridIndex: 0, lazyMount: false },
);

const root = ref<HTMLElement | null>(null);

/** The projected pixel positions, keyed by placement id — recomputed on every re-anchor tick. */
const pixels = ref<Record<string, { left: number; top: number }>>({});

/** The chart has completed ≥1 render pass, so a coordinate system exists — the readiness the
    `convertToPixel` projection HOLDS for (ECharts' `finished` event; see the re-anchor clock). */
const painted = ref(false);

/** Project every placement's data coord into the host's local pixel box. The chart's
    `convertToPixel` returns canvas-local pixels; the canvas fills the host, so they ARE the
    host-local coords (no viewport offset needed — the overlay is absolutely positioned INSIDE
    the same `.relative` host the canvas fills). An axis-only placement pins to the grid gutter. */
function reanchor(): void {
    const c = props.chart;
    // HOLD until the chart has painted once — a coordinate system does not exist before the first
    // `finished` render (nor under lazyMount before scroll-in), and `convertToPixel` against an empty
    // coord-system list WARNS ("[ECharts] No coordinate system … found by the given finder") and
    // yields nothing. `painted` is the real readiness gate; without it the immediate chart-arrival
    // re-anchor projected pre-layout and fired that console warn on the /usf strip's break-even chip.
    if (!c || !painted.value) {
        pixels.value = {};
        return;
    }
    const next: Record<string, { left: number; top: number }> = {};
    for (const p of props.placements) {
        try {
            let px: number | undefined;
            let py: number | undefined;
            if (p.x != null && p.y != null) {
                const xy = c.convertToPixel({ gridIndex: props.gridIndex }, [p.x, p.y]) as
                    | [number, number]
                    | undefined;
                if (xy) [px, py] = xy;
            } else if (p.y != null) {
                const yy = c.convertToPixel({ yAxisIndex: 0 }, p.y) as number | undefined;
                if (yy != null) py = yy;
                px = p.gutter ?? 0; // the true left-gutter inset — 0 (the host's raw left edge) if unset.
            } else if (p.x != null) {
                const xx = c.convertToPixel({ xAxisIndex: 0 }, p.x) as number | undefined;
                if (xx != null) px = xx;
                py = p.gutter ?? 0; // the SAME lever on the omitted y-axis — 0 (unchanged) if unset.
            }
            if (px == null && py == null) continue;
            next[p.id] = {
                left: (px ?? 0) + (p.dx ?? 0),
                top: (py ?? 0) + (p.dy ?? 0),
            };
        } catch {
            // defensive: a genuinely degenerate point yields nothing — skip it. The init transient
            // (pre-layout, no coord system) is fenced by the `painted` gate above, not masked here.
        }
    }
    pixels.value = next;
}

// The re-anchor clock. The chart's `finished` render is the canonical "convertToPixel is valid"
// first-paint signal (the SAME clock useVizOverlay + RankedStrip's projector gate on); plus the
// placements change and the expand-settle tick (below). On each chart INSTANCE change the finished
// handler is re-bound and readiness reset, so a fresh (lazyMount) or re-created chart re-arms its
// own paint gate and a torn-down instance never re-anchors.
function onFinished(): void {
    painted.value = true;
    reanchor();
}
watch(
    () => props.chart,
    (c, prev) => {
        prev?.off("finished", onFinished);
        painted.value = false;
        pixels.value = {};
        c?.on("finished", onFinished);
    },
    { immediate: true },
);
watch(() => props.placements, reanchor, { deep: true });

const settle = inject(EXPAND_SETTLE_KEY, undefined);
if (settle) watch(settle.tick, reanchor);

// A ResizeObserver on the host catches a layout reflow (the grid transform moves with the box).
// T-PERF-4 (I-PERF-DATA.c) — under `lazyMount`, the observer is held off until the deferred chart
// arrives: there is nothing to re-anchor against before then (reanchor early-returns on a null
// chart), so observing at hydration would only churn the callback off the TBT path. We (re)wire on
// BOTH the root element mounting AND the chart arriving, so the observer comes up the moment the
// lazy chart inits on scroll-into-view. Without `lazyMount` the observer wires as soon as the root
// mounts (the eager, byte-identical path).
let ro: ResizeObserver | null = null;
function wireResizeObserver(): void {
    ro?.disconnect();
    ro = null;
    const el = root.value;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Under lazyMount, defer the observer until the chart instance exists (the lazy host is live).
    if (props.lazyMount && !props.chart) return;
    ro = new ResizeObserver(() => reanchor());
    ro.observe(el);
}
watch(root, wireResizeObserver);
watch(() => props.chart, wireResizeObserver);
onBeforeUnmount(() => {
    ro?.disconnect();
    props.chart?.off("finished", onFinished);
});

/** The per-placement transform that seats the slot relative to its projected point (mirroring
    the ECharts `label.position` anchor — `end` reads rightward, `start` leftward, etc). */
function transformFor(p: VizAnnotationPlacement): string {
    switch (p.align) {
        case "start":
            return "translate(-100%, -50%)";
        case "top":
            return "translate(-50%, -100%)";
        case "bottom":
            return "translate(-50%, 0)";
        case "end":
        default:
            return "translate(0, -50%)";
    }
}

const byId = computed(() => new Map(props.placements.map((p) => [p.id, p])));
</script>

<template>
    <!-- The overlay layer — absolutely fills the `.relative` chart host; each placement's slot
         seats at its projected pixel point. `pointer-events:none` so the canvas keeps the hover;
         a slot may opt back in. `data-viz-text-overlay` is the gate's overlay-presence marker. -->
    <div ref="root" class="viz-text-overlay" data-viz-text-overlay aria-hidden="true">
        <div
            v-for="p in placements"
            v-show="pixels[p.id]"
            :key="p.id"
            class="viz-text-overlay__slot"
            :style="{
                left: `${pixels[p.id]?.left ?? 0}px`,
                top: `${pixels[p.id]?.top ?? 0}px`,
                transform: transformFor(byId.get(p.id) ?? p),
            }"
        >
            <slot :name="p.id" :placement="p" />
        </div>
    </div>
</template>

<style scoped>
.viz-text-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
}
.viz-text-overlay__slot {
    position: absolute;
    will-change: transform;
}
</style>
