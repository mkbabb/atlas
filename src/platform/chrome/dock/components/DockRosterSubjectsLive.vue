<script setup lang="ts">
// DockRosterSubjectsLive — the live "By subject" list, mounted by DockRoster's seat on first use
// (U/B7c C1). A glass Select of the subject index; choosing one routes there with the site
// transition.
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Select, SelectContent, SelectItem } from "@mkbabb/glass-ui/select";
import { DockTrigger } from "@mkbabb/glass-ui/dock-trigger";
import { siteTransition } from "../site-transition.js";
import type { SiteSubject } from "../site.js";

defineOptions({ inheritAttrs: false });

const { subjects, ruled = false } = defineProps<{
    /** The subject index entries. */
    subjects: readonly SiteSubject[];
    /** The row carries the rule above it (no companion row precedes it). */
    ruled?: boolean;
}>();

/** The list is open. */
const open = defineModel<boolean>("open", { default: false });

const router = useRouter();
const subject = computed({
    get: () => "",
    set: (to) => {
        if (typeof to === "string" && to) siteTransition(() => router.push(to));
    },
});
</script>

<template>
    <Select v-model="subject" v-model:open="open">
        <DockTrigger
            v-bind="$attrs"
            for="select"
            class="dock-roster__row dock-roster__row--subjects"
            :class="{ 'dock-roster__row--ruled': ruled }"
            data-testid="dock-roster-subjects"
        >
            <span class="dock-roster__title">By subject</span>
        </DockTrigger>
        <SelectContent side="right" align="start">
            <SelectItem v-for="s in subjects" :key="s.to" :value="s.to">{{ s.label }}</SelectItem>
        </SelectContent>
    </Select>
</template>
