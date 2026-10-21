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
    it("resolves every nucleus at rest: its own bias, rest y and rest value (U/B7 §5.6)", () => {
        for (const spec of nucleiSpecs(0.3, deposition)) {
            const n = nucleusAt(spec);
            expect(n.paletteBias).toBe(spec.paletteBias);
            expect(n.y).toBe(spec.yRest);
            expect(n.valueBias).toBe(spec.valueRest);
        }
    });
});
