// @mkbabb/atlas · ./filter — THE UNIFIED filter module (O-B5). The split-brain resolves: the engine
// (`platform/filter`), the UI (`platform/chrome/filter`) and the hooks (`platform/composables/
// useFilter*`) become ONE module — `filter/{engine,ui,composables}` (src-rearchitecture §A.3;
// R-016 · R-022). The Provenance cross-cut (the algebra rendering in the filter view AND at the
// scrolled-to viz) is served by the `provenance/` family (O-B7) consuming `filter/engine` — NOT a
// fourth filter home.
//
// This barrel is CURATED to the clean closure landable under the COPY-stays-green invariant
// (repo-split §F): the leaf `Signal` type, the `useFilterPane` drawer singleton, and the three
// presentational UI leaves. The SCC-blocked bulk — the coordinator graph, the panel hosts, the
// dimension hooks — value-imports O-B9 stores + O-B4R charts and rides **O-B5R** (the post-B9 filter
// closure; the per-wave curated-barrel precedent of O-B3 data / O-B4 charts). The monorepo import
// flip to this home is O-B11.
export type { Signal } from "./engine";
export { useFilterPane } from "./composables";
export { PercentileRangeSlider, FilterRow, FilterDrawerFoot } from "./ui";
