<script setup lang="ts">
// HandUnderline.vue — the K-HANDMARK collapse: a THIN re-point shim onto the generalized
// `HandMark.vue` (the pen-family `underline | circle | path` diagonal of the matrix). The
// morphology (the font-proportional weight solver + the aspect strip-pin), the ribbon policy, the
// clock + dark-lift, and the keyframe-free draw seam ALL live in `HandMark.vue` now — the two J-era
// wrappers (this + `HandHighlight`) had grown past their seams (K0-REDLINE §2·7), re-threading the
// same clock/brush/scrub policy by hand. The collapse is the seam re-cut.
//
// This shim preserves the wrapper's PUBLIC surface (its props + defaults + the `play()`/`snap()`
// expose) so its live call-sites — the SCI/ECF mastheads, the StoryBeat/Chase/Equity/Charters/
// retention picks, the /demand crossover-year mark — compile UNCHANGED. K-REPOINT (D16) re-points
// them onto `<HandMark>` in LOCKSTEP with the e2e surface re-baseline, then retires this shim; it is
// kept ONLY until then (KISS, no orphan, no premature mass-edit).
import { ref } from "vue";
import HandMark from "@/charts/glyph/HandMark.vue";
import type { MarkClock } from "@/motion/useHandMarkClock";

const props = withDefaults(
    defineProps<{
        clock?: MarkClock;
        variant?: "pen" | "pencil" | "crayon" | "marker";
        shape?: "underline" | "circle" | "path";
        path?: string;
        color?: string;
        drawMs?: number;
        seed?: number;
        boil?: boolean;
    }>(),
    {
        clock: "load",
        variant: "pen",
        shape: "underline",
        path: undefined,
        color: undefined,
        drawMs: 700,
        seed: 1,
        boil: false,
    },
);

// Forward the load-clock one-shot + the PRM/interrupt snap to the underlying HandMark.
const mark = ref<{
    play: () => Promise<void>;
    snap: () => void;
} | null>(null);
async function play(): Promise<void> {
    await mark.value?.play();
}
function snap(): void {
    mark.value?.snap();
}
defineExpose({ play, snap });
</script>

<template>
    <HandMark
        ref="mark"
        :clock="props.clock"
        :variant="props.variant"
        :shape="props.shape"
        :path="props.path"
        :color="props.color"
        :draw-ms="props.drawMs"
        :seed="props.seed"
        :boil="props.boil"
    >
        <slot />
    </HandMark>
</template>
