// `compileSegment` — the compile boundary as a pure TOTAL resolver (W-MOTION-CORE · spec-motion §d).
// The C-7 softening is honored: correctness here is `tsc` (the closed unions force every arm) plus
// these ordinary assertions. No born-RED gate, no proof script.
import { describe, expect, it } from "vitest";
import {
    compileSegment,
    compileTarget,
    type CompileTarget,
} from "../../src/motion/compileSegment";
import {
    LEAN_CATALOG,
    LEAN_MECHANISMS,
    PRESET_TRIGGERS,
    type LeanPresetName,
} from "../../src/motion/lean-catalog";
import { MOTION_TRIGGERS } from "../../src/motion/triggers";
import type { AnyMotionSegment } from "../../src/motion/motion-director";

const PRESETS = Object.keys(LEAN_CATALOG) as LeanPresetName[];
const POSITION = ["scroll", "pin"] as const;
const seg = (use: LeanPresetName, on: AnyMotionSegment["on"]): AnyMotionSegment => ({
    id: `${use}-${on}`,
    use,
    target: { kind: "host" },
    on,
});

describe("compileTarget — total over mechanism × trigger", () => {
    it("resolves every cell of the closed product to exactly one target", () => {
        const targets = new Set<CompileTarget>();
        for (const mechanism of LEAN_MECHANISMS)
            for (const trigger of MOTION_TRIGGERS) {
                const target = compileTarget(mechanism, trigger);
                expect(target).toBeTypeOf("string");
                targets.add(target);
            }
        expect(LEAN_MECHANISMS.length * MOTION_TRIGGERS.length).toBe(63);
        expect([...targets].sort()).toEqual([
            "compositor",
            "compositor-idle",
            "director-scalar",
            "director-spring",
        ]);
    });

    it("the boundary's own table, cell by cell", () => {
        for (const trigger of POSITION) {
            expect(compileTarget("reveal", trigger)).toBe("compositor");
            expect(compileTarget("draw", trigger)).toBe("compositor");
            expect(compileTarget("count", trigger)).toBe("director-scalar");
            expect(compileTarget("type", trigger)).toBe("director-scalar");
            expect(compileTarget("morph", trigger)).toBe("director-scalar");
        }
        for (const trigger of ["select", "hover", "active", "filter", "load"] as const)
            for (const mechanism of LEAN_MECHANISMS)
                // `breath` is the one MECHANISM-first arm: it resolves idle whatever the trigger,
                // because it reads neither a clock nor an edge (spec-motion :445).
                expect(compileTarget(mechanism, trigger)).toBe(
                    mechanism === "breath" ? "compositor-idle" : "director-spring",
                );
    });

    it("THE INVARIANT — no scroll/pin reveal or draw ever takes the director-spring path", () => {
        for (const trigger of POSITION)
            for (const mechanism of ["reveal", "draw", "path"] as const)
                expect(compileTarget(mechanism, trigger)).not.toBe("director-spring");
    });
});

describe("compileSegment — total over the sealed catalog", () => {
    it("compiles every preset × every trigger that preset declares", () => {
        let cells = 0;
        for (const use of PRESETS)
            for (const on of PRESET_TRIGGERS[use]) {
                const compiled = compileSegment(seg(use, on));
                expect(compiled.target).toBeTypeOf("string");
                cells++;
            }
        expect(cells).toBe(29); // the catalog's declared (preset, trigger) pairs (+2 CurvePersist, +1 Breath)
    });

    it("compiles every preset × EVERY trigger without throwing (totality past the declared set)", () => {
        for (const use of PRESETS)
            for (const on of MOTION_TRIGGERS)
                expect(() => compileSegment(seg(use, on))).not.toThrow();
    });

    it("a compositor segment carries data attributes and binds no director scalar", () => {
        const compiled = compileSegment(seg("DrawIn", "scroll"));
        expect(compiled).toEqual({ target: "compositor", dataAttrs: { "data-motion": "DrawIn" } });
        expect(compiled.directorBind).toBeUndefined();
    });

    it("a director segment binds its trigger and stamps no attribute", () => {
        const compiled = compileSegment(seg("SelectRing", "select"));
        expect(compiled).toEqual({ target: "director-spring", directorBind: "select" });
        expect(compiled.dataAttrs).toBeUndefined();
    });

    it("the stage jack: SeriesMorph on `pin` resolves to the cached scalar, never a spring", () => {
        expect(PRESET_TRIGGERS.SeriesMorph).toContain("pin");
        expect(compileSegment(seg("SeriesMorph", "pin"))).toEqual({
            target: "director-scalar",
            directorBind: "pin",
        });
    });
});
