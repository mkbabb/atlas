// spine-fill.spec.ts — the chapter rail's spine is the run's paint, not an element (B6 · U RULINGS
// §M M-4): one CSS image, the ramp foot→crown, every stop weighted by the year-fade `--spine-o`.
import { describe, expect, it } from "vitest";
import { spineFill } from "../../src/platform/chrome/dock/spine-fill";

describe("spineFill", () => {
    it("paints the ramp to top, evenly spaced, each stop weighted by --spine-o", () => {
        const img = spineFill(["red", "green", "blue"]);
        expect(img.startsWith("linear-gradient(to top, ")).toBe(true);
        expect(img).toContain("color-mix(in oklab, red calc(var(--spine-o, 1) * 100%), transparent) 0%");
        expect(img).toContain("green calc(var(--spine-o, 1) * 100%), transparent) 50%");
        expect(img).toContain("blue calc(var(--spine-o, 1) * 100%), transparent) 100%");
    });

    it("a one-colour ramp paints a solid bar", () => {
        const img = spineFill(["var(--route-accent)"]);
        expect(img.match(/var\(--route-accent\) calc/g)).toHaveLength(2);
        expect(img).toContain(") 100%)");
    });
});
