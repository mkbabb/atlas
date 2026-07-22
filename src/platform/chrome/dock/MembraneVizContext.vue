<script setup lang="ts">
// MembraneVizContext.vue — FACET 5, THE VIZ-CONTEXT ZONE (spec-chrome §c.1 facet 5 · the A-39 fold ·
// W-55 one-zone). ONE registry-projected detent replaces the N per-plate `VizGearDock` capsules: the
// ACTIVE viz's controls, projected `facetsFor([activeVizId])` SINGULAR (never 25 pre-rendered forks —
// the §c.2 within-facet-forking cure). Two projection paths off the ONE active id, precedence-ordered:
//
//   · PATH A — a composed `ChapterStage` → its scene-aware `anatomy.gear.controls` via the S-20 seam
//     `stageControlsFor` (fold-1). PRECEDENCE, so /sci's scatter controls survive the fold (§e.3 —
//     "without which /sci is exactly the route the fold breaks"); the graphic registers a raw plate
//     `optionsController` under the SAME stage id, and path B would lose the stage's scene filtering.
//   · PATH B — a plain plate → its registered E2 `optionsController` via <VizOptionsBand> (the dials
//     the retired inline dock hosted, re-homed into the ONE zone).
//
// Plus the ENLARGE — the `?fig=` seam driven by the ACTIVE id (§c.1 facet 5 = "options + enlarge"),
// so every active viz has viz chrome here even when it declares no options. `dialVizId` tracks the
// PINNED viz first, else the centre-grain singleton (the β-LOW-3 not-tracking wrinkle, cured here).
//
// The zone SELF-GATES on a live active id (nothing centred ⇒ no node). It reads the registry — it
// owns NO viz state (the controllers are `useVizOptions`'s, URL-backed; the id is the store's).
import { computed, inject } from "vue";
import { Maximize2, Minimize2, SlidersHorizontal } from "@lucide/vue";
import { DockControl } from "@mkbabb/glass-ui/dock";
import VizOptionsBand from "../../../filter/ui/VizOptionsBand.vue";
import { DASHBOARD_KEY } from "../../../contract/index.js";
import { useVizRegistry } from "../../../charts/composables/useVizRegistry.js";
import { useFilterPanel } from "../../../filter/composables/useFilterPanel.js";
import { useFilterPane } from "../../../filter/composables/useFilterPane.js";
import { useFilterLedger } from "../../../filter/composables/useFilterLedger.js";
import { useViewParams } from "../../stores/useViewParams.js";
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

const { registry, stageControlsFor } = useVizRegistry();
const { pinnedVizId, pin } = useFilterPanel();
const { open: filterOpen } = useFilterPane();
const { appliedCount } = useFilterLedger();
const view = useViewParams();

// THE ONE DIAL-VIZ TRUTH (β-LOW-3 + the STRAND B primary fallback) — the pinned viz wins, else the
// centre-grain singleton, else the no-scrub route's primary viz. Canonicalized in
// `useMembraneProvenance` so this facet-5/7 zone, the facet-6 provenance detent, and the
// export/provenance teleport gate all resolve ONE truth (they cannot drift). It is FILTER-AGNOSTIC:
// the zone paints its options/enlarge for any dial viz — the A-19 phantom-filter guard rides only the
// facet-7 trigger's own `routeHasFilter` gate below, so a filterless route (vft, speedtest) paints
// its enlarge/export chrome but grows NO empty-drawer trigger.
const dialVizId = useDialVizId();

// A-19 ROUTE-GATE — the facet-7 filter TRIGGER paints iff THIS route declares a filter body
// (EcfFilter / ConsultantFilter / DemandFilter / …): the one place the phantom-filter guard lives now
// that the dial is filter-agnostic. `inject(DASHBOARD_KEY)` resolves from the dock's dashboard
// provider (the membrane is its descendant).
const ctx = inject(DASHBOARD_KEY, null);
const routeHasFilter = computed(() => Boolean(ctx?.filterBody));

// PATH A — a composed stage's scene-aware controls (the S-20 seam), precedence over the raw plate.
const stageControls = computed(() =>
    dialVizId.value ? stageControlsFor(dialVizId.value) : undefined,
);
// PATH B — a plain plate's E2 options controller (only when no stage owns the id).
const optionsController = computed(() =>
    !stageControls.value && dialVizId.value
        ? (registry.value.get(dialVizId.value)?.optionsController ?? null)
        : null,
);

// THE ENLARGE — the `?fig=` expand seam, driven by the ACTIVE id (never a private URL-state bag).
const isFullscreen = computed(
    () => dialVizId.value !== "" && view.figId === dialVizId.value,
);
function toggleEnlarge(): void {
    if (!dialVizId.value) return;
    if (isFullscreen.value) view.closeFig(dialVizId.value);
    else view.openFig(dialVizId.value);
}

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
        <!-- PATH A — the composed stage's scene-aware controls (precedence). -->
        <component
            :is="stageControls.component"
            v-if="stageControls"
            v-bind="stageControls.props"
        />
        <!-- PATH B — the plain plate's E2 options band. -->
        <VizOptionsBand
            v-else-if="optionsController"
            :viz-id="dialVizId"
            :controller="optionsController"
        />

        <!-- FACET 7 — THE FILTER TRIGGER (spec-chrome §c.1 facet 7 · W-57 · the W-05 GEAR-ONLY
             erratum). The ONE relocated filter affordance: pins the ACTIVE viz + opens the shared
             drawer (the relay). Names the active viz (aria/title) + de-occludes; the applied-count
             pip rides it so ≥1 active dial reads at rest. The `filter-trigger` facet is stamped as a
             shipped DOM fact (the closed-union member, inspectable) — the seat, not a new drawer.
             A-19: gated on `routeHasFilter` so a filterless route (vft, speedtest) grows no
             empty-drawer trigger even though the zone paints its enlarge/export chrome. -->
        <span v-if="routeHasFilter" class="membrane-viz-context__filter-slot">
            <DockControl
                compact
                class="membrane-viz-context__filter"
                :aria-label="`Filters — ${dialVizId}`"
                :aria-expanded="filterDrawerOpen"
                aria-haspopup="true"
                :title="`Filters · ${dialVizId}`"
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

        <!-- THE ENLARGE — the `?fig=` seam (§c.1 facet 5 = "options + enlarge"); present for every
             active viz so the zone always carries viz chrome. -->
        <DockControl
            compact
            class="membrane-viz-context__enlarge"
            :aria-pressed="isFullscreen"
            :aria-label="isFullscreen ? 'Collapse the figure' : 'Enlarge the figure'"
            :title="isFullscreen ? 'Collapse' : 'Enlarge'"
            :data-testid="`viz-context-enlarge-${dialVizId}`"
            data-viz-context-enlarge
            @click="toggleEnlarge"
        >
            <Minimize2 v-if="isFullscreen" aria-hidden="true" />
            <Maximize2 v-else aria-hidden="true" />
        </DockControl>
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
.membrane-viz-context__enlarge {
    align-self: center;
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
