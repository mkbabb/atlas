<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Download, Settings2 } from "@lucide/vue";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { instrumentSpringStyle } from "@/motion/instrument-spring";

defineProps<{ label: string; appliedCount?: number; sourceData?: boolean }>();
const emit = defineEmits<{ "open-source-data": [] }>();
const open = ref(false);
const reducedMotion = useReducedMotion();
const style = computed(() => instrumentSpringStyle(reducedMotion.value));
let dwell: ReturnType<typeof setTimeout> | null = null;
function schedule(value: boolean): void {
    if (dwell) clearTimeout(dwell);
    dwell = setTimeout(() => (open.value = value), 60);
}
onBeforeUnmount(() => dwell && clearTimeout(dwell));
</script>

<template>
    <div
        class="viz-gear-dock"
        :class="{ 'viz-gear-dock--open': open }"
        :style="style"
        role="group"
        :aria-label="label"
        data-viz-gear-dock
        @pointerenter="schedule(true)"
        @pointerleave="schedule(false)"
        @focusin="open = true"
        @focusout="schedule(false)"
    >
        <button
            type="button"
            class="viz-gear-dock__gear"
            :aria-expanded="open"
            :aria-label="`${label} settings`"
            @click="open = !open"
        >
            <Settings2 aria-hidden="true" />
            <span v-if="appliedCount" class="viz-gear-dock__badge">{{ appliedCount }}</span>
        </button>
        <div class="viz-gear-dock__bloom" :aria-hidden="!open" :inert="!open || undefined">
            <slot />
            <button
                v-if="sourceData"
                type="button"
                class="viz-gear-dock__source"
                aria-label="Open source data"
                @click="emit('open-source-data')"
            >
                <Download aria-hidden="true" />
            </button>
        </div>
    </div>
</template>

<style scoped>
.viz-gear-dock,.viz-gear-dock__bloom { display: inline-flex; align-items: center; gap: .2rem; }
.viz-gear-dock__gear { position: relative; display: grid; inline-size: 44px; block-size: 44px; place-items: center; border: 0; border-radius: var(--radius-control); background: transparent; color: var(--foreground); }
.viz-gear-dock__gear svg { inline-size: 1.25rem; block-size: 1.25rem; }
.viz-gear-dock__source { display: grid; inline-size: 44px; block-size: 44px; place-items: center; border: 0; border-radius: var(--radius-control); background: transparent; color: inherit; }
.viz-gear-dock__source svg { inline-size: 1.1rem; block-size: 1.1rem; }
.viz-gear-dock__badge { position: absolute; inset-block-start: 0; inset-inline-end: 0; font: 700 .625rem/1 var(--font-mono); }
.viz-gear-dock__bloom { max-inline-size: 0; opacity: 0; overflow: clip; transform: translateX(.35rem); transition: max-inline-size var(--instrument-spring-duration) var(--instrument-spring-ease), opacity var(--instrument-spring-duration) var(--instrument-spring-ease), transform var(--instrument-spring-duration) var(--instrument-spring-ease); }
.viz-gear-dock--open .viz-gear-dock__bloom { max-inline-size: 16rem; opacity: 1; overflow: visible; transform: none; }
</style>
