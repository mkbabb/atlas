// THE A-21 BREATH RATION, at the type level (W-MOTION-CORE · OPTIONS §4.3 — "breath is earned, not
// ambient"). Idle animation is the one verb that competes with data for attention without being asked
// to, so the seat is narrowed to fields the author already declared: a route's `ornament` components
// and its one `signature` beat's mark. Never free-per-beat, never prose, never a numeral.
//
// The `@ts-expect-error` lines below ARE the ration: `npm run typecheck` covers `tests/**/*.ts`, and an
// expect-error whose error does NOT occur is itself a `tsc` failure. A mis-declaration that started
// compiling would turn this file RED — the gate is enforced by the compiler, not by review.
import { describe, expect, it } from "vitest";
import { LEAN_CATALOG, PRESET_TRIGGERS } from "../../src/motion/lean-catalog";
import type { MotionDeclaration } from "../../src/motion/motion-director";
import type { ChapterStage } from "../../src/charts/contract/scene-contract";

const host = { kind: "host" } as const;

/** THE TWO EARNED SEATS — a declared ornament, and the one signature beat's mark. */
const ornamentMotion: MotionDeclaration<{ kind: "ornament" }> = {
    segments: [{ id: "fleuron-idle", use: "Breath", target: host, on: "load" }],
};
const signatureMotion: MotionDeclaration<{ kind: "signature" }> = {
    segments: [{ id: "signature-idle", use: "Breath", target: host, on: "load" }],
};

/** PROSE is not a breath seat — the ration's first named exclusion. */
const proseMotion: MotionDeclaration<{ kind: "prose" }> = {
    segments: [
        // @ts-expect-error — A-21: `Breath` binds to an ornament or the signature mark, never prose.
        { id: "prose-idle", use: "Breath", target: host, on: "load" },
    ],
};

/** A NUMERAL is not a breath seat either — a drifting figure is unreadable AND unearned. */
const numeralMotion: MotionDeclaration<{ kind: "numeral" }> = {
    segments: [
        // @ts-expect-error — A-21: a numeral never breathes (the ration's second named exclusion).
        { id: "numeral-idle", use: "Breath", target: host, on: "load" },
    ],
};

/** A PLAIN PLATE (the omitted-surface default) cannot make itself ambient — "never free-per-beat". */
const plateMotion: MotionDeclaration = {
    segments: [
        // @ts-expect-error — A-21: idle is EARNED; a plate cannot declare it for itself.
        { id: "plate-idle", use: "Breath", target: host, on: "load" },
    ],
};

/** Nor may the earned JACK surface breathe — pin-eligibility grants no idle (the gates are disjoint). */
const stageMotion: MotionDeclaration<ChapterStage> = {
    segments: [
        // @ts-expect-error — A-21: a ChapterStage is pin-eligible, NOT breath-eligible.
        { id: "stage-idle", use: "Breath", target: host, on: "load" },
    ],
};

/** The ration narrows `Breath` and NOTHING else — every other preset stays declarable everywhere. */
const proseReveal: MotionDeclaration<{ kind: "prose" }> = {
    segments: [{ id: "prose-in", use: "RevealUp", target: host, on: "scroll" }],
};

describe("the A-21 breath ration", () => {
    it("the earned seats declare the idle; prose, numerals, plates and stages do not", () => {
        expect(ornamentMotion.segments[0]!.use).toBe("Breath");
        expect(signatureMotion.segments[0]!.use).toBe("Breath");
        expect(proseReveal.segments[0]!.use).toBe("RevealUp");
        // The four refused declarations compile only behind an `@ts-expect-error`; they are held here
        // so the ration has a live witness rather than a comment.
        for (const decl of [proseMotion, numeralMotion, plateMotion, stageMotion])
            expect(decl.segments).toHaveLength(1);
    });

    it("`Breath` is the ONLY rationed preset — the mechanism it rides is its own", () => {
        expect(LEAN_CATALOG.Breath.mechanism).toBe("breath");
        expect(
            Object.values(LEAN_CATALOG).filter((p) => p.mechanism === "breath"),
        ).toHaveLength(1);
        // The mount edge is the whole trigger story: a breath reads no clock and no impulse.
        expect(PRESET_TRIGGERS.Breath).toEqual(["load"]);
    });
});
