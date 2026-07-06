// @mkbabb/atlas · chrome/background/composables — the atmosphere-FX brains (src-rearchitecture §A.2/§A.7;
// O-B8a). The aurora config + veil + the atmosphere activity/tier selectors + the atmosphere ladder
// disperse out of the flat platform/composables/ bag into the background submodule that consumes them.
// `aurora-nuclei` (the Tide/drift geometry the config maps over) is the O-B8a altitude-split of
// useAuroraConfig — deep-import-only internal helper, NOT re-exported here.
export * from "./useAuroraConfig";
export * from "./useAuroraVeil";
export * from "./useAtmosphereActivity";
export * from "./useAtmosphereTier";
export * from "./atmosphere";
