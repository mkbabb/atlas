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
export * from "./bounds";
export * from "./regions";
export * from "./perf/inp-probe";
