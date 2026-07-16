// data/index.ts — @mkbabb/atlas/data, THE DATA-BACKBONE FAMILY BARREL.
//
// The curated public entry of the platform data layer — the feed contract + loader, the geometry +
// entity-geometry projections, the LEA join, and the multi-year derivation. A RE-EXPORT barrel: each
// member re-exports from its physical home. Curated, not wholesale — the `feedParse.worker.ts` worker
// entry stays unexported (it is consumed via the `?worker` query, not a normal symbol), and the
// `glyphs/*.json` topology assets stay deep-path data (the encapsulation boundary).
//
// SCOPE — the leaf data-plane. Query membership belongs to the filter engine; this barrel owns
// feed, geometry, joins, and time scope.
// (`minimapMark.ts` was a data-plane leaf until O-A12 FOLDED it into `charts/glyph/resolveEntityIcon`
//  — the grain-aware resolver is a chart mark, so it homes in the glyph family, not the feed layer.)

// — the feed contract + loader (+ the data-saver seam the loader reads) —
export * from "./contract.js";
export * from "./loadFeed.js";
export * from "./dataSaver.js";

// — the geometry projections —
export * from "./geometry.js";
export * from "./entityGeometry.js";

// — O-A14: the school-point supply loader (the C1 point-in-district dot; the injected `schoolPoint` /
//   `districtOf` resolvers the school grain consumes). The `glyphs/school-points.json` asset stays
//   deep-path data — this LOADER is the exposed surface. —
export * from "./schoolPoints.js";

// — the raw NC district topology glyph (v1.0.1 · O-B10): the ONE synchronously-bound topology asset
//   (the SCI school map's `GeoChoropleth :topology`), exposed by name past the deep-path boundary —
export * from "./districtTopology.js";

// — the joins + derivations —
export * from "./leaJoin.js";
export * from "./multiYear.js";

// — the year-scope reader (URL-driven year cursor) + the route dataset-universe resolver (O-B9) —
export * from "./useYearScope.js";
export * from "./routeUniverse.js";
