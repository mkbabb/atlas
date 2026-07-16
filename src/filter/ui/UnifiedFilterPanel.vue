<script setup lang="ts">
// UnifiedFilterPanel.vue — THE ONE FILTER SURFACE (K-FILTER-UNIFIED §4.E). The single panel body the
// `FilterPanel` drawer renders — it COLLAPSES the J-arc two-filter fork (the standalone Teleported
// `FilterView` selection card + the inline per-viz `VizFilterDock`) into ONE projected panel. It
// reads the mounted-plate registry projected to the K-ACTIVE in-viewport SET (`useFilterPanel`,
// READ-ONLY off `activeVizIds` — it NEVER writes the K-ACTIVE signal), and stacks:
//
//   (0) the ALGEBRA band         — the `#algebra` slot (band-0, ABOVE the selection-set pane): the
//        route's GLOBAL filter-algebra readout (`AlgebraReadout`, provenance-surface §3.2). First-
//        class HERE so a route need not prepend it inside its `filterBody`; unfilled ⇒ nothing.
//   (1) the SELECTION-SET pane   — `<SelectionSetPane />` (the lifted `FilterView` body);
//   (2) the route's own controls — the active dashboard's `filterBody` (the route's base dials,
//        injected off `DASHBOARD_KEY` — consumed in-place so the route's filter vocabulary survives
//        the collapse, ONE surface, no orphaned route controls);
//   (3) the CONTEXT band         — `scope:'context'` projected `<DimDial>`s ("Narrow the fleet");
//   (4) the VIEW dials           — `scope:'view'` projected `<DimDial>`s ("Filter within the fleet").
//
// THE KEYED FLIP. Bands 3+4 render the projected dials in a `<TransitionGroup name="dim-flip">`
// keyed by the dim KEY: a context-shift on scroll FLIPs the persistent dims to their new slot,
// leaving dims fade/collapse, entering fade/expand. PRM = instant via the `@media (prefers-reduced-
// motion: reduce)` carve (the named transition is ALWAYS bound; the media query kills it — ONE
// mechanism, KISS). Vue-native FLIP + CSS, NOT keyframes.js (the standing law — list reorder = FLIP).
import { computed, inject } from "vue";
import { DASHBOARD_KEY } from "../../contract/index.js";
import { useFilterPanel } from "../composables/useFilterPanel.js";
import { useVizRegistry } from "../../charts/composables/useVizRegistry.js";
import { useActiveBeat } from "../../platform/stores/useActiveBeat.js";
import { storeToRefs } from "pinia";
import SelectionSetPane from "./SelectionSetPane.vue";
import DimDial from "./DimDial.vue";
import VizOptionsBand from "./VizOptionsBand.vue";

const ctx = inject(DASHBOARD_KEY);

// The route's own filter body (the base dials) — rendered as a band INSIDE the one panel (no second
// surface; the route's controls live HERE now, not in a separate card/dock).
const routeBody = computed(() => ctx?.filterBody);

const { contextDims, viewDims, pinnedVizId } = useFilterPanel();
const { registry } = useVizRegistry();

// The viz id the dials name their testids for — the pin (when the dock toggle pinned the panel) else
// the centre-grain singleton (a stable id for the projected dial's `viz-filter-dim-…` relation).
const beat = useActiveBeat();
const { activeVizId } = storeToRefs(beat);
const dialVizId = computed<string>(() => pinnedVizId.value ?? activeVizId.value ?? "panel");

const hasContextDims = computed(() => contextDims.value.length > 0);
const hasViewDims = computed(() => viewDims.value.length > 0);

// THE E2 OPTIONS — the registered facet's controller for the pinned/active viz (the dials the
// retired inline dock used to host, re-homed into the ONE panel). One viz's options at a time (the
// dock-toggle target), so the band reads off `dialVizId`'s registered controller.
const optionsController = computed(
    () => registry.value.get(dialVizId.value)?.optionsController ?? null,
);

