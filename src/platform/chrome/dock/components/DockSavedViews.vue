<script setup lang="ts">
// DockSavedViews — the Saved views seat (U/B7 §2.2; U/B7c C1, O-7). Until first use it is the face
// alone, the bookmark glyph; the list (DockSavedViewsLive, glass's Select of the views the reader
// saved, newest first) loads and mounts when the reader opens it (DockSelectSeat).
import { Bookmark } from "@lucide/vue";
import DockSelectSeat from "./DockSelectSeat.vue";

defineOptions({ inheritAttrs: false });

const { side = "right", returnFocus = true } = defineProps<{
    /** Which side the list opens to: `right` beside the rail, `top` above the phone bar. */
    side?: "right" | "top";
    /** Focus goes back to the trigger when the list closes. The dock clears it when the list
        closed because another surface took its seat: that surface owns focus. */
    returnFocus?: boolean;
}>();

/** The list is open. */
const open = defineModel<boolean>("open", { default: false });

const load = () => import("./DockSavedViewsLive.vue");
</script>

<template>
    <DockSelectSeat
        v-bind="$attrs"
        v-model:open="open"
        :load="load"
        :bind="{ side, returnFocus }"
        :face="{
            class: 'dock-trigger dock-select-trigger dock-saved',
            'aria-label': 'Saved views',
            title: 'Saved views',
            'data-testid': 'dock-saved-views',
        }"
    >
        <Bookmark class="dock-saved__glyph" aria-hidden="true" />
        <span hidden />
    </DockSelectSeat>
</template>

<style>
/* The face and the live trigger share these rules (the live module has no sheet of its own). */
.dock-saved {
    display: grid;
    place-items: center;
    inline-size: var(--dock-control-size, 2.75rem);
    block-size: var(--dock-control-size, 2.75rem);
    padding: 0;
}
.dock-saved__glyph {
    inline-size: 1.1rem;
    block-size: 1.1rem;
}
</style>
