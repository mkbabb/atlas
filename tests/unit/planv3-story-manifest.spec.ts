import { describe, expect, it } from "vitest";
import {
    beatsOf,
    chaptersOf,
    edgesOf,
    figureOf,
    navOf,
    poleOf,
    scenesOf,
    toDeck,
    type StoryManifest,
    type StoryStage,
} from "@/story/manifest";
import type { VizContract } from "@/charts/contract/viz-contract";
import {
    isChapterScene,
    isChapterStage,
    type ChapterScene,
} from "@/charts/contract/scene-contract";
import { hasMasthead } from "@/editorial/useBeatLayout";

const load = async () => ({ default: {} });

describe("StoryManifest projections", () => {
    it("derives every order-sensitive surface from one array", () => {
        const manifest: StoryManifest = {
            id: "example",
            points: [
                { slug: "cover", kind: "cover", title: "Cover", viz: { kind: "component", load } },
                {
                    slug: "first",
                    kind: "beat",
                    title: "First",
                    navLabel: "One",
                    viz: { kind: "component", load },
                },
                {
                    slug: "second",
                    kind: "beat",
                    title: "Second",
                    pole: "center",
                    transition: { kind: "crossfade" },
                    viz: { kind: "component", load },
                },
                {
                    slug: "foot",
                    kind: "colophon",
                    title: "Sources",
                    viz: { kind: "component", load },
                },
            ],
        };

        expect(beatsOf(manifest).map((point) => point.slug)).toEqual(["first", "second"]);
        expect(figureOf(manifest, "second")).toBe(2);
        expect(navOf(manifest).map(({ id, label }) => ({ id, label }))).toEqual([
            { id: "first", label: "One" },
            { id: "second", label: "Second" },
        ]);
        expect(poleOf(manifest, "first")).toBe("left");
        expect(poleOf(manifest, "second")).toBe("center");
        expect(edgesOf(manifest)).toEqual([
            { from: "first", to: "second", spec: { kind: "crossfade" } },
        ]);
        expect(toDeck(manifest).slides.map((slide) => slide.component)).toEqual([
            "cover",
            "first",
            "second",
            "foot",
        ]);
    });

    it("projects the nested scene tier only from stage points", () => {
        const stage: StoryStage = {
            kind: "stage",
            id: "cluster",
            grain: "district",
            graphic: () => null,
            identity: { field: "leaNumber" },
            transition: { mode: "blend", reduced: false },
            scenes: [
                { id: "a", prose: "A", state: { year: 2020 }, encode: { x: "district:x", y: "district:y" } },
                { id: "b", prose: "B", state: { year: 2021 }, encode: { x: "district:x", y: "district:y" } },
            ],
        };
        const point = {
            slug: "cluster",
            kind: "beat" as const,
            title: "Cluster",
            viz: { kind: "stage" as const, stage },
        };
        expect(scenesOf(point)).toEqual(stage.scenes);
    });

    it("projects canonical points into the current editorial story chapter surface", () => {
        const contract = { id: "direct-contract" } as VizContract;
        const provenance = () => null;
        const hero = { title: "Cover", dek: "Dek", figures: [], provenance };
        const colophon = { blurb: "Notes" };
        const manifest: StoryManifest = {
            id: "canonical",
            skin: "funds",
            colorKind: "sequential",
            seed: 42,
            points: [
                {
                    slug: "cover",
                    kind: "cover",
                    title: "Cover",
                    viz: { kind: "hero", hero },
                },
                {
                    slug: "lazy",
                    kind: "beat",
                    title: "Lazy",
                    eyebrow: "One",
                    dek: "Loaded on demand",
                    pole: "right",
                    rule: "numeral",
                    superlative: { label: "is the canonical example", tone: "quiet" },
                    figure: { kind: "value-scaled", value: 0.75, domain: [0, 1] },
                    rank: "lede",
                    signature: true,
                    marquee: true,
                    colorKind: "rainbow",
                    hinge: 0.35,
                    transition: { kind: "crossfade" },
                    focus: [{ kind: "highlight", marks: ["a"] }],
                    viz: { kind: "component", load },
                },
                {
                    slug: "contract",
                    kind: "beat",
                    title: "Contract",
                    navLabel: "Two",
                    viz: { kind: "contract", contract },
                },
                {
                    slug: "foot",
                    kind: "colophon",
                    title: "Sources",
                    viz: { kind: "colophon", colophon },
                },
            ],
        };

        const chapters = chaptersOf(manifest);
        expect(chapters.map((chapter) => chapter.id)).toEqual([
            "cover",
            "lazy",
            "contract",
            "foot",
        ]);
        expect(chapters[0]).toMatchObject({ viz: "hero", hero, isBeat: false });
        expect(chapters[0]!.hero?.provenance).toBe(provenance);
        expect(chapters[1]).toMatchObject({
            colorKind: "rainbow",
            hinge: 0.35,
            transition: { kind: "crossfade" },
            focus: [{ kind: "highlight", marks: ["a"] }],
            reveal: { layout: { title: "right", scrollIn: "right" } },
            rule: "numeral",
            superlative: { label: "is the canonical example", tone: "quiet" },
            figure: { kind: "value-scaled", value: 0.75, domain: [0, 1] },
            rank: "lede",
            signature: true,
            marquee: true,
        });
        expect(chapters[1]!.viz).not.toBe(load);
        expect(chapters[2]).toMatchObject({
            viz: contract,
            navLabel: "Two",
            colorKind: "sequential",
        });
        expect(chapters[2]!.viz).toBe(contract);
        expect(chapters[3]).toMatchObject({
            viz: "colophon",
            colophon,
            isBeat: false,
        });
        expect(chapters.every((chapter) => !("seed" in chapter) && !("skin" in chapter))).toBe(true);
    });

    it("keeps a canonical async plate identity across equivalent live story rebuilds", () => {
        let hinge = 0.2;
        const story = (): StoryManifest => ({
            id: "live-story",
            points: [
                {
                    slug: "plate",
                    kind: "beat",
                    title: "Plate",
                    hinge: (hinge += 0.1),
                    viz: { kind: "component", load },
                },
            ],
        });

        const first = chaptersOf(story());
        const rebuilt = chaptersOf(story());
        expect(rebuilt[0]!.viz).toBe(first[0]!.viz);
        expect(rebuilt[0]!.hinge).not.toBe(first[0]!.hinge);
    });

    it("projects a canonical persistent stage directly onto the chapter viz arm", () => {
        const stage: StoryStage = {
            kind: "stage",
            id: "cluster",
            grain: "district",
            graphic: () => null,
            identity: { field: "leaNumber" },
            transition: { mode: "blend", reduced: false },
            scenes: [{ id: "a", prose: "A", state: { year: 2020 }, encode: { x: "district:x", y: "district:y" } }],
        };
        const [chapter] = chaptersOf({
            id: "staged",
            points: [
                {
                    slug: "cluster",
                    kind: "beat",
                    title: "Cluster",
                    viz: { kind: "stage", stage },
                },
            ],
        });

        expect(chapter!.viz).toBe(stage);
        expect(isChapterStage(chapter!.viz)).toBe(true);
    });

    it("projects a non-ECharts sticky scene without inventing a stage morph contract", () => {
        const scene: ChapterScene = {
            kind: "scene",
            graphic: () => null,
            steps: [{ id: "2024", prose: "Today", state: { year: 2024 } }],
        };
        const [chapter] = chaptersOf({
            id: "mapped",
            points: [
                {
                    slug: "map",
                    kind: "beat",
                    title: "Map",
                    viz: { kind: "scene", scene },
                },
            ],
        });

        expect(chapter!.viz).toBe(scene);
        expect(isChapterScene(chapter!.viz)).toBe(true);
        expect(isChapterStage(chapter!.viz)).toBe(false);
    });

    it("treats component-backed cover and colophon points as masthead-free sentinels", () => {
        const chapters = chaptersOf({
            id: "component-sentinels",
            points: [
                { slug: "cover", kind: "cover", title: "Cover", viz: { kind: "component", load } },
                { slug: "beat", kind: "beat", title: "Beat", viz: { kind: "component", load } },
                { slug: "foot", kind: "colophon", title: "Foot", viz: { kind: "component", load } },
            ],
        });

        expect(chapters.map(hasMasthead)).toEqual([false, true, false]);
    });
});
