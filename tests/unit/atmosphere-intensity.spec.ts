import { describe, expect, it } from "vitest";
import {
    armShader,
    ATMOSPHERE_PRESETS,
    clampDeposition,
    DEFAULT_DEPOSITION,
    DEFAULT_INTENSITY,
    selectAtmosphere,
} from "../../src/platform/chrome/background/composables/atmosphere";
import { AMERICA, EARTHTONE } from "../../src/contract/theme";

// W-THEME A-36 — the intensity fold. The table is the ONE home of the aurora ladder's rungs, and
// the shader arm is a THREE-way AND. The RENDER half (the ceilings, the dock pair, the grain, the
// versal ink actually painting) binds at W-ATMOS; what is falsifiable HERE is the config.

describe("the preset → envelope table (spec-atmosphere §d.1)", () => {
    it("carries the three rungs, monotonically louder", () => {
        const [quiet, data, hero] = [
            ATMOSPHERE_PRESETS.quiet,
            ATMOSPHERE_PRESETS.data,
            ATMOSPHERE_PRESETS.hero,
        ];
        expect(quiet.envelope.breathDepthMax).toBeLessThan(
            data.envelope.breathDepthMax,
        );
        expect(data.envelope.breathDepthMax).toBeLessThan(
            hero.envelope.breathDepthMax,
        );
        expect(quiet.opacityCeiling.light).toBeLessThan(data.opacityCeiling.light);
        expect(data.opacityCeiling.light).toBeLessThan(hero.opacityCeiling.light);
        expect(quiet.grain).toBeLessThan(data.grain);
        expect(data.grain).toBeLessThan(hero.grain);
    });

    it("holds the two hard bounds: under glass-ui's 0.15 breath ceiling, dark ≥ light", () => {
        for (const preset of Object.values(ATMOSPHERE_PRESETS)) {
            expect(preset.envelope.breathDepthMax).toBeLessThan(0.15);
            expect(preset.opacityCeiling.dark).toBeGreaterThan(
                preset.opacityCeiling.light,
            );
        }
    });

    it("arms the shader on ONE rung only — `hero`", () => {
        expect(ATMOSPHERE_PRESETS.quiet.shader).toBe(false);
        expect(ATMOSPHERE_PRESETS.data.shader).toBe(false);
        expect(ATMOSPHERE_PRESETS.hero.shader).toBe(true);
    });

    it("clamps the deposition into the DECLARED rung, not one global envelope", () => {
        const loud = { ...DEFAULT_DEPOSITION, granulation: 0.6, breathDepth: 0.2 };
        expect(clampDeposition(loud, "quiet")).toMatchObject({
            granulation: 0.34,
            breathDepth: 0.03,
        });
        expect(clampDeposition(loud, "hero")).toMatchObject({
            granulation: 0.52,
            breathDepth: 0.12,
        });
    });
});

describe("the THREE-way shader arm (§d.2 — armShader)", () => {
    it("closes only when all three legs close", () => {
        expect(armShader("hero", true, "A")).toBe(true);
        expect(armShader("data", true, "A")).toBe(false); // the intensity leg
        expect(armShader("hero", false, "A")).toBe(false); // the COVER leg (D NEW-5)
        expect(armShader("hero", true, "B")).toBe(false); // the device leg
    });

    it("never arms an INTERIOR chroma hero — the vft VI.2 case the cover leg exists for", () => {
        expect(EARTHTONE.atmosphere?.intensity).toBe("hero");
        expect(armShader(EARTHTONE.atmosphere!.intensity!, false, "A")).toBe(false);
    });
});

describe("the ONE home (H-1)", () => {
    it("resolves an undeclared intensity to the default register", () => {
        expect(AMERICA.atmosphere?.intensity).toBeUndefined();
        expect(selectAtmosphere(AMERICA.atmosphere, AMERICA.chrome).intensity).toBe(
            DEFAULT_INTENSITY,
        );
    });

    it("carries the declared rung through to the selection every render surface reads", () => {
        expect(selectAtmosphere(EARTHTONE.atmosphere, EARTHTONE.chrome).intensity).toBe(
            "hero",
        );
    });
});
