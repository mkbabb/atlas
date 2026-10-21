<script setup lang="ts">
// DockSearch — the site layer's Search (U/B7 §2.2). A glass command palette over the dashboards and
// any instance search source (sci: the school units, by name). A source loads on the first open of
// Search, once, so no route's first paint carries it. A result routes to its page.
import { computed, ref, shallowRef } from "vue";
import { useRouter } from "vue-router";
import { Search } from "@lucide/vue";
import { DockControl } from "@mkbabb/glass-ui/dock";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@mkbabb/glass-ui/command";
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

const open = ref(false);
const loaded = shallowRef<{ group: string; items: readonly SiteSearchItem[] }[]>([]);
let loading: Promise<void> | null = null;
function loadSources(): void {
    loading ??= Promise.all(
        sources.map(async (s) => ({ group: s.group, items: await s.load().catch(() => []) })),
    ).then((groups) => {
        loaded.value = groups;
    });
}

function onOpen(next: boolean): void {
    open.value = next;
    if (next) loadSources();
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
    >
        <Search aria-hidden="true" />
    </DockControl>
    <CommandDialog :open="open" @update:open="onOpen">
        <CommandInput placeholder="Search dashboards and school units" data-testid="dock-search-input" />
        <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup heading="Dashboards">
                <CommandItem
                    v-for="item in dashboards"
                    :key="item.to"
                    :value="item.to"
                    :text-value="item.label"
                    @select="go(item.to)"
                >
                    {{ item.label }}
                </CommandItem>
            </CommandGroup>
            <CommandGroup v-for="g in loaded" :key="g.group" :heading="g.group">
                <CommandItem
                    v-for="item in g.items"
                    :key="item.to"
                    :value="item.to"
                    :text-value="item.label"
                    @select="go(item.to)"
                >
                    {{ item.label }}
                </CommandItem>
            </CommandGroup>
        </CommandList>
    </CommandDialog>
</template>
