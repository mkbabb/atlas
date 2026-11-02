// charts/geo/index.ts — @mkbabb/atlas · the GEO family — the choropleth + region marks + the coherence backstop (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export * from "./geo-coherence.js";
export { default as GeoChoropleth } from "./GeoChoropleth.vue";
export { default as GeoPlate } from "./GeoPlate.vue";
export { default as SelectionRegion } from "./SelectionRegion.vue";

// v1.0.1 (O-B10 re-cut) — the geo mark component-script TYPE (`GeoAnchor`, the plate's [lon,lat]
// anchor payload); the `default`-only re-export dropped it. Re-exported by name from the owning SFC.
export type { GeoAnchor } from "./GeoPlate.vue";

// U/B8 A10 — the label rail's pure layout (the settle pass + the count-by-width rule), and the
// `labelRail` prop's contract type.
export * from "./label-rail.js";
export type { LabelRailSpec } from "./useChoroplethShapes.js";
