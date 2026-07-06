// stores/index.ts — @mkbabb/atlas · THE PINIA-STORES FAMILY BARREL (src-rearchitecture §A.6; O-B9).
//
// The platform stores move as-is into the library (`useHoverReadout` + `useSelection` stay GLOBAL —
// the drill-down/provenance substrate, NOT pushed into `filter/`, §A.6). A curated re-export barrel.
//
// ── O-B9 landed the ACYCLIC keystone; O-B4R CLOSES the cyclic remainder ─────────────────────────
// O-B9 landed `useSelection` + `useActiveBeat` (the SCC keystone). O-B4R (the SCC closure pass) now
// co-lands the four cyclic stores together with the charts `interaction/HoverCard.vue` (`Fact` type)
// and the top-level `@/contract` (`useDashboardRegistry`) they strongly-connect through:
//   · `useActiveDashboard` → `@/contract` `useDashboardRegistry`.
//   · `useViewParams`      → `useActiveDashboard` + `@/data/useYearScope`.
//   · `useHoverReadout`    → `interaction/HoverCard.vue` (`Fact` type; the HoverCard↔readout 2-cycle).
//   · `useSelectionStat`   → `interaction/HoverCard.vue` + `useHoverReadout`.
//
// The monorepo import flip to this home is O-B11.

// — the selection substrate: the global hover/pin state + the mark-colour resolver (§A.6) —
export * from "./useSelection";

// — the active-beat resolver (the scroll-driven beat cursor every viz reads) —
export * from "./useActiveBeat";

// — the active-dashboard feed resolver (route → feed load, keyed on the registry) —
export * from "./useActiveDashboard";

// — the view-params store (year scope + selection sync + the ?params URL bridge) —
export * from "./useViewParams";

// — the hover-readout substrate (the drill-down provenance channel) —
export * from "./useHoverReadout";

// — the selection-stat store (the pinned-selection fact readout) —
export * from "./useSelectionStat";
