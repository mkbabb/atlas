// @mkbabb/atlas · ./filter — THE UNIFIED filter module (O-B5). The split-brain resolves: the engine
// (`platform/filter`), the UI (`platform/chrome/filter`) and the hooks (`platform/composables/
// useFilter*`) become ONE module — `filter/{engine,ui,composables}` (src-rearchitecture §A.3;
// R-016 · R-022). The Provenance cross-cut (the algebra rendering in the filter view AND at the
// scrolled-to viz) is served by the `provenance/` family (O-B7) consuming `filter/engine` — NOT a
// fourth filter home.
//
// ── O-B4R (the SCC closure) — the full unified filter surface ─────────────────────────────────
// O-B5 landed the leaf closure (Signal, useFilterPane, the 3 UI leaves); O-B4R closes the SCC and
// wires the whole engine + composables + ui. The chrome-blocked `FilterPanel.vue` (→ chrome/
// freshness) stays deferred to O-B8. The monorepo import flip to this home is O-B11.
export * from "./engine/index.js";
export * from "./composables/index.js";
export * from "./ui/index.js";
