<script setup lang="ts">
// DockDashboardSelect — the dashboard switcher (U/B7 §2.2, O-12). One glass Select of every listed
// dashboard in `rank` order (held entries are not listed; companions come last). Choosing one routes
// there; the arriving page runs one view transition (`siteTransition`, 240 ms, a cut under PRM).
// It is a single control (a Select trigger), so it can sit in the rail's site layer or as the phone
// bar's Dashboards cell without becoming a container seat.
import { computed } from "vue";
import { useRouter } from "vue-router";
import { LayoutGrid } from "@lucide/vue";
import { Select, SelectContent, SelectItem, SelectSeparator } from "@mkbabb/glass-ui/select";
import { DockTrigger } from "@mkbabb/glass-ui/dock";
import { useDashboardRegistry } from "../../../../contract/index.js";
import { siteTransition } from "../site-transition.js";

// One control: the caller's attributes land on the trigger (a seat of the bar's run).
defineOptions({ inheritAttrs: false });

const { active, side = "right" } = defineProps<{
    /** The active dashboard's slug, or undefined off a dashboard route. */
    active?: string;
    /** Which side the list opens to: `right` beside the rail, `top` above the phone bar. */
    side?: "right" | "top";
}>();

const router = useRouter();
const { getDashboards } = useDashboardRegistry();
const ranked = computed(() => getDashboards().filter((d) => typeof d.rank === "number"));
const companions = computed(() => getDashboards().filter((d) => d.rank === "companion"));
const activeTitle = computed(() => getDashboards().find((d) => d.slug === active)?.title);

const model = computed({
    get: () => active ?? "",
    set: (slug) => {
        if (typeof slug !== "string" || !slug || slug === active) return;
        siteTransition(() => router.push(`/${slug}`));
    },
});
</script>

<template>
    <Select v-model="model">
        <DockTrigger
            v-bind="$attrs"
            for="select"
            class="dock-dashboards"
            :aria-label="activeTitle ? `Dashboards: ${activeTitle}` : 'Dashboards'"
            title="Dashboards"
            data-testid="dock-dashboards"
        >
            <LayoutGrid class="dock-dashboards__glyph" aria-hidden="true" />
            <template #icon><span hidden /></template>
        </DockTrigger>
        <SelectContent :side="side" align="start" data-testid="dock-dashboards-list">
            <SelectItem
                v-for="d in ranked"
                :key="d.slug"
                :value="d.slug"
                :data-testid="`dock-dashboard-option-${d.slug}`"
            >
                {{ d.title }}
            </SelectItem>
            <template v-if="companions.length">
                <SelectSeparator />
                <SelectItem
                    v-for="d in companions"
                    :key="d.slug"
                    :value="d.slug"
                    :data-testid="`dock-dashboard-option-${d.slug}`"
                >
                    {{ d.title }}
                </SelectItem>
            </template>
        </SelectContent>
    </Select>
</template>

<style scoped>
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
