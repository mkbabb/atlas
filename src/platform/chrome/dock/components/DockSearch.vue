<script setup lang="ts">
// DockSearch — the site layer's Search (U/B7 §2.2). A glass command palette over the dashboards and
// any instance search source (sci: the school units, by name). A source loads on the first open of
// Search, once, so no route's first paint carries it. A result routes to its page. The palette's open
// state is a model, so the dock can seat it or hold the rail open while it is open (PLAN §2.5).
// The palette is an async chunk (DockSearchPalette), fetched when the pointer or focus reaches the
// button and mounted on the first open, so the entry carries only the button (B7b M3, O-7).
import { computed, defineAsyncComponent, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
import { Search } from "@lucide/vue";
import { DockControl } from "@mkbabb/glass-ui/dock";
import { useDashboardRegistry } from "../../../../contract/index.js";
import type { SiteSearchItem, SiteSearchSource } from "../site.js";

// One control: the caller's attributes land on the button (a seat of the bar's run).
defineOptions({ inheritAttrs: false });

const { sources = [] } = defineProps<{
    /** Instance search sources beyond the dashboards, loaded on the first open. */
    sources?: readonly SiteSearchSource[];
}>();

const router = useRouter();
const { getDashboards } = useDashboardRegistry();
const dashboards = computed<SiteSearchItem[]>(() =>
    getDashboards()
        .filter((d) => d.rank !== "held")
        .map((d) => ({ label: d.title, to: `/${d.slug}` })),
);

/** The palette is open. */
const open = defineModel<boolean>("open", { default: false });
const loaded = shallowRef<{ group: string; items: readonly SiteSearchItem[] }[]>([]);
let loading: Promise<void> | null = null;
function loadSources(): void {
    loading ??= Promise.all(
        sources.map(async (s) => ({ group: s.group, items: await s.load().catch(() => []) })),
    ).then((groups) => {
        loaded.value = groups;
    });
}

const loadPalette = () => import("./DockSearchPalette.vue");
const DockSearchPalette = defineAsyncComponent(loadPalette);
/** The palette mounts on the first open and stays mounted (its close animation, its focus return). */
const mounted = shallowRef(false);
watch(
    open,
    (next) => {
        if (!next) return;
        mounted.value = true;
        loadSources();
    },
    { immediate: true },
);

function onOpen(next: boolean): void {
    open.value = next;
}

function go(to: string): void {
    open.value = false;
    void router.push(to);
}
</script>

<template>
    <DockControl
        v-bind="$attrs"
        compact
        class="dock-search"
        aria-label="Search"
        title="Search"
        aria-haspopup="dialog"
        :aria-expanded="open"
        data-testid="dock-search"
        @click="onOpen(true)"
        @pointerenter="loadPalette"
        @focus="loadPalette"
    >
        <Search aria-hidden="true" />
    </DockControl>
    <DockSearchPalette
        v-if="mounted"
        :open="open"
        :dashboards="dashboards"
        :groups="loaded"
        @update:open="onOpen"
        @go="go"
    />
</template>
