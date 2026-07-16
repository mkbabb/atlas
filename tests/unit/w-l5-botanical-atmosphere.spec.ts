import { describe, expect, it } from "vitest";
import {
    constellationShouldRun,
    nextConstellationPhase,
} from "../../src/platform/chrome/background/composables/constellation-register";
import {
    nucleiSpecs,
    nucleusAt,
} from "../../src/platform/chrome/background/composables/aurora-nuclei";

const deposition = {
    granulation: 0.34,
    breathDepth: 0.02,
    breathPeriod: 60,
    elongation: 1,
    angle: 0,
};

describe("constellation register", () => {
    it("resolves live, bake and auto without letting reduced motion be outvoted", () => {
        const present = { active: true, hidden: false, reduced: false };
        expect(constellationShouldRun("live", present)).toBe(true);
        expect(constellationShouldRun("bake", present)).toBe(false);
        expect(constellationShouldRun("auto", present)).toBe(true);
        expect(constellationShouldRun("auto", { ...present, active: false })).toBe(false);
        expect(constellationShouldRun("live", { ...present, hidden: true })).toBe(false);
        expect(constellationShouldRun("live", { ...present, reduced: true })).toBe(false);
    });

    it("walks the asleep → waking → live → sleeping cycle", () => {
        expect(nextConstellationPhase("asleep", "wake")).toBe("waking");
        expect(nextConstellationPhase("waking", "woke")).toBe("live");
        expect(nextConstellationPhase("live", "sleep")).toBe("sleeping");
        expect(nextConstellationPhase("sleeping", "slept")).toBe("asleep");
    });

});

describe("aurora register", () => {
    it("moves the warm pair deeper into warm at page top and preserves neutral bias-cap zero", () => {
        const warm = nucleiSpecs(0.3, deposition)[0]!;
        expect(nucleusAt(warm, 0, -1, 0.3).paletteBias).toBeLessThan(warm.paletteBias);
        expect(nucleusAt(warm, 1, 1, 0.3).paletteBias).toBeGreaterThan(warm.paletteBias);
        expect(nucleusAt(warm, 0, -1, 0).paletteBias).toBe(warm.paletteBias);
    });
});
