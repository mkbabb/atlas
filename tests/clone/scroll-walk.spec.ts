// The scroll-free walk's verdict (scroll-walk.ts). The collapse fixtures are recorded cells:
// /sci and /bead at 1440 in Chromium on the B7b clone's dist-2 (out/b7b-x1/clone-2), where the
// HoverCard setup crash put the route in its error state mid-walk. scrollY fell to 0 and
// `scrollHeight - innerHeight` read 0, and the old verdict counted both cells as passes.
import { describe, expect, it } from "vitest";
import { ScrollWalk, type Sample } from "./scroll-walk";

const STEP = 300;

/** Feed samples until the walk says it is over; return what the browser spec asserts on. */
function walk(samples: Sample[]) {
    const w = new ScrollWalk(0, STEP);
    let steps = 0;
    for (const s of samples) {
        steps++;
        if (w.step(s).done) break;
    }
    return { steps, stuck: w.settle(), collapsed: w.collapsed };
}

/** Whole steps to `end`, then the remainder, with the document height steady. */
function healthy(end: number): Sample[] {
    const out: Sample[] = [];
    for (let sy = STEP; sy < end; sy += STEP) out.push({ sy, end });
    out.push({ sy: end, end });
    return out;
}

/** The page walks normally, then the document empties: scrollY and the end both read 0. */
function collapsing(sys: number[], end: number): Sample[] {
    return sys.map((sy) => (sy === 0 ? { sy: 0, end: 0 } : { sy, end }));
}

describe("the scroll-free walk verdict", () => {
    it("passes a page walked to its end", () => {
        expect(walk(healthy(9552))).toEqual({ steps: 32, stuck: [], collapsed: [] });
    });

    it("passes a page too short to scroll", () => {
        expect(walk([{ sy: 0, end: 0 }])).toEqual({ steps: 1, stuck: [], collapsed: [] });
    });

    it("fails /sci at 1440 when the document collapses at step 7", () => {
        const v = walk(collapsing([300, 600, 900, 1200, 1500, 1800, 2100, 0], 9552));
        expect(v.collapsed).toEqual([{ k: 7, sy: 0, end: 0, from: 2100 }]);
        expect(v.steps).toBe(8);
    });

    it("fails /bead at 1440 when the document collapses at step 3", () => {
        const v = walk(collapsing([300, 600, 900, 0], 6459));
        expect(v.collapsed).toEqual([{ k: 3, sy: 0, end: 0, from: 900 }]);
    });

    it("fails a page thrown back to the top while its document stays whole", () => {
        const v = walk([{ sy: 300, end: 6459 }, { sy: 600, end: 6459 }, { sy: 0, end: 6459 }]);
        expect(v.stuck).toEqual([{ k: 2, moved: -600, sy: 0 }]);
    });

    it("still pairs a late Firefox wheel with its catch-up", () => {
        const v = walk([
            { sy: 300, end: 6000 },
            { sy: 300, end: 6000 },
            { sy: 900, end: 6000 },
            { sy: 1200, end: 6000 },
        ]);
        expect(v.stuck).toEqual([]);
    });
});
