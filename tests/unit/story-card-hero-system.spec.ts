import { describe, expect, it } from "vitest";
import { resolveHeroSystem } from "../../src/editorial/hero-system";
import { storyCardSurface } from "../../src/editorial/story-card";

describe("HeroSystem", () => {
    it("organizes the existing DashboardHero payload without minting state or a wrapper tree", () => {
        const provenance = {} as never;
        const system = resolveHeroSystem({
            hero: { title: "Atlas", dek: "Evidence", figures: [], provenance },
        });
        expect(system.heroProps).toEqual({ title: "Atlas", dek: "Evidence", figures: [] });
        expect(system.provenance).toBe(provenance);
    });
});

describe("StoryCard surface", () => {
    it("keeps veil as the quiet default and preserves the opaque downgrade", () => {
        expect(storyCardSurface({})).toBe("veil");
        expect(storyCardSurface({ surface: "opaque" })).toBe("opaque");
    });
});
