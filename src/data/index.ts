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
//   · `minimapMark.ts`     → `charts/geo/` (a chart mark, not a feed concern)                    ==> O-B4R.
//   · `useFilteredRows.ts` → `charts/lib/filter-algebra` (O-B4R) + `useFilterDimensions` (O-B5R) +
//                            `useViewParams` (O-B4R via the stores SCC)                          ==> O-B4R/B5R.

// — the feed contract + loader (+ the data-saver seam the loader reads) —
export * from "./contract";
export * from "./loadFeed";
export * from "./dataSaver";

// — the geometry projections —
export * from "./geometry";
export * from "./entityGeometry";

// — the joins + derivations —
export * from "./leaJoin";
export * from "./multiYear";

// — the year-scope reader (URL-driven year cursor) + the route dataset-universe resolver (O-B9) —
export * from "./useYearScope";
export * from "./routeUniverse";
