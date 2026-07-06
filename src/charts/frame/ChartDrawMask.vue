<!-- platform/charts/ChartDrawMask.vue — THE ECHARTS-CANVAS DRAW-IN MASK (K-B-MOTION · compositor-only wipe)

     ECharts renders to <canvas>; we CANNOT draw it stroke-by-stroke without `setOption`-per-frame
     (the data-fidelity + perf violation the K-CHARTER bans). So the draw-in is a reveal WIPE, NOT a
     re-render: a cover-colored rect sits OVER the canvas and shrinks `scaleX:1 → 0` as the reader
     scrolls toward centre, uncovering the already-fully-rendered chart. The chart paints ONCE at
     mount; only the mask's `scaleX` — a compositor-only transform (zero layout, zero paint, zero
     `setOption`) — animates. This GENERALIZES the proven sibling (ProductMixPlate.vue:393-402:
     `scaleX(0.02) → scaleX(1)`, `transform-origin:left center`).

     The scalar is JS-BOUND (`--draw-t`), NOT a pure-CSS read of `--scroll-tl`: `--scroll-tl` is
     `@property … inherits:false` (scroll-driven.css), so a DESCENDANT rect would read its registered
     initial 0 → `scaleX(1)` → the chart is PERMANENTLY masked. The bound `--draw-t` is the imperative
     bridge across that inheritance wall. -->
<script setup lang="ts">
defineProps<{
    /** The drawIn stage scalar [0,1] off the reveal register's drawIn cover band. 0 = fully masked (chart
        hidden); 1 = fully uncovered (mask collapsed). Reads 1 under PRM / when `drawIn` is undeclared
        (the missing-stage-terminal law) → the mask renders collapsed and inert (the plate looks
        exactly as today). */
    t: number;
    /** The wipe axis off `RevealFacet.direction` — 'ltr' (reading direction, the default, reveals
        L→R) | 'rtl' (horizontal-bar argument, reveals R→L) | 'center' (centre-out, a diverging viz). */
    direction?: "ltr" | "rtl" | "center";
}>();
</script>

<template>
    <div
        class="chart-draw-mask"
        aria-hidden="true"
        :data-draw-dir="direction ?? 'ltr'"
        :style="{ '--draw-t': t }"
    />
</template>

<style scoped>
.chart-draw-mask {
    position: absolute;
    inset: 0;
    z-index: 1; /* above the canvas, below the plate furniture */
    pointer-events: none; /* never eats hover/click on the chart beneath */
    /* THE SURFACE MATCH — flat --card, NEVER glass (R5 vacated; ChartFrame.vue:485,507,596). The
       chart body is the atlas-plate's flat --card recipe, so this is the exact surface behind the
       canvas, late-resolved + theme-aware. */
    background: var(--card, var(--background));
    /* THE WIPE — origin per direction; scaleX marches the masked edge. Compositor-only. */
    transform-origin: right center; /* ltr default: reveals L→R (reading direction) */
    transform: scaleX(calc(1 - var(--draw-t, 1)));
    /* NO transition: the scalar is SCROLL-SCRUBBED (a pure function of scroll position) — a
       transition would fight the scrub (the scroll-scrubbed-not-time-driven law). */
}

.chart-draw-mask[data-draw-dir="rtl"] {
    transform-origin: left center;
}
.chart-draw-mask[data-draw-dir="center"] {
    transform-origin: center center;
}

@media (prefers-reduced-motion: reduce) {
    .chart-draw-mask {
        transform: scaleX(0); /* collapsed — chart fully visible, belt-and-braces */
    }
}
</style>
