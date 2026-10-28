// U/B7b M3 · O-7 entry JS. `leaJoin` (reached on every route through the dock's `useViewParams`)
// read 100 county names from the coarse glyph registry, which carries every county's outline. That
// put 32,772 B of outline strings (11.2 KB brotli) into sci's entry chunk at the B7b PL head, and
// defeated `entityGeometry`'s lazy import of the same registry. The join now reads the bake's name
// table.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { leaToCountyFips } from "../../src/data/leaJoin";

const DATA = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/data");

describe("the LEA→county join reads names, not outlines", () => {
    it("does not import the outline registry", () => {
        const src = readFileSync(resolve(DATA, "leaJoin.ts"), "utf8");
        expect(src).not.toMatch(/countyGlyphRegistry|nc-county\.coarse/);
        expect(src).toMatch(/nc-county\.names\.json\?raw/);
    });

    it("the name table is the coarse registry's names, key for key", () => {
        const coarse = JSON.parse(readFileSync(resolve(DATA, "glyphs/nc-county.coarse.json"), "utf8")) as Record<string, { name: string }>;
        const names = JSON.parse(readFileSync(resolve(DATA, "glyphs/nc-county.names.json"), "utf8")) as Record<string, string>;
        expect(Object.keys(names)).toEqual(Object.keys(coarse).sort());
        for (const [fips, e] of Object.entries(coarse)) expect(names[fips]).toBe(e.name);
    });

    it("still joins a county-named LEA and a city LEA", () => {
        expect(leaToCountyFips("Wake County Schools")).toBe("37183");
        expect(leaToCountyFips("Asheville City Schools")).toBe("37021");
    });
});
