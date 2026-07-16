// data/districtTopology.ts — THE RAW NC DISTRICT TOPOLOGY GLYPH, as a named export (v1.0.1 · O-B10).
//
// The `glyphs/*.json` topology assets are otherwise deep-path-encapsulated (the data barrel serves
// them through the async `loadGlyphRegistry(grain, lod)` tier-loader), but ONE map — the SCI school
// map — binds `GeoChoropleth :topology` SYNCHRONOUSLY off the pre-baked per-LEA J-GLYPH topology
// (`nc-district-topology.json`, a `Topology` whose features carry `properties.{lea,name}`). An async
// loader cannot serve a synchronous prop, so the raw glyph rides this one named export (the sole
// puncture of the encapsulation boundary). Its public type is the topology contract, not the
// physical JSON module: declaration consumers should never need Atlas's source asset layout.
import type { Topology } from "topojson-specification";
import topologyJson from "./glyphs/nc-district-topology.json?raw";

export const ncDistrictTopology = JSON.parse(topologyJson) as Topology;
