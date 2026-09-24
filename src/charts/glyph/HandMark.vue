<script setup lang="ts">
// charts/glyph/HandMark.vue — Atlas's semantic hand-mark over a WORD (K-HANDMARK). The slotted
// word/clause wears glass-ui's `<HandMark>`: one pen making four gestures — `underline` · `strike`
// · `circle` · `highlight`. The geometry, the nib, the draw-on, the re-ink, and the ink-lag are all
// glass-rendered, in 1:1 CSS px off the word's own measured line rects.
//
// THE GLASS 9.0.0 RE-CUT (repinned at 10.1). The 4.x–8.x engine laid a fixed `viewBox` over the
// word and took a brush continuum (`pen | pencil | crayon | marker | highlighter`), a `path` escape
// hatch, and a pencil-boil living line; the atlas corrected its viewBox geometry here with a
// morphology solver (font-proportional weight, the aspect strip-pin, the hull blob fix). glass 9.0.0
// replaced all of it with one measured pen whose knobs are `shape · color · weight · seed · draw`,
// so the solver, the brush variants, the boil and its budget are DELETED, not ported. A mark with no
// word (a rule, a ring ornament, a leader) inks through `InkStroke` over glass's exported pen.
import { computed, ref } from "vue";
import { HandMark as GlassHandMark, type HandShape } from "@mkbabb/glass-ui/handmark";
import { useHandMarkClock, type MarkClock } from "@/motion/useHandMarkClock";

const props = withDefaults(
    defineProps<{
        /** The gesture. `underline` (default) under the WORD; `strike` through it; `circle` the ring
         *  around it; `highlight` the chisel band behind it. */
        shape?: HandShape;
        /** The ink colour (any CSS colour). Defaults to the editorial red, lifted per theme. For
         *  `highlight` glass takes a HUE (a number, default 78 — the amber band) instead. */
        color?: string;
        /** The nib as a dimensionless multiple (1 is the pen). */
        weight?: number;
        /** Which clock drives the draw: `load` (draws on at mount; `play()` re-fires it), `scroll` (the
         *  bidirectional view-timeline scrub), `static` (present, at rest). */
        clock?: MarkClock;
        /** The hand's seed — same seed ⇒ the same stroke on every reload. Omitted, glass derives it
         *  from the word and its position. */
        seed?: number;
    }>(),
    {
        shape: "underline",
        color: undefined,
        weight: 1,
        clock: "load",
        seed: undefined,
    },
);

const { draw, resolveInkColor } = useHandMarkClock(() => props.clock);
const redInk = resolveInkColor(() => props.color);
/** The highlight band takes a hue, never the red ink: pass only an explicit value there. */
const ink = computed<string | undefined>(() =>
    props.shape === "highlight" ? props.color : redInk.value,
);

// The library instance — `play()` is exposed for the load `Sequence` chain.
const mark = ref<{ play: () => void } | null>(null);

/** CLOCK A — draw the mark once more (the load arrival). A no-op for scroll/static. Returns a
 *  Promise so `await`-shaped call sites keep their signature. */
async function play(): Promise<void> {
    if (props.clock !== "load") return;
    mark.value?.play();
}
/** Snap to terminal — the library settles instantly under PRM itself. */
function snap(): void {
    mark.value?.play();
}
defineExpose({ play, snap });
</script>

<template>
    <!-- `data-mark-*` attrs are the probe/gate hooks; the scroll clock's wipe keys off them. -->
    <span class="hand-mark" :data-mark-clock="clock" :data-mark-shape="shape">
        <GlassHandMark
            ref="mark"
            class="hand-mark__ink"
            :shape="shape"
            :color="ink"
            :weight="weight"
            :seed="seed"
            :draw="draw"
        >
            <slot />
        </GlassHandMark>
    </span>
</template>

<style scoped>
/* The pen-family word-mark stays nowrap so the ink spans exactly its word; a highlighted clause may
   WRAP (glass lays one band per line rect and never bridges). */
.hand-mark {
    position: relative;
    white-space: nowrap;
}
.hand-mark[data-mark-shape="highlight"] {
    white-space: normal;
}

/* THE SUFFUSION RUNG ④ (DESIGN §13 / HIER-SUFFUSION) — the stroke editorial marks declare their
   recession from `--attn-chrome` on the mark frame alone (the word renders OUTSIDE the SVG). The
   highlight is EXEMPT: its band is the gesture's defining paint, not a recession rung. */
.hand-mark:not([data-mark-shape="highlight"]) :deep(.hm-mark) {
    opacity: var(--attn-chrome);
}

/* THE SCROLL-SCRUB (clock="scroll") — the mark draws/un-draws BIDIRECTIONALLY under real scroll: the
   atlas `crayon-wipe` clip (map-draw.css) on each mark frame's own `view()` timeline. Under PRM (or a
   non-supporting engine) the wipe never attaches and the mark rests drawn. */
@media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
        .hand-mark[data-mark-clock="scroll"] :deep(.hm-mark) {
            animation: crayon-wipe auto linear both;
            animation-timeline: view(block);
            animation-range: entry 0% entry 26%;
        }
    }
}
</style>
