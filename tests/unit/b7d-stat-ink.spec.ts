// T-12, PV-03 (U/B7d M3): a stat printed in a chart fill token read 1.01:1 on the page; the cover's
// provenance line set a step under every plate's strip.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { statInk } from "../../src/charts/legend/statInk";

describe("the stat numeral's ink", () => {
    it("clamps the token into the legibility band in both schemes", () => {
        const ink = statInk("--viz-no-data");
        expect(ink).toContain("oklch(from var(--viz-no-data) min(l, 0.47)");
        expect(ink).toContain("oklch(from var(--viz-no-data) max(l, 0.75)");
    });
    it("VizAggregateStats never paints a raw token", () => {
        const sfc = readFileSync("src/charts/legend/VizAggregateStats.vue", "utf8");
        expect(sfc).not.toMatch(/color: `var\(/);
        expect(sfc.match(/statInk\((lead|s)\.colorVar\)/g)).toHaveLength(2);
    });
});

describe("the cover's provenance line", () => {
    it("sets at the strip's size", () => {
        const bar = readFileSync("src/platform/provenance/ProvenanceBar.vue", "utf8");
        const whisper = bar.match(/\.provenance-bar__whisper \{[^}]*\}/)![0];
        expect(whisper).toContain("--type-small");
        expect(whisper).not.toContain("--type-micro");
    });
});
