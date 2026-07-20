// THE W-50 UN-JACK GATE, at the type level (W-MOTION-CORE · spec-motion §c). The pass-2 gate tried to
// detect "scenes that differ only by a scalar-scrub apply" — undecidable from an opaque `SceneStep.state`,
// and it could not fire on its own target (the /sci map carries no `encode` to compare). The repair
// re-keys it on the surface the author already declared: `ChapterStage` (encode-bearing) is pin-eligible,
// `ChapterScene` (a scalar walk via `apply`) is not.
//
// The `@ts-expect-error` lines below ARE the gate: `npm run typecheck` covers `tests/**/*.ts`, and an
// expect-error whose error does NOT occur is itself a `tsc` failure. So a mis-declaration that started
// compiling would turn this file RED.
import { describe, expect, it } from "vitest";
import { MOTION_TRIGGERS, type MotionTrigger } from "../../src/motion/triggers";
import type { MotionDeclaration } from "../../src/motion/motion-director";
import type {
    ChapterScene,
    ChapterStage,
} from "../../src/charts/contract/scene-contract";

const marks = { kind: "marks", within: ".mark" } as const;

/** A `ChapterStage` MAY take the jack — its `SceneOption`s carry distinct `encode` triples. */
const stageMotion: MotionDeclaration<ChapterStage> = {
    segments: [{ id: "scene-morph", use: "SeriesMorph", target: marks, on: "pin" }],
};

/** A `ChapterScene` may NOT — the year-walk must use a direct control, not a held viewport. */
const sceneMotion: MotionDeclaration<ChapterScene> = {
    segments: [
        // @ts-expect-error — W-50: `pin` is ChapterStage-only; a ChapterScene is not pin-eligible by TYPE.
        { id: "year-walk", use: "SeriesMorph", target: marks, on: "pin" },
    ],
};

/** A plain plate (the omitted-surface default) is likewise not pin-eligible. */
const plateMotion: MotionDeclaration = {
    segments: [
        // @ts-expect-error — W-50: only a `ChapterStage` declaration may name the `pin` trigger.
        { id: "plate-jack", use: "SeriesMorph", target: marks, on: "pin" },
    ],
};

/** The sealed six remain declarable on every surface — the gate narrows `pin` and nothing else. */
const sceneScroll: MotionDeclaration<ChapterScene> = {
    segments: [{ id: "fill", use: "BarRise", target: marks, on: "scroll" }],
};

describe("the W-50 type-keyed pin gate", () => {
    it("the trigger roster is the sealed six plus pin", () => {
        expect(MOTION_TRIGGERS).toEqual([
            "scroll",
            "select",
            "hover",
            "active",
            "filter",
            "load",
            "pin",
        ]);
        expect(new Set<MotionTrigger>(MOTION_TRIGGERS).size).toBe(7);
    });

    it("a stage declares the jack; a scene and a plate do not (the declarations above are the proof)", () => {
        expect(stageMotion.segments[0]!.on).toBe("pin");
        expect(sceneScroll.segments[0]!.on).toBe("scroll");
        // The scene/plate declarations only compile behind an `@ts-expect-error`; they are held here so
        // the gate has a live witness rather than a comment.
        expect(sceneMotion.segments).toHaveLength(1);
        expect(plateMotion.segments).toHaveLength(1);
    });
});
