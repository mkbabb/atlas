// tests/unit/oa15-beat-template.spec.ts — O-A15 ACCEPTANCE teeth at the pure-mechanism layer:
//   · resolveBeatTemplate — authored poles WIN, cadence fills the rest.
//   · the RESEED determinism — a route reseed drifts the MICRO-GRAIN but NOT the authored poles (E1).
//   · figureLadderScalar (Q-27) — index=0.5, value-scaled clamps, degenerate domain ⇒ 0.5 (no NaN).
//   · the center pole through resolveLayout (useBeatLayout) — the third pole resolves L/C/R + dock.
//   · SuperlativeRegister (Q-48) — the ceiling guard passes a ceiling verb, FAILS a forbidden one; opt-in.
import { describe, it, expect } from "vitest";
import {
    resolveBeatTemplate,
    resolveBeatTemplates,
    figureLadderScalar,
    type BeatVariationPolicy,
} from "../../src/story/beat-template";
import { resolveLayout } from "../../src/editorial/useBeatLayout";
import {
    SuperlativeRegister,
    isWithinCeiling,
    superlativeTone,
} from "../../src/story/superlative";

const stub = { name: "Stub" } as never;

const policy: BeatVariationPolicy = {
    id: "test-route",
    seed: 1234,
    beats: [
        { title: "left", signature: false },
        { title: "center", numbers: "bottom" }, // authored center + authored numbers
        { title: "left", signature: true }, // the ONE signature (left, so phase-3's cadence-right never clashes)
        {}, // unauthored → cadence (phase 3, odd ⇒ right)
    ],
};

describe("O-A15 · resolveBeatTemplate — authored poles win, cadence fills the rest", () => {
    it("an AUTHORED pole survives verbatim; the layout carries it", () => {
        const t = resolveBeatTemplate(policy, 0, 1234);
        expect(t.title).toBe("left");
        expect(t.reveal.layout?.title).toBe("left");
        expect(t.numbers).toBe("top"); // phase 0 cadence (even ⇒ top)
    });

    it("the CENTER pole resolves as authored", () => {
        const t = resolveBeatTemplate(policy, 1, 1234);
        expect(t.title).toBe("center");
        expect(t.numbers).toBe("bottom"); // authored override of the even-cadence top
    });

    it("an UNAUTHORED beat falls to the zebra cadence (phase 3, odd ⇒ right / bottom)", () => {
        const t = resolveBeatTemplate(policy, 3, 1234);
        expect(t.title).toBe("right");
        expect(t.numbers).toBe("bottom");
    });

    it("the signature flag reads through; the rest default false", () => {
        expect(resolveBeatTemplate(policy, 2, 1234).signature).toBe(true);
        expect(resolveBeatTemplate(policy, 0, 1234).signature).toBe(false);
    });
});

describe("O-A15 · the RESEED determinism (E1) — poles FIXED, micro-grain DRIFTS", () => {
    it("a reseed A/B keeps the authored poles byte-identical but drifts the grain", () => {
        const a = resolveBeatTemplates(policy, 1);
        const b = resolveBeatTemplates(policy, 999999);
        // poles fixed
        expect(a.map((r) => r.title)).toEqual(b.map((r) => r.title));
        expect(a.map((r) => r.numbers)).toEqual(b.map((r) => r.numbers));
        // grain drifts (at least one beat's delay jitter differs across the two seeds)
        const drift = a.some((r, i) => r.grain.delayFrac !== b[i]!.grain.delayFrac);
        expect(drift).toBe(true);
    });

    it("a byte-identical RELOAD (same seed) reproduces the grain exactly", () => {
        const a = resolveBeatTemplates(policy, 42);
        const b = resolveBeatTemplates(policy, 42);
        expect(a).toEqual(b);
    });
});

describe("O-A15 · figureLadderScalar (Q-27) — value-scaled sizing, total", () => {
    it("index ⇒ the neutral middle rung 0.5", () => {
        expect(figureLadderScalar({ kind: "index" })).toBe(0.5);
    });
    it("value-scaled maps + clamps into [0,1]", () => {
        expect(figureLadderScalar({ kind: "value-scaled", value: 5, domain: [0, 10] })).toBe(0.5);
        expect(figureLadderScalar({ kind: "value-scaled", value: -3, domain: [0, 10] })).toBe(0);
        expect(figureLadderScalar({ kind: "value-scaled", value: 99, domain: [0, 10] })).toBe(1);
    });
    it("a degenerate / NaN domain ⇒ 0.5 (never NaN)", () => {
        expect(figureLadderScalar({ kind: "value-scaled", value: 5, domain: [3, 3] })).toBe(0.5);
        expect(figureLadderScalar({ kind: "value-scaled", value: NaN, domain: [0, 1] })).toBe(0.5);
    });
});

describe("O-A15 · the CENTER third pole through resolveLayout (useBeatLayout)", () => {
    it("an explicit center title resolves L/C/R + docks right (the counterweight default)", () => {
        const layout = resolveLayout({ reveal: { layout: { title: "center" } }, viz: stub } as never, 0);
        expect(layout.title).toBe("center");
        expect(layout.dock).toBe("right");
    });
    it("the zebra still alternates L/R when unauthored (center is authored-only, never auto-picked)", () => {
        expect(resolveLayout({ viz: stub } as never, 0).title).toBe("left");
        expect(resolveLayout({ viz: stub } as never, 1).title).toBe("right");
    });
    it("aside retains inset/scrub intent without becoming a title-alignment alias", () => {
        const chapter = { reveal: { aside: true }, viz: stub } as never;
        expect(resolveLayout(chapter, 0).title).toBe("left");
        expect(resolveLayout(chapter, 1).title).toBe("right");
    });
});

describe("O-A15 · SuperlativeRegister (Q-48) — the never-incriminate ceiling guard", () => {
    it("a CEILING verb passes; a FORBIDDEN accusatory verb FAILS", () => {
        expect(isWithinCeiling("drew the most per student")).toBe(true);
        expect(isWithinCeiling("ranks 3rd of 1,150")).toBe(true);
        expect(isWithinCeiling("the district colluded with its consultant")).toBe(false);
        expect(isWithinCeiling("a FRAUD scheme")).toBe(false);
    });
    it("the register is frozen + tone defaults to the quiet register (never a loud crown)", () => {
        expect(Object.isFrozen(SuperlativeRegister)).toBe(true);
        expect(superlativeTone({ label: "sits far from peers" })).toBe("quiet");
        expect(superlativeTone({ label: "x", tone: "neutral" })).toBe("neutral");
    });
});

