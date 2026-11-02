import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";
import { entranceThreads, originRank } from "../../src/charts/geo/geo-entrance.js";

// U/B8 A1 — the map entrance from an origin. `originRank` turns an origin key and the feature
// centroids into the choropleth's `rank` input (distance order); the `entrance` prop opts a map
// into the ripple or the thread overlay, and a map that does not declare it renders no overlay.

const pt = (key: string, cx: number, cy: number) => ({ key, cx, cy });

describe("originRank — the distance order from an origin feature", () => {
    const points = [pt("a", 10, 0), pt("o", 0, 0), pt("b", 3, 4), pt("c", 1, 0)];

    it("ranks the origin first, then every feature by distance from it", () => {
        const rank = originRank("o", points)!;
        expect(["o", "c", "b", "a"].map(rank)).toEqual([0, 1, 2, 3]);
    });

    it("keeps input order between features at the same distance", () => {
        const tied = [pt("o", 0, 0), pt("e", 5, 0), pt("w", -5, 0), pt("n", 0, -5), pt("near", 1, 1)];
        const rank = originRank("o", tied)!;
        expect(["near", "e", "w", "n"].map(rank)).toEqual([1, 2, 3, 4]);
    });

    it("puts the origin ahead of a feature sharing its centroid", () => {
        const rank = originRank("o", [pt("twin", 0, 0), pt("o", 0, 0)])!;
        expect(rank("o")).toBe(0);
        expect(rank("twin")).toBe(1);
    });

    it("returns undefined for a key that is not a feature", () => {
        expect(originRank("o", points)!("zz")).toBeUndefined();
    });

    it("falls back to the existing rank when the origin is missing", () => {
        const existing = (k: string) => ({ a: 0, b: 1 })[k];
        expect(originRank("nowhere", points, existing)).toBe(existing);
        expect(originRank(null, points, existing)).toBe(existing);
        expect(originRank(undefined, points)).toBeUndefined();
    });
});

describe("entranceThreads — slack threads from the origin to each valued feature", () => {
    const shapes = [
        { ...pt("o", 0, 0), hasValue: true },
        { ...pt("far", 10, 0), hasValue: true },
        { ...pt("empty", 2, 0), hasValue: false },
        { ...pt("near", 4, 0), hasValue: true },
    ];

    it("draws one thread per valued feature other than the origin, nearest first", () => {
        expect(entranceThreads("o", shapes).map((t) => t.key)).toEqual(["near", "far"]);
    });

    it("bows each thread off the straight run (a quadratic with an offset control)", () => {
        const [near] = entranceThreads("o", shapes);
        expect(near.d).toMatch(/^M0,0Q2,-?[\d.]+ 4,0$/);
        expect(near.d).not.toBe("M0,0Q2,0 4,0");
    });

    it("draws nothing when the origin is missing", () => {
        expect(entranceThreads("nowhere", shapes)).toEqual([]);
    });
});

// Three 10×10 squares: "01" at (5,5), "02" at (25,5), "03" at (45,5); "03" has no value.
const topology = {
    type: "Topology",
    arcs: [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]],
        [[40, 0], [40, 10], [50, 10], [50, 0], [40, 0]],
    ],
    objects: {
        states: {
            type: "GeometryCollection",
            geometries: [
                { type: "Polygon", id: 1, arcs: [[0]], properties: { name: "Alpha" } },
                { type: "Polygon", id: 2, arcs: [[1]], properties: { name: "Bravo" } },
                { type: "Polygon", id: 3, arcs: [[2]], properties: { name: "Charlie" } },
            ],
        },
    },
} as unknown as Topology;

async function render(props: Record<string, unknown>): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: [50, 10],
                redundantChannel: "none",
                fill: () => "#888",
                valueFormat: (k: string) => (k === "03" ? "" : "1"),
                ...props,
            }),
    });
    return renderToString(createSSRApp(App));
}

describe("GeoChoropleth — the opt-in entrance overlay", () => {
    it("renders no thread overlay and no entrance marker unless opted in", async () => {
        const html = await render({});
        expect(html).not.toContain("geo-entrance-threads");
        expect(html).not.toContain("data-entrance");
    });

    it("renders no thread overlay for the ripple", async () => {
        const html = await render({ entrance: { origin: "01", kind: "ripple" } });
        expect(html).toContain('data-entrance="ripple"');
        expect(html).not.toContain("geo-entrance-threads");
    });

    it("serves the threads entrance held, with no thread layer (it mounts on the client)", async () => {
        // The server cannot know the client's motion preference, so it renders the hold (which the
        // CSS gates behind the motion query) and leaves the threads to mount after hydration.
        const html = await render({ entrance: { origin: "01", kind: "threads" } });
        expect(html).toContain('data-entrance="threads"');
        expect(html).toContain("data-entrance-pending");
        expect(html).not.toContain("geo-entrance-threads");
    });

    it("serves an opted-out map with no hold", async () => {
        expect(await render({})).not.toContain("data-entrance-pending");
    });
});

// U/B8 owner ruling — the ripple stays on WAAPI; the CSS `--rank` draw hook (and its
// `.geo-shape--draw` class) is retired, so a ranked map carries neither on any mark.
describe("GeoChoropleth — no CSS draw hook", () => {
    const rank = (k: string) => ({ "01": 0, "02": 1, "03": 2 })[k];

    it("puts no --rank style and no draw class on a ranked map's shapes", async () => {
        for (const props of [{ rank }, { rank, entrance: { origin: "01", kind: "ripple" } }]) {
            const html = await render(props);
            expect(html).toContain('class="geo-shape');
            expect(html).not.toContain("--rank");
            expect(html).not.toContain("geo-shape--draw");
        }
    });

    it("puts neither on the texture overlay a pattern-channel map paints", async () => {
        // `redundantChannel: "pattern"` mounts the `.geo-texture` ink path over each valued region,
        // the second site the retired hook wrote to.
        for (const props of [
            { rank, redundantChannel: "pattern" },
            { rank, redundantChannel: "pattern", entrance: { origin: "01", kind: "ripple" } },
        ]) {
            const html = await render(props);
            expect(html).toMatch(/class="[^"]*\bgeo-texture\b/);
            expect(html).toContain('data-texture-key="01"');
            expect(html).not.toContain("--rank");
            expect(html).not.toContain("geo-shape--draw");
        }
    });
});
