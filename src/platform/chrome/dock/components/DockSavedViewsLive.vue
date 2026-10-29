<script setup lang="ts">
// DockSavedViewsLive — the live Saved views list, mounted by DockSavedViews's seat on first use
// (U/B7c C1). The site layer's Saved views (U/B7 §2.2): a glass Select of the views the reader
// saved with "Save this view", newest first, across every dashboard. Choosing one opens it. The list's
// open state is a model, so the dock can seat it or hold the rail open while it is open (PLAN §2.5).
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Bookmark } from "@lucide/vue";
import { Select, SelectContent, SelectItem } from "@mkbabb/glass-ui/select";
import { DockTrigger } from "@mkbabb/glass-ui/dock";
import { useSavedViews } from "../../../composables/useSavedViews.js";

// One control: the caller's attributes land on the trigger (a seat of the bar's run).
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

/** The list closed: keep focus where the surface that displaced it put it. */
function onCloseAutoFocus(event: Event): void {
    if (!returnFocus) event.preventDefault();
}

const router = useRouter();
const { views } = useSavedViews();
const model = computed({
    get: () => "",
    set: (url) => {
        if (typeof url === "string" && url) void router.push(url);
    },
});
</script>

<template>
    <Select v-model="model" v-model:open="open">
        <DockTrigger
            v-bind="$attrs"
            for="select"
            class="dock-saved"
            aria-label="Saved views"
            title="Saved views"
            data-testid="dock-saved-views"
        >
            <Bookmark class="dock-saved__glyph" aria-hidden="true" />
            <template #icon><span hidden /></template>
        </DockTrigger>
        <SelectContent :side="side" align="start" @close-auto-focus="onCloseAutoFocus">
            <SelectItem v-if="!views.length" value="none" disabled>No saved views yet</SelectItem>
            <SelectItem v-for="v in views" :key="v.id" :value="v.url">{{ v.name }}</SelectItem>
        </SelectContent>
    </Select>
</template>

