// @mkbabb/atlas · filter/ui — the filter-UI barrel (O-B5 unify; from platform/chrome/filter).
//
// The three presentational LEAVES land now (external-only imports — glass-ui + lucide + vue):
//   • `PercentileRangeSlider` (glass-ui/slider) — the range-dim dual-thumb slider
//   • `FilterRow` — the one labeled label+control row grammar
//   • `FilterDrawerFoot` (glass-ui/button + @lucide/vue) — the drawer foot cluster
// The panel HOSTS — `FilterPanel` / `UnifiedFilterPanel` / `DimDial` / `SelectionSetPane` /
// `VizOptionsBand` + `components/YearScrubber` — value-import `platform/stores/*` (O-B9), the
// `charts` family (`ColorScale` / `Glyph` / `ReadoutFacts` / `viz-contract` / `selection-contract` —
// O-B4R), `data/useYearScope` (O-B9) and the deferred filter composables, so they defer to **O-B5R**
// (the post-B9 filter closure).
export { default as PercentileRangeSlider } from "./PercentileRangeSlider.vue";
export { default as FilterRow } from "./components/FilterRow.vue";
export { default as FilterDrawerFoot } from "./components/FilterDrawerFoot.vue";

// — O-A9 (v1.0.4): the filter-view GLOBAL algebra band (provenance-surface §3.2). Filter-panel
//   chrome consuming `humanizePredicate` from the `provenance/` family; band 0 of UnifiedFilterPanel. —
export { default as AlgebraReadout } from "./AlgebraReadout.vue";

// — O-B4R (the SCC closure): the panel hosts + dials —
export { default as UnifiedFilterPanel } from "./UnifiedFilterPanel.vue";
export { default as DimDial } from "./DimDial.vue";
export { default as SelectionSetPane } from "./SelectionSetPane.vue";
export { default as VizOptionsBand } from "./VizOptionsBand.vue";
export { default as YearScrubber } from "./components/YearScrubber.vue";

// — O-B8a (the chrome-blocked residue closes): FilterPanel value-imports `chrome/freshness`
//   (the chrome root, homed by the O-B8a split), so the drawer host lands. —
export { default as FilterPanel } from "./FilterPanel.vue";

export { default as SourceDataBrowser } from "./SourceDataBrowser.vue";
export * from "./source-data-browser";
