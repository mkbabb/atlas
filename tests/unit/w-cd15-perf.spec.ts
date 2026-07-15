import { describe, expect, it, vi } from "vitest";
import type { EChartsType } from "echarts/core";
import { resolveOrnamentAnchor } from "@/charts/composables/useEChartOrnament";
import { chaptersOf, type StoryManifest } from "@/story/manifest";

describe("W-CD15 keyed ornament", () => {
    it("reads the keyed live element and resolves its transformed center", () => {
        const getItemGraphicEl = vi.fn(() => ({
            getBoundingRect: () => ({ x: 10, y: 20, width: 6, height: 8 }),
            transformCoordToGlobal: (x: number, y: number) => [x + 100, y + 200],
        }));
        const chart = {
            getModel: () => ({
                getSeries: () => [{
                    getData: () => ({
                        indexOfName: (name: string) => name === "district-1" ? 4 : -1,
                        getItemGraphicEl,
                    }),
                }],
            }),
        } as unknown as EChartsType;

        expect(resolveOrnamentAnchor(chart, "district-1")).toEqual({ x: 113, y: 224 });
        expect(getItemGraphicEl).toHaveBeenCalledWith(4);
        expect(resolveOrnamentAnchor(chart, "missing")).toBeNull();
    });
});

describe("W-CD09 A9 opaque card", () => {
    it("projects one route declaration to beats while leaving the cover unwrapped", () => {
        const story = {
            id: "perf",
            card: { surface: "opaque" },
            points: [
                { slug: "cover", kind: "cover", title: "", viz: { kind: "hero", hero: { title: "", dek: "", figures: [] } } },
                { slug: "one", kind: "beat", title: "One", viz: { kind: "component", load: async () => ({ default: {} }) } },
                { slug: "two", kind: "beat", title: "Two", card: { surface: "veil" }, viz: { kind: "component", load: async () => ({ default: {} }) } },
            ],
        } as unknown as StoryManifest;

        const [cover, one, two] = chaptersOf(story);
        expect(cover?.card).toBeUndefined();
        expect(one?.card?.surface).toBe("opaque");
        expect(two?.card?.surface).toBe("veil");
    });
});
