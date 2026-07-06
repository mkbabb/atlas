import { ref } from "vue";

// useFilterPane — the ONE shared source of the filter Drawer's open state (C.W3.3,
// re-seated from the B7-S0 §K5 open-default rail). The filter is now a CLOSED-BY-DEFAULT
// right `Drawer mode="live-behind"` (FilterPanel.vue); a closed floating drawer occludes
// NOTHING on first paint, so the hero is fully visible (CP-1, A1). The §K5 reactive
// content-gutter machinery that the old open-default rail forced (PlatformShell insetting
// <main> by the rail width) is RETIRED — C3.1 deleted the gutter, and there is no rail to
// flow beside.
//
// `open` stays a module-level singleton so the FilterPanel (which renders the Drawer +
// its summon trigger) AND the C3.2 A4 dock pull-out read ONE truth: the dock's collapse
// affordance opens this same Drawer. The default is CLOSED — `ref(false)`.
const open = ref(false);

export function useFilterPane() {
    return { open };
}
