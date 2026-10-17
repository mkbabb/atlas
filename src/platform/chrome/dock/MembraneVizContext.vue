<script setup lang="ts">
// MembraneVizContext.vue — FACET 5, THE VIZ-CONTEXT ZONE (spec-chrome §c.1 facet 5), now the seat of
// the route's FILTER TRIGGER only (facet 7).
//
// A-39, THE PLATE (RULINGS §I): a figure's own actions (Enlarge, export, options) live AT the figure,
// in its act row (`charts/frame/PlateAct.vue`). The dock carries no per-figure action: the zone's
// options band (the stage-controls and plate-options projections) and its Enlarge are deleted, with no
// alias. What stays is the route-level filter drawer's trigger, which acts on the route's filters.
import { computed, inject } from "vue";
import { SlidersHorizontal } from "@lucide/vue";
import { DockControl } from "@mkbabb/glass-ui/dock";
import { DASHBOARD_KEY } from "../../../contract/index.js";
import { useFilterPanel } from "../../../filter/composables/useFilterPanel.js";
import { useFilterPane } from "../../../filter/composables/useFilterPane.js";
import { useFilterLedger } from "../../../filter/composables/useFilterLedger.js";
import { useDialVizId } from "../../provenance/useMembraneProvenance.js";
import { facetBand, type MembraneFacet } from "./membrane-facet.js";

const FACET: MembraneFacet = "viz-context";
// FACET 7 — the filter TRIGGER (spec-chrome §c.1 facet 7 · W-57). The W-05 GEAR-ONLY erratum
// (§g.1, discharged 2026-07-21) seats the rest filter affordance HERE, "in the membrane's
// viz-context zone", NOT as a separate teleported pip-door (the OF-23 door provably paints 0×0 at
// rest). So the ONE relocated filter trigger co-locates with the active-viz zone, scoped to the
// SAME `dialVizId`: it PINS the panel to the active viz + opens the shared drawer, never a K-ACTIVE
// write. The `filter-trigger` union member below pins the stamp to a real facet (a typo is a compile
// error); the drawer/relay it opens ALREADY EXISTS (FilterPanel + useFilterPanel) — this is the seat.
const FILTER_FACET: MembraneFacet = "filter-trigger";

const { pinnedVizId, pin } = useFilterPanel();
const { open: filterOpen } = useFilterPane();
const { appliedCount } = useFilterLedger();

// THE ONE DIAL-VIZ TRUTH (canonicalized in `useMembraneProvenance`): the pinned viz, else the
// centre-grain singleton, else the no-scrub route's primary viz. The zone paints only while it is set.
const dialVizId = useDialVizId();

// A-19 ROUTE-GATE — the facet-7 filter TRIGGER paints iff THIS route declares a filter body
// (EcfFilter / ConsultantFilter / DemandFilter / …): the one place the phantom-filter guard lives now
// that the dial is filter-agnostic. `inject(DASHBOARD_KEY)` resolves from the dock's dashboard
// provider (the membrane is its descendant).
const ctx = inject(DASHBOARD_KEY, null);
const routeHasFilter = computed(() => Boolean(ctx?.filterBody));

// FACET 7 — THE FILTER TRIGGER. Reads EXPANDED iff the shared drawer is open AND pinned to THIS
// active viz (mirrors the retired per-plate `useVizPlate.filterDockOpen` — the relocation is
// behaviour-faithful). One click PINS the active viz + opens the drawer (the relay); re-clicking the
// same active viz's trigger closes it (the drawer-close false-edge clears the pin, FilterPanel owns
// that watcher). NEVER writes the K-ACTIVE `activeVizId` signal (the single-writer law).
const filterDrawerOpen = computed(
    () => filterOpen.value && pinnedVizId.value === dialVizId.value,
);
function toggleFilter(): void {
    if (!dialVizId.value) return;
    if (filterDrawerOpen.value) {
        filterOpen.value = false;
    } else {
        pin(dialVizId.value);
        filterOpen.value = true;
    }
}
// The COLLAPSED applied-filters summary — the panel's own de-duped active-dim count (the SAME
// `useFilterLedger` projection the FilterPanel door reads), shown when dials are active + the drawer
// is closed; absent otherwise (OF-9, de-occluded).
const showAppliedPip = computed(
    () => !filterDrawerOpen.value && appliedCount.value > 0,
);

// THE TRUTHFUL ACCESSIBLE NAME (U9 · §6.5) — the trigger discloses the "Filters" DIALOG for the
// active dashboard, so its accessible name is that HUMAN contract, NEVER the technical `dialVizId`
// slug (`ecf-choropleth`, `sci-scatter`, …). `ctx.title` is the dashboard's human title (the same
// string FilterPanel's save default reads); absent ⇒ the bare "Filters". The truthful popup ROLE
// (`aria-haspopup="dialog"` — the receiver IS a named dialog, not a menu), the `aria-controls` join
// to the drawer body, and `aria-expanded` complete the honest disclosure contract on the template.
const filterName = computed(() =>
    ctx?.title ? `Filters — ${ctx.title}` : "Filters",
);
</script>

<template>
    <div
        v-if="dialVizId"
        class="membrane-viz-context"
        :data-membrane-facet="FACET"
        :data-membrane-band="facetBand(FACET)"
        :data-active-viz="dialVizId"
        data-viz-context-zone
    >
        <!-- FACET 7 — THE FILTER TRIGGER (spec-chrome §c.1 facet 7 · W-57 · the W-05 GEAR-ONLY
             erratum). The ONE relocated filter affordance: pins the ACTIVE viz + opens the shared
             drawer (the relay). Names the active viz (aria/title) + de-occludes; the applied-count
             pip rides it so ≥1 active dial reads at rest. The `filter-trigger` facet is stamped as a
             shipped DOM fact (the closed-union member, inspectable) — the seat, not a new drawer.
             A-19: gated on `routeHasFilter` so a filterless route (vft, speedtest) grows no
             empty-drawer trigger. -->
        <span v-if="routeHasFilter" class="membrane-viz-context__filter-slot">
            <DockControl
                compact
                class="membrane-viz-context__filter"
                :aria-label="filterName"
                :aria-expanded="filterDrawerOpen"
                aria-haspopup="dialog"
                aria-controls="filter-drawer-body"
                :title="filterName"
                :data-membrane-facet="FILTER_FACET"
                :data-testid="`membrane-filter-trigger-${dialVizId}`"
                data-membrane-filter-trigger
                @click="toggleFilter"
            >
                <SlidersHorizontal aria-hidden="true" />
            </DockControl>
            <span
                v-if="showAppliedPip"
                class="membrane-viz-context__applied"
                :title="`${appliedCount} filter(s) applied`"
                :data-testid="`membrane-filter-applied-${dialVizId}`"
                data-membrane-filter-applied
                :data-filter-count="appliedCount"
            >
                {{ appliedCount }}
            </span>
        </span>

    </div>
</template>

<style scoped>
.membrane-viz-context {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    inline-size: 100%;
    padding-block: 0.4rem;
}
.membrane-viz-context__filter-slot {
    position: relative;
    align-self: center;
    display: inline-grid;
    place-items: center;
}
.membrane-viz-context__applied {
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
