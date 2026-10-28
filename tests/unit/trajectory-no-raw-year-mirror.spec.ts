// U/B7b M4 · R-TAB-SCI (B7B-PARITY.md §2): the trajectory plate carried a zero-size, aria-hidden SVG
// "axis" that printed every raw year key ("2014" … "2025") into the page's innerText, under a plate
// whose axis, table and key stats print the consumer's period label ("2014–15"). The mirror existed
// for a DOM axis-count gate; the gate institution is abrogated, so the mirror goes with it.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(__dirname, "../../src/charts/marks/TrajectoryPlate.vue"), "utf8");

describe("the trajectory plate prints no raw year mirror", () => {
    it("has no echarts-axis-label text mirror", () => {
        expect(src).not.toMatch(/echarts-axis-label/);
        expect(src).not.toMatch(/axisYears/);
    });

    it("prints no unformatted year interpolation in its template", () => {
        const template = src.slice(src.indexOf("<template>"));
        expect(template).not.toMatch(/\{\{\s*y\s*\}\}/);
    });
});
