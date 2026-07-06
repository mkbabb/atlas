// data/index.ts — @mkbabb/atlas/data, THE DATA-BACKBONE FAMILY BARREL.
//
// The curated public entry of the platform data layer — the feed contract + loader, the geometry +
// entity-geometry projections, the LEA join, and the multi-year derivation. A RE-EXPORT barrel: each
// member re-exports from its physical home. Curated, not wholesale — the `feedParse.worker.ts` worker
// entry stays unexported (it is consumed via the `?worker` query, not a normal symbol), and the
// `glyphs/*.json` topology assets stay deep-path data (the encapsulation boundary).
//
// O-B3 SCOPE — the LEAF data-plane only. Four members hold at the monorepo source, DEFERRED to the
// wave that lands their cross-module dependency (the library must stay green; NO dangling imports):
//   · `minimapMark.ts`   → `charts/geo/` (a chart mark, not a feed concern) — lands with O-B4.
//   · `useYearScope.ts`  → depends on `composables/useUrlState`                — lands with the composables move.
//   · `useFilteredRows.ts` → depends on `charts/lib/filter-algebra` + `composables/` + `stores/` — lands with those.
//   · `routeUniverse.ts` → depends on `stores/useSelection` + `charts/selection-contract`         — lands with those.

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
