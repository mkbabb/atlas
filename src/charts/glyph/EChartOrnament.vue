<script setup lang="ts">
import { computed } from "vue";
import InkStroke from "./InkStroke.vue";
import { RED_INK } from "../../motion/useHandMarkClock.js";
import type { EChartReadiness } from "../composables/useEChart.js";
import { useEChartOrnament } from "../composables/useEChartOrnament.js";

/** The ornament ring around the anchored mark. glass 9 re-cut `<HandMark>` into a pen that marks
    SLOTTED TEXT, so a wordless ring inks through `InkStroke` over glass's exported `handRing`. The
    retired `variant="pencil"` read as a lighter red hand; the editorial red at a 0.7 nib keeps that
    whisper, lifted per theme with glass's own `light-dark()` idiom. */
const ink = `light-dark(${RED_INK.light}, ${RED_INK.dark})`;

/** `echart`: the host chart's readiness handle (`chart`, `settled`, `frame` from its useEChart). */
const props = defineProps<{ echart: EChartReadiness; markKey: string | null }>();
const { anchor } = useEChartOrnament(props.echart, () => props.markKey);
const position = computed(() => anchor.value
    ? { transform: `translate3d(${anchor.value.x}px, ${anchor.value.y}px, 0)` }
    : undefined,
);
</script>

<template>
    <InkStroke
        v-if="anchor"
        class="echart-ornament"
        kind="ring"
        :weight="0.7"
        :color="ink"
        :seed="3"
        :style="position"
    />
</template>

<style scoped>
.echart-ornament {
    position: absolute;
    inset: 0 auto auto 0;
    width: 2.25rem;
    height: 2.25rem;
    margin: -1.125rem;
    pointer-events: none;
    z-index: 3;
    will-change: transform;
}
</style>
