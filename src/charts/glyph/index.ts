// charts/glyph/index.ts — @mkbabb/atlas · the GLYPH family — the entity glyph + the hand marks (O-B4R · §A.1).
// The family barrel — re-exports the family's public surface (components as named default
// re-exports, the .ts leaves whole). Split-internal helpers stay family-internal.

export { default as Glyph } from "./Glyph.vue";
export { default as HandMark } from "./HandMark.vue";
export { default as EChartOrnament } from "./EChartOrnament.vue";

// O-A12 — the generalized EntityIcon facade + the imperative resolver + the abstract-grain primitive
// math (the folded `resolveMinimapMark`, generalized from 2 to 4 variants).
export { default as EntityIcon } from "./EntityIcon.vue";
export {
    resolveEntityIcon,
    resolveEntityIconForSelection,
    grainForKind,
    type EntityGrain,
    type FillPolicy,
    type EntityStroke,
    type EntityIconDescriptor,
    type EntityGlyphMark,
    type EntityHexMark,
    type EntityPointMark,
    type EntityHubMark,
    type EntityUnknownMark,
    type ResolveEntityIconOptions,
} from "./resolveEntityIcon.js";
export {
    pxToLod,
    hexPolygonPoints,
    hubGeometry,
    viewBoxCenter,
    ICON_VIEWBOX,
    type IconLod,
    type IconPoint,
    type HubGeometry,
    type HubSpoke,
} from "./iconPrimitives.js";
