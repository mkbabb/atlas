<script setup lang="ts">
// DockFilterTrigger — the dock's ROUTE-LEVEL filters control (facet 7 · RULINGS §L D3-1, §M M-4).
//
// The dock keeps no figure subject. This trigger opens the route's filter drawer and nothing else: it
// pins no figure, carries no figure id, and paints whether or not a figure is centred. A figure's own
// dials are its own acts, in its figure dock (O-18, `charts/frame/PlateDock.vue`). The facet-5
// viz-context zone that used to hold this trigger (stamped with, and pinning, a "dial" figure chosen
// by the tie rule: D3-B N4, D5-A CX-K2) is deleted with no alias.
//
// It is a single control seated in the dock's foot (`#persistent-end`), outside glass's toolbar run,
// so it is its own Tab stop. Gated on the route declaring a filter body (A-19), so vft and speedtest
// grow no empty-drawer trigger.
import { computed } from "vue";
import { SlidersHorizontal } from "@lucide/vue";
import { DockControl } from "@mkbabb/glass-ui/dock";
import type { DashboardContext } from "../../../../contract/index.js";
import { useFilterPane } from "../../../../filter/composables/useFilterPane.js";
import { useFilterLedger } from "../../../../filter/composables/useFilterLedger.js";
import type { MembraneFacet } from "../membrane-facet.js";

const FACET: MembraneFacet = "filter-trigger";

// The dock is mounted once above the router (U/B7 §2.2), so the route's context arrives as a prop
// from the dock, not by inject from the route view.
const { ctx } = defineProps<{ ctx: DashboardContext }>();
const routeHasFilter = computed(() => Boolean(ctx.filterBody));

const { open } = useFilterPane();
const { appliedCount } = useFilterLedger();

/** The accessible name is the human contract: the route's Filters dialog, never a technical slug.
    The applied count is spoken with it, since the counter badge is only paint. */
const name = computed(() => {
    const base = ctx.title ? `Filters: ${ctx.title}` : "Filters";
    return appliedCount.value > 0 ? `${base}, ${appliedCount.value} applied` : base;
});

/** The applied count rides the closed trigger, so active filters read at rest. */
const showApplied = computed(() => !open.value && appliedCount.value > 0);

function toggle(): void {
    open.value = !open.value;
}
</script>

<template>
    <span v-if="routeHasFilter" class="dock-filter-trigger">
        <DockControl
            compact
            class="dock-filter-trigger__control"
            :aria-label="name"
            :aria-expanded="open"
            aria-haspopup="dialog"
            aria-controls="filter-drawer-body"
            :title="name"
            :data-membrane-facet="FACET"
            data-testid="dock-filter-trigger"
            data-membrane-filter-trigger
            @click="toggle"
        >
            <SlidersHorizontal aria-hidden="true" />
        </DockControl>
        <span
            v-if="showApplied"
            class="dock-filter-trigger__applied"
            aria-hidden="true"
            data-testid="dock-filter-applied"
            :data-filter-count="appliedCount"
        >
            {{ appliedCount }}
        </span>
    </span>
</template>

<style scoped>
.dock-filter-trigger {
    position: relative;
    display: inline-grid;
    place-items: center;
}
/* The applied count: a small counter seated on the control's upper end corner, ink on foreground. */
.dock-filter-trigger__applied {
    position: absolute;
    inset-block-start: -0.15rem;
    inset-inline-end: -0.15rem;
    display: grid;
    min-inline-size: 1rem;
    block-size: 1rem;
    padding-inline: 0.15rem;
    place-items: center;
    border-radius: var(--radius-pill);
    background: var(--foreground);
    color: var(--background);
    font: 700 0.625rem/1 var(--font-mono);
    pointer-events: none;
}
</style>
