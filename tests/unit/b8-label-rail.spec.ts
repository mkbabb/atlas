// U/B8 A10 · the label rail: the settle pass and the count-by-width rule.
import { describe, it, expect } from "vitest";
import {
    settleRail,
    railLabelCount,
    layoutLabelRail,
    RAIL_COUNT_STEPS,
    type RailItem,
} from "../../src/charts/geo/label-rail";

const items = (anchors: number[], w = 40): RailItem[] => anchors.map((at) => ({ at, size: w }));

/** No two settled boxes overlap, given each box's centre and size. */
function overlaps(xs: number[], sizes: number[]): boolean {
    for (let i = 1; i < xs.length; i++) {
        if (xs[i] - xs[i - 1] < (sizes[i] + sizes[i - 1]) / 2 - 1e-9) return true;
    }
    return false;
}

describe("settleRail", () => {
    it("leaves well-spaced labels on their anchors", () => {
        expect(settleRail(items([50, 150, 250]), [0, 300])).toEqual([50, 150, 250]);
    });

    it("spreads a crowded cluster so no two labels touch", () => {
        const its = items([100, 102, 104, 106, 108]);
        const xs = settleRail(its, [0, 400]);
        expect(overlaps(xs, its.map((i) => i.size))).toBe(false);
    });

    it("keeps the anchors' order, so the threads never cross", () => {
        const its = items([10, 11, 12, 200, 201, 202], 30);
        const xs = settleRail(its, [0, 300]);
        for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    });

    it("centres a spread cluster on its anchors instead of pushing it one way", () => {
        const xs = settleRail(items([150, 150, 150]), [0, 300]);
        const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
        expect(mean).toBeCloseTo(150, 6);
    });

    it("holds every label inside the bounds at both ends", () => {
        const its = [
            { at: 2, size: 60 },
            { at: 4, size: 40 },
            { at: 296, size: 50 },
            { at: 299, size: 70 },
        ];
        const xs = settleRail(its, [0, 300]);
        xs.forEach((x, i) => {
            expect(x - its[i].size / 2).toBeGreaterThanOrEqual(-1e-9);
            expect(x + its[i].size / 2).toBeLessThanOrEqual(300 + 1e-9);
        });
        expect(overlaps(xs, its.map((i) => i.size))).toBe(false);
    });

    it("honours the gap between neighbours", () => {
        const xs = settleRail(items([100, 100], 20), [0, 300], 6);
        expect(xs[1] - xs[0]).toBeCloseTo(26, 6);
    });

    it("throws when the labels cannot fit the span, rather than overlapping", () => {
        expect(() => settleRail(items([10, 20, 30], 200), [0, 300])).toThrow(RangeError);
    });
});

describe("railLabelCount", () => {
    it("drops the count as the map narrows: 3 under 560px, 4 under 900px, else 6", () => {
        expect(railLabelCount(390)).toBe(3);
        expect(railLabelCount(559)).toBe(3);
        expect(railLabelCount(560)).toBe(4);
        expect(railLabelCount(899)).toBe(4);
        expect(railLabelCount(900)).toBe(6);
        expect(railLabelCount(1440)).toBe(6);
    });

    it("never rises as the width shrinks", () => {
        let last = Infinity;
        for (let w = 2000; w >= 0; w -= 10) {
            const n = railLabelCount(w);
            expect(n).toBeLessThanOrEqual(last);
            last = n;
        }
    });

    it("reads 0 before the field has a measured width", () => {
        expect(railLabelCount(0)).toBe(0);
        expect(RAIL_COUNT_STEPS.length).toBeGreaterThan(0);
    });
});

