<script setup lang="ts">
// platform/charts/PaperCallout.vue — THE IN-BOUNDS EDITORIAL LEADER-LINE CALLOUT SEAT
// (K-PAPER-CALLOUT · §4.C · paper/K-PAPER-CONVERGENCE.md P4).
//
// The register's seat — two co-located pieces, BOTH shipped-primitive consumers, that editorialize a
// datum the reference's way (IMG_1882.PNG §I·3 — "hand-lettered callouts on thin leader lines that
// editorialize the data"):
//
//   · THE CHIP — a Newsreader-italic DOM chip (the editorial marginalia voice, the closest sanctioned
//     italic in the Fraunces/Newsreader/Fira triad), inked rung-④ `--attn-chrome` (the editorial-mark
//     MARGIN rung, recessive to the rung-③ key/axis — NEVER `--attn-legend`; `tokens.css:790`), seated
//     on the SHIPPED `--paper-aged-texture` paper stock via the K-PAPER-GRAIN `paper-aged-surface`
//     @utility. The chip is `ResizeObserver`-self-measured (its OWN rendered box) and fed to the Cox
//     solver BEFORE any `inside()`/no-clip verdict — never a hard-coded estimate.
//   · THE LEADER — the SHIPPED `@mkbabb/glass-ui/handmark` `InkMark shape="path"` (via the platform
//     `HandMark` collapse, the arbitrary-`d` escape hatch — NOT a parallel SVG draw engine), drawn-on
//     bidirectionally via `clock="scroll"` (the `AnimatedRule` draw-on precedent). The leader's `d` is
//     the solver's `leaderPath` (tiers ③④), re-mapped from the host pixel frame into the brush's
//     100×40 viewBox. `aria-hidden` + `pointer-events:none` — the leader is decorative; the chip carries
//     the editorial text (itself supplementary to the chart's `role=img` label + the export table).
//
// THE FRAME. This seat mounts in the SHIPPED `VizTextOverlay` `#annotation-<id>` slot, which the
// overlay positions at the datum's projected pixel (`convertToPixel`, re-anchored on the expand-settle
// tick — NO hand-rolled re-anchor). So the slot origin IS the datum anchor: the solver runs in the
// anchor-relative frame (anchor = {0,0}); the host hands the standing settle-pass occupancy + the plate
// box in that SAME anchor-relative frame. The 0×0 root neutralizes the slot's align transform so the
// origin lands exactly on the datum.

import { computed, onBeforeUnmount, ref, watch } from "vue";
import HandMark from "@/charts/glyph/HandMark.vue";
import {
    solveCallout,
    type CalloutPlacement,
    type ChipBox,
    type OccupancyBox,
    type PlateBox,
} from "@/charts/scene/usePaperCallout";

const props = withDefaults(
    defineProps<{
        /** The plate's standing settle-pass occupancy (the marks' pixel boxes), in the ANCHOR-RELATIVE
            frame (the slot origin is the datum) — the Cox solver's collision set. */
        occupancy: readonly OccupancyBox[];
        /** The plate's no-clip box, in the SAME anchor-relative frame (so `left`/`top` are the negated
            datum pixel — the plate edges relative to the anchor). */
        plate: PlateBox;
        /** The editorial AT-text the chip SAYS about the datum. */
        text: string;
        /** The chip's small caps eyebrow (the marginalia label). Omit for a text-only chip. */
        eyebrow?: string;
        /** The leader brush grain determinism (the SectionDivider seed law — pixel-identical reloads). */
        seed?: number;
    }>(),
    { eyebrow: undefined, seed: 7 },
);

// ── THE SELF-MEASURE (the gate's self-measure clause) — the chip's OWN rendered box, observed BEFORE
// any `inside()`/no-clip verdict. The Cox solver reads this measured box, never a hard-coded estimate.
const chipEl = ref<HTMLElement | null>(null);
const chipBox = ref<ChipBox>({ width: 0, height: 0 });
let ro: ResizeObserver | null = null;
function measure(): void {
    const el = chipEl.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    chipBox.value = { width: r.width, height: r.height };
}
watch(chipEl, (el) => {
    ro?.disconnect();
    ro = null;
    if (el && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => measure());
        ro.observe(el);
        measure();
    }
});
onBeforeUnmount(() => ro?.disconnect());

// ── THE COX SOLVE (the pure module) — re-run reactively on the self-measured chip box + the occupancy/
// plate the host re-anchors on the settle/resize clock. The anchor is the slot origin (0,0).
const placement = computed<CalloutPlacement>(() =>
    solveCallout({ left: 0, top: 0 }, chipBox.value, props.plate, props.occupancy),
);

