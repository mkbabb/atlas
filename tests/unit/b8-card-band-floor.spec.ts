// U/B8 A5 repair. The tiny-viewport band fallback fired in normal viewports whenever the pointer sat
// off the anchor so that every full-size corner covered one or the other, and it then picked a band
// too thin to read (a 38 px sliver near the bottom-left; a 0 px band at top -16 near the top-right).
// The band now has a usable floor: a band below it loses to a full-size corner that clears the
// anchor (covering the pointer if it must), and no seat caps the card below the floor or above the
// viewport.
import { describe, expect, it } from "vitest";
import { BAND_FLOOR, CARD_PAD, bandFloor, transientSeat, type Rect } from "../../src/interaction/useCardPlacement.js";

type Pt = { x: number; y: number };
type Seat = { left: number; top: number; maxHeight?: number };
const covers = (s: Seat, fp: { w: number; h: number }, p: Pt) =>
    p.x >= s.left && p.x <= s.left + fp.w && p.y >= s.top && p.y <= s.top + Math.min(fp.h, s.maxHeight ?? fp.h);

describe("the band fallback never shrinks the card to a sliver", () => {
    const vp = { vw: 1440, vh: 900 };
    it("floors the band at min(card height, 120 px)", () => {
        expect(BAND_FLOOR).toBe(120);
        expect(bandFloor(282, 900)).toBe(120);
        expect(bandFloor(90, 900)).toBe(90);
    });
    it("bottom-left: anchor (40,830), pointer (80,790), a 240x120 card", () => {
        const fp = { w: 240, h: 120 };
        const a = { x: 40, y: 830 };
        const s = transientSeat(a, fp, vp, { x: 80, y: 790 });
        expect(s.maxHeight ?? fp.h).toBeGreaterThanOrEqual(bandFloor(fp.h, vp.vh));
        expect(s.top).toBeGreaterThanOrEqual(0);
        expect(covers(s, fp, a)).toBe(false);
    });
    it("top-right: anchor (1207,0), pointer (1117,60), a 320x282 card", () => {
        const fp = { w: 320, h: 282 };
        const a = { x: 1207, y: 0 };
        const s = transientSeat(a, fp, vp, { x: 1117, y: 60 });
        expect(s.maxHeight ?? fp.h).toBeGreaterThanOrEqual(bandFloor(fp.h, vp.vh));
        expect(s.top).toBeGreaterThanOrEqual(0);
        expect(covers(s, fp, a)).toBe(false);
    });
});

describe("property sweep: maxHeight >= floor and top >= 0", () => {
    // A seeded LCG so the sweep is deterministic.
    let seed = 0x5eed;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const pick = (lo: number, hi: number) => Math.round(lo + rnd() * (hi - lo));
    const viewports = [
        { vw: 360, vh: 640 },
        { vw: 390, vh: 844 },
        { vw: 768, vh: 1024 },
        { vw: 1280, vh: 720 },
        { vw: 1440, vh: 900 },
        { vw: 1920, vh: 1080 },
    ];
    const cards = [
        { w: 240, h: 120 },
        { w: 320, h: 282 },
        { w: 280, h: 90 },
        { w: 320, h: 420 },
    ];
    it("holds across viewports, cards, anchors, pointers and docks", () => {
        let n = 0;
        for (const vp of viewports) {
            for (const fp of cards) {
                if (fp.w + 2 * CARD_PAD > vp.vw) continue;
                const floor = bandFloor(fp.h, vp.vh);
                for (let i = 0; i < 400; i++) {
                    const a = { x: pick(0, vp.vw), y: pick(0, vp.vh) };
                    const p = rnd() < 0.15 ? null : { x: a.x + pick(-200, 200), y: a.y + pick(-200, 200) };
                    const dock: Rect | null =
                        rnd() < 0.5 ? null : { left: 0, top: vp.vh - 72, right: vp.vw, bottom: vp.vh - 16 };
                    const s = transientSeat(a, fp, vp, p, dock);
                    const ctx = JSON.stringify({ vp, fp, a, p, dock, s });
                    expect(s.maxHeight ?? fp.h, ctx).toBeGreaterThanOrEqual(floor);
                    expect(s.top, ctx).toBeGreaterThanOrEqual(0);
                    n++;
                }
            }
        }
        expect(n).toBeGreaterThan(5000);
    });
});
