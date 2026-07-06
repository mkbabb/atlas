// @mkbabb/atlas · chrome/background — the atmosphere FX cluster (src-rearchitecture §A.2; O-B8a). The
// data-derived page atmosphere: Atmosphere (the backdrop compositor) hosts Aurora (the pole-derived
// glow) + Constellation (the star field); AuroraVeilStage is the masthead veil surface. The brains
// live in composables/ (aurora config/veil + atmosphere activity/tier + the ladder). Pure structural
// re-home — render-identity.
export { default as Atmosphere } from "./Atmosphere.vue";
export { default as Aurora } from "./Aurora.vue";
export { default as AuroraVeilStage } from "./AuroraVeilStage.vue";
export { default as Constellation } from "./Constellation.host.vue";
export * from "./composables";
