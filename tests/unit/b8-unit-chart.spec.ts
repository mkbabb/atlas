import { getHeapStatistics } from "node:v8";
import { describe, expect, it } from "vitest";
import {
    boustrophedonLayout,
    createUnitLayout,
    gridLayout,
    groupedBlocksLayout,
    hitTest,
    unitSummary,
} from "../../src/charts/marks/unit-layouts";
import { UNIT_MAX_DPR, UnitCanvas, UnitMorph, sampleSpring, unitDpr } from "../../src/charts/marks/unit-engine";

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

    it("allocates nothing in the step loop", () => {
        const n = 2000;
        const from = gridLayout(n, { width: 400, cell: 8 });
        const to = boustrophedonLayout(n, { width: 300, cell: 6 });
        const m = new UnitMorph(n, { duration: 10_000, spread: 2000 });
        m.snap(from);
        m.morphTo(to, 0);
        m.focus(0);

        // No typed array is built by a frame.
        const RealF32 = globalThis.Float32Array;
        let built = 0;
        globalThis.Float32Array = class extends RealF32 {
            constructor(...args: ConstructorParameters<typeof Float32Array>) {
                super(...args);
                built++;
            }
        } as typeof Float32Array;
        try {
            for (let t = 0; t < 200; t++) m.step(t * 16);
        } finally {
            globalThis.Float32Array = RealF32;
        }
        expect(built).toBe(0);

        // Bytes per frame, from V8's running allocation count (Node 26 `total_allocated_bytes`). A
        // read carries a fixed overhead, so the rate is the slope between a short and a long run.
        // The probe is shown able to see one small object per frame, so a clean read is real.
        // An older Node has no such count: the typed-array check above is then the whole witness.
        const stats = () => getHeapStatistics() as unknown as { total_allocated_bytes?: number };
        if (stats().total_allocated_bytes === undefined) return;
        const allocated = () => stats().total_allocated_bytes!;
        const run = (frame: (t: number) => unknown, frames: number) => {
            const before = allocated();
            for (let t = 0; t < frames; t++) frame(t);
            return allocated() - before;
        };
        const perFrame = (frame: (t: number) => unknown) => {
            run(frame, 5000); // warm: the interpreter boxes floats until the loop is compiled
            return (run(frame, 200_000) - run(frame, 20_000)) / 180_000;
        };
        const small = new UnitMorph(200, { duration: 1e9, spread: 2000 });
        small.snap(gridLayout(200, { width: 400, cell: 8 }));
        small.morphTo(boustrophedonLayout(200, { width: 300, cell: 6 }), 0);
        small.focus(0);
        let held: unknown = null;
        const control = perFrame((t) => {
            small.step(t);
            held = { t };
        });
        void held;
        const clean = perFrame((t) => small.step(t));
        expect(control).toBeGreaterThan(16);
        expect(clean).toBeLessThan(4);
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
        expect(UNIT_MAX_DPR).toBe(2);
        expect(unitDpr(3)).toBe(2);
        expect(unitDpr(1.5)).toBe(1.5);
        expect(unitDpr(0)).toBe(1);
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

    it("hit-tests against the layout on screen", () => {
        const { canvas } = fakeCanvas();
        const f = fakeFrames();
        const u = new UnitCanvas(canvas, 4, { raf: f.raf, caf: f.caf, now: () => 0 });
        expect(u.hit(5, 5)).toBe(-1);
        u.show(gridLayout(4, { width: 40, cell: 10 }));
        expect(u.hit(25, 5)).toBe(2);
    });
});
