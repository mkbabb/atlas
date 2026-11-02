// U/B8 A5. The transient seat clamped the card to the viewport at `anchor + CARD_PAD`, so near the
// right or bottom edge the clamp slid the card back over the anchor and the mark under it. It now
// flips to the far side of the anchor when the near side would cross the edge and the far side has
// room, and an optional avoid-rect (a fixed dock) keeps the card clear of it.
import { describe, expect, it } from "vitest";
import { CARD_PAD, transientSeat, type Rect } from "../../src/interaction/useCardPlacement.js";

const fp = { w: 320, h: 282 };
const vp = { vw: 1440, vh: 900 };
type Seat = { left: number; top: number };
const covers = (s: Seat, p: { x: number; y: number }) =>
    p.x >= s.left && p.x <= s.left + fp.w && p.y >= s.top && p.y <= s.top + fp.h;
const overlaps = (s: Seat, r: Rect) =>
    s.left < r.right && s.left + fp.w > r.left && s.top < r.bottom && s.top + fp.h > r.top;

describe("the transient card flips at the viewport edge", () => {
    it("keeps the below-right seat when there is room", () => {
        expect(transientSeat({ x: 400, y: 300 }, fp, vp)).toEqual({ left: 400 + CARD_PAD, top: 300 + CARD_PAD });
    });
    it("flips left of the anchor at the right edge instead of clamping over it", () => {
        const a = { x: 1300, y: 300 };
        const s = transientSeat(a, fp, vp);
        expect(s).toEqual({ left: a.x - CARD_PAD - fp.w, top: a.y + CARD_PAD });
        expect(covers(s, a)).toBe(false);
    });
    it("flips above the anchor at the bottom edge instead of clamping over it", () => {
        const a = { x: 400, y: 800 };
        const s = transientSeat(a, fp, vp);
        expect(s).toEqual({ left: a.x + CARD_PAD, top: a.y - CARD_PAD - fp.h });
        expect(covers(s, a)).toBe(false);
    });
    it("flips both ways in the bottom-right corner", () => {
        const a = { x: 1300, y: 800 };
        const s = transientSeat(a, fp, vp);
        expect(s).toEqual({ left: a.x - CARD_PAD - fp.w, top: a.y - CARD_PAD - fp.h });
        expect(covers(s, a)).toBe(false);
    });
    it("clamps on the near side when the far side has no room either", () => {
        const narrow = { vw: 500, vh: 900 };
        const s = transientSeat({ x: 250, y: 300 }, fp, narrow);
        expect(s.left).toBe(narrow.vw - fp.w - CARD_PAD);
    });
});

describe("the transient card stays clear of an avoid-rect", () => {
    const dock: Rect = { left: 400, top: 820, right: 1040, bottom: 880 };
    it("ignores an avoid-rect the default seat already clears", () => {
        expect(transientSeat({ x: 400, y: 300 }, fp, vp, null, dock)).toEqual({ left: 416, top: 316 });
    });
    it("moves off a fixed dock the default seat would cover", () => {
        const a = { x: 600, y: 560 };
        expect(overlaps({ left: a.x + CARD_PAD, top: a.y + CARD_PAD }, dock)).toBe(true);
        const s = transientSeat(a, fp, vp, null, dock);
        expect(overlaps(s, dock)).toBe(false);
        expect(covers(s, a)).toBe(false);
        expect(s.top).toBeGreaterThanOrEqual(CARD_PAD);
    });
    it("clears the dock and the live pointer together", () => {
        const a = { x: 600, y: 560 };
        const p = { x: 700, y: 400 };
        const s = transientSeat(a, fp, vp, p, dock);
        expect(overlaps(s, dock)).toBe(false);
        expect(covers(s, p)).toBe(false);
    });
    it("clears a full-width bar by taking the seat above the anchor", () => {
        const bar: Rect = { left: 0, top: 600, right: 1440, bottom: 900 };
        const a = { x: 700, y: 500 };
        const s = transientSeat(a, fp, vp, null, bar);
        expect(s).toEqual({ left: a.x + CARD_PAD, top: a.y - CARD_PAD - fp.h });
        expect(overlaps(s, bar)).toBe(false);
    });
    it("keeps the near seat inside the viewport when no seat clears the rect", () => {
        const all: Rect = { left: 0, top: 0, right: 1440, bottom: 900 };
        expect(transientSeat({ x: 400, y: 300 }, fp, vp, null, all)).toEqual({ left: 416, top: 316 });
    });
});
