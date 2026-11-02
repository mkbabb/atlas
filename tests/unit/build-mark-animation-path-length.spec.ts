import { describe, expect, it } from "vitest";
import { buildMarkAnimation } from "../../src/motion/buildMarkAnimation.js";

// The `draw` mechanism sweeps `stroke-dashoffset` over the dash it sets. An authored `pathLength`
// rescales every dash value to its units, so the sweep must run in them: a `pathLength="1"` path
// (the choropleth's static unit dash) draws over a unit dash, not over its measured user-space length.
function path(attrs: Record<string, string>, measured: number) {
    return {
        getAttribute: (k: string) => attrs[k] ?? null,
        getTotalLength: () => measured,
        style: {} as Record<string, string>,
    } as unknown as SVGElement & { style: Record<string, string> };
}

const linear = (t: number) => t;

describe("buildMarkAnimation draw", () => {
    it("sweeps in the authored pathLength units", () => {
        const el = path({ pathLength: "1" }, 300);
        const m = buildMarkAnimation(el, "draw", { ease: linear });
        m.at(0);
        expect(el.style).toMatchObject({ strokeDasharray: "1", strokeDashoffset: "1" });
        m.at(0.5);
        expect(Number(el.style.strokeDashoffset)).toBeCloseTo(0.5);
        m.at(1);
        expect(Number(el.style.strokeDashoffset)).toBe(0);
    });

    it("sweeps the measured length when no pathLength is authored", () => {
        const el = path({}, 300);
        buildMarkAnimation(el, "draw", { ease: linear }).at(0);
        expect(el.style).toMatchObject({ strokeDasharray: "300", strokeDashoffset: "300" });
    });
});
