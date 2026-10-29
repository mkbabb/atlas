<script setup lang="ts">
// DockDashboardSelect — the dashboard switcher's seat (U/B7 §2.2, O-12; U/B7c C1, O-7). Until first
// use it is the face alone, the dashboards glyph; the list (DockDashboardSelectLive, glass's Select)
// loads and mounts when the reader opens it (DockSelectSeat). It is a single control, so it can sit
// in the rail's site layer or as the phone bar's Dashboards cell without becoming a container seat.
import { computed } from "vue";
import { LayoutGrid } from "@lucide/vue";
import { useDashboardRegistry } from "../../../../contract/index.js";
import DockSelectSeat from "./DockSelectSeat.vue";

defineOptions({ inheritAttrs: false });

const { active, side = "right", returnFocus = true } = defineProps<{
    /** The active dashboard's slug, or undefined off a dashboard route. */
    active?: string;
    /** Which side the list opens to: `right` beside the rail, `top` above the phone bar. */
    side?: "right" | "top";
    /** Focus goes back to the trigger when the list closes. The dock clears it when the list
        closed because another surface took its seat: that surface owns focus. */
    returnFocus?: boolean;
}>();

/** The list is open. */
const open = defineModel<boolean>("open", { default: false });

const { getDashboards } = useDashboardRegistry();
const activeTitle = computed(() => getDashboards().find((d) => d.slug === active)?.title);
const load = () => import("./DockDashboardSelectLive.vue");
</script>

<template>
    <DockSelectSeat
        v-bind="$attrs"
        v-model:open="open"
        :load="load"
        :bind="{ active, side, returnFocus }"
        :face="{
            class: 'dock-trigger dock-select-trigger dock-dashboards',
            'aria-label': activeTitle ? `Dashboards: ${activeTitle}` : 'Dashboards',
            title: 'Dashboards',
            'data-testid': 'dock-dashboards',
        }"
    >
        <LayoutGrid class="dock-dashboards__glyph" aria-hidden="true" />
        <span hidden />
    </DockSelectSeat>
</template>

<style>
/* The face and the live trigger share these rules (the live module has no sheet of its own). */
.dock-dashboards {
    display: grid;
    place-items: center;
    inline-size: var(--dock-control-size, 2.75rem);
    block-size: var(--dock-control-size, 2.75rem);
    padding: 0;
}
.dock-dashboards__glyph {
    inline-size: 1.1rem;
    block-size: 1.1rem;
}
</style>
