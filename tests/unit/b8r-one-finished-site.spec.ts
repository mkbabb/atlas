// U/B8 I-1: one `finished` site. `useEChart` owns the only subscription to ECharts' `finished`
// (U RULINGS §J J-1). Plates, overlays and specs read its `settled` and `frame`. The first paint is
// at rest (U/B8 P-G4), so its one `finished` fires a frame after `init`. A subscriber added after the
// instance exists can miss it and then wait forever. That is how the engine lane went red in all three
// engines at d4c2989: `MultiYearFigure.hover.browser.spec.ts` subscribed late.
//
// Fails before (d4c2989): that spec subscribes to `finished` itself. Passes after: it waits on the
// line chart's `settled` gate through tests/browser/echart-capture.ts.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

/** The seam itself, and the seam's own spec, which tests the `finished` event it is built on. */
const OWNERS = new Set(["src/charts/composables/useEChart.ts", "src/charts/composables/useEChart.browser.spec.ts"]);

/** A live subscription in code: `.on("finished"` or `.on('finished'`. */
const SUBSCRIBES = /\.on\(\s*["']finished["']/;

function files(dir: string, depth = 8): string[] {
    if (depth < 0) return [];
    return readdirSync(dir).flatMap((name) => {
        if (name === "node_modules" || name === "__screenshots__") return [];
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path, depth - 1);
        return /\.(ts|vue)$/.test(name) ? [path] : [];
    });
}

/** Code lines only: a `//` or `*` comment line that names the event is not a subscription. */
function subscribes(path: string): boolean {
    return readFileSync(path, "utf8")
        .split("\n")
        .some((line) => !/^\s*(\/\/|\*|\/\*)/.test(line) && SUBSCRIBES.test(line));
}

describe("one finished site (U/B8 I-1)", () => {
    it("only useEChart subscribes to ECharts' finished", () => {
        const offenders = [...files(join(ROOT, "src")), ...files(join(ROOT, "tests"))]
            .map((p) => relative(ROOT, p))
            .filter((p) => !OWNERS.has(p) && subscribes(join(ROOT, p)));
        expect(offenders).toEqual([]);
    });

    it("the hover spec waits on the line chart's settled gate", () => {
        const src = readFileSync(join(ROOT, "src/charts/marks/MultiYearFigure.hover.browser.spec.ts"), "utf8");
        expect(src).toMatch(/captureEChart\(/);
        expect(src).toMatch(/until\(\(\) => readiness\.settled\.value\)/);
    });
});
