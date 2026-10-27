<script setup lang="ts">
// DockSavedViews — the site layer's Saved views (U/B7 §2.2): a glass Select of the views the reader
// saved with "Save this view", newest first, across every dashboard. Choosing one opens it.
import { computed, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import { Bookmark } from "@lucide/vue";
import { Select, SelectContent, SelectItem } from "@mkbabb/glass-ui/select";
import { DockTrigger } from "@mkbabb/glass-ui/dock";
import { useSavedViews } from "../../../composables/useSavedViews.js";
import { useDockSurfaceHold } from "../composables/useDockPortals.js";

// One control: the caller's attributes land on the trigger (a seat of the bar's run).
defineOptions({ inheritAttrs: false });

const { side = "right" } = defineProps<{
    /** Which side the list opens to: `right` beside the rail, `top` above the phone bar. */
    side?: "right" | "top";
}>();

const router = useRouter();
const { views } = useSavedViews();
// The list is teleported outside the rail, so while it is open it holds the rail open.
const open = ref(false);
const trigger = useTemplateRef<{ $el: HTMLElement }>("trigger");
useDockSurfaceHold("dock-saved-views", open, () => trigger.value?.$el);

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
            ref="trigger"
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
        <SelectContent :side="side" align="start">
            <SelectItem v-if="!views.length" value="none" disabled>No saved views yet</SelectItem>
            <SelectItem v-for="v in views" :key="v.id" :value="v.url">{{ v.name }}</SelectItem>
        </SelectContent>
    </Select>
</template>

<style scoped>
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
