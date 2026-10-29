<script setup lang="ts">
// DockRoster — the dock's site face on `/` (U/B7 §2.2, §3.1–§3.3; O-2, O-3). At ≥ 768 px the dock
// rests open on the homepage and lists the ranked dashboards: one row per dashboard with its title,
// its one number and that number's period, SCI first. Held entries are not listed; companions follow
// below a rule. The last row, "By subject", opens the subject index (DockRosterSubjectsLive, loaded on
// first use). The row sheet is unscoped (its classes are namespaced) so the live row wears it too.
//
// Every root node is one control, because these rows are the seats of glass's toolbar run (the same
// contract as the chapter rungs, B6 · §M M-4): glass roves them with the arrows and gives the run one
// Tab stop. The rule above the companions is that row's top border, not an element.
import { computed } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { ChevronDown } from "@lucide/vue";
import DockSelectSeat from "./DockSelectSeat.vue";
import { useDashboardRegistry } from "../../../../contract/index.js";
import { siteTransition } from "../site-transition.js";
import type { SiteSubject } from "../site.js";

const { subjects = [] } = defineProps<{
    /** The subject index entries ("By subject"); the row is omitted when there are none. */
    subjects?: readonly SiteSubject[];
}>();

const router = useRouter();
const { getDashboards } = useDashboardRegistry();
const ranked = computed(() => getDashboards().filter((d) => typeof d.rank === "number"));
const companions = computed(() => getDashboards().filter((d) => d.rank === "companion"));

function go(e: MouseEvent, to: string): void {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    siteTransition(() => router.push(to));
}

// "By subject" is a seat: its Select loads on first use (U/B7c C1, O-7).
const loadSubjects = () => import("./DockRosterSubjectsLive.vue");
</script>

<template>
    <RouterLink
        v-for="(d, i) in ranked"
        :key="d.slug"
        :to="`/${d.slug}`"
        class="dock-roster__row"
        :style="{ '--row-accent': d.accent ?? 'var(--route-accent, var(--foreground))' }"
        :data-testid="`dock-roster-${d.slug}`"
        :data-rank="d.rank"
        :data-roster-index="i"
        @click="go($event, `/${d.slug}`)"
    >
        <span class="dock-roster__title">{{ d.title }}</span>
        <span v-if="d.headline" class="dock-roster__figure">
            <span class="dock-roster__value">{{ d.headline.value }}</span>
            <span class="dock-roster__period">{{ d.headline.period }}</span>
        </span>
    </RouterLink>
    <RouterLink
        v-for="(d, i) in companions"
        :key="d.slug"
        :to="`/${d.slug}`"
        class="dock-roster__row dock-roster__row--companion"
        :class="{ 'dock-roster__row--ruled': i === 0 }"
        :data-testid="`dock-roster-${d.slug}`"
        data-rank="companion"
        @click="go($event, `/${d.slug}`)"
    >
        <span class="dock-roster__title">{{ d.title }}</span>
    </RouterLink>
    <DockSelectSeat
        v-if="subjects.length"
        :load="loadSubjects"
        :bind="{ subjects, ruled: !companions.length }"
        :face="{
            class: [
                'dock-trigger dock-select-trigger dock-roster__row dock-roster__row--subjects',
                { 'dock-roster__row--ruled': !companions.length },
            ],
            'data-testid': 'dock-roster-subjects',
        }"
    >
        <span class="dock-roster__title">By subject</span>
        <ChevronDown class="dock-select-trigger__chevron" aria-hidden="true" />
    </DockSelectSeat>
</template>

<style>
/* A roster row: one link covering the whole row, ≥ 44 px, the dashboard's accent as a 3 px edge.
   Hover and the current row change colour only (no transform, no shadow change). */
.dock-roster__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 0.125rem 0.75rem;
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: 0.5rem 0.75rem 0.5rem 0.875rem;
    border: 0;
    border-inline-start: 3px solid var(--row-accent, transparent);
    border-radius: 0 0.75rem 0.75rem 0;
    background: transparent;
    color: var(--foreground);
    text-align: start;
    text-decoration: none;
    cursor: pointer;
    transition: background-color var(--transition-control, 150ms ease);
}
.dock-roster__row:hover {
    background: color-mix(in oklab, var(--foreground) 6%, transparent);
}
.dock-roster__row:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: 2px;
}
.dock-roster__row--companion,
.dock-roster__row--subjects {
    border-inline-start-color: transparent;
    color: var(--muted-foreground);
}
.dock-roster__row--ruled {
    margin-block-start: 0.5rem;
    box-shadow: 0 -0.25rem 0 -0.1875rem var(--engrave, color-mix(in oklab, currentColor 18%, transparent));
}
.dock-roster__title {
    grid-column: 1 / -1;
    overflow: hidden;
    font-size: 0.875rem;
    font-weight: 550;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.dock-roster__figure {
    display: contents;
}
.dock-roster__value {
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
}
.dock-roster__period {
    justify-self: end;
    color: var(--muted-foreground);
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
}
@media (prefers-reduced-motion: reduce) {
    .dock-roster__row {
        transition: none;
    }
}
</style>
