<script setup lang="ts">
// StickyScene.vue — the scene host: an in-flow figure with its control in the head (U/B7 O-12).
//
// Scrolling only scrolls. The figure sits in the page's flow; no step observer, no pin, no scroll
// clock. A scene with `period: "year"` seats the period control (PeriodControl) in the figure head's
// top-right seat: choosing a period, stepping or playing writes it through the year scope, a reader
// act. A stage (ChapterStage) seats its scene control through the `control` slot instead. One data
// line under the figure (`caption`, or the `caption` slot) follows the selected period or scene.
import {
    computed, onBeforeUnmount, onMounted, ref,
    type Component, type VNodeChild,
} from "vue";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import VizPlate from "../frame/VizPlate.vue";
import PeriodControl from "./PeriodControl.vue";
import { isVizContract } from "../contract/viz-contract.js";
import type { VizContract } from "../contract/viz-contract.js";
import type { ChapterScene, SceneProse } from "../contract/scene-contract.js";

const props = defineProps<{
    /** The declared scene. */
    scene: ChapterScene;
    /** The chapter index (kept for the essay's mount signature). */
    index?: number;
    /** The owning story beat. */
    beatId?: string;
}>();
const emit = defineEmits<{
    /** The figure entered or left the viewport (the stage's `stage-active` event). Writes nothing. */
    "active-change": [active: boolean];
}>();

const view = useViewParams();
const yearScope = computed(() => (props.scene.period === "year" ? view.yearScope : null));
const period = computed(() => yearScope.value?.activeYear.value ?? null);
function choosePeriod(key: number): void {
    yearScope.value?.setSingle(key);
}

const graphicEl = ref<HTMLElement | null>(null);
const rootEl = ref<HTMLElement | null>(null);
let io: IntersectionObserver | null = null;
let active = false;
onMounted(() => {
    if (!rootEl.value || typeof IntersectionObserver === "undefined") return;
    io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting !== active) {
                active = entry.isIntersecting;
                emit("active-change", active);
            }
        }
    });
    io.observe(rootEl.value);
});
onBeforeUnmount(() => {
    io?.disconnect();
    if (active) emit("active-change", false);
});

const graphicComponent = computed<Component | null>(() =>
    isVizContract(props.scene.graphic) ? null : (props.scene.graphic as Component),
);

function Prose(p: { prose: SceneProse }): VNodeChild {
    return typeof p.prose === "function" ? p.prose() : p.prose;
}
</script>

<template>
    <div
        ref="rootEl"
        class="sticky-scene"
        :class="{ 'sticky-scene--focal': scene.focal }"
        :data-period="scene.period"
    >
        <div v-if="$slots.control || (yearScope && period !== null)" class="sticky-scene__head" data-figure-control-seat>
            <slot name="control">
                <PeriodControl
                    v-if="yearScope && period !== null"
                    :periods="yearScope.years"
                    :model-value="period"
                    :label="yearScope.noun.label"
                    :noun="yearScope.noun.singular"
                    :host="graphicEl"
                    @update:model-value="choosePeriod"
                />
            </slot>
        </div>
        <div ref="graphicEl" class="sticky-scene__graphic">
            <VizPlate v-if="!graphicComponent" :contract="(scene.graphic as VizContract)" />
            <component :is="graphicComponent" v-else />
            <slot name="anatomy" />
        </div>
        <div v-if="$slots.caption || scene.caption" class="sticky-scene__caption" data-scene-caption>
            <slot name="caption">
                <Prose v-if="scene.caption" :prose="scene.caption" />
            </slot>
        </div>
    </div>
</template>

<style scoped>
.sticky-scene {
    display: grid;
    gap: 0.75rem;
    min-inline-size: 0;
}
.sticky-scene__head {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.5rem;
    min-inline-size: 0;
}
.sticky-scene__graphic {
    position: relative;
    min-inline-size: 0;
}
.sticky-scene__caption {
    font-size: var(--type-caption, 0.875rem);
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums lining-nums;
}
</style>
