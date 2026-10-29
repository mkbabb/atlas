<script setup lang="ts">
// DockSelectSeat — a dock Select that loads on first use (U/B7c C1, O-7 entry JS).
//
// The dock's Selects (Dashboards, Sections, Saved views, By subject) were always mounted, so every
// consumer's entry carried glass's Select and reka's Select content for lists nobody had opened
// (REPORT-B7B §4). Until the reader reaches for one, the seat renders the face alone: a button with
// the trigger's classes, name and test id. Pointer or focus on it fetches the list's module; a
// click, Enter or Space mounts the real Select, open, in the face's place. From then on the Select
// stays mounted and owns the face, its focus and its close. The dock can also open a list itself
// (the seat's model set true), which mounts it the same way. The face stays until the module has
// arrived, so the swap is one frame with no gap.
import { markRaw, shallowRef, watch, type Component } from "vue";

// The caller's attributes (a seat's `data-dock-cell`) land on the face and on the live Select.
defineOptions({ inheritAttrs: false });

const { load, bind = {}, face = {} } = defineProps<{
    /** The module of the live Select (its trigger and its list). */
    load: () => Promise<{ default: Component }>;
    /** Props for the live Select. */
    bind?: Record<string, unknown>;
    /** The face's own attributes: the trigger's class, accessible name and test id. */
    face?: Record<string, unknown>;
}>();

/** The list is open. */
const open = defineModel<boolean>("open", { default: false });

const Live = shallowRef<Component | null>(null);
/** The live Select is mounted: the reader (or the dock) opened the list once. */
const armed = shallowRef(false);
let loading: Promise<void> | null = null;
function fetchLive(): Promise<void> {
    loading ??= load().then((m) => {
        Live.value = markRaw(m.default);
    });
    return loading;
}

watch(
    open,
    (next) => {
        if (next)
            void fetchLive().then(() => {
                armed.value = true;
            });
    },
    { immediate: true },
);

function arm(): void {
    void fetchLive().then(() => {
        armed.value = true;
        open.value = true;
    });
}
</script>

<template>
    <component :is="Live" v-if="armed && Live" v-bind="{ ...$attrs, ...bind }" v-model:open="open" />
    <button
        v-else
        v-bind="{ ...$attrs, ...face }"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-autocomplete="none"
        data-state="closed"
        data-dock-select-seat=""
        data-glass-dock-seat
        @click="arm"
        @pointerenter="fetchLive"
        @focus="fetchLive"
    >
        <slot />
    </button>
</template>
