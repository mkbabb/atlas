// charts/index.ts — @mkbabb/atlas · the ./charts family barrel (src-rearchitecture §A.1).
//
// The 57-file flat `platform/charts/` bag dissolves into 10 family submodules, each with a family
// `index.ts` re-exporting its public surface. This barrel re-exports the FAMILIES (not the flat
// files) — the born-clean `./charts` export backed by clean internals (§A.10).
//
// ── O-B4 PARTIAL (the honest state) ──────────────────────────────────────────────────────────
// The full family split is BLOCKED by a dependency inversion the wave's DEPS line (B2, B3)
// understates: the bulk of the charts graph value-imports `platform/stores/*`, `platform/context/*`,
// `platform/motion/*`, `platform/interaction/*`, and the filter/motion/global composables — modules
// owned by O-B5 (filter), O-B6 (motion/interaction), and O-B9 (stores/context/composables-residue),
// ALL sequenced AFTER B4. Under the COPY-into-library model (the library MUST stay typecheck-green;
// NO dangling imports — the O-B2/B3 precedent), a file that value-imports a not-yet-landed module
// cannot land. So this wave lands the maximal SELF-CONTAINED clean core — the `scale/` family (with
// the ColorScale god-split, §A.9) + the clean `contract/` + `lib/` members — and DEFERS the rest
// (VizPlate/ChartFrame + marks/geo/readout/scene components + the entangled contract trio) to the
// waves that land their upstream closure. See the O-B4 PACK deferral ledger + the RED-LEDGER row.
// ── O-B4R (the SCC closure) — the full family surface ────────────────────────────────────────
// O-B4 landed scale/contract(clean)/lib; O-B4R closes the SCC and wires every family barrel.
export * from "./scale/index.js";
export * from "./contract/index.js";
export * from "./lib/index.js";
export * from "./frame/index.js";
export * from "./geo/index.js";
export * from "./glyph/index.js";
export * from "./legend/index.js";
export * from "./marks/index.js";
export * from "./readout/index.js";
export * from "./scene/index.js";
export * from "./composables/index.js";
export * from "./viz-set.js";
export * from "./morph.js";
