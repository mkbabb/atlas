// platform/composables/useFilterMount.ts — THE VIZ-AGNOSTIC PER-ROUTE FILTER-VIEW ADAPTER
// (J-FILTER §4 · arm c · the j0-filter-route-fold seam).
//
// THE PROBLEM (j0-filter-route-fold, J-FEEDBACK-4 §5 / CH4 PARTIAL). The FilterView facility is the ONE
// persistent selection surface, and it must fold into EVERY route WITH a selection surface — but it must
// NOT paint on a route WITHOUT one. The prior selection card (`SelectionPreview`) was mounted route-locally
// with NO single contract-derived adapter, and /demand (zero entity-selection wiring) was never honestly
// framed as INERT. The honest scope is "4 of 5": /usf (state) · /ecf (district) · /sci (district) ·
// /speedtest (cell) carry an entity-selection surface; /demand does NOT (its `selectionKey` is the temporal
// `year` axis — a year-scrub dial, never an entity pin).
//
// THE TRANSPOSITION (the ONE per-route adapter; viz-agnostic, NEVER a per-viz fork). This composable is the
// SINGLE seam the FilterView mount reads. It resolves `hasSelectionSurface` from the active dashboard's
// CONTRACT — the injected `DashboardContext.selectionKey` — NOT a per-route hard-code and NOT a per-viz
// branch:
//   • an ENTITY-selection route mints a `{kind}:{id}` composite key into `useSelection.selectedKeys` (a
//     `fips`/`leaNumber`/`h3Index` grain), so its `selectionKey` is an entity grain → the facility MOUNTS.
//   • /demand's `selectionKey` is the TEMPORAL `year` axis (a year scrub, no entity pin) → the facility is
//     INERT (`hasSelectionSurface=false`, zero selection wiring). This reads the DATA truth (a temporal key
//     is not an entity-selection surface), so it survives a future route-merge — it is not a slug allow-list.
//
// THE CONTRACT-DERIVED RENDER (the SAME on every selection route — never a per-viz fork). The FilterView the
// adapter mounts derives ENTIRELY from `useSelection.selectedItems` (the parsed composite-key set) + the
// readout store (the pinned facts) — the IDENTICAL store fan-out for /usf, /ecf, /sci, /speedtest. The
// adapter adds NO route branch to that render; it only gates the MOUNT (present on the four, inert on
// /demand). So `[data-testid=filter-view]` is PRESENT-and-bound on the four selection routes and ABSENT on
// /demand, the SAME render from one contract.
//
// THE FENCE (arm-c bounds). This adapter does NOT author `FilterView.vue` (arm a) — it provides the mount
// gate the FilterView reads. It does NOT re-own the selection STATE layer (`useSelection` is read-only here)
// and it never forks the render per viz.

import { computed, inject, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useSelection } from "@/platform/stores/useSelection";
import { DASHBOARD_KEY, type DashboardContext } from "@/contract";
import type { SelectionKey } from "@/charts/contract/selection-contract";

/**
 * The set of `DashboardContext.selectionKey` values that name a TEMPORAL axis (a year/time scrub) rather
 * than an ENTITY selection surface. A route whose selection key is temporal mints NO `{kind}:{id}` entity
 * composite key into `useSelection`, so the FilterView has nothing to render — it stays INERT. Read as the
 * DATA truth (the kind of thing the route "selects"), so the inert framing survives a route rename/merge,
 * NOT a slug allow-list. /demand is the sole temporal-key route today (`selectionKey: "year"`).
 */
const TEMPORAL_SELECTION_KEYS: ReadonlySet<string> = new Set(["year"]);

/** The mount contract the FilterView reads from the per-route adapter — the ONE viz-agnostic seam. */
export interface FilterMount {
    /**
     * Whether the active route carries an ENTITY-selection surface (so the FilterView FOLDS in). True on
     * /usf · /ecf · /sci · /speedtest (an entity-grain `selectionKey`); FALSE on /demand (the temporal
     * `year` key — inert). The FilterView gates its `v-if` on this, so `[data-testid=filter-view]` is
     * PRESENT on the four selection routes and ABSENT on /demand.
     */
    hasSelectionSurface: ComputedRef<boolean>;
    /**
     * The parsed selected items — the SAME contract-derived projection the FilterView mini-map + accordion
     * render from (`useSelection.selectedItems`), never a per-viz fork. Empty when nothing is pinned (the
     * facility may still be mounted-and-bound on a selection route — the mount relation is route-scoped, the
     * content is selection-scoped).
     */
    selectedItems: ComputedRef<SelectionKey[]>;
    /**
     * Whether the facility currently has content to paint (an entity-selection surface AND ≥1 pinned item).
     * The thin `hasSelectionSurface ∧ selectedItems.length` the FilterView reads for its content body (the
     * mini-map + list only have meaning with a non-empty selection); the `[data-testid=filter-view]` MOUNT
     * relation rides `hasSelectionSurface` alone, so the gate reads presence on the four routes regardless
     * of the live selection state.
     */
    hasContent: ComputedRef<boolean>;
}

/**
 * THE VIZ-AGNOSTIC PER-ROUTE FILTER-VIEW ADAPTER (the FilterView mount reads this). Resolves the
 * single `hasSelectionSurface` gate from the active dashboard's contract (`selectionKey`) plus the
 * contract-derived `selectedItems` projection — the SAME render on every selection route, INERT on
 * /demand. The FilterView consumes this composable for its `v-if`/content, so the four selection
 * routes mount the facility from ONE adapter and /demand leaves it inert (the j0-filter-route-fold law).
 *
 * `ctx` is the injected `DashboardContext` (the chrome's `DASHBOARD_KEY`); passed explicitly when a caller
 * already holds it (DashboardView injects once), else injected here. When NO context is resolved (the
 * gallery/about fallthrough — no dashboard mounted), the surface is INERT (no selection wiring at all).
 */
export function useFilterMount(
    ctx: DashboardContext | undefined = inject(DASHBOARD_KEY, undefined),
): FilterMount {
    const selection = useSelection();
    const { selectedItems } = storeToRefs(selection);

    const hasSelectionSurface = computed<boolean>(() => {
        // No active dashboard (gallery/about) → no selection surface at all.
        if (!ctx) return false;
        // A TEMPORAL selection key (/demand's `year`) is a time-scrub axis, NOT an entity-pin surface →
        // INERT. An entity-grain key (`fips`/`leaNumber`/`h3Index`) carries the surface → MOUNT.
        return !TEMPORAL_SELECTION_KEYS.has(ctx.selectionKey);
    });

    const hasContent = computed<boolean>(
        () => hasSelectionSurface.value && selectedItems.value.length > 0,
    );

    return { hasSelectionSurface, selectedItems, hasContent };
}
