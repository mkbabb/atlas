// U/B7c L · F-14. The hover card takes the pointer (`pointer-events: auto`, so a reader can move onto
// it), and it seats below and right of the datum's anchor. When the anchor is not under the pointer
// (a charter catchment on the /sci map anchors at the school's internal point, 200 px from where the
// pointer entered the polygon), that seat covered the pointer: the next click landed on the card, not
// the mark, and EntityDetail never opened (served /sci 1440, Chromium). The seat now never covers the
// live pointer: it tries the four corners round the anchor and takes the first that leaves the
// pointer clear.
import { describe, expect, it } from "vitest";
import { CARD_PAD, transientSeat } from "../../src/interaction/useCardPlacement.js";

const fp = { w: 320, h: 282 };
const vp = { vw: 1440, vh: 900 };
const covers = (s: { left: number; top: number }, p: { x: number; y: number }) =>
    p.x >= s.left && p.x <= s.left + fp.w && p.y >= s.top && p.y <= s.top + fp.h;

describe("the transient card never seats over the live pointer", () => {
    it("keeps the below-right seat when the pointer is clear of it", () => {
        const a = { x: 400, y: 300 };
        expect(transientSeat(a, fp, vp, { x: 400, y: 300 })).toEqual({ left: 400 + CARD_PAD, top: 300 + CARD_PAD });
    });
    it("moves off the pointer that sits inside the below-right seat (the /sci charter case)", () => {
        const a = { x: 873, y: 475 };
        const p = { x: 1046, y: 575 };
        const s = transientSeat(a, fp, vp, p);
        expect(covers(s, p)).toBe(false);
    });
    it("stays inside the viewport whichever corner it takes", () => {
        const a = { x: 1300, y: 820 };
        const s = transientSeat(a, fp, vp, { x: 1250, y: 860 });
        expect(s.left).toBeGreaterThanOrEqual(CARD_PAD);
        expect(s.left + fp.w).toBeLessThanOrEqual(vp.vw - CARD_PAD);
        expect(s.top + fp.h).toBeLessThanOrEqual(vp.vh - CARD_PAD);
        expect(covers(s, { x: 1250, y: 860 })).toBe(false);
    });
    it("with no pointer (keyboard or deep-link selection) seats below-right of the anchor", () => {
        expect(transientSeat({ x: 400, y: 300 }, fp, vp, null)).toEqual({ left: 416, top: 316 });
    });
});
