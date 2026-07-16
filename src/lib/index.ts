// @mkbabb/atlas · ./lib barrel — the framework-free helpers (src-rearchitecture §A.8).
//
// O-B2 filled the O-B0 scaffold with the three clean, zero-dependency helpers rated move-as-is:
//   · bounds   — the live min/max reducer over a row set (liveBounds).
//   · regions  — the US-census region enum + FIPS→region map (REGIONS / Region / regionFor).
//   · perf     — the INP field-probe instrument (installInpProbe / inpReport / markFilterStart / …).
//
// DEFERRED (tree-over-spec): `lib/format.ts` is NOT re-homed here. The N.WE1 B6 inversion made it a
// THIN re-export shim onto the real authority at `charts/lib/format.ts` (so a published `./charts`
// member no longer reaches into an unpublished instance module). Its authority therefore moves WITH
// the charts family (WG-B B3/B4); re-homing the shim now would dangle on charts that has not landed.
export * from "./bounds.js";
export * from "./regions.js";
export * from "./perf/inp-probe.js";

// ── v1.0.2 (O-B10 re-cut) — THE PROSE-FORMATTER LIGHT SURFACE ──────────────────────────────────
// The precision authority (`formatUsdCompact` / `formatMultiplier` / the full prose-formatter seam)
// lives at `charts/lib/format.ts` (the N.WE1 B6 inversion home, where `ColorScale` reaches it local).
// But that file is ALSO re-exported through the echarts-heavy `./charts` barrel — so a consumer's
// eager gallery module (a `dashboards/*/meta.ts` lifting a compact-USD teaser) that reached the
// formatter through `./charts` dragged the mark components + their top-level `use([...])` echarts
// registrations into the bootstrap graph → the echarts↔vendor circular chunk → the SPA never mounted.
// `format.ts` is framework-free (zero imports — pure `Intl` cores), so re-exporting its surface HERE
// gives the light, meta-consumable prose formatters an echarts-FREE home on the `./lib` subpath (the
// honest pre-inversion home: the seam WAS `src/lib/format.ts` before B6 moved the body). The authority
// stays at `charts/lib/format.ts` (ColorScale + the axis faces unmoved); this is an ADDITIVE re-export
// — `./charts` keeps its copy for the heavy consumers, `./lib` carries the light one. Gallery meta.ts
// flips to `@mkbabb/atlas/lib` and stays echarts-free by construction.
export * from "../charts/lib/format.js";
