<script setup lang="ts">
// VizGearDock — the per-viz control CAPSULE (PA-4 OF-15). It COMPOSES Glass's <GlassDock>: the
// gear rides the native collapsed layer and the per-viz controls bloom into the expanded layer.
// The dwell/hover/focus/click-away collapse machine AND the real glass material are the library's
// — no hand-rolled `open` flag, dwell timer, or dismiss claim survives (the native slot owns the
// gear). The single figure-enlarge seat and the stage source-data seat ride inside this one capsule.
import { GlassDock, DockControl } from "@mkbabb/glass-ui/dock";
import { Download, Settings2 } from "@lucide/vue";

defineProps<{ label: string; appliedCount?: number; sourceData?: boolean }>();
const emit = defineEmits<{ "open-source-data": [] }>();
</script>

<template>
    <GlassDock
        class="viz-gear-dock"
        size="sm"
        fit-content
        :aria-label="label"
        data-viz-gear-dock
    >
        <!-- The native collapsed layer OWNS the gear — the capsule's resting face and its expand
             trigger (GlassDock pins on click, blooms on hover/focus). The applied-filters count
             rides it so it reads at rest (OF-9). -->
        <template #collapsed>
            <button type="button" class="viz-gear-dock__gear" :aria-label="`${label} settings`">
                <Settings2 aria-hidden="true" />
                <span v-if="appliedCount" class="viz-gear-dock__badge">{{ appliedCount }}</span>
            </button>
        </template>

        <!-- The expanded layer — the consumer's controls plus the stage source-data seat. -->
        <slot />
        <DockControl
            v-if="sourceData"
            compact
            aria-label="Open source data"
            @click="emit('open-source-data')"
        >
            <Download aria-hidden="true" />
        </DockControl>
    </GlassDock>
</template>

<style scoped>
.viz-gear-dock__gear {
    position: relative;
    display: grid;
    place-items: center;
    min-inline-size: 2.75rem;
    min-block-size: 2.75rem;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
}
.viz-gear-dock__gear svg { inline-size: 1.25rem; block-size: 1.25rem; }
.viz-gear-dock__badge {
    position: absolute;
    inset-block-start: 0.15rem;
    inset-inline-end: 0.15rem;
    font: 700 0.625rem/1 var(--font-mono);
}
</style>
