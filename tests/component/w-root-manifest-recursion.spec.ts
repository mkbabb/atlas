import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import { chaptersOf, navOf } from "../../src/story/manifest";
import type { StoryManifest } from "../../src/story/manifest";

// A-16 (the gap-4a render proof) — a manifest whose `"appendix"` point NESTS its own `points`
// projects through the SAME `chaptersOf`/`navOf` machinery as a flat one and RENDERS: the nested
// movement lands in DOM order under its parent, carrying the ancestor nav-label chain whose LENGTH
// is its depth (never a declared `depth` field), and its beat reaches the nav.

vi.mock("../../src/platform/chrome/masthead/FigureInitial.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});

import Beat from "../../src/editorial/Beat.vue";

const manifest: StoryManifest = {
    id: "propaedeutic-story",
    points: [
        {
            slug: "opening",
            kind: "beat",
            navLabel: "Opening",
            title: "The opening",
            viz: { kind: "colophon" },
        },
        {
            slug: "propaedeutic",
            kind: "appendix",
            navLabel: "Propaedeutic",
            title: { text: "How to read this atlas" },
            viz: { kind: "colophon" },
            points: [
                {
                    slug: "germination",
                    kind: "beat",
                    navLabel: "Germination",
                    title: "The first movement",
                    viz: { kind: "colophon" },
                    points: [
                        {
                            slug: "imbibition",
                            kind: "beat",
                            navLabel: "Imbibition",
                            title: "The second movement",
                            viz: { kind: "colophon" },
                        },
                    ],
                },
            ],
        },
    ],
};

/** The essay's own read of the projection: one `Beat` per projected chapter, in projected order. */
const Essay = defineComponent({
    setup: () => () =>
        h(
            "div",
            chaptersOf(manifest).map((chapter) =>
                h(
                    Beat,
                    { id: chapter.id, testid: chapter.id },
                    {
                        header: () => [
                            h("p", { class: "beat__path" }, (chapter.path ?? []).join(" › ")),
                            h(
                                "h2",
                                typeof chapter.title === "string"
                                    ? chapter.title
                                    : chapter.title.text,
                            ),
                        ],
                    },
                ),
            ),
        ),
});

describe("the S5 manifest recursion (A-16)", () => {
    it("flattens nested points into the chapter projection, in DOM order, with the ancestor path", () => {
        const chapters = chaptersOf(manifest);
        expect(chapters.map((c) => c.id)).toEqual([
            "opening",
            "propaedeutic",
            "germination",
            "imbibition",
        ]);
        // depth IS the path length — derived from position, never declared
        expect(chapters.map((c) => (c.path ?? []).length)).toEqual([0, 0, 1, 2]);
        expect(chapters[3].path).toEqual(["Propaedeutic", "Germination"]);
    });

    it("reaches nested beats through the same nav projection", () => {
        expect(navOf(manifest).map((item) => item.label)).toEqual([
            "Opening",
            "Germination",
            "Imbibition",
        ]);
    });

    it("renders every projected chapter, the nested appendix movements included", async () => {
        const html = await renderToString(createSSRApp(Essay));
        expect(html).toContain("How to read this atlas");
        expect(html).toContain("The first movement");
        expect(html).toContain("The second movement");
        expect(html).toContain("Propaedeutic › Germination");
        expect(html).toContain('id="imbibition"');
    });
});
