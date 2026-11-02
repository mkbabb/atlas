import { getHeapStatistics } from "node:v8";
import { describe, expect, it } from "vitest";
import {
    boustrophedonLayout,
    createUnitLayout,
    gridLayout,
    groupedBlocksLayout,
    hitTest,
    MIN_UNIT_PITCH,
    type UnitBlockOptions,
    type UnitLayout,
    unitStep,
    unitSummary,
} from "../../src/charts/marks/unit-layouts";
import { UnitCanvas, UnitMorph, sampleSpring } from "../../src/charts/marks/unit-engine";
import { MAX_CANVAS_DPR, cappedDpr } from "../../src/lib/dpr";

// U/B8 A3: the canvas unit chart, one mark per record (the Gregg cloth's engine, made generic).
// Fails at b25200d: neither module exists.

describe("unit layouts", () => {
    it("grid fills rows left to right, rank in reading order", () => {
        const l = gridLayout(7, { width: 30, cell: 10, gap: 0 });
        expect(l.count).toBe(7);
        expect(l.height).toBe(30);
        expect(Array.from(l.x)).toEqual([5, 15, 25, 5, 15, 25, 5]);
        expect(Array.from(l.y)).toEqual([5, 5, 5, 15, 15, 15, 25]);
        expect(Array.from(l.rank)).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(l.w[0]).toBe(10);
    });

    it("grid fits the largest pitch that holds every mark in the frame", () => {
        const l = gridLayout(12, { width: 40, height: 30, gap: 0 });
        // 4 x 3 cells of 10 px fill 40 x 30 exactly; any larger pitch drops a mark.
        expect(l.w[0]).toBeCloseTo(10, 5);
        for (let i = 0; i < l.count; i++) {
            expect(l.x[i] + l.w[i] / 2).toBeLessThanOrEqual(40 + 1e-4);
            expect(l.y[i] + l.h[i] / 2).toBeLessThanOrEqual(30 + 1e-4);
        }
    });

    it("grid follows a given order: slot k holds order[k]", () => {
        const l = gridLayout(3, { width: 30, cell: 10, gap: 0, order: [2, 0, 1] });
        expect(Array.from(l.rank)).toEqual([1, 2, 0]);
        expect(l.x[2]).toBe(5);
    });

    it("boustrophedon reverses every other row, rank along the path", () => {
        const l = boustrophedonLayout(6, { width: 30, cell: 10, gap: 0 });
        expect(Array.from(l.x)).toEqual([5, 15, 25, 25, 15, 5]);
        expect(Array.from(l.y)).toEqual([5, 5, 5, 15, 15, 15]);
        expect(Array.from(l.rank)).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("grouped blocks stack each group from the baseline, one block per group", () => {
        const group = [1, 0, 1, 1, 0, 1, 1];
        const l = groupedBlocksLayout(group, { width: 50, cell: 10, gap: 0, blockGap: 10 });
        expect(l.blocks.map((b) => [b.group, b.count])).toEqual([
            [0, 2],
            [1, 5],
        ]);
        // Two blocks of 20 px with a 10 px gap: 2 columns each, 3 rows for the tallest.
        expect(l.height).toBe(30);
        expect(Array.from(l.group)).toEqual(group);
        // Group 0's first mark sits bottom-left of the first block.
        expect([l.x[1], l.y[1]]).toEqual([5, 25]);
        expect([l.x[4], l.y[4]]).toEqual([15, 25]);
        // Group 1 starts at x = 30, bottom row first, filling upward.
        expect([l.x[0], l.y[0]]).toEqual([35, 25]);
        expect([l.x[6], l.y[6]]).toEqual([35, 5]);
        expect(l.blocks[1]).toMatchObject({ x: 30, w: 20 });
        // Rank sweeps block by block.
        expect(l.rank[1]).toBe(0);
        expect(l.rank[0]).toBe(2);
    });

    it("grouped blocks fit a frame height", () => {
        const group = Array.from({ length: 40 }, (_, i) => (i < 30 ? 0 : 1));
        const l = groupedBlocksLayout(group, { width: 100, height: 60, gap: 0, blockGap: 0 });
        for (let i = 0; i < l.count; i++) expect(l.y[i] - l.h[i] / 2).toBeGreaterThanOrEqual(-1e-4);
        expect(l.height).toBe(60);
    });

    it("grouped blocks fitted to a height stay inside the frame width", () => {
        // The reviewer's repros: a tall frame must not grow a pitch wider than its block.
        const cases: [number[], { width: number; height: number; blockGap?: number }][] = [
            [Array.from({ length: 30 }, (_, i) => i % 10), { width: 100, height: 600 }],
            [Array.from({ length: 12 }, (_, i) => i % 3), { width: 90, height: 300, blockGap: 0 }],
        ];
        for (const [group, o] of cases) {
            const l = groupedBlocksLayout(group, o);
            for (let i = 0; i < l.count; i++) {
                expect(l.x[i] - l.w[i] / 2).toBeGreaterThanOrEqual(-1e-4);
                expect(l.x[i] + l.w[i] / 2).toBeLessThanOrEqual(o.width + 1e-4);
                expect(l.y[i] - l.h[i] / 2).toBeGreaterThanOrEqual(-1e-4);
            }
            for (const b of l.blocks) expect(b.x + b.w).toBeLessThanOrEqual(o.width + 1e-4);
        }
    });

    it("grouped blocks without a height still fit one column in each block", () => {
        // Ten groups across 60 px leave blocks under 8 px wide: the default pitch must shrink to fit.
        const group = Array.from({ length: 30 }, (_, i) => i % 10);
        const l = groupedBlocksLayout(group, { width: 60, gap: 0 });
        expect(l.w[0]).toBeLessThan(8);
        for (let i = 0; i < l.count; i++) {
            expect(l.x[i] - l.w[i] / 2).toBeGreaterThanOrEqual(-1e-4);
            expect(l.x[i] + l.w[i] / 2).toBeLessThanOrEqual(60 + 1e-4);
        }
        for (const b of l.blocks) expect(b.w).toBeGreaterThanOrEqual(l.w[0] - 1e-4);
        // A frame wide enough keeps the default pitch.
        expect(groupedBlocksLayout([0, 1], { width: 100, gap: 0 }).w[0]).toBe(8);
    });

    it("a frame no pitch fits throws instead of laying the marks out past it", () => {
        // A block gap that eats the whole width leaves no block for any pitch.
        expect(() => groupedBlocksLayout([0, 1, 2], { width: 20, height: 20, blockGap: 10 })).toThrow(RangeError);
        expect(() => groupedBlocksLayout([0, 1, 2], { width: 20, blockGap: 10 })).toThrow(RangeError);
        // A height of a hair cannot hold a hundred thousand marks at half a pixel.
        expect(() => gridLayout(100_000, { width: 10, height: 0.1 })).toThrow(/minimum pitch/);
        // The fitted pitch at the floor is still a fit, not a refusal.
        const l = gridLayout(400, { width: 10, height: 10, gap: 0 });
        expect(l.w[0]).toBeCloseTo(0.5, 5);
        for (let i = 0; i < l.count; i++) expect(l.y[i] + l.h[i] / 2).toBeLessThanOrEqual(10 + 1e-4);
    });

    it("a zero or degenerate frame, or one under the minimum pitch, throws the same RangeError in every builder", () => {
        const builders = [
            (o: UnitBlockOptions) => gridLayout(4, o),
            (o: UnitBlockOptions) => boustrophedonLayout(4, o),
            (o: UnitBlockOptions) => groupedBlocksLayout([0, 1, 1], o),
        ];
        const frames: UnitBlockOptions[] = [
            { width: 0 },
            { width: 0, height: 0 },
            { width: 0.3 },
            { width: MIN_UNIT_PITCH - 1e-3, height: 100 },
            { width: -10 },
            { width: Number.NaN },
            { width: Number.POSITIVE_INFINITY },
            { width: 100, height: 0 },
            { width: 100, height: 0.3 },
            { width: 0, cell: 10 },
            { width: 100, cell: 0 },
            { width: 100, cell: 0.3 },
        ];
        for (const build of builders) {
            for (const frame of frames) expect(() => build(frame), JSON.stringify(frame)).toThrow(RangeError);
        }
        // Every fitted pitch is at or above the floor: never 0, never NaN. Two blocks and the gap of
        // one pitch between them need three pitches of width.
        const fitted: [(o: UnitBlockOptions) => UnitLayout, number[]][] = [
            [builders[0], [MIN_UNIT_PITCH, 0.7, 1, 3]],
            [builders[1], [MIN_UNIT_PITCH, 0.7, 1, 3]],
            [builders[2], [3 * MIN_UNIT_PITCH, 3, 7]],
        ];
        for (const [build, widths] of fitted) {
            for (const width of widths) {
                const l = build({ width, gap: 0 });
                expect(l.w[0]).toBeGreaterThanOrEqual(MIN_UNIT_PITCH);
                for (let i = 0; i < l.count; i++) {
                    expect(Number.isFinite(l.x[i]) && Number.isFinite(l.y[i])).toBe(true);
                    expect(l.x[i] + l.w[i] / 2).toBeLessThanOrEqual(width + 1e-4);
                }
            }
        }
        // Under three floor pitches of width the two blocks refuse, with the same error.
        expect(() => groupedBlocksLayout([0, 1, 1], { width: 3 * MIN_UNIT_PITCH - 1e-3 })).toThrow(RangeError);
    });

    it("an explicit cell the frame cannot hold throws the fitted path's RangeError in every builder", () => {
        const builders = [
            (o: UnitBlockOptions) => gridLayout(4, o),
            (o: UnitBlockOptions) => boustrophedonLayout(4, o),
            (o: UnitBlockOptions) => groupedBlocksLayout([0, 1, 1], o),
        ];
        const frames: UnitBlockOptions[] = [
            // A cell wider than the frame: one column already runs out of it sideways.
            { width: 100, cell: 500 },
            // Rows that overrun a given height.
            { width: 20, height: 15, cell: 10 },
        ];
        for (const build of builders) {
            for (const frame of frames) {
                expect(() => build(frame), JSON.stringify(frame)).toThrow(RangeError);
                expect(() => build(frame), JSON.stringify(frame)).toThrow(/minimum pitch|cannot fill/);
            }
        }
        // Two blocks and a one-pitch gap need three cells of width.
        expect(() => groupedBlocksLayout([0, 1, 1], { width: 25, cell: 10 })).toThrow(RangeError);
        // A cell the frame holds is laid out as given, every mark inside the frame.
        for (const build of builders) {
            const l = build({ width: 30, height: 30, cell: 10, gap: 0 });
            expect(l.w[0]).toBe(10);
            for (let i = 0; i < l.count; i++) {
                expect(l.x[i] + l.w[i] / 2).toBeLessThanOrEqual(30 + 1e-4);
                expect(l.y[i] + l.h[i] / 2).toBeLessThanOrEqual(30 + 1e-4);
            }
        }
    });

    it("a layout authored as data validates its arrays", () => {
        expect(() =>
            createUnitLayout({ width: 10, height: 10, x: [1, 2], y: [1], w: [1, 1], h: [1, 1] }),
        ).toThrow(/length/);
    });

    it("summarizes the marks by group for the role=img label", () => {
        const l = groupedBlocksLayout([0, 1, 1, 2, 1], { width: 60, cell: 10 });
        expect(unitSummary(l, ["Walk-in", "Tour", "Event"], "visits")).toBe(
            "5 visits: 3 Tour, 1 Walk-in, 1 Event.",
        );
    });
});

describe("hit test", () => {
    const l = gridLayout(6, { width: 30, cell: 10, gap: 0.2 });

    it("finds the mark under a point", () => {
        expect(hitTest(l, 15, 5)).toBe(1);
        expect(hitTest(l, 24, 14)).toBe(5);
    });

    it("takes the nearest mark in a gap, within one cell", () => {
        // x = 9.5 lies in the gap between marks 0 (center 5) and 1 (center 15).
        expect(hitTest(l, 9.5, 5)).toBe(0);
        expect(hitTest(l, 10.5, 5)).toBe(1);
    });

    it("misses far outside the marks", () => {
        expect(hitTest(l, 200, 200)).toBe(-1);
        expect(hitTest(l, -50, 5)).toBe(-1);
    });

    it("sees every mark in a crowded cell, not only the last one written", () => {
        const dense = createUnitLayout({
            width: 20,
            height: 20,
            x: [10, 10.5, 11],
            y: [10, 10, 10],
            w: [8, 8, 8],
            h: [8, 8, 8],
        });
        expect(hitTest(dense, 10, 10)).toBe(0);
        expect(hitTest(dense, 11, 10)).toBe(2);
    });
});

describe("keyboard walk", () => {
    // A snake: mark order 0 1 2 / 5 4 3 on screen, rank along the path.
    const l = boustrophedonLayout(6, { width: 30, cell: 10, order: [0, 1, 2, 3, 4, 5] });

    it("steps along the rank, entering at an end", () => {
        expect(unitStep(l, -1, "ArrowRight")).toBe(0);
        expect(unitStep(l, -1, "ArrowLeft")).toBe(5);
        expect(unitStep(l, 2, "ArrowDown")).toBe(3);
        expect(unitStep(l, 3, "ArrowUp")).toBe(2);
        expect(unitStep(l, 4, "Home")).toBe(0);
        expect(unitStep(l, 1, "End")).toBe(5);
    });

    it("holds at either end and ignores other keys", () => {
        expect(unitStep(l, 5, "ArrowRight")).toBe(5);
        expect(unitStep(l, 0, "ArrowLeft")).toBe(0);
        expect(unitStep(l, 2, "a")).toBe(2);
    });

    it("follows a reordered rank, not the mark index", () => {
        const r = gridLayout(3, { width: 30, cell: 10, order: [2, 0, 1] });
        expect(unitStep(r, -1, "ArrowRight")).toBe(2);
        expect(unitStep(r, 2, "ArrowRight")).toBe(0);
    });
});

describe("morph engine", () => {
    const a = gridLayout(4, { width: 40, cell: 10, gap: 0 });
    const b = createUnitLayout({ width: 40, height: 40, x: [35, 35, 35, 35], y: [5, 15, 25, 35], w: [10, 10, 10, 10], h: [10, 10, 10, 10] });
    const c = createUnitLayout({ width: 40, height: 40, x: [5, 5, 5, 5], y: [35, 35, 35, 35], w: [4, 4, 4, 4], h: [4, 4, 4, 4] });

    it("samples the keyframes.js spring once, pinned at both ends", () => {
        const lut = sampleSpring({ response: 0.5, dampingFraction: 0.68 }, 256);
        expect(lut).toBeInstanceOf(Float32Array);
        expect(lut.length).toBe(257);
        expect(lut[0]).toBeCloseTo(0, 6);
        expect(lut[256]).toBeCloseTo(1, 6);
        // An underdamped spring overshoots somewhere mid-curve.
        expect(Math.max(...lut)).toBeGreaterThan(1);
    });

    it("lands on the target and reports settled", () => {
        const m = new UnitMorph(4, { duration: 100, spread: 0 });
        m.snap(a);
        m.morphTo(b, 0);
        expect(m.step(50)).toBe(true);
        expect(m.step(101)).toBe(false);
        expect(m.settled).toBe(true);
        expect(Array.from(m.x)).toEqual(Array.from(b.x));
        expect(Array.from(m.y)).toEqual(Array.from(b.y));
    });

    it("a morph started mid-flight starts from the current positions", () => {
        const m = new UnitMorph(4, { duration: 100, spread: 0 });
        m.snap(a);
        m.morphTo(b, 0);
        m.step(40);
        const midX = Array.from(m.x);
        const midY = Array.from(m.y);
        expect(midX).not.toEqual(Array.from(a.x));
        expect(midX).not.toEqual(Array.from(b.x));
        // Interrupt at the same instant: the new morph's first frame is exactly where the marks were.
        m.morphTo(c, 40);
        m.step(40);
        expect(Array.from(m.x)).toEqual(midX);
        expect(Array.from(m.y)).toEqual(midY);
        m.step(141);
        expect(Array.from(m.x)).toEqual(Array.from(c.x));
        expect(Array.from(m.w)).toEqual(Array.from(c.w));
    });

    it("an interrupt between frames advances to the interrupt time first", () => {
        const m = new UnitMorph(4, { duration: 100, spread: 0 });
        const ref = new UnitMorph(4, { duration: 100, spread: 0 });
        m.snap(a);
        ref.snap(a);
        m.morphTo(b, 0);
        ref.morphTo(b, 0);
        m.step(20);
        ref.step(20);
        ref.step(60);
        // No frame ran at 60 on `m`; the interrupt still starts from where the marks are at 60.
        m.morphTo(c, 60);
        m.step(60);
        expect(Array.from(m.x)).toEqual(Array.from(ref.x));
    });

    it("staggers by the target layout's rank", () => {
        const m = new UnitMorph(4, { duration: 100, spread: 300 });
        m.snap(a);
        m.morphTo(b, 0);
        m.step(50);
        // Rank 0 has moved; the last rank has not left yet.
        expect(m.x[0]).not.toBe(a.x[0]);
        expect(m.y[3]).toBe(a.y[3]);
    });

    it("dims outside the focus group and settles back", () => {
        const g = createUnitLayout({ ...a, group: [0, 0, 1, 1] });
        const m = new UnitMorph(4);
        m.snap(g);
        m.focus(1);
        let t = 0;
        while (m.step((t += 16)) && t < 5000);
        expect(Array.from(m.alpha).map((v) => +v.toFixed(2))).toEqual([0.26, 0.26, 1, 1]);
        m.focus(null);
        while (m.step((t += 16)) && t < 10000);
        expect(Array.from(m.alpha)).toEqual([1, 1, 1, 1]);
    });

    it("refuses a layout with another mark count", () => {
        const m = new UnitMorph(4);
        expect(() => m.snap(gridLayout(5, { width: 40, cell: 10 }))).toThrow(/count/);
    });

    // Bytes per frame, from V8's running allocation count (Node 26 `total_allocated_bytes`). The count
    // moves a heap page (256 KiB) at a time, so a short run reads 0 or a whole page: a frame that
    // allocates one object every 32 frames lands under a page in 20k frames and reads clean. One long
    // run of `FRAMES` frames carries any steady rate across many pages, so its error is under a page
    // over the run (0.13 B per frame). Each run subtracts an empty loop of the same length, which
    // cancels the reads' own allocation, and the read is the median over `RUNS` runs: the runtime's own
    // allocation (a tier-up or a deopt landing mid-run, more likely under load) lifts one run and
    // leaves the median. Undefined on an older Node without the count.
    const FRAMES = 2_000_000;
    const RUNS = 5;
    // Half of a 16 B object every 32 frames (0.5 B per frame). Measured on Node 26 over 10 runs of the
    // file: the live loop's median reads -0.001 to 0.071 (a single run, lifted by the runtime, up to
    // 0.34, which is why the read is a median); the sparsest controls, a `{ t }` literal (32 B) and a
    // closure every 32 frames, read medians of 1.00 to 1.05 and 1.69 to 1.78.
    const ALLOCATION_LIMIT = 0.25;

    function allocationRuns(frame: (t: number) => unknown) {
        const stats = () => getHeapStatistics() as unknown as { total_allocated_bytes?: number };
        if (stats().total_allocated_bytes === undefined) return undefined;
        const allocated = () => stats().total_allocated_bytes!;
        const empty = (_t: number) => undefined;
        const run = (f: (t: number) => unknown) => {
            const before = allocated();
            for (let t = 0; t < FRAMES; t++) f(t);
            return allocated() - before;
        };
        run(frame); // warm: the interpreter boxes floats until the loop is compiled
        run(empty);
        const reads: number[] = [];
        for (let k = 0; k < RUNS; k++) {
            const base = run(empty);
            reads.push((run(frame) - base) / FRAMES);
        }
        const median = [...reads].sort((a, b) => a - b)[RUNS >> 1];
        return { median, reads };
    }

    // A small morph kept in flight for the whole run: `now` cycles inside the morph's span, so every
    // frame has marks landed, leaving and between, and the focus flips every 500 frames so the alpha
    // keeps easing. A morph that settled would measure only the early return.
    function liveFrame() {
        const n = 16;
        const m = new UnitMorph(n, { duration: 1000, spread: 2000 });
        m.snap(createUnitLayout({ ...gridLayout(n, { width: 400, cell: 8 }), group: Array.from({ length: n }, (_, i) => i & 1) }));
        m.morphTo(boustrophedonLayout(n, { width: 300, cell: 6 }), 0);
        return (t: number) => {
            if (t % 500 === 0) m.focus((t / 500) & 1);
            return m.step(t % 2500);
        };
    }

    it("allocates nothing in the step loop", async ({ annotate }) => {
        const n = 2000;
        const from = gridLayout(n, { width: 400, cell: 8 });
        const to = boustrophedonLayout(n, { width: 300, cell: 6 });
        const m = new UnitMorph(n, { duration: 10_000, spread: 2000 });
        m.snap(from);
        m.morphTo(to, 0);
        m.focus(0);

        // Structural: no typed array or Array is constructed by a frame, mid-flight and settling.
        const g = globalThis as unknown as Record<string, new (...a: never[]) => unknown>;
        const names = [
            "Float32Array",
            "Float64Array",
            "Int8Array",
            "Int16Array",
            "Int32Array",
            "Uint8Array",
            "Uint8ClampedArray",
            "Uint16Array",
            "Uint32Array",
            "Array",
        ];
        const real = names.map((k) => g[k]);
        let built = 0;
        names.forEach((k, j) => {
            const Real = real[j] as unknown as new (...a: unknown[]) => object;
            g[k] = new Proxy(Real, {
                construct(target, args, newTarget) {
                    built++;
                    return Reflect.construct(target, args, newTarget);
                },
                apply(target, self, args) {
                    built++;
                    return Reflect.apply(target as unknown as (...a: unknown[]) => unknown, self, args);
                },
            }) as never;
        });
        let more = true;
        try {
            for (let t = 0; t < 200; t++) m.step(t * 16);
            for (let t = 0; t < 2000 && more; t++) more = m.step(4000 + t * 16);
        } finally {
            names.forEach((k, j) => (g[k] = real[j]));
        }
        expect(built).toBe(0);

        // Measured: the live loop reads under the limit that every negative control below exceeds.
        const clean = allocationRuns(liveFrame());
        if (clean === undefined) return; // the structural check is then the witness
        await annotate(`B per frame: median ${clean.median.toFixed(3)} of ${clean.reads.map((r) => r.toFixed(3))}`);
        expect(clean.median).toBeLessThan(ALLOCATION_LIMIT);
    });

    // Negative controls: the live loop plus one allocation every `period` frames. Each MUST read over
    // the limit, or the probe is blind at that rate and the clean read above means nothing.
    let held: unknown = null;
    const controls: [string, number, (t: number) => void][] = [];
    for (const period of [1, 3, 4, 8, 32]) {
        controls.push([
            "an object literal",
            period,
            (t) => {
                if (t % period === 0) held = { t };
            },
        ]);
        controls.push([
            "a closure",
            period,
            (t) => {
                if (t % period === 0) held = () => period;
            },
        ]);
    }
    it.for(controls)("the probe sees %s every %i frames", async ([, , allocate], { annotate }) => {
        const frame = liveFrame();
        const read = allocationRuns((t) => {
            frame(t);
            allocate(t);
        });
        void held;
        if (read === undefined) return;
        await annotate(`B per frame: median ${read.median.toFixed(3)} of ${read.reads.map((r) => r.toFixed(3))}`);
        expect(read.median).toBeGreaterThan(ALLOCATION_LIMIT);
    });

    it("the allocation probe is immune to a runtime burst landing mid-run", async ({ annotate }) => {
        // A one-off 16 MB allocation the frame does not own (a tier-up under load, modelled), landing in
        // the first measured run: that run reads ~8 B per frame and a mean over the runs ~1.7, both over
        // the limit; the median does not carry it.
        const frame = liveFrame();
        let calls = 0;
        let burst: unknown = null;
        const read = allocationRuns((t) => {
            if (++calls === FRAMES + 10_000) burst = new Array(2_000_000).fill(0);
            return frame(t);
        });
        void burst;
        if (read === undefined) return;
        await annotate(`B per frame: median ${read.median.toFixed(3)} of ${read.reads.map((r) => r.toFixed(3))}`);
        expect(Math.max(...read.reads)).toBeGreaterThan(ALLOCATION_LIMIT);
        expect(read.reads.reduce((a, b) => a + b) / RUNS).toBeGreaterThan(ALLOCATION_LIMIT);
        expect(read.median).toBeLessThan(ALLOCATION_LIMIT);
    });
});

describe("unit canvas", () => {
    function fakeCanvas() {
        const calls = { fillRect: 0, drawImage: 0, fillStyle: [] as string[] };
        const ctx = {
            set fillStyle(v: string) {
                calls.fillStyle.push(v);
            },
            globalAlpha: 1,
            setTransform() {},
            clearRect() {},
            fillRect() {
                calls.fillRect++;
            },
            drawImage() {
                calls.drawImage++;
            },
        };
        const canvas = { width: 0, height: 0, getContext: () => ctx } as unknown as HTMLCanvasElement;
        return { canvas, calls };
    }
    function fakeFrames() {
        let next: FrameRequestCallback | null = null;
        let id = 0;
        return {
            raf: (cb: FrameRequestCallback) => {
                next = cb;
                return ++id;
            },
            caf: () => {
                next = null;
            },
            pending: () => next !== null,
            run(t: number) {
                const cb = next;
                next = null;
                cb?.(t);
            },
        };
    }

    it("caps the device pixel ratio at 2", () => {
        expect(MAX_CANVAS_DPR).toBe(2);
        expect(cappedDpr(3)).toBe(2);
        expect(cappedDpr(1.5)).toBe(1.5);
        expect(cappedDpr(0)).toBe(1);
    });

    it("sizes the backing store at the capped ratio", () => {
        const { canvas } = fakeCanvas();
        const f = fakeFrames();
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => 0 });
        u.setSize(100, 50, 3);
        expect([canvas.width, canvas.height]).toEqual([200, 100]);
    });

    it("stops the frame loop once settled", () => {
        const { canvas, calls } = fakeCanvas();
        const f = fakeFrames();
        let now = 0;
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => now, morph: { duration: 100, spread: 0 } });
        u.setPalette(["#a00", "#0a0"], [0, 1, 0, 1]);
        u.show(gridLayout(4, { width: 40, cell: 10 }));
        f.run(0);
        expect(f.pending()).toBe(false);
        now = 0;
        u.show(boustrophedonLayout(4, { width: 20, cell: 10 }));
        let frames = 0;
        while (f.pending() && frames < 100) f.run((now = ++frames * 16));
        expect(frames).toBe(7);
        expect(f.pending()).toBe(false);
        // One fill colour switch per palette entry per frame, not per mark.
        expect(calls.fillStyle.slice(-2)).toEqual(["#a00", "#0a0"]);
        expect(calls.fillRect).toBeGreaterThan(0);
    });

    it("snaps under reduced motion", () => {
        const { canvas } = fakeCanvas();
        const f = fakeFrames();
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => 0, reduced: true });
        u.show(gridLayout(4, { width: 40, cell: 10 }));
        const b = boustrophedonLayout(4, { width: 20, cell: 10 });
        u.show(b);
        f.run(0);
        expect(Array.from(u.morph.x)).toEqual(Array.from(b.x));
        expect(f.pending()).toBe(false);
    });

    it("lands a morph in flight when reduced motion turns on", () => {
        const { canvas } = fakeCanvas();
        const f = fakeFrames();
        let now = 0;
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => now, morph: { duration: 100, spread: 0 } });
        const g = gridLayout(4, { width: 40, cell: 10 });
        u.show(createUnitLayout({ ...g, group: [0, 0, 1, 1] }));
        f.run(0);
        const b = boustrophedonLayout(4, { width: 20, cell: 10, group: [0, 0, 1, 1] });
        u.show(b);
        u.focus(1);
        f.run((now = 30));
        expect(Array.from(u.morph.x)).not.toEqual(Array.from(b.x));
        u.reduced = true;
        expect(Array.from(u.morph.x)).toEqual(Array.from(b.x));
        expect(Array.from(u.morph.y)).toEqual(Array.from(b.y));
        expect(u.morph.settled).toBe(true);
        f.run((now = 31));
        expect(f.pending()).toBe(false);
    });

    it("draws marks from an optional sprite, one source rect per palette entry", () => {
        const { canvas, calls } = fakeCanvas();
        const f = fakeFrames();
        const sprite = { image: {} as CanvasImageSource, rects: new Float32Array([0, 0, 8, 8, 8, 0, 8, 8]) };
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => 0, sprite: () => sprite });
        u.setPalette(["#a00", "#0a0"], [0, 1, 0, 1]);
        u.show(gridLayout(4, { width: 40, cell: 10 }));
        f.run(0);
        expect(calls.drawImage).toBe(4);
        expect(calls.fillRect).toBe(0);
    });

    it("hit-tests mid-morph against the marks where they are drawn, not their targets", () => {
        const { canvas } = fakeCanvas();
        const f = fakeFrames();
        let t = 0;
        const u = new UnitCanvas(canvas, 2, { raf: f.raf, caf: f.caf, now: () => t, morph: { duration: 100, spread: 0 } });
        const from = createUnitLayout({ width: 100, height: 10, x: [5, 15], y: [5, 5], w: [8, 8], h: [8, 8] });
        const to = createUnitLayout({ width: 100, height: 10, x: [85, 95], y: [5, 5], w: [8, 8], h: [8, 8] });
        u.show(from);
        f.run(0);
        u.show(to);
        t = 1;
        f.run(t);
        // One ms in, mark 0 is still near x = 5: the pointer there finds it, and the empty target
        // slot at x = 85 finds nothing yet.
        expect(u.morph.x[0]).toBeLessThan(10);
        expect(u.hit(5, 5)).toBe(0);
        expect(u.hit(85, 5)).toBe(-1);
        // Landed: the layout's index answers again, at the targets.
        t = 200;
        f.run(t);
        expect(u.hit(85, 5)).toBe(0);
        expect(u.hit(5, 5)).toBe(-1);
    });

    it("hit-tests against the layout on screen", () => {
        const { canvas } = fakeCanvas();
        const f = fakeFrames();
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => 0 });
        expect(u.hit(5, 5)).toBe(-1);
        u.show(gridLayout(4, { width: 40, cell: 10 }));
        expect(u.hit(25, 5)).toBe(2);
    });
});
