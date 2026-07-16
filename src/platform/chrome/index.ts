// @mkbabb/atlas · ./chrome — the platform-chrome family barrel (src-rearchitecture §A.2; O-B8a).
//
// THE SPLIT (§A.2). The flat `platform/chrome/` dir — four unrelated concerns sharing one bag +
// a generic `components/` bag + a `filter/` sub-tree (structure-census §B.2) — dissolves into four
// colocated submodules, each owning its components + the composables it consumes:
//   · shell/       — PlatformShell (the app frame the router mounts under).
//   · dock/        — the floating Dock instrument (the L12 §0 submodule): Dock + its band
//                    sub-components (crest / stepper / nav / foot / summary) + composables/
//                    (collapse / stepper / gear / data-state + scroll-chrome).
//   · background/  — the atmosphere FX cluster (Atmosphere / Aurora / AuroraVeilStage /
//                    Constellation) + composables/ (aurora config/veil + atmosphere activity/tier).
//   · masthead/    — GalleryMasthead / BrandMark / FigureInitial / SiteColophon.
// `freshness` stays at the chrome root; `useMobileRegister` stays global (§A.7). The `filter/` UI is
// NOT chrome's — it unified into the top-level `./filter` module (O-B5); it is not re-exported here.
//
// RENDER-IDENTITY (O-B8a is the UNFENCED, structural half of the former O-B8; Ruling R2). This is a
// PURE STRUCTURAL re-home: every module renders byte-identical to pre-split. The dock's atlas
// second-collapse machine is CARRIED UNCHANGED (the `display:none .dock-layers` collapse + the
// `inline-size` width transition + the `--cp-radius` override, in Dock.css); its DELETE + the
// glass-morph consume are O-B8b, gated on the glass-ui 5.0.0 dock arm. The monorepo import flip to
// this home is O-B11.
export * from "./shell/index.js";
export * from "./dock/index.js";
export * from "./background/index.js";
export * from "./masthead/index.js";
export * from "./freshness.js";
