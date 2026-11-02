// U/B8 A5. With no avoid-rect (a mount outside the site shell, where no dock binds the dock-rect
// source), the seat is the one the card took before the A5 repair wherever that seat left the anchor
// and the pointer clear (the repair changes only the seats that covered them). The wiring that passes
// the dock's rect is witnessed by src/interaction/HoverCard.dock-clear.browser.spec.ts.
import { describe, expect, it } from "vitest";
import { CARD_PAD, transientSeat, type Anchor, type Footprint, type Viewport } from "../../src/interaction/useCardPlacement.js";

// The seat as it stood at c3f38da with no avoid-rect: flip each axis at the edge, then the first
// corner that leaves the live pointer clear.
function seatBefore(anchor: Anchor, { w, h }: Footprint, { vw, vh }: Viewport, pointer: Anchor | null) {
    const clampX = (x: number) => Math.max(CARD_PAD, Math.min(x, vw - w - CARD_PAD));
    const clampY = (y: number) => Math.max(CARD_PAD, Math.min(y, vh - h - CARD_PAD));
    const right = anchor.x + CARD_PAD;
    const left = anchor.x - CARD_PAD - w;
    const below = anchor.y + CARD_PAD;
    const above = anchor.y - CARD_PAD - h;
    const flipX = right + w > vw - CARD_PAD && left >= CARD_PAD;
    const flipY = below + h > vh - CARD_PAD && above >= CARD_PAD;
    const [x0, x1] = (flipX ? [left, right] : [right, left]).map(clampX) as [number, number];
    const [y0, y1] = (flipY ? [above, below] : [below, above]).map(clampY) as [number, number];
    const seats = [
        { left: x0, top: y0 },
        { left: x1, top: y0 },
        { left: x0, top: y1 },
        { left: x1, top: y1 },
    ];
    const clear = (s: { left: number; top: number }) =>
        !pointer || pointer.x < s.left || pointer.x > s.left + w || pointer.y < s.top || pointer.y > s.top + h;
    return seats.find(clear) ?? seats[0]!;
}

describe("with no avoid-rect the card seats as it did before", () => {
    const fp = { w: 320, h: 282 };
    const covers = (s: { left: number; top: number }, p: Anchor) =>
        p.x >= s.left && p.x <= s.left + fp.w && p.y >= s.top && p.y <= s.top + fp.h;
    for (const vp of [
        { vw: 1440, vh: 900 },
        { vw: 1024, vh: 768 },
        { vw: 390, vh: 844 },
    ]) {
        it(`at ${vp.vw} x ${vp.vh}`, () => {
            let compared = 0;
            for (let x = 0; x <= vp.vw; x += 40)
                for (let y = 0; y <= vp.vh; y += 40)
                    for (const pointer of [null, { x, y }, { x: x + 150, y: y + 120 }, { x: x - 150, y: y - 120 }]) {
                        const a = { x, y };
                        const before = seatBefore(a, fp, vp, pointer);
                        if (covers(before, a) || (pointer && covers(before, pointer))) continue;
                        expect(transientSeat(a, fp, vp, pointer)).toEqual(before);
                        expect(transientSeat(a, fp, vp, pointer, null)).toEqual(before);
                        compared++;
                    }
            expect(compared).toBeGreaterThan(100);
        });
    }
});
