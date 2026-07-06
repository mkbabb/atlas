// platform/composables/useFilterPanel.ts — THE UNIFIED-PANEL PROJECTION (K-FILTER-UNIFIED §4.E).
//
// The ONE panel projects `⋃ activeVizIds' filterDimensions`, de-duped by `dimKeyOf`, split into the
// CONTEXT band (`scope:'context'`) + the VIEW dials (`scope:'view'`), re-composing off the K-ACTIVE
// in-viewport SET. It WATCHES `useActiveBeat().activeVizIds` (READ-ONLY — it NEVER writes the
// K-ACTIVE signal; the single-writer law, §3.4) and projects the PIN-or-set:
//
//   panelVizIds = pinnedVizId ? { pinnedVizId } : activeVizIds
//
// THE PIN (H2). The dock's filter-toggle PINS the panel to ONE viz via the panel-LOCAL `pinnedVizId`
// module singleton — a write to the K-ACTIVE signal here would RACE the scroll reader (the
// multi-writer defect). The pin releases on the drawer's open false-edge (`FilterPanel.vue` owns the
// one watcher: `watch(open, (o) => { if (!o) clearPin() })`). A scroll-resumed reader re-takes
// context after close.
//
// FIRST-DECLARATION-WINS (the §3.5 precondition). A dim declared by N active vizzes shows ONCE
// (de-duped by `dimKeyOf` = the key); the first declaration fixes the `scope` deterministically. The
// `k0-filter-scope-consistency` gate asserts no two contracts declare the SAME key with a CONFLICTING
// scope, so the projection is order-INDEPENDENT.

import { computed, ref, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import { useVizRegistry } from "@/charts/composables/useVizRegistry";
import type { FilterDimension } from "@/charts/contract/viz-contract";

/** The panel-LOCAL pin — a module singleton (NOT a K-ACTIVE write). `null` ⇒ the panel projects the
    in-viewport set; a vizId ⇒ the panel pins to that ONE viz (the dock-toggle target). */
const pinnedVizId = ref<string | null>(null);

/** A dim's de-dup key — the §3.5 keystone (a dim declared by N like vizzes shows ONCE). */
function dimKeyOf(d: Pick<FilterDimension, "key">): string {
    return d.key;
}

export interface UseFilterPanelReturn {
    /** The de-duped projection of the active viz-set's dims — first-declaration-wins per key. */
    projectedDims: ComputedRef<FilterDimension[]>;
    /** The `scope:'context'` partition (the "Narrow the fleet" band). */
    contextDims: ComputedRef<FilterDimension[]>;
    /** The `scope:'view'` partition (the "Filter within the fleet" dials). */
    viewDims: ComputedRef<FilterDimension[]>;
    /** The id the panel is pinned to (or null when it projects the in-viewport set). */
    pinnedVizId: ComputedRef<string | null>;
    /** PIN the panel to ONE viz (the dock-toggle target) — the panel-local singleton, NEVER a
        K-ACTIVE write. */
    pin: (vizId: string) => void;
    /** RELEASE the pin (the drawer-close false-edge) — the panel re-projects the in-viewport set. */
    clearPin: () => void;
}

/**
 * THE UNIFIED-PANEL PROJECTION. Reads the mounted-plate registry projected to the K-ACTIVE
 * in-viewport SET (or the panel-local pin), de-dupes by `dimKeyOf`, and partitions context/view.
 * Degrades gracefully if K-ACTIVE ships only the singleton — the panel projects the pin-only set
 * (narrower, never broken).
 */
export function useFilterPanel(): UseFilterPanelReturn {
    const { facetsFor } = useVizRegistry();
    const beat = useActiveBeat();
    // READ-ONLY — `storeToRefs` keeps `activeVizIds` reactive; the panel NEVER writes the signal.
    const { activeVizId, activeVizIds } = storeToRefs(beat);

    /** The PIN-or-set: a pinned viz wins; else the in-viewport set; the singleton centre is the
        last-resort floor (so a panel opened before the set settles still projects ONE viz). */
    const panelVizIds = computed<Set<string>>(() => {
        if (pinnedVizId.value) return new Set([pinnedVizId.value]);
        if (activeVizIds.value.size > 0) return new Set(activeVizIds.value);
        return activeVizId.value ? new Set([activeVizId.value]) : new Set();
    });

    /** The de-duped union — first declaration of a key wins (its `scope` is then unambiguous, the
        §3.5 consistency gate asserts the precondition). */
    const projectedDims = computed<FilterDimension[]>(() => {
        const byKey = new Map<string, FilterDimension>();
        for (const facet of facetsFor(panelVizIds.value)) {
            for (const d of facet.dims) {
                if (!byKey.has(dimKeyOf(d))) byKey.set(dimKeyOf(d), d);
            }
        }
        return [...byKey.values()];
    });

    const contextDims = computed<FilterDimension[]>(() =>
        projectedDims.value.filter((d) => (d.scope ?? "view") === "context"),
    );
    const viewDims = computed<FilterDimension[]>(() =>
        projectedDims.value.filter((d) => (d.scope ?? "view") === "view"),
    );

    function pin(vizId: string): void {
        pinnedVizId.value = vizId;
    }
    function clearPin(): void {
        pinnedVizId.value = null;
    }

    return {
        projectedDims,
        contextDims,
        viewDims,
        pinnedVizId: computed(() => pinnedVizId.value),
        pin,
        clearPin,
    };
}
