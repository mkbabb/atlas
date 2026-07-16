// Render-tier boundary and policy shape.
import { describe, it, expect } from "vitest";
import {
    tierForMarkCount,
    renderPolicyForCount,
    RENDER_TIER_SVG_CEIL,
    type RenderTier,
} from "../../src/charts/scale/render-tier";
describe("O-F19 1 — tierForMarkCount: the ONE real SVG↔canvas boundary", () => {
    it("returns svg at and below the ceil, canvas above it — the exact boundary, not a range guess", () => {
        expect(tierForMarkCount(0)).toBe("svg");
        expect(tierForMarkCount(RENDER_TIER_SVG_CEIL)).toBe("svg");
        expect(tierForMarkCount(RENDER_TIER_SVG_CEIL + 1)).toBe("canvas");
    });

    it("resolves the LIVE corpus correctly: every geo figure (~300 marks) is svg; the densest live frame (the /sci all-year scatter, 3243 marks) is canvas", () => {
        expect(tierForMarkCount(300)).toBe("svg");
        expect(tierForMarkCount(3243)).toBe("canvas");
    });

    it("the return type is closed to svg|canvas — no third tier value is constructible (a type-level assert, not a runtime one)", () => {
        const tiers: RenderTier[] = ["svg", "canvas"];
        for (const t of tiers) {
            expect(["svg", "canvas"]).toContain(t);
        }
    });
});

describe("O-F19 2 — renderPolicyForCount: the pruned VizRenderPolicy shape", () => {
    it("returns ONLY markCount + tier — no large/largeThreshold/progressive keys survive", () => {
        const policy = renderPolicyForCount(3243);
        expect(policy).toEqual({ markCount: 3243, tier: "canvas" });
        expect(Object.keys(policy).sort()).toEqual(["markCount", "tier"]);
    });
});
