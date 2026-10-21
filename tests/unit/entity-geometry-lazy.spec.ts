// Entity geometry is lazy and off the data barrel (U/B7 · PLAN §6.2 F1). Before, `./data`
// re-exported `entityGeometry`, whose state and county coarse tiers were static JSON imports, so any
// first-paint import of the barrel linked them. Now no tier answers until it is loaded, and the
// barrel carries none of the resolver's exports.
import { describe, expect, it } from "vitest";
import * as data from "../../src/data/index";
import { countyGlyph, glyphRegistryVersion, loadGlyphRegistry, stateGlyph } from "../../src/data/entityGeometry";
import pkg from "../../package.json";

describe("entity geometry (F1)", () => {
    it("is not re-exported from the data barrel", () => {
        for (const name of ["stateGlyph", "countyGlyph", "districtGlyph", "loadGlyphRegistry", "glyphRegistryVersion"])
            expect(name in data, name).toBe(false);
    });
    it("has its own package entry", () => {
        expect((pkg.exports as Record<string, unknown>)["./data/entity-geometry"]).toEqual({
            types: "./types/data/entityGeometry.d.ts",
            import: "./dist/entity-geometry.js",
        });
    });
    it("answers no tier before it is loaded, then bumps the version once loaded", async () => {
        expect(stateGlyph("37", "coarse")).toBeNull();
        expect(countyGlyph("37183", "coarse")).toBeNull();
        const v = glyphRegistryVersion.value;
        await loadGlyphRegistry("county", "coarse");
        expect(glyphRegistryVersion.value).toBeGreaterThan(v);
        expect(countyGlyph("37183", "coarse")).not.toBeNull();
    });
});
