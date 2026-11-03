// U/B8 A5. The transient seat clamped the card to the viewport at `anchor + CARD_PAD`, so near the
// right or bottom edge the clamp slid the card back over the anchor and the mark under it. It now
// flips to the far side of the anchor when the near side would cross the edge and the far side has
// room, and an optional avoid-rect (a fixed dock) keeps the card clear of it.
import { describe, expect, it } from "vitest";
import { AVOID_GAP, CARD_PAD, transientSeat, type Rect } from "../../src/interaction/useCardPlacement.js";

const fp = { w: 320, h: 282 };
const vp = { vw: 1440, vh: 900 };
type Seat = { left: number; top: number; maxHeight?: number };
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

// U/B8 A5 repair. The avoid-rect test was exact-edge: a card could sit flush on the dock. The seat now
// keeps `AVOID_GAP` (8 px, Gregg's DOCK_CLEARANCE) between them, and a caller may pass its own gap.
describe("the transient card keeps a clearance gap from the avoid-rect", () => {
    const gapped = (s: Seat, r: Rect, g: number) =>
        s.left >= r.right + g || s.left + fp.w <= r.left - g || s.top >= r.bottom + g || s.top + fp.h <= r.top - g;
    // The below-right seat ends 4 px above the dock: clear of it, but inside the gap.
    const a = { x: 400, y: 300 };
    const dock: Rect = { left: 300, top: 300 + CARD_PAD + fp.h + 4, right: 1000, bottom: 900 };
    it("defaults the gap to 8 px", () => {
        expect(AVOID_GAP).toBe(8);
    });
    it("moves off a dock the near seat would sit flush against", () => {
        const s = transientSeat(a, fp, vp, null, dock);
        expect(gapped(s, dock, AVOID_GAP)).toBe(true);
        expect(covers(s, a)).toBe(false);
    });
    it("takes the caller's gap", () => {
        expect(transientSeat(a, fp, vp, null, dock, 0)).toEqual({ left: 416, top: 316 });
        const s = transientSeat(a, fp, vp, null, dock, 24);
        expect(gapped(s, dock, 24)).toBe(true);
    });
});

// U/B8 A5 repair. In a viewport too small for the card on either side of the anchor, every corner
// clamped back over the anchor, so the card hid the mark it described. The seat now takes the roomier
// band above or below the anchor and caps the card's height to it.
describe("in a tiny viewport the card never covers the anchor", () => {
    const tiny = { vw: 360, vh: 400 };
    const coversCapped = (s: Seat, p: { x: number; y: number }) =>
        p.x >= s.left && p.x <= s.left + fp.w && p.y >= s.top && p.y <= s.top + Math.min(fp.h, s.maxHeight ?? fp.h);
    it("caps the card below a high anchor", () => {
        const a = { x: 180, y: 120 };
        const s = transientSeat(a, fp, tiny);
        expect(coversCapped(s, a)).toBe(false);
        expect(s.top).toBe(a.y + CARD_PAD);
        expect(s.maxHeight).toBe(tiny.vh - CARD_PAD - (a.y + CARD_PAD));
        expect(s.left).toBeGreaterThanOrEqual(CARD_PAD);
    });
    it("caps the card above a low anchor", () => {
        const a = { x: 180, y: 290 };
        const s = transientSeat(a, fp, tiny);
        expect(coversCapped(s, a)).toBe(false);
        expect(s.top).toBe(CARD_PAD);
        expect(s.top + s.maxHeight!).toBe(a.y - CARD_PAD);
    });
    it("leaves the live pointer clear too", () => {
        const a = { x: 180, y: 180 };
        const p = { x: 200, y: 230 }; // inside the roomier band below
        const s = transientSeat(a, fp, tiny, p);
        expect(coversCapped(s, a)).toBe(false);
        expect(coversCapped(s, p)).toBe(false);
    });
    it("bounds the band by a dock in its column", () => {
        const bar: Rect = { left: 16, top: 330, right: 344, bottom: 386 };
        const a = { x: 180, y: 120 };
        const s = transientSeat(a, fp, tiny, null, bar);
        expect(s.top + s.maxHeight!).toBeLessThanOrEqual(bar.top - AVOID_GAP);
        expect(coversCapped(s, a)).toBe(false);
    });
    it("sets no cap where a full-size corner clears the anchor", () => {
        expect(transientSeat({ x: 400, y: 300 }, fp, vp).maxHeight).toBeUndefined();
    });
});
