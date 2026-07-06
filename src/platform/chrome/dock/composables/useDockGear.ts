// useDockGear — the dock's MOBILE-GEAR posture register (J-DOCK §approach-2/§6 · C23).
//
// The 2026-06-20 live review named the phone-register defect by hand: at 390px the rail
// stacks the crest + the Roman beats + the year-range toggle + the ⤓-save door + the filter
// pull-out + the dark-toggle foot ALL inline on a 72px column — four discrete secondary
// affordances on the most-starved viewport. The user asked for "a general GEAR icon on mobile
// that encapsulates dark mode + the other items" (J-FEEDBACK-2 §1).
//
// This composable owns the gear POSTURE — it does NOT hand-roll a popover (the gear sheet
// consumes glass-ui's `DropdownMenu` + `DockDropdownTrigger` disclosure, DockSettings.vue) and
// it does NOT re-author the four controls' STATE (that stays J-ARCH's `useDockDataState`; the
// gear sheet merely RENDERS those affordances). Three reactive scalars only:
//   (a) the gear disclosure open ref (`gearOpen`),
//   (b) the chip-gating (`showChip = selectionCount > 0`, §approach-1 — the chip and the gear
//       share the foot register, so the gate co-locates here),
//   (c) the `@media(--phone)` register read (`isPhone`, via J-MOBILE's `useMobileRegister` —
//       CONSUMED, never a second breakpoint seam; the breakpoint-DRY co-touch is a READ).
//
// THE FILTERVIEW OPENER (J-FEEDBACK-4 §2/§9 — the C24 sel-chip's surviving form). Iteration-4
// settles what the SHOWN chip DOES: it is the dock-native TRIGGER that raises J-FILTER's
// filter-view facility, NOT a passive `N selected` readout. J-FILTER owns the facility BODY +
// its open singleton; J-DOCK owns ONLY the opener trigger. Until J-FILTER lands its own
// singleton, the opener consumes the EXISTING ONE-open-truth filter seam (`useFilterPane().open`,
// `Dock.vue` §A4) — the same `open` the dock filter pull-out flips — so there is ONE open
// mechanism, no second fork (the J-FILTER re-point is a single ref swap when its singleton lands).

import { computed, ref, type ComputedRef, type Ref } from "vue";
import { useSelection } from "@/platform/stores/useSelection";
import { useFilterPane } from "@/filter/composables/useFilterPane";
import { useMobileRegister } from "@/platform/composables/useMobileRegister";

/** The gear posture's reactive surface — the dock composes these into its template. */
export interface UseDockGear {
    /** The gear controls-sheet open ref (the `DropdownMenu` open model). */
    gearOpen: Ref<boolean>;
    /** Open the gear controls sheet (the @media(--phone) secondary cluster). */
    openGear: () => void;
    /** Close the gear controls sheet. */
    closeGear: () => void;
    /** Mount-gate for the selection chip — TRUE only when a selection is live (C24). */
    showChip: ComputedRef<boolean>;
    /** The live selection count (the chip's `N selected` opener label). */
    selectionCount: ComputedRef<number>;
    /** The `@media(--phone)` register read (J-MOBILE's `useMobileRegister`, CONSUMED). */
    isPhone: Ref<boolean>;
    /** Raise the filter-view facility — the C24 chip's opener job (consumes the ONE-open-truth
        filter seam; J-FILTER re-points this to its own singleton when the facility body lands). */
    openFilterView: () => void;
}

/**
 * Bind the dock's gear posture. Owns the gear-sheet open ref, the selection-chip mount-gate,
 * the FilterView-opener binding, and the `@media(--phone)` register read — ZERO new observer,
 * ZERO second breakpoint home (the register read CONSUMES `useMobileRegister`), ZERO re-owned
 * control state (the four controls stay in J-ARCH's `useDockDataState`; the gear sheet renders
 * them). A pure posture composable over the existing seams.
 */
export function useDockGear(): UseDockGear {
    // The gear controls-sheet disclosure — the `DropdownMenu` open model the gear glyph drives
    // at @media(--phone). Closed by default; one tap opens the secondary cluster.
    const gearOpen = ref(false);
    const openGear = (): void => {
        gearOpen.value = true;
    };
    const closeGear = (): void => {
        gearOpen.value = false;
    };

    // ── The selection-chip mount-gate (C24 · §approach-1) ─────────────────────────
    // The chip mounts ONLY when a selection is live — at `selectionCount=0` the node is ABSENT
    // (the 106px "selected: none" vertical readout is RECLAIMED). A pure projection of the ONE
    // selection store's set, co-located here because the chip and the gear share the foot register.
    const selection = useSelection();
    const selectionCount = computed(() => selection.selectedKeys.size);
    const showChip = computed(() => selectionCount.value > 0);

    // ── The @media(--phone) register read (CONSUMED — J-MOBILE's one JS phone probe) ──
    const { isPhone } = useMobileRegister();

    // ── The FilterView opener (J-FEEDBACK-4 §9 — the chip's job) ──────────────────
    // The shown chip raises the filter-view facility. Until J-FILTER lands its own open
    // singleton, this consumes the EXISTING ONE-open-truth filter seam (the same `open` the dock
    // filter pull-out + the FilterPanel trigger flip) — ONE open mechanism, no second fork.
    const { open: filterOpen } = useFilterPane();
    const openFilterView = (): void => {
        filterOpen.value = true;
    };

    return {
        gearOpen,
        openGear,
        closeGear,
        showChip,
        selectionCount,
        isPhone,
        openFilterView,
    };
}
