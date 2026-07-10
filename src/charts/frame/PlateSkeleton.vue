<script setup lang="ts">
// PlateSkeleton.vue — THE LOADING RUNG (N.WD1 · §4.D1.2 — net-new, CLS-reserved).
//
// The FIRST rung of the 4-rung host ladder VizPlate branches on (`loading → PlateSkeleton`). Before
// the readiness machine, a plate mounted before `ensureLoaded` resolved could FLASH its designed
// PlateVoid as if legitimately empty (the VizPlate void/loading conflation). Under the machine a
// void can only mean "loaded and genuinely empty"; the LOADING phase renders THIS skeleton instead —
// a quiet placeholder that FILLS the reserved chart-body footprint (no collapse, no CLS) so the
// engraved frame stays whole and the canvas mounts into an already-sized slot when the feed lands.
//
// It mirrors PlateVoid's box (min-block-size 12rem, block-size 100%) so the loading→ready→void rungs
// swap in the SAME reserved footprint — the ≤0.038 CLS floor holds across every phase.
//
// THE REGISTER (N5 design consult, signed): the skeleton speaks the atlas's PAPER vocabulary, never
// the gray web-skeleton dialect — the shapes are ENGRAVED-INK washes (`--foreground` at whisper
// alpha, warm on both stocks: espresso wash on the peach paper, ivory wash on the dark stock), cut
// print-crisp at `--radius-mark` (no pills), seated on a TRUE `--engrave` hairline baseline (the
// structure holds steady; only the pending content breathes). The plot silhouette is NON-monotone so
// it reads as a resting dataset, not a synthetic staircase; the breath is a compositor-only opacity
// sweep staggered left→right across the columns (PRM = a static rest at the settled wash).

defineProps<{
    /** The skeleton's accessible label (the plate name) — the polite "loading" region names it. */
    label?: string;
}>();

// O-D24/O-LIB-CARRY — THE CAPTION SLOT. Before this the skeleton carried NO visible copy (only the
// sr-only `label` announcement below) — a route needing in-metaphor loading prose (O-D24's vft
// fault-beat: "Developing the plate…", its timeout note) could not express it through this shared
// rung and had to hand-compose the skeleton's own primitives in-route instead of riding this
// generic ladder (`VizPlate.vue`'s `#loading` passthrough forwards here). ABSENT by default (every
// existing mount stays byte-identical); a filled slot renders as ONE visible line beneath the plot
// silhouette, in the SAME quiet muted-prose voice the void family's `caption` prop wears.

/** The resting plot silhouette — a NON-monotone height set (fractions of the 6rem plot band) so the
    pending block reads as a quiet dataset's outline, never a synthetic 40/51/62/73/84 ramp. The
    heights resolve in REM (`calc(--h * 6rem)`), never a percentage: the skeleton's `block-size:100%`
    chain is indefinite when the plate body is auto-sized, and a percentage block-size against an
    indefinite flex chain resolves to 0 — the columns silently vanish (live-proven on /demand). */
const SILHOUETTE = [0.62, 0.38, 0.74, 0.5, 0.88] as const;
</script>

<template>
    <div
        class="plate-skeleton"
        role="status"
        aria-live="polite"
        data-testid="plate-skeleton"
        data-plate-phase="loading"
    >
        <span class="sr-only">{{
            label ? `Loading “${label}”…` : "Loading the figure…"
        }}</span>
        <!-- The reserved band — a masthead line + a plot silhouette on a hairline baseline, all
             pointer-inert. The shapes are decorative; the sr-only status above carries the meaning. -->
        <div class="plate-skeleton__masthead" aria-hidden="true">
            <span class="plate-skeleton__bar plate-skeleton__bar--title" />
            <span class="plate-skeleton__bar plate-skeleton__bar--dek" />
        </div>
        <div class="plate-skeleton__plot" aria-hidden="true">
            <span
                v-for="(h, i) in SILHOUETTE"
                :key="i"
                class="plate-skeleton__col"
                :style="{ '--h': String(h), '--i': i }"
            />
        </div>
        <p v-if="$slots.caption" class="plate-skeleton__caption text-prose-muted">
            <slot name="caption" />
        </p>
    </div>
</template>

<style scoped>
/* Fills the chart body's footprint EXACTLY like PlateVoid so loading→ready→void swap in one reserved
   box (the CLS floor). No collapse. */
.plate-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-block-size: 12rem;
    block-size: 100%;
    padding: 1.25rem;
    justify-content: center;
}
.plate-skeleton__masthead {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
/* THE PLOT SILHOUETTE — columns seated on a TRUE --engrave hairline (the plot's own baseline rule;
   the axis-as-fat-pill is gone). The hairline does NOT breathe: structure holds steady while the
   pending content pulses above it — the engraved frame's own discipline. */
.plate-skeleton__plot {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex: 1;
    min-block-size: 6rem;
    padding-block-start: 0.5rem;
    border-block-end: 1px solid var(--engrave);
}
.plate-skeleton__col {
    flex: 1;
    /* The non-monotone silhouette height — a fraction of the 6rem band resolved in REM (definite;
       a percentage would resolve to 0 against the indefinite flex chain — see the script note). */
    block-size: calc(var(--h, 0.6) * 6rem);
    /* Print-crisp: a micro-mark cut on the rising corners only; square-bottomed on the baseline. */
    border-radius: var(--radius-mark) var(--radius-mark) 0 0;
    /* 16% ink (the --engrave weight) — browser-tuned: at 12% the columns sank into the plate
       texture at the breath's low rest. Peak breath ≈ the engraved hairline's own presence. */
    background: color-mix(in oklab, var(--foreground) 16%, transparent);
}
/* The masthead lines — engraved-ink washes at the type rungs (title darker, dek quieter), cut at
   the same micro-mark radius. Warm on BOTH stocks (the wash derives from --foreground, so it is
   espresso ink on the peach paper and ivory ink on the dark stock — never a cool web gray). */
.plate-skeleton__bar {
    display: block;
    block-size: 0.75rem;
    border-radius: var(--radius-mark);
    background: color-mix(in oklab, var(--foreground) 10%, transparent);
}
.plate-skeleton__bar--title {
    inline-size: 42%;
    block-size: 1rem;
    background: color-mix(in oklab, var(--foreground) 14%, transparent);
}
.plate-skeleton__bar--dek {
    inline-size: 64%;
}
/* THE CAPTION SLOT (O-LIB-CARRY) — ONE visible prose line beneath the plot silhouette, absent by
   default. It mirrors PlateVoid's `.plate-void__caption` register (the void family's quiet prose
   voice) so a face's copy reads consistently whether the plate is loading or genuinely empty. */
.plate-skeleton__caption {
    margin: 0;
    max-inline-size: 44ch;
    font-size: 0.9375rem;
}
/* The quiet breath — a compositor-only opacity sweep (no layout, no paint of geometry). Each column
   leads its neighbour by a beat (the --i stagger), so the pulse READS left→right across the
   silhouette — a slow scan, never a whole-block blink. The masthead breathes unstaggered. */
.plate-skeleton__col,
.plate-skeleton__bar {
    animation: plate-skeleton-breath 2.2s ease-in-out infinite;
    animation-delay: calc(var(--i, 0) * 140ms);
}
@keyframes plate-skeleton-breath {
    0%,
    100% {
        opacity: 0.55;
    }
    50% {
        opacity: 1;
    }
}
@media (prefers-reduced-motion: reduce) {
    .plate-skeleton__col,
    .plate-skeleton__bar {
        animation: none;
        opacity: 0.7;
    }
}
</style>
