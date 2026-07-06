// data/districtTopology.ts — THE RAW NC DISTRICT TOPOLOGY GLYPH, as a named export (v1.0.1 · O-B10).
//
// The `glyphs/*.json` topology assets are otherwise deep-path-encapsulated (the data barrel serves
// them through the async `loadGlyphRegistry(grain, lod)` tier-loader), but ONE map — the SCI school
// map — binds `GeoChoropleth :topology` SYNCHRONOUSLY off the pre-baked per-LEA J-GLYPH topology
// (`nc-district-topology.json`, a `Topology` whose features carry `properties.{lea,name}`). An async
// loader cannot serve a synchronous prop, so the raw glyph rides this one named export (the sole
// puncture of the encapsulation boundary). Consumers cast it to `Topology` (topojson-specification):
// the JSON's inferred shape is intentionally left un-narrowed here so the glyph stays a pure asset.
import ncDistrictTopology from "./glyphs/nc-district-topology.json" with { type: "json" };

export { ncDistrictTopology };
