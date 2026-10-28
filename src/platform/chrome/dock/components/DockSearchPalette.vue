<script setup lang="ts">
// DockSearchPalette — the glass command palette DockSearch opens. It is its own async chunk: the
// palette (glass Command, its dialog and the reka combobox under them) loads on the first open, or
// when the pointer or focus reaches the Search button, so no route's entry carries it (B7b M3, O-7).
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@mkbabb/glass-ui/command";
import type { SiteSearchItem } from "../site.js";

defineProps<{
    open: boolean;
    dashboards: readonly SiteSearchItem[];
    groups: readonly { group: string; items: readonly SiteSearchItem[] }[];
}>();
const emit = defineEmits<{ "update:open": [boolean]; go: [string] }>();
</script>

<template>
    <CommandDialog :open="open" @update:open="emit('update:open', $event)">
        <CommandInput placeholder="Search dashboards and school units" data-testid="dock-search-input" />
        <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup heading="Dashboards">
                <CommandItem
                    v-for="item in dashboards"
                    :key="item.to"
                    :value="item.to"
                    :textValue="item.label"
                    @select="emit('go', item.to)"
                >
                    {{ item.label }}
                </CommandItem>
            </CommandGroup>
            <CommandGroup v-for="g in groups" :key="g.group" :heading="g.group">
                <CommandItem
                    v-for="item in g.items"
                    :key="item.to"
                    :value="item.to"
                    :textValue="item.label"
                    @select="emit('go', item.to)"
                >
                    {{ item.label }}
                </CommandItem>
            </CommandGroup>
        </CommandList>
    </CommandDialog>
</template>