describe("layoutLabelRail", () => {
    const regions = [
        { key: "a", name: "Wake", value: "1,204", cx: 600, cy: 120 },
        { key: "b", name: "Durham", value: "310", cx: 590, cy: 110 },
        { key: "c", name: "Orange", value: "122", cx: 570, cy: 115 },
        { key: "d", name: "Guilford", value: "98", cx: 420, cy: 100 },
        { key: "e", name: "Mecklenburg", value: "87", cx: 300, cy: 260 },
        { key: "f", name: "Johnston", value: "61", cx: 640, cy: 170 },
        { key: "g", name: "Forsyth", value: "40", cx: 380, cy: 95 },
    ];

    it("hangs the top N for the width, in priority order, sorted along the rail", () => {
        const out = layoutLabelRail(regions, { viewWidth: 975, widthPx: 700, side: "top" });
        expect(out.labels.map((l) => l.key).sort()).toEqual(["a", "b", "c", "d"]);
        const xs = out.labels.map((l) => l.x);
        expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    });

    it("sizes text and strokes per screen pixel (divided by k)", () => {
        const wide = layoutLabelRail(regions, { viewWidth: 975, widthPx: 975, side: "top" });
        const narrow = layoutLabelRail(regions, { viewWidth: 975, widthPx: 487.5, side: "top" });
        expect(wide.k).toBeCloseTo(1, 6);
        expect(narrow.k).toBeCloseTo(0.5, 6);
        expect(narrow.fontSize).toBeCloseTo(wide.fontSize * 2, 6);
        expect(narrow.strokeWidth).toBeCloseTo(wide.strokeWidth * 2, 6);
        expect(narrow.dotR).toBeCloseTo(wide.dotR * 2, 6);
        expect(narrow.pad).toBeCloseTo(wide.pad * 2, 6);
    });

    it("draws each thread from the rail to its region's centroid", () => {
        const out = layoutLabelRail(regions, { viewWidth: 975, widthPx: 1200, side: "top" });
        for (const l of out.labels) {
            const r = regions.find((g) => g.key === l.key)!;
            expect(l.to).toEqual({ x: r.cx, y: r.cy });
            expect(l.y).toBeLessThan(0);
            expect(l.from.x).toBeCloseTo(l.x, 6);
        }
    });

    it("keeps the rail labels apart and inside the map's width", () => {
        const out = layoutLabelRail(regions, { viewWidth: 975, widthPx: 1200, side: "top" });
        const sorted = [...out.labels].sort((p, q) => p.x - q.x);
        for (let i = 0; i < sorted.length; i++) {
            expect(sorted[i].x - sorted[i].size / 2).toBeGreaterThanOrEqual(-1e-9);
            expect(sorted[i].x + sorted[i].size / 2).toBeLessThanOrEqual(975 + 1e-9);
            if (i) expect(sorted[i].x - sorted[i - 1].x).toBeGreaterThanOrEqual((sorted[i].size + sorted[i - 1].size) / 2 - 1e-9);
        }
    });

    it("drops the lowest-priority labels a narrow rail cannot hold", () => {
        const long = regions.map((r) => ({ ...r, name: `${r.name} County of the Long Name` }));
        const out = layoutLabelRail(long, { viewWidth: 975, widthPx: 400, side: "top", count: () => 6 });
        expect(out.labels.length).toBeLessThan(6);
        expect(out.labels.length).toBeGreaterThan(0);
        // what stays is a priority prefix
        const keep = new Set(out.labels.map((l) => l.key));
        const prefix = long.slice(0, keep.size).map((r) => r.key);
        expect(prefix.every((k) => keep.has(k))).toBe(true);
    });

    it("stacks a side rail down the right edge, ordered by height", () => {
        const out = layoutLabelRail(regions, { viewWidth: 975, viewHeight: 610, widthPx: 1200, side: "right" });
        const ys = out.labels.map((l) => l.y);
        expect([...ys].sort((p, q) => p - q)).toEqual(ys);
        for (const l of out.labels) expect(l.x).toBeGreaterThan(975);
        expect(out.pad).toBeGreaterThan(0);
    });

    it("reads no labels before the field is measured", () => {
        expect(layoutLabelRail(regions, { viewWidth: 975, widthPx: 0, side: "top" }).labels).toEqual([]);
    });
});
