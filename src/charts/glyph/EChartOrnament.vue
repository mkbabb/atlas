<script setup lang="ts">
import { computed } from "vue";
import type { EChartsType } from "echarts/core";
import HandMark from "./HandMark.vue";
import { useEChartOrnament } from "../composables/useEChartOrnament.js";

const props = defineProps<{ chart: EChartsType | null; markKey: string | null }>();
const { anchor } = useEChartOrnament(() => props.chart, () => props.markKey);
const position = computed(() => anchor.value
    ? { transform: `translate3d(${anchor.value.x}px, ${anchor.value.y}px, 0)` }
    : undefined,
);
</script>

<template>
    <HandMark
        v-if="anchor"
        class="echart-ornament"
        variant="pencil"
        shape="circle"
        clock="static"
        :seed="3"
        :style="position"
        aria-hidden="true"
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
