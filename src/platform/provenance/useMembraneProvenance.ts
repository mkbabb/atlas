// platform/provenance/useMembraneProvenance.ts — FACET 6, THE PROVENANCE-DETENT TELEPORT SEAM
// (spec-chrome §c.1 facet 6 · the A-39 fold · STRAND A). The membrane's facet-6 must re-home the
// active viz's provenance AND its CSV/image export INTO the dock — but atlas cannot import the
// dashboards' `PlateProvenance`, and re-authoring per-plate export handlers in the dock would fork
// the logic. TELEPORT is the KISS mechanism: the dock renders ONE target container (the HOST); each
// plate's own provenance + export nodes relocate INTO it when that plate is the active/dial viz (the
// SOURCE). The plate keeps OWNING its content — Teleport moves the live vnode, no cross-repo import,
// no projected copy.
//
// ONE target, ref-counted liveness: a SOURCE teleports ONLY when a target is mounted (the dock is on
// screen) AND this viz is the dial viz — so a dock-less mount (the home gallery, an SSR/story
// harness) never fires a teleport at an absent target ("Failed to locate Teleport target"), and
// exactly ONE plate ever projects (the singular fold, never 25 stacked).
import { computed, onMounted, onUnmounted, ref, type ComputedRef } from "vue";
import { getActivePinia, storeToRefs } from "pinia";
import { useFilterPanel } from "../../filter/composables/useFilterPanel.js";
import { useActiveBeat } from "../stores/useActiveBeat.js";
import { useVizRegistry } from "../../charts/composables/useVizRegistry.js";
import { hasVizScrubHost } from "../../charts/composables/activeViz.js";

/** The singleton facet-6 teleport target id (ONE dock ⇒ ONE target). Both the SOURCE selector and
    the HOST element id derive from this ONE string, so the seam can never drift. */
export const MEMBRANE_PROVENANCE_TARGET_ID = "membrane-provenance-slot";

/** The CSS selector a SOURCE teleports to — the HOST's element id. */
export const MEMBRANE_PROVENANCE_TARGET_SELECTOR = `#${MEMBRANE_PROVENANCE_TARGET_ID}`;

// Ref-count of live facet-6 targets. Normally 0 (no dock) or 1 (a dashboard route's dock). A SOURCE
// reads it so a teleport only ever activates against a mounted target.
const hostCount = ref(0);

// The empty dial for a no-Pinia context — shared so the guard allocates nothing per call.
const EMPTY_DIAL: ComputedRef<string> = computed(() => "");

/** THE ONE DIAL-VIZ TRUTH — the SAME resolution ALL of the membrane's viz-scoped chrome reads (the
    facet-5 zone, the facet-6 provenance detent, and the export/provenance teleport gate). The PINNED
    viz wins, else the centre-grain singleton, else — on ANY route with NO viz-writing scrub host —
    the route's PRIMARY registered viz. Canonicalized HERE (the facet-5 zone `MembraneVizContext`
    consumes this exact function) so nothing can drift: on a no-scrub route they ALL resolve the
    primary viz, so facet-6 PAINTS and the plate's export/provenance teleport lands — WITHOUT this the
    export would strand once `VizGearDock` is deleted (a filterless plain plate — `vft`, `speedtest` —
    still declares an `export`, so its CSV/image download must have a home).

    FILTER-AGNOSTIC ON PURPOSE. The dial does NOT gate on `filterBody`: a route with no filter still
    has an export + enlarge to project. The A-19 phantom-filter guard rides ONE place only — the
    facet-7 filter TRIGGER's own `v-if="routeHasFilter"` in `MembraneVizContext` — so a filterless
    route paints its export/enlarge chrome but grows NO empty-drawer trigger. A SCRUB route (`/sci`,
    `/usf`) mounts a viz-writing host ⇒ `hasVizScrubHost` suppresses the fallback ⇒ the dial reduces
    byte-identically to `pinned ?? centre-grain` (the zone rests empty at the page top exactly as
    before). The home gallery mounts no plate ⇒ `primaryVizId` is `""` ⇒ no dial, no chrome.

    Pinia-safe by construction: a SOURCE (`VizPlate` / the dashboards `PlateProvenance` / the
    `ChapterStage` source-data seat) can be unit-mounted OUTSIDE the app (no `app.use(pinia)`) — and
    the store reads (`useFilterPanel`/`activeVizId`) need an active Pinia. Guard the WHOLE read: no
    active Pinia ⇒ the empty dial (the teleport simply never fires there); inside the app the dock
    installs Pinia at bootstrap, so the real dial flows. `useVizRegistry`/`hasVizScrubHost` are module
    singletons, safe even off-app. */
export function useDialVizId(): ComputedRef<string> {
    if (!getActivePinia()) return EMPTY_DIAL;
    const { pinnedVizId } = useFilterPanel();
    const { activeVizId } = storeToRefs(useActiveBeat());
    const { primaryVizId } = useVizRegistry();
    return computed<string>(() => {
        if (pinnedVizId.value) return pinnedVizId.value;
        if (activeVizId.value) return activeVizId.value;
        if (!hasVizScrubHost.value) return primaryVizId.value;
        return "";
    });
}

/** THE HOST — facet-6 (`MembraneProvenanceDetent.vue`) calls this. It hands back the target id to
    stamp on the container `<div>` and registers/deregisters this target's liveness so every SOURCE
    knows a target exists to receive its teleport. */
export function useMembraneProvenanceHost(): { targetId: string } {
    onMounted(() => {
        hostCount.value += 1;
    });
    onUnmounted(() => {
        hostCount.value -= 1;
    });
    return { targetId: MEMBRANE_PROVENANCE_TARGET_ID };
}

/** THE SOURCE — a plate's provenance (dashboards `PlateProvenance`) + its header export control
    (`VizPlate`) call this with the viz id. `teleport` is true iff a facet-6 target is live AND this
    viz is the dial viz; when false the node renders in place (the Teleport `disabled` fallback), so
    the pre-fold home stays intact until this viz is projected. `targetSelector` is the ONE stable
    selector both sources point at. */
export function useMembraneProvenanceSource(vizId: () => string): {
    teleport: ComputedRef<boolean>;
    targetSelector: string;
} {
    const dial = useDialVizId();
    const teleport = computed<boolean>(
        () => hostCount.value > 0 && vizId() !== "" && vizId() === dial.value,
    );
    return { teleport, targetSelector: MEMBRANE_PROVENANCE_TARGET_SELECTOR };
}
