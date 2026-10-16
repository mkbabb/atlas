<script setup lang="ts">
import { computed } from "vue";
import HandMark from "./HandMark.vue";
import type { EChartReadiness } from "../composables/useEChart.js";
import { useEChartOrnament } from "../composables/useEChartOrnament.js";

/** `echart`: the host chart's readiness handle (`chart`, `settled`, `frame` from its useEChart). */
const props = defineProps<{ echart: EChartReadiness; markKey: string | null }>();
const { anchor } = useEChartOrnament(props.echart, () => props.markKey);
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