// ── THE LEADER GEOMETRY — re-map the solver's host-pixel `leaderPath` (tiers ③④) into the `InkMark`
// 100×40 viewBox. The leader wrapper covers the segment's bounding box (slot-local), and the brush's
// `preserveAspectRatio="none"` viewBox stretches to fill it — an affine map, so the two endpoints land
// on their exact pixels. A purely axis-aligned leader floors its zero extent to 1px (a hairline span).
const leader = computed<{ style: Record<string, string>; path: string } | null>(() => {
    const d = placement.value.leaderPath;
    if (!d) return null;
    const m = /M\s*(-?[\d.]+)\s+(-?[\d.]+)\s+L\s*(-?[\d.]+)\s+(-?[\d.]+)/.exec(d);
    if (!m) return null;
    const x1 = +m[1];
    const y1 = +m[2];
    const x2 = +m[3];
    const y2 = +m[4];
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const bw = Math.max(Math.abs(x2 - x1), 1);
    const bh = Math.max(Math.abs(y2 - y1), 1);
    const vx = (x: number): string => (((x - minX) / bw) * 100).toFixed(2);
    const vy = (y: number): string => (((y - minY) / bh) * 40).toFixed(2);
    return {
        style: { left: `${minX}px`, top: `${minY}px`, width: `${bw}px`, height: `${bh}px` },
        path: `M ${vx(x1)} ${vy(y1)} L ${vx(x2)} ${vy(y2)}`,
    };
});
</script>

<template>
    <!-- The 0×0 root sits at the datum anchor (the slot origin); its absolutely-positioned children
         seat in the anchor-relative frame. `aria-hidden` — the leader is decorative + the chip is
         supplementary to the chart's role=img label and the export table. -->
    <div class="paper-callout" data-paper-callout aria-hidden="true">
        <!-- THE LEADER — the SHIPPED InkMark shape="path", drawn-on via clock="scroll" (tiers ③④). -->
        <div v-if="leader" class="paper-callout__leader" :style="leader.style">
            <HandMark shape="path" :path="leader.path" clock="scroll" :seed="seed" />
        </div>
        <!-- THE CHIP — Newsreader-italic, rung-④ --attn-chrome, on the paper-aged stock, offset to the
             solver's clear seat. `ref` + the ResizeObserver above self-measure its OWN box. -->
        <div
            ref="chipEl"
            class="paper-callout__chip paper-aged-surface"
            :style="{ transform: `translate(${placement.chip.left}px, ${placement.chip.top}px)` }"
        >
            <span v-if="eyebrow" class="paper-callout__eyebrow">{{ eyebrow }}</span>
            <span class="paper-callout__text">{{ text }}</span>
        </div>
    </div>
</template>

<style scoped>
/* THE ROOT — a zero-size point at the datum anchor (the slot origin). Out of flow, so the overlay
   slot's align transform resolves to no shift and the origin lands exactly on the datum. */
.paper-callout {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    overflow: visible;
}

/* THE CHIP — the editorial marginalia chip. Newsreader-italic (the in-triad editorial voice), inked
   rung-④ `--attn-chrome` (the editorial-mark MARGIN rung — the callout editorializes from the margin,
   recessive to the rung-③ key/axis; NEVER `--attn-legend`). Seats on the K-PAPER-GRAIN paper stock. */
.paper-callout__chip {
    position: absolute;
    left: 0;
    top: 0;
    max-width: 20ch;
    padding: 0.14rem 0.42rem;
    border-radius: var(--radius-sm, 6px);
    background: color-mix(in oklab, var(--background, #fdfbf4), transparent 4%);
    box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground, #1a1a1a) 12%, transparent);
    font-family: var(--font-serif, "Newsreader"), serif;
    font-style: italic;
    font-size: 0.76rem;
    line-height: 1.22;
    color: var(--foreground);
    /* RUNG-④ — the editorial-mark margin ink (the `k-paper-callout-in-bounds` rung clause). */
    opacity: var(--attn-chrome);
    pointer-events: none;
}

/* THE EYEBROW — the small-caps marginalia label (Fira-caps, the annotation eyebrow register). */
.paper-callout__eyebrow {
    display: block;
    font-family: var(--font-mono, "Fira Code"), monospace;
    font-style: normal;
    font-size: 0.56rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.82;
}

/* THE LEADER — the InkMark fills the segment-bbox wrapper (the brush's `preserveAspectRatio="none"`
   100×40 viewBox stretches to it). `pointer-events:none` — decorative. */
.paper-callout__leader {
    position: absolute;
    pointer-events: none;
}
.paper-callout__leader :deep(.hand-mark),
.paper-callout__leader :deep(.hm) {
    display: block;
    width: 100%;
    height: 100%;
}
.paper-callout__leader :deep(.hm__svg) {
    left: 0;
    width: 100%;
    height: 100%;
}
</style>
