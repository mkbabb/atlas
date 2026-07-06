// useDockDataState — the dock's data-state register (J-ARCH §3, the Dock 988-L
// decomposition). EXTRACTED from Dock.vue:224-268 as a content-MOVE: the two
// always-visible data affordances the persistent dock carries — the year-scrubber
// RANGE-mode toggle and the `useSavedViews` ⤓-save door — lifted to a named home so
// `Dock.vue` composes it as a thin shell.
//
// The saved-views shelf stays the ONE `platform:views` shelf the filter drawer's
// named-save also writes (no second shelf — both call `save({url: currentUrl()})`, the
// dedup-by-url composable keeps it one set). The year-range state layer already ships
// end-to-end (`useYearScope.setRange`, `?yearMode=range&years=`); this owns only the
// CONTROL that enters it. ZERO behavior change — a content-MOVE from Dock.vue.
import { computed, onBeforeUnmount, ref, type ComputedRef, type Ref } from "vue";
import { useViewParams } from "@/platform/stores/useViewParams";
import { useSavedViews, currentUrl } from "@/platform/composables/useSavedViews";
import type { DashboardContext } from "@/contract";

/** The data-state register's reactive surface — the dock composes this into its template. */
export interface UseDockDataState {
    /** The active year-scope mode ("single" | "range" | "aggregate"). */
    yearModeNow: ComputedRef<string>;
    /** Show the range control only on a multi-year dashboard whose feed (hence scope) landed. */
    hasYearScope: ComputedRef<boolean>;
    /** Toggle range mode over the full span, or fall back to single-at-latest on leaving it. */
    toggleRange: () => void;
    /** ⤓-save the current full URL state under the dashboard title onto the platform:views shelf. */
    saveCurrentView: () => void;
    /** A brief accent confirm flag after a save (the "View saved" visual echo). */
    saveFlash: Ref<boolean>;
}

/**
 * Bind the dock's data-state register to the active dashboard context. Owns the
 * year-range mode toggle + the saved-views ⤓-save door, relocated from Dock.vue onto
 * the SAME `useViewParams` year-scope and `platform:views` shelf they already shared —
 * never a fork. ZERO behavior change — a content-MOVE.
 */
export function useDockDataState(
    ctx: DashboardContext | undefined,
): UseDockDataState {
    const view = useViewParams();

    // ── The saved-views ⤓ door (PL-5, C.W7.e) ────────────────────────────────────
    // The dock is the platform's ALWAYS-VISIBLE register (the filter drawer is closed-
    // default), so it carries a second, persistent ⤓-save affordance ON the SAME
    // `useSavedViews` shelf the filter drawer's "Save view" door writes (no second shelf —
    // both call `save({url: currentUrl()})`, the dedup-by-url composable keeps it one set).
    // Saving rides the URL-as-state round-trip, DECOUPLED from the SA secret: a view over
    // snapshot data still round-trips its filter/selection/year query verbatim (PL-5 is
    // sound over EITHER feed source).
    const savedViews = useSavedViews();
    const saveFlash = ref(false);
    let saveFlashTimer: ReturnType<typeof setTimeout> | null = null;

    /** ⤓-save the current full URL state under the dashboard title — the persistent dock
        door onto the platform:views shelf (the filter drawer's named-save is the richer
        door; this is the one-tap quick-save from anywhere in the scroll). */
    function saveCurrentView(): void {
        const slug = ctx?.id;
        if (!slug) return;
        savedViews.save({ name: ctx?.title ?? slug, slug, url: currentUrl() });
        saveFlash.value = true;
        if (saveFlashTimer) clearTimeout(saveFlashTimer);
        saveFlashTimer = setTimeout(() => (saveFlash.value = false), 1400);
    }

    // ── The year-scrubber RANGE-mode UI control ──────────────────────────────────
    // The state layer already ships `range` end-to-end (`useYearScope.setRange`,
    // `?yearMode=range&years=`, `resolveScope`→`many` frames) — the only thing absent was a
    // CONTROL to ENTER it. Without it a range-scope saved-view could not round-trip (PL-5's
    // stated dependency). This is the named, grep-checked build: a dock control that toggles
    // range mode over the full span (the small-multiple/compare register), mirroring the
    // filter drawer's single↔aggregate toggle with the third arm the grammar always had.
    const yearScopeRef = computed(() => view.yearScope);
    const yearModeNow = computed(() => yearScopeRef.value?.mode.value ?? "single");
    const yearScopeYears = computed<number[]>(() => yearScopeRef.value?.years ?? []);
    /** Show the range control only on a multi-year dashboard whose feed (hence scope) landed. */
    const hasYearScope = computed(() =>
        Boolean(
            ctx?.hasMultiYear &&
                yearScopeRef.value &&
                yearScopeYears.value.length > 1,
        ),
    );
    /** Toggle range mode over the full span, or fall back to single-at-latest on leaving it. */
    function toggleRange(): void {
        const ys = yearScopeRef.value;
        if (!ys) return;
        if (ys.mode.value === "range") ys.setSingle(ys.latestYear);
        else ys.setRange(yearScopeYears.value);
    }

    onBeforeUnmount(() => {
        if (saveFlashTimer) clearTimeout(saveFlashTimer);
    });

    return {
        yearModeNow,
        hasYearScope,
        toggleRange,
        saveCurrentView,
        saveFlash,
    };
}
