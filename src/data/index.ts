// data/index.ts — @mkbabb/atlas/data, THE DATA-BACKBONE FAMILY BARREL.
//
// The curated public entry of the platform data layer — the feed contract + loader, the geometry +
// entity-geometry projections, the LEA join, and the multi-year derivation. A RE-EXPORT barrel: each
// member re-exports from its physical home. Curated, not wholesale — the `feedParse.worker.ts` worker
// entry stays unexported (it is consumed via the `?worker` query, not a normal symbol), and the
// `glyphs/*.json` topology assets stay deep-path data (the encapsulation boundary).
//
// SCOPE — the LEAF data-plane. O-B3 landed the acyclic core; O-B9 (the composables/stores move)
// lands the two leaves whose upstream it carries: `useYearScope` (→ `composables/useUrlState`) and
// `routeUniverse` (→ `stores/useSelection` + `charts/selection-contract`). Two members still hold at
// the monorepo source, DEFERRED (the library must stay green; NO dangling imports):
//   · `useFilteredRows.ts` → `charts/lib/filter-algebra` (O-B4R) + `useFilterDimensions` (O-B5R) +
//                            `useViewParams` (O-B4R via the stores SCC)                          ==> O-B4R/B5R.
// (`minimapMark.ts` was a data-plane leaf until O-A12 FOLDED it into `charts/glyph/resolveEntityIcon`
//  — the grain-aware resolver is a chart mark, so it homes in the glyph family, not the feed layer.)

// — the feed contract + loader (+ the data-saver seam the loader reads) —
export * from "./contract";
export * from "./loadFeed";
export * from "./dataSaver";

// — the geometry projections —
export * from "./geometry";
export * from "./entityGeometry";

// — O-A14: the school-point supply loader (the C1 point-in-district dot; the injected `schoolPoint` /
//   `districtOf` resolvers the school grain consumes). The `glyphs/school-points.json` asset stays
//   deep-path data — this LOADER is the exposed surface. —
export * from "./schoolPoints";

// — the raw NC district topology glyph (v1.0.1 · O-B10): the ONE synchronously-bound topology asset
//   (the SCI school map's `GeoChoropleth :topology`), exposed by name past the deep-path boundary —
export * from "./districtTopology";

// — the joins + derivations —
export * from "./leaJoin";
export * from "./multiYear";

// — the year-scope reader (URL-driven year cursor) + the route dataset-universe resolver (O-B9) —
export * from "./useYearScope";
export * from "./routeUniverse";

// — O-B4R (the SCC closure): the filtered-rows selector —
//   (`minimapMark` FOLDED into `charts/glyph/resolveEntityIcon` at O-A12 — the grain-aware resolver
//   generalized from 2 to 4 variants; the mini-map now consumes `resolveEntityIconForSelection`.)
export * from "./useFilteredRows";
