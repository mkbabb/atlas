import countyGlyphsJson from "./glyphs/nc-county.coarse.json?raw";

/** The shared source-owned county registry; Vite folds the raw payload into this module once. */
export const countyGlyphRegistry = JSON.parse(countyGlyphsJson) as Record<
    string,
    { name?: string }
>;
