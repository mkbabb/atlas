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