// THE BAND-0 SLOT (O-A9 residue close) — the route's GLOBAL filter-algebra readout (`AlgebraReadout`)
// renders ABOVE the selection-set pane. First-class so a route need not prepend it inside `filterBody`;
// unfilled ⇒ nothing (the consumer paints it, no default — mirroring the VizPlate `#provenance` slot).
defineSlots<{ algebra(): unknown }>();
</script>

<template>
    <section class="unified-filter-panel" aria-label="Filters" data-testid="unified-filter-panel">
        <!-- (0) THE ALGEBRA BAND — band-0, ABOVE the selection-set pane: the route's GLOBAL filter-
             algebra readout (AlgebraReadout, provenance-surface §3.2). First-class HERE so a route
             need not prepend it inside its `filterBody`; unfilled ⇒ renders nothing (the consumer
             paints it, no default — mirroring the VizPlate `#provenance` slot). -->
        <slot name="algebra" />

        <!-- (1) THE SELECTION-SET BAND — the lifted FilterView body (self-gates on a live selection). -->
        <SelectionSetPane />

        <!-- (2) THE ROUTE CONTROLS — the active dashboard's own filter body, consumed in-place so the
             route's filter vocabulary survives the two-filter collapse (ONE surface, no orphan). -->
        <component :is="routeBody" v-if="routeBody" />

        <!-- (3) THE CONTEXT BAND — `scope:'context'` projected dials ("Narrow the fleet"). -->
        <div v-if="hasContextDims" class="unified-filter-panel__band">
            <h3 class="unified-filter-panel__crest sr-only">Narrow the fleet</h3>
            <TransitionGroup tag="ul" name="dim-flip" class="unified-filter-panel__dials">
                <DimDial
                    v-for="d in contextDims"
                    :key="d.key"
                    :dim="d"
                    :viz-id="dialVizId"
                />
            </TransitionGroup>
        </div>

        <!-- (4) THE VIEW DIALS — `scope:'view'` projected dials ("Filter within the fleet"). -->
        <div v-if="hasViewDims" class="unified-filter-panel__band">
            <h3 class="unified-filter-panel__crest sr-only">Filter within the fleet</h3>
            <TransitionGroup tag="ul" name="dim-flip" class="unified-filter-panel__dials">
                <DimDial
                    v-for="d in viewDims"
                    :key="d.key"
                    :dim="d"
                    :viz-id="dialVizId"
                />
            </TransitionGroup>
        </div>

        <!-- (5) THE E2 OPTIONS BAND — the pinned/active viz's per-viz option dials (the retired inline
             dock's options section, re-homed into the ONE panel). -->
        <div v-if="optionsController" class="unified-filter-panel__band">
            <VizOptionsBand :viz-id="dialVizId" :controller="optionsController" />
        </div>
    </section>
</template>

<style scoped>
.unified-filter-panel {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
}
.unified-filter-panel__band {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.unified-filter-panel__band + .unified-filter-panel__band {
    padding-block-start: 0.75rem;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground), transparent 90%);
}
.unified-filter-panel__crest {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted-foreground);
}
.unified-filter-panel__dials {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

/* THE KEYED FLIP — the projected dials FLIP to their new slot on a scroll context-shift; leaving
   dims fade/collapse, entering fade/expand. Vue-native <TransitionGroup> FLIP + CSS (NOT keyframes.js
   — the standing law: a list reorder is a FLIP, never a kf timeline). */
.dim-flip-move,
.dim-flip-enter-active,
.dim-flip-leave-active {
    transition:
        transform 0.32s ease,
        opacity 0.32s ease;
}
.dim-flip-enter-from,
.dim-flip-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
/* leaving dims are taken out of flow so the FLIP of the survivors reads cleanly. */
.dim-flip-leave-active {
    position: absolute;
}

/* PRM = INSTANT — the named transition is ALWAYS bound; the media query kills it (ONE mechanism,
   no `:name=""` trick, no JS read). The context-shift snaps; information parity holds. */
@media (prefers-reduced-motion: reduce) {
    .dim-flip-move,
    .dim-flip-enter-active,
    .dim-flip-leave-active {
        transition: none;
    }
}
</style>
