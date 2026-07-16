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
        const hero = source("src/editorial/DashboardHero.vue");
        expect(hero).toContain('class="eyebrow dashboard-hero__eyebrow"');
        expect(hero).toContain('class="eyebrow-plain dashboard-hero__identity"');
    });
});

describe("StoryCard composition", () => {
    it("composes the shipped Card, Beat, and AnimatedRule with no more than two seams", () => {
        const card = source("src/editorial/StoryCard.vue");
        const essay = source("src/editorial/DashboardEssay.vue");
        const rule = source("src/editorial/AnimatedRule.vue");
        expect(card).toContain(':surface="surface"');
        expect(card).toContain(":data-card-mode=\"facet.mode ?? 'plate'\"");
        expect(card).toMatch(
            /\.story-card\[data-card-mode="stage"\]\s*{[^}]*overflow:\s*clip;/s,
        );
        expect(card).not.toMatch(
            /\.story-card\[data-card-mode="stage"\][^{]*{[^}]*overflow:\s*(?:auto|hidden|scroll)/s,
        );
        expect(card).toContain(":tier=\"facet.tier ?? 'quiet'\"");
        expect(card).toContain("<Beat");
        expect(card.match(/<AnimatedRule/g)).toHaveLength(2);
        expect(card).toContain('weight="seam"');
        expect(rule).toContain(':overrides="HAIRLINE_BRUSH"');
        expect(rule).toContain("max-inline-size: var(--measure-figure");
        expect(rule).toMatch(
            /\.animated-rule:not\(\.animated-rule--seam\):not\(\[data-variant="numeral"\]\)\s*{[^}]*block-size:\s*1px;/s,
        );
        expect(card).not.toMatch(/\.story-card\s*\{[^}]*border-radius/s);
        expect(essay).toContain(":is=\"chapter.card ? StoryCard : Beat\"");
        expect(essay).toContain("<template #figure>");
        expect(essay).toContain("chapter.card ? 'seam'");
        expect(source("src/editorial/Beat.vue")).toContain('<slot name="figure" />');
        expect(rule.indexOf('v-if="isSeam"')).toBeLessThan(
            rule.indexOf('v-else-if="variant === \'numeral\'"'),
        );
    });

    it("lets Glass own the card rhythm and suppresses only nested ChartFrame perimeter chrome", () => {
        const card = source("src/editorial/StoryCard.vue");
        const frame = source("src/charts/frame/ChartFrame.vue");
        const drilldown = source("src/interaction/SelectionDrilldownPanel.vue");
        const frameCss = source("src/charts/frame/ChartFrame.css");

        expect(card).toContain("provide(STORY_CARD_KEY, context)");
        for (const variable of [
            "--card-pad-inline",
            "--card-pad-block",
            "--card-pad-section-gap",
            "--card-pad-footer",
            "--card-pad-title-gap",
        ]) {
            expect(card).toContain(`var(${variable})`);
        }
        expect(card).not.toContain("var(--space-phi-");
        expect(card).not.toContain("--storycard-pad");
        expect(drilldown).toContain("<Card");
        expect(drilldown).not.toMatch(
            /\.drilldown__card\s*{[^}]*border-radius\s*:/s,
        );
        expect(frame).toContain("inject(STORY_CARD_KEY, null) !== null");
        expect(frame).toContain("'plate--card-contained': cardContained");
        expect(frameCss).toMatch(/\.plate--card-contained\s*{[^}]*border:\s*0;[^}]*box-shadow:\s*none;/s);
    });

    it("keeps keyStats as an optional non-card crown while card stats use aggregateStats", () => {
        const contract = source("src/charts/contract/viz-contract.ts");
        const plate = source("src/charts/frame/VizPlate.vue");
        expect(contract).toContain("keyStats?: () => KeyStat[]");
        expect(source("src/charts/frame/useVizPlate.ts")).toContain(
            "props.contract.keyStats?.() ?? []",
        );
        expect(plate).toContain('v-if="!suppressFoot && (keyStats.length || provenance || slots.foot)"');
        expect(plate).toContain(':stats="keyStats"');
        expect(source("src/editorial/StoryCardStats.vue")).toContain(
            "storyCard.aggregateStats.value",
        );
        expect(plate).toContain("storyCard.setAggregateStats(vizId, stats)");
        expect(plate).toContain("if (props.contract.id !== vizId) storyCard.clearAggregateStats(vizId)");
        expect(plate).toContain("!storyCard && aggregateStats.length");
    });

    it("clears the prior aggregate-stat registration when a plate contract id is replaced", () => {
        const plate = source("src/charts/frame/VizPlate.vue");
        expect(plate).toContain("[props.contract.id, aggregateStats.value] as const");
        expect(plate).toContain("storyCard.setAggregateStats(vizId, stats)");
        expect(plate).toContain("if (props.contract.id !== vizId) storyCard.clearAggregateStats(vizId)");
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
