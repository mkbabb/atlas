// U/B8 A10 · the label rail: the settle pass and the count-by-width rule.
import { describe, it, expect } from "vitest";
import {
    settleRail,
    railLabelCount,
    layoutLabelRail,
    RAIL_COUNT_STEPS,
    type RailItem,
    type RailLabel,
    type RailRegion,
} from "../../src/charts/geo/label-rail";
import { patternScreenTransform } from "../../src/charts/geo/redundant-channel";

type Pt = { x: number; y: number };
/** Whether two segments cross at a point interior to both (shared endpoints do not count). */
function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
    const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = o(c, d, a);
    const d2 = o(c, d, b);
    const d3 = o(a, b, c);
    const d4 = o(a, b, d);
    const eps = 1e-9;
    return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}
/** The legs a label's thread draws: from → knee → centroid. */
const legs = (l: RailLabel): [Pt, Pt][] => [
    [l.from, l.knee],
    [l.knee, l.to],
];
/** Whether any two threads in a layout cross. */
function threadsCross(labels: readonly RailLabel[], legsOf: (l: RailLabel) => [Pt, Pt][] = legs): boolean {
    for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
            for (const [a, b] of legsOf(labels[i])) {
                for (const [c, d] of legsOf(labels[j])) if (segmentsCross(a, b, c, d)) return true;
            }
        }
    }
    return false;
}
/** The straight thread the first cut drew: label → centroid, no knee. */
const straight = (l: RailLabel): [Pt, Pt][] => [[l.from, l.to]];

/** A seeded LCG, so the property sweeps are reproducible. */
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

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

    it("the fixture is crowded: a naive rail seating each label on its anchor overlaps", () => {
        // The red evidence for the settle pass: the same picks, seated where a rail with no settle
        // would put them (on the centroids), collide; the laid rail does not.
        const out = layoutLabelRail(regions, { viewWidth: 975, widthPx: 1200, side: "top" });
        const sorted = [...out.labels].sort((p, q) => p.x - q.x);
        const naive = sorted.map((l) => l.to.x);
        expect(overlaps(naive, sorted.map((l) => l.size))).toBe(true);
        expect(overlaps(sorted.map((l) => l.x), sorted.map((l) => l.size))).toBe(false);
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

    it("routes the threads so no two cross where straight threads would", () => {
        // Two regions by the left edge: the clamp pushes both labels right of their anchors, the
        // left one tied to a deep centroid and the right one to a shallow one. A straight thread
        // from each label to its centroid crosses the other; the knee route does not.
        const edge: RailRegion[] = [
            { key: "deep", name: "Deep", value: "10", cx: 5, cy: 500 },
            { key: "shallow", name: "Shallow", value: "20", cx: 15, cy: 10 },
        ];
        const out = layoutLabelRail(edge, { viewWidth: 975, widthPx: 975, side: "top" });
        expect(out.labels.map((l) => l.key)).toEqual(["deep", "shallow"]);
        expect(threadsCross(out.labels, straight)).toBe(true);
        expect(threadsCross(out.labels)).toBe(false);
    });

    it("bends each thread on the field's edge, level with its anchor", () => {
        const top = layoutLabelRail(regions, { viewWidth: 975, widthPx: 1200, side: "top" });
        for (const l of top.labels) expect(l.knee).toEqual({ x: l.to.x, y: 0 });
        const side = layoutLabelRail(regions, { viewWidth: 975, viewHeight: 610, widthPx: 1200, side: "right" });
        for (const l of side.labels) expect(l.knee).toEqual({ x: 975, y: l.to.y });
    });

    it("never crosses two threads, on either rail, over random fields", () => {
        const rand = lcg(0xa10);
        let straightCrossed = 0;
        for (let trial = 0; trial < 300; trial++) {
            const n = 2 + Math.floor(rand() * 5);
            const field: RailRegion[] = Array.from({ length: n }, (_, i) => ({
                key: `r${i}`,
                name: "Region".slice(0, 2 + Math.floor(rand() * 5)),
                value: String(Math.floor(rand() * 999)),
                cx: 1 + rand() * 973,
                cy: 1 + rand() * 608,
            }));
            for (const side of ["top", "right"] as const) {
                const widthPx = 390 + rand() * 1050;
                const out = layoutLabelRail(field, { viewWidth: 975, viewHeight: 610, widthPx, side, count: () => 6 });
                expect(threadsCross(out.labels)).toBe(false);
                if (threadsCross(out.labels, straight)) straightCrossed++;
            }
        }
        // The sweep is not vacuous: straight threads cross on some of these fields.
        expect(straightCrossed).toBeGreaterThan(0);
    });

    it("reads no labels before the field is measured", () => {
        expect(layoutLabelRail(regions, { viewWidth: 975, widthPx: 0, side: "top" }).labels).toEqual([]);
    });
});

describe("patternScreenTransform", () => {
    it("divides the hatch tile by k so it holds one screen grain at every width", () => {
        expect(patternScreenTransform(2)).toBe("scale(0.5)");
        expect(patternScreenTransform(0.5, "rotate(45)")).toBe("scale(2) rotate(45)");
    });

    it("writes nothing new while unmeasured or at k = 1, so the resting markup is unchanged", () => {
        expect(patternScreenTransform(0)).toBeUndefined();
        expect(patternScreenTransform(1)).toBeUndefined();
        expect(patternScreenTransform(0, "rotate(45)")).toBe("rotate(45)");
        expect(patternScreenTransform(1, "rotate(45)")).toBe("rotate(45)");
    });
});
