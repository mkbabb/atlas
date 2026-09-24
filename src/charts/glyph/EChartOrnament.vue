<script setup lang="ts">
import { computed } from "vue";
import type { EChartsType } from "echarts/core";
import InkStroke from "./InkStroke.vue";
import { RED_INK } from "@/motion/useHandMarkClock";

/** The editorial-red ring ink, lifted per theme (glass's own `light-dark()` idiom). */
const ink = `light-dark(${RED_INK.light}, ${RED_INK.dark})`;
import { useEChartOrnament } from "@/charts/composables/useEChartOrnament";

const props = defineProps<{ chart: EChartsType | null; markKey: string | null }>();
const { anchor } = useEChartOrnament(() => props.chart, () => props.markKey);
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
