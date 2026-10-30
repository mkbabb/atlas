import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canvasTextTheme } from "../../src/charts/composables/useVizPalette";

// U/B7d M3 · T-03 ("correct fonts in every viz"). A canvas label whose option names no family
// painted in ECharts' default "sans-serif", a face the page never sets: the B7d re-measure counted
// 390 such labels on /bead, 56 on /usf, 18 on /sci and 74 on /vft. Every instance now takes an init
// theme whose textStyle carries the page's live prose family. Fails at a32e05e (no theme).

vi.mock("@mkbabb/glass-ui/dark", () => ({ useGlobalDark: () => ({ onFlipSettled: vi.fn() }) }));
afterEach(() => vi.unstubAllGlobals());

describe("canvas text theme (T-03)", () => {
    it("carries the live prose family", () => {
        const values: Record<string, string> = { "--font-serif": '"Test Sans", sans-serif', "--font-mono": '"Test Mono", monospace' };
        vi.stubGlobal("window", {});
        vi.stubGlobal("document", {
            createElement: () => ({ style: {} }),
            documentElement: { appendChild: () => undefined },
        });
        vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: (n: string) => values[n] ?? "", fontSize: "13px" }));
        expect(canvasTextTheme()).toEqual({ textStyle: { fontFamily: '"Test Sans", sans-serif' } });
    });

    it("is the theme every chart instance is created with", () => {
        const src = readFileSync(join(__dirname, "../../src/charts/composables/useEChart.ts"), "utf8");
        expect(src).toMatch(/init\(opts\.host\.value, canvasTextTheme\(\)\)/);
        expect(src.match(/= init\(/g)).toHaveLength(1);
    });
});
