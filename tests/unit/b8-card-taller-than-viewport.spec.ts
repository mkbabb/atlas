// U/B8 A5 repair. A card taller than the viewport (minus its margins) got a full-size corner with no
// maxHeight, clamped to top = CARD_PAD, and ran past the bottom edge. Every seat for such a card now
// carries a maxHeight that fits: top >= CARD_PAD and top + maxHeight <= vh - CARD_PAD.
import { describe, expect, it } from "vitest";
import { CARD_PAD, bandFloor, transientSeat } from "../../src/interaction/useCardPlacement.js";

describe("a card taller than the viewport fits inside it", () => {
    const vp = { vw: 1440, vh: 900 };
    const fp = { w: 320, h: 1200 };
    const fits = (s: { top: number; maxHeight?: number }) => {
        expect(s.maxHeight).toBeDefined();
        expect(s.top).toBeGreaterThanOrEqual(CARD_PAD);
        expect(s.top + s.maxHeight!).toBeLessThanOrEqual(vp.vh - CARD_PAD);
        expect(s.maxHeight!).toBeGreaterThanOrEqual(bandFloor(fp.h, vp.vh));
    };
    it("a mid-viewport anchor with no pointer", () => fits(transientSeat({ x: 400, y: 450 }, fp, vp)));
    it("a top-left anchor with the pointer on it", () =>
        fits(transientSeat({ x: 20, y: 20 }, fp, vp, { x: 20, y: 20 })));
    it("a bottom-right anchor beside a dock", () =>
        fits(
            transientSeat({ x: 1400, y: 860 }, fp, vp, { x: 1380, y: 840 }, {
                left: 0,
                top: vp.vh - 72,
                right: vp.vw,
                bottom: vp.vh - 16,
            }),
        ));
    it("a card exactly the viewport's height less its margins needs no cap", () => {
        const s = transientSeat({ x: 100, y: 450 }, { w: 320, h: vp.vh - 2 * CARD_PAD }, vp);
        expect(s.top).toBeGreaterThanOrEqual(CARD_PAD);
        expect(s.top + (s.maxHeight ?? vp.vh - 2 * CARD_PAD)).toBeLessThanOrEqual(vp.vh - CARD_PAD);
    });
});
