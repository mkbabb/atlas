// U/B7c C1: the motion `scroll` trigger is retired. No consumer declares a segment on it (sci dropped
// its last one in a5542fbb), and it cost every plate on the viz hub a cover-progress clock of its own.
// Scroll-scrubbed reveals belong to the reveal register (`revealHostStyle`, `scroll-driven.css`), not
// the director. The presets that fired only on scroll (BarRise, ClipWipe, DrawIn) go with it; their
// K-catalog names fold into the reveal and draw presets that remain, so the 57-name cover stays total.
import { describe, expect, it } from "vitest";
import { MOTION_TRIGGERS } from "../../src/motion/triggers";
import { K_CATALOG_NAMES, LEAN_CATALOG, PRESET_TRIGGERS } from "../../src/motion/lean-catalog";
import { useMotionDrivers } from "../../src/motion/motion-director";
import { createVizContext } from "../../src/interaction/useVizContext";
import { ref } from "vue";

describe("the retired motion `scroll` trigger", () => {
    it("is not in the trigger roster, and no preset declares it", () => {
        expect(MOTION_TRIGGERS as readonly string[]).not.toContain("scroll");
        for (const on of Object.values(PRESET_TRIGGERS)) expect(on as readonly string[]).not.toContain("scroll");
        expect(Object.keys(LEAN_CATALOG)).not.toEqual(expect.arrayContaining(["BarRise"]));
        expect(Object.keys(LEAN_CATALOG)).not.toEqual(expect.arrayContaining(["ClipWipe"]));
        expect(Object.keys(LEAN_CATALOG)).not.toEqual(expect.arrayContaining(["DrawIn"]));
    });

    it("the scroll-only presets' names fold into the remaining reveal and draw presets", () => {
        expect(LEAN_CATALOG.RevealUp.subsumes).toEqual(
            expect.arrayContaining(["BarRise", "GeoFillCascade", "HexCascade", "ChartDrawMask", "ClipReveal", "KineticEmphasis"]),
        );
        expect(LEAN_CATALOG.CurvePersist.subsumes).toEqual(expect.arrayContaining(["LineDraw", "RibbonFlow"]));
        const all = Object.values(LEAN_CATALOG).flatMap((p) => p.subsumes);
        expect(all).toHaveLength(K_CATALOG_NAMES.length);
        expect(new Set(all)).toEqual(new Set(K_CATALOG_NAMES));
    });

    it("the driver edges carry no scroll clock", () => {
        const drivers = useMotionDrivers(ref(null));
        expect("scroll" in drivers).toBe(false);
        const ctx = createVizContext("v", {
            pin: () => 1,
            hoveredKey: () => null,
            selectedKeys: () => new Set(),
            primaryKey: () => null,
            activeVizId: () => "",
            filterEpoch: () => 0,
            reducedMotion: () => false,
        } as Parameters<typeof createVizContext>[1]);
        expect("scroll" in ctx).toBe(false);
    });
});
