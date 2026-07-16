// @mkbabb/atlas · chrome/dock — the floating Dock instrument (src-rearchitecture §A.2; O-B8a — the
// L12 §0 dock submodule). The dock is ONE submodule: the GlassDock-consumed instrument, its band
// sub-components (DockCrest / DockStepperRender / DockNavItem / DockFoot, each owning the
// composable it consumes, under components/), and its composables/ (collapse / stepper / gear /
// data-state + the scroll-chrome edge hook).
//
// MOVED AS-IS (render-identity). The atlas collapse override in Dock.vue — the `display:none`
// `.dock-layers` collapse, the `inline-size` width transition, and the `--cp-radius` border-radius
// override — is CARRIED UNCHANGED here (Dock.css). Its DELETE + the glass-morph consume are O-B8b,
// gated on the glass-ui 5.0.0 dock arm; this structural move neither fixes nor regresses it. The
// band sub-components stay deep-import-only (internal to the instrument).
export { default as Dock } from "./Dock.vue";
export { default as DockSettings } from "./DockSettings.vue";
export { default as ControlPlaneSpine } from "./ControlPlaneSpine.vue";
export * from "./composables";
