<script setup lang="ts">
// DockSettings — the MOBILE-GEAR controls sheet (J-DOCK §approach-2/§6 · C23).
//
// At @media(--phone) the dock's four secondary controls (the year-range compare toggle, the
// ⤓-save door, the filter pull-out, and the dark-mode toggle) collapse behind ONE Lucide
// `Settings` glyph — the gear. This component IS the gear: a glass `DropdownMenu` whose
// `DockTrigger` is the gear glyph and whose `DropdownMenuContent` is the controls sheet. It
// consumes glass-ui's OWN disclosure (the same `DropdownMenu` + `DockTrigger` idiom VizPlate's
// download menu rides) — NO hand-rolled popover.
//
// THE STATE BOUNDARY (§approach-6). DockSettings is PRESENTATIONAL — it RENDERS the four
// affordances, it does NOT re-own their state. The year-range mode + the ⤓-save flash live in
// J-ARCH's `useDockDataState`; the filter-open + dark-toggle are the platform singletons. This
// component takes the scalars + handlers as props and emits the gear-open model — a thin sheet,
// not a second data seam.
//
// THE MENU LOADS ON FIRST USE (U/B7c M1, O-7 entry JS). glass's DropdownMenu root provides the
// whole reka DropdownMenu family and floating-ui, about 60 KB raw of sci's entry, for a sheet the
// reader may never open. Until the reader reaches for it, the gear is a face alone: a button with
// the dock trigger's classes, name, seat mark and test id. Pointer or focus on it fetches the live
// menu (DockSettingsMenu); a press (the live trigger opens on pointerdown), Enter or Space mounts
// it, open, in the face's place, and from then on it owns the gear, its focus and its close. The
// dock can also open the sheet itself (the model set true), which mounts it the same way. The face
// stays until the module has arrived, so the swap is one frame with no gap (C1's DockSelectSeat).
import { markRaw, shallowRef, watch, type Component } from "vue";
import { Settings } from "@lucide/vue";

// One control: the caller's attributes land on the gear (the bar's end cell).
defineOptions({ inheritAttrs: false });

const { open, returnFocus = true } = defineProps<{
    /** The gear-sheet open model (the `v-model:open` from the dock's `useDockGear().gearOpen`). */
    open: boolean;
    /** Show the year-range compare control (a multi-year dashboard whose scope landed). */
    hasYearScope: boolean;
    /** The active year-scope mode — the range toggle reads `=== 'range'` for its pressed state. */
    yearModeNow: string;
    /** A brief accent confirm after a ⤓-save (the "View saved" visual echo). */
    saveFlash: boolean;
    /** Wire glass-ui's no-transition fast-path on the dark toggle (the INSTANT theme re-print). */
    disableTransitions: boolean;
    /** Offer "Save this view": only on a dashboard route (a view is a dashboard's URL state). */
    canSave?: boolean;
    /** Return focus to the gear on close. False when another surface took the seat: that surface
        moved focus into itself, and a return to the gear would pull it back out (in WebKit the
        entity detail then reads focus leaving its dialog and closes). The sibling bar sheets
        take the same prop. */
    returnFocus?: boolean;
}>();

const emit = defineEmits<{
    /** Two-way gear-sheet open model (driven by the dock's `useDockGear().gearOpen`). */
    (e: "update:open", value: boolean): void;
    /** Toggle year-range (range ↔ single-at-latest) — handler stays `useDockDataState.toggleRange`. */
    (e: "toggle-range"): void;
    /** ⤓-save the current view — handler stays `useDockDataState.saveCurrentView`. */
    (e: "save-view"): void;
}>();

const Live = shallowRef<Component | null>(null);
/** The live menu is mounted: the reader (or the dock) opened the sheet once. */
const armed = shallowRef(false);
let loading: Promise<void> | null = null;
function fetchLive(): Promise<void> {
    loading ??= import("./DockSettingsMenu.vue").then((m) => {
        Live.value = markRaw(m.default);
    });
    return loading;
}
watch(
    () => open,
    (next) => {
        if (next)
            void fetchLive().then(() => {
                armed.value = true;
            });
    },
    { immediate: true },
);
function arm(): void {
    if (armed.value) return;
    void fetchLive().then(() => {
        armed.value = true;
        emit("update:open", true);
    });
}
/** The sheet closed: keep focus where the surface that displaced it put it. */
function onCloseAutoFocus(event: Event): void {
    if (!returnFocus) event.preventDefault();
}
</script>

<template>
    <component
        :is="Live"
        v-if="armed && Live"
        v-bind="$attrs"
        :open="open"
        :has-year-scope="hasYearScope"
        :year-mode-now="yearModeNow"
        :save-flash="saveFlash"
        :disable-transitions="disableTransitions"
        :can-save="canSave"
        @update:open="(v: boolean) => emit('update:open', v)"
        @toggle-range="emit('toggle-range')"
        @save-view="emit('save-view')"
        @close-auto-focus="onCloseAutoFocus"
    />
    <!-- THE FACE: the gear as the live trigger draws it, until the menu has loaded. -->
    <button
        v-else
        v-bind="$attrs"
        type="button"
        data-glass-dock-seat
        class="dock-trigger dock-dropdown-trigger usf-dock__gear"
        aria-label="More"
        title="More"
        aria-haspopup="menu"
        aria-expanded="false"
        data-state="closed"
        data-testid="dock-gear"
        @pointerdown="arm"
        @click="arm"
        @pointerenter="fetchLive"
        @focus="fetchLive"
    >
        <Settings class="usf-dock__ctl-glyph" aria-hidden="true" />
    </button>
</template>

<style scoped>
/* The gear face — the ≥44px rounded dock-control hitbox. N.WG1 Arm H (the L-DOCK residue cleanup):
   the trigger formerly ALSO carried `.usf-dock__ctl`, but that class lives ONLY in DockFoot's
   SCOPED block, so the forward never reached this component (scoped-away, an under-consumed remnant
   of the killed L-DOCK cluster). It is removed — the gear's engrave/hover face is DockTrigger's
   own glass styling; this rule owns only the shared control SIZE (the `--dock-control-size` floor). */
.usf-dock__gear {
    inline-size: var(--dock-control-size, 2.75rem);
    block-size: var(--dock-control-size, 2.75rem);
}
.usf-dock__ctl-glyph {
    inline-size: 1.05rem;
    block-size: 1.05rem;
}
</style>
