// platform/provenance/useMembraneProvenance.ts — FACET 6, THE PROVENANCE-DETENT TELEPORT SEAM
// (spec-chrome §c.1 facet 6). The membrane's facet 6 re-homes the active viz's PROVENANCE record into
// the dock. Atlas cannot import the dashboards' `PlateProvenance`, so TELEPORT is the mechanism: the
// dock renders ONE target container (the HOST); a plate's own provenance node relocates INTO it when
// that plate is the active/dial viz (the SOURCE). The plate keeps OWNING its content.
//
// A-39, THE PLATE (RULINGS §I): a figure's ACTIONS (Enlarge, export, options) never come here. They
// live in the figure's own act row (`charts/frame/PlateAct.vue`); this seam carries the record only.
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

/** THE ONE DIAL-VIZ TRUTH — the resolution the membrane's viz-scoped chrome reads (the facet-7
    filter trigger, the facet-6 provenance detent, and the provenance teleport gate). The PINNED viz
    wins, else the centre-grain singleton, else — on a route with NO viz-writing scrub host — the
    route's PRIMARY registered viz. A SCRUB route (`/sci`, `/usf`) suppresses the fallback, so the dial
    reduces to `pinned ?? centre-grain`. The home gallery mounts no plate ⇒ `""` ⇒ no dial.

    Pinia-safe by construction: a SOURCE can be unit-mounted OUTSIDE the app (no `app.use(pinia)`),
    and the store reads need an active Pinia, so no active Pinia ⇒ the empty dial (the teleport never
    fires there). `useVizRegistry`/`hasVizScrubHost` are module singletons, safe even off-app. */
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

/** THE SOURCE — a plate's provenance (dashboards `PlateProvenance`) calls this with the viz id. `teleport` is true iff a facet-6 target is live AND this
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
