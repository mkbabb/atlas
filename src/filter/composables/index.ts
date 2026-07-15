// @mkbabb/atlas · filter/composables — the filter-hooks barrel (O-B5 unify; from
// platform/composables/useFilter*). The four `useFilter*` hooks unify here out of the flat bag.
//
// `useFilterPane` — the drawer open-state singleton (vue-only) — is the CLEAN leaf that lands now.
// `useFilterDimensions` / `useFilterMount` / `useFilterPanel` value-import `platform/stores/*`
// (`useSelection` / `useViewParams` / `useActiveBeat` — O-B9), the `charts` contract
// (`selection-contract` / `viz-contract` — O-B4R) and `useVizRegistry` (O-B9), so they defer to
// **O-B5R** (the post-B9 filter closure).
export { useFilterPane } from "./useFilterPane";

// — O-B4R (the SCC closure): the dimension/mount/panel hooks —
export * from "./useFilterDimensions";
export * from "./useFilterMount";
export * from "./useFilterPanel";
export * from "./useFilterLedger";
export * from "./useVirtualWindow";
export * from "./useVirtualSectionWindow";
