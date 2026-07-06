// charts/geo/index.ts — @mkbabb/atlas · the GEO family — the choropleth + region marks + the coherence backstop (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export * from "./geo-coherence";
export { default as GeoChoropleth } from "./GeoChoropleth.vue";
export { default as GeoPlate } from "./GeoPlate.vue";
export { default as SelectionRegion } from "./SelectionRegion.vue";
