// U/B7b lane M5 (PLAN §7.3, O-8, O-14; R-LABELS §4): the reader names atlas writes into the served
// page. The rendered-words pass on the sci build (tests/prose/rendered-words.spec.ts in sci) found
// spaced em dashes in eight atlas-owned names ("… — data table", "… — series key", "Filters — …",
// "… — home", "… — cover", "Chart options — …", "… — no data") on every route, and the S3 strip's
// "Σ" crest on every plate (72 rendered hits in Chromium). Each site now prints a plain name.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { figureLabelFor } from "../../src/editorial/useBeatLayout";

const SITES = [
    "src/charts/legend/ChartDataTable.vue",
    "src/charts/marks/TimeSeries.vue",
    "src/charts/legend/VizOptions.vue",
    "src/filter/ui/components/YearScrubber.vue",
    "src/platform/chrome/dock/components/DockFilterTrigger.vue",
    "src/platform/chrome/masthead/BrandMark.vue",
    "src/platform/chrome/masthead/SiteColophon.vue",
    "src/platform/provenance/VizAppendixDock.vue",
];

/** The file's code with comments blanked, so only strings the reader can meet are scanned. */
function code(path: string): string {
    return readFileSync(path, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/^\s*\/\/.*$/gm, "");
}

describe("atlas reader names (U/B7b M5)", () => {
    it.each(SITES)("%s writes no spaced em dash into a string", (path) => {
        const literals = code(path).match(/`[^`]*`|"[^"\n]*"|'[^'\n]*'/g) ?? [];
        expect(literals.filter((s) => s.includes(" — "))).toEqual([]);
    });

    it("the S3 strip carries no Σ crest", () => {
        expect(code("src/platform/provenance/VizAppendixDock.vue")).not.toContain("Σ");
    });

    it("a cover's figure label reads '<name>: cover'", () => {
        const cover = { viz: "hero", eyebrow: "USFI" } as Parameters<typeof figureLabelFor>[0];
        expect(figureLabelFor(cover, 0)).toBe("USFI: cover");
    });
});
