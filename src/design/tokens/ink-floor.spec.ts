// U/B7d M3 repair 1 · T-12: the body ink is meant to clear 4.5:1 and the large ink 3:1. On a plate's
// painted ground they read 4.37:1 (/ecf "$145", the 390 window figures) and 2.96:1 (the /usf crown).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { statInk } from "../../charts/legend/statInk";

const css = readFileSync(resolve(process.cwd(), "src/design/tokens/color.css"), "utf8");
const clamp = (name: string) => {
    const m = new RegExp(`${name}: light-dark\\(\\s*oklch\\(from var\\(.*?\\) min\\(l, ([\\d.]+)\\)`).exec(css);
    if (!m) throw new Error(name);
    return Number(m[1]);
};

describe("the light scheme's ink clamps", () => {
    it.each(["--ink-diverging-low", "--ink-diverging-high", "--ink-sequential-high", "--ink-primary", "--ink-accent"])(
        "%s body ink sits at L 0.44 or below",
        (name) => expect(clamp(name)).toBeLessThanOrEqual(0.44),
    );
    it.each(["--ink-diverging-low-lg", "--ink-diverging-high-lg", "--ink-sequential-high-lg", "--ink-rainbow-signature-1-lg"])(
        "%s large ink sits at L 0.60 or below",
        (name) => expect(clamp(name)).toBeLessThanOrEqual(0.6),
    );
    it("statInk and FigureSlug share the body clamp", () => {
        expect(statInk("--x")).toContain("min(l, 0.44)");
        expect(readFileSync(resolve(process.cwd(), "src/charts/frame/FigureSlug.vue"), "utf8")).toContain("min(l, 0.44)");
    });
    it("the provenance text holds its floor on a route with a lighter foreground", () => {
        for (const f of ["ProvenanceBar", "ProvenanceAppendix"]) {
            const sfc = readFileSync(resolve(process.cwd(), `src/platform/provenance/${f}.vue`), "utf8");
            expect(sfc).not.toMatch(/var\(--foreground\), transparent (32|28)%/);
        }
    });
});
