<script setup lang="ts">
// VizOptionsBand.vue — THE E2 PER-VIZ OPTIONS BAND of the unified panel (K-FILTER-UNIFIED §4.E · the
// `VizFilterDock.vue:205-290` options section LIFTED). The segmented / select / switch dials the
// retired inline dock used to host re-home HERE, projected off the pinned/active viz's registered
// `UseVizOptions` controller (the SAME glass-ui vocabulary — ToggleGroup / Select / Switch + reset —
// only now inside the ONE panel, never a transient popover, never an inline per-plate dock). It
// CONSUMES the controller; it owns NO option state (the controller is `useVizOptions`'s, URL-backed).
import { computed } from "vue";
import { ToggleGroup, ToggleGroupItem } from "@mkbabb/glass-ui/toggle-group";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@mkbabb/glass-ui/select";
import { Switch } from "@mkbabb/glass-ui/switch";
import { LabeledField } from "@mkbabb/glass-ui/labeled-field";
import type { UseVizOptions, VizOptionSpec } from "@/charts/composables/useVizOptions";

const props = defineProps<{
    /** The owning viz id (for the control testids). */
    vizId: string;
    /** The E2 per-viz options controller (the registered facet's controller). */
    controller: UseVizOptions;
}>();

const optionSpecs = computed<VizOptionSpec[]>(() => props.controller.specs ?? []);
const hasOptions = computed(() => optionSpecs.value.length > 0);
const isDefault = computed(() => props.controller.isDefault.value);

function strModel(spec: VizOptionSpec): string {
    return String(props.controller.values[spec.key] ?? "");
}
function setStr(spec: VizOptionSpec, v: string | string[]): void {
    const next = Array.isArray(v) ? v[0] : v;
    if (next == null || next === "") return;
    props.controller.set(spec.key, next);
}
function boolModel(spec: VizOptionSpec): boolean {
    return props.controller.values[spec.key] === true;
}
function setBool(spec: VizOptionSpec, v: boolean): void {
    props.controller.set(spec.key, v);
}
function resetOptions(): void {
    props.controller.reset();
}
</script>

<template>
    <div v-if="hasOptions" class="viz-options-band">
        <p class="viz-options-band__crest">Options</p>
        <div class="viz-options-band__rows">
            <LabeledField
                v-for="spec in optionSpecs"
                :key="spec.key"
                :label="spec.label"
                :label-class="'viz-options-band__label'"
                class="viz-options-band__row"
                v-slot="{ controlId, labelledBy }"
            >
                <ToggleGroup
                    v-if="spec.kind === 'segmented'"
                    :id="controlId"
                    :model-value="strModel(spec)"
                    type="single"
                    register="glass"
                    :aria-labelledby="labelledBy"
                    class="flex flex-wrap gap-1"
                    :data-testid="`viz-opt-${vizId}-${spec.key}`"
                    :data-viz-scope="spec.scope === 'global' ? 'global' : undefined"
                    @update:model-value="(v) => setStr(spec, v as string | string[])"
                >
                    <ToggleGroupItem
                        v-for="ch in spec.choices"
                        :key="ch.value"
                        :value="ch.value"
                        :aria-label="ch.label"
                        :disabled="ch.disabled"
                        :title="ch.hint"
                        class="min-h-[44px] text-xs"
                    >
                        {{ ch.label }}
                    </ToggleGroupItem>
                </ToggleGroup>

                <Select
                    v-else-if="spec.kind === 'select'"
                    :model-value="strModel(spec)"
                    @update:model-value="(v) => setStr(spec, v as string)"
                >
                    <SelectTrigger
                        :id="controlId"
                        :aria-labelledby="labelledBy"
                        class="viz-options-band__select min-h-[44px] text-xs"
                        :data-testid="`viz-opt-${vizId}-${spec.key}`"
                        :data-viz-scope="spec.scope === 'global' ? 'global' : undefined"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem
                            v-for="ch in spec.choices"
                            :key="ch.value"
                            :value="ch.value"
                            :disabled="ch.disabled"
                        >
                            {{ ch.label }}
                        </SelectItem>
                    </SelectContent>
                </Select>

                <Switch
                    v-else
                    :id="controlId"
                    :model-value="boolModel(spec)"
                    :aria-labelledby="labelledBy"
                    :data-testid="`viz-opt-${vizId}-${spec.key}`"
                    :data-viz-scope="spec.scope === 'global' ? 'global' : undefined"
                    @update:model-value="(v) => setBool(spec, v as boolean)"
                />
            </LabeledField>
        </div>

        <button
            v-if="!isDefault"
            type="button"
            class="viz-options-band__reset min-h-[44px]"
            :data-testid="`viz-options-reset-${vizId}`"
            @click="resetOptions"
        >
            Reset to defaults
        </button>
    </div>
</template>

<style scoped>
.viz-options-band {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.viz-options-band__crest {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
.viz-options-band__rows {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
}
.viz-options-band__rows :deep(.viz-options-band__row) {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}
.viz-options-band__rows :deep(.viz-options-band__label) {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--foreground);
}
.viz-options-band__select {
    inline-size: 100%;
}
.viz-options-band__reset {
    align-self: flex-start;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    color: var(--muted-foreground);
    background: transparent;
    border: 0;
    border-radius: var(--radius, 6px);
    text-underline-offset: 2px;
    cursor: pointer;
}
.viz-options-band__reset:hover {
    text-decoration: underline;
}
.viz-options-band__reset:focus-visible {
    outline: 2px solid var(--focus-ring-color);
    outline-offset: 2px;
}
</style>
