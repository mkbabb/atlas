import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveHeroSystem } from "@/editorial/hero-system";
import { storyCardSurface } from "@/editorial/story-card";

const root = fileURLToPath(new URL("../..", import.meta.url));
const source = (path: string): string => readFileSync(`${root}/${path}`, "utf8");

describe("HeroSystem", () => {
    it("organizes the existing DashboardHero payload without minting state or a wrapper tree", () => {
        const provenance = {} as never;
        const system = resolveHeroSystem({
            ordinal: 4,
            hero: { title: "Atlas", dek: "Evidence", figures: [], provenance },
        });
        expect(system.heroProps).toEqual({ title: "Atlas", dek: "Evidence", figures: [], ordinal: 4 });
        expect(system.provenance).toBe(provenance);
        expect(source("src/editorial/hero-system.ts")).not.toMatch(/\b(ref|watch|computed)\s*\(/);
    });
});

describe("StoryCard composition", () => {
    it("composes the shipped Card, Beat, and AnimatedRule with no more than two seams", () => {
        const card = source("src/editorial/StoryCard.vue");
        expect(card).toContain(':surface="surface"');
        expect(card).toContain(":tier=\"facet.tier ?? 'quiet'\"");
        expect(card).toContain("<Beat");
        expect(card.match(/<AnimatedRule/g)).toHaveLength(2);
        expect(card).toContain('weight="seam"');
        expect(source("src/editorial/DashboardEssay.vue")).toContain(
            ":is=\"chapter.card ? StoryCard : Beat\"",
        );
    });

    it("keeps veil as the quiet default and preserves the measured opaque downgrade", () => {
        expect(storyCardSurface({})).toBe("veil");
        expect(storyCardSurface({ surface: "opaque" })).toBe("opaque");
    });

    it("moves numeral rendering into the owning title band", () => {
        const essay = source("src/editorial/DashboardEssay.vue");
        const ghost = source("src/editorial/GhostNumeral.vue");
        expect(essay).toContain("<GhostNumeral");
        expect(essay).not.toContain(':numeral="figures[i]"');
        expect(ghost).toContain("toRoman");
        expect(ghost).toContain("scale === 'chapter'");
    });
});
