// @mkbabb/atlas · filter/engine — the coordinator-engine barrel (O-B5 unify; from platform/filter).
//
// The Vue-reactivity signal façade (`signals.ts`) is the one CLEAN leaf that lands now (vue-only).
// The coordinator graph — `predicate` / `selection` / `coordinator` / `filter-codec` / `route-fold` —
// type-imports `filter/composables/useFilterDimensions`. Under the
// COPY-stays-green invariant (repo-split §F) those files land green only AFTER O-B9, so they defer to
// **O-B5R** (the post-B9 filter closure — the B4→B4R precedent). The public coordinator surface
// (`createCoordinator` / `createSelection` / `createParams` / `cellToClause` / `dimsToPredicate` /
// `compile` / `explain` / `isIdentity` / `encodeFilter` / `parseFilter` /
// `deriveRegistry` + the `Coordinator` / `Client` / `Params` / `Selection` / `Predicate` types) is
// re-instated by O-B5R.
export type { Signal } from "./signals.js";

// — O-B5R/B4R (the SCC closure): the coordinator engine graph —
export * from "./predicate.js";
export * from "./selection.js";
export * from "./coordinator.js";
export * from "./filter-codec.js";
export * from "./route-fold.js";
export * from "./rows.js";
