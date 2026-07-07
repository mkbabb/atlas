// tests/unit/oa15-beat-template.spec.ts — O-A15 ACCEPTANCE teeth at the pure-mechanism layer:
//   · resolveBeatTemplate — authored poles WIN, cadence fills the rest; reveal FOLLOWS the pole;
//     the center pole rises vertically; the rule is authored ?? tier-rotated.
//   · the RESEED determinism — a route reseed drifts the MICRO-GRAIN but NOT the authored poles (E1).
//   · checkBeatConstraints (E2) — 0 consecutive shared poles · ≤2 C · exactly 1 signature (+ NEGs).
//   · figureLadderScalar (Q-27) — index=0.5, value-scaled clamps, degenerate domain ⇒ 0.5 (no NaN).
//   · expandStory zip — each MASTHEAD chapter carries its ResolvedBeatTemplate; a sentinel carries NONE.
//   · the center pole through resolveLayout (useBeatLayout) — the third pole resolves L/C/R + up + dock.
//   · SuperlativeRegister (Q-48) — the ceiling guard passes a ceiling verb, FAILS a forbidden one; opt-in.
//   · vizAlternates (Q-30) — the registry + the expand-menu binding + the catalog (facility only).
//   · rotateRuleVariant — restraint-first (`rule` dominant), tier-offset cadence.
import { describe, it, expect } from "vitest";
import {
    resolveBeatTemplate,
    resolveBeatTemplates,
    checkBeatConstraints,
    figureLadderScalar,
    type BeatVariationPolicy,
} from "@/story/beat-template";
import { expandStory, STORY_TEMPLATES } from "@/story/story-template";
import type { StoryChapter } from "@/story/story-contract";
import { resolveLayout } from "@/editorial/useBeatLayout";
import { rotateRuleVariant, RULE_VARIANTS } from "@/editorial/rule-register";
import {
    SuperlativeRegister,
    isWithinCeiling,
    superlativeTone,
} from "@/story/superlative";
import {
    VIZ_ALTERNATES,
    VIZ_ALTERNATE_CATALOG,
    alternatesFor,
    vizMenuOptions,
    useVizAlternates,
} from "@/story/viz-alternates";

const stub = { name: "Stub" } as never; // a non-sentinel viz / icon placeholder

const policy: BeatVariationPolicy = {
    id: "test-route",
    seed: 1234,
    beats: [
        { title: "left", signature: false, rule: "rule" },
        { title: "center", numbers: "bottom" }, // authored center + authored numbers
        { title: "left", signature: true }, // the ONE signature (left, so phase-3's cadence-right never clashes)
        {}, // unauthored → cadence (phase 3, odd ⇒ right)
    ],
};

describe("O-A15 · resolveBeatTemplate — authored poles win, cadence fills the rest", () => {
    it("an AUTHORED pole survives verbatim; the reveal FOLLOWS it (scrollIn mirrors the pole)", () => {
        const t = resolveBeatTemplate(policy, 0, 1234);
        expect(t.title).toBe("left");
        expect(t.reveal.layout?.title).toBe("left");
        expect(t.reveal.layout?.scrollIn).toBe("left");
        expect(t.numbers).toBe("top"); // phase 0 cadence (even ⇒ top)
        expect(t.rule).toBe("rule"); // authored
    });

    it("the CENTER pole rises vertically (scrollIn:'up') — no margin to slide from (Q-21)", () => {
        const t = resolveBeatTemplate(policy, 1, 1234);
        expect(t.title).toBe("center");
        expect(t.reveal.layout?.scrollIn).toBe("up");
        expect(t.numbers).toBe("bottom"); // authored override of the even-cadence top
    });

    it("an UNAUTHORED beat falls to the zebra cadence (phase 3, odd ⇒ right / bottom)", () => {
        const t = resolveBeatTemplate(policy, 3, 1234);
        expect(t.title).toBe("right");
        expect(t.numbers).toBe("bottom");
        expect(RULE_VARIANTS).toContain(t.rule); // tier-rotated, in the closed register
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
        expect(a.map((r) => r.rule)).toEqual(b.map((r) => r.rule));
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

describe("O-A15 · checkBeatConstraints (E2) — the resolved-tuple invariants", () => {
    it("the authored policy PASSES: 0 consecutive shared poles, ≤2 C, exactly 1 signature", () => {
        const report = checkBeatConstraints(resolveBeatTemplates(policy));
        expect(report).toEqual({
            consecutiveSharedPoles: 0,
            centerBeats: 1,
            signatureBeats: 1,
            ok: true,
        });
    });

    it("NEG — two adjacent beats sharing a pole TRIPS consecutiveSharedPoles", () => {
        const bad: BeatVariationPolicy = {
            id: "bad",
            beats: [{ title: "left", signature: true }, { title: "left" }],
        };
        const report = checkBeatConstraints(resolveBeatTemplates(bad));
        expect(report.consecutiveSharedPoles).toBe(1);
        expect(report.ok).toBe(false);
    });

    it("NEG — >2 center beats FAILS the ≤2-C ceiling; NEG — no/2 signatures FAILS the exactly-1", () => {
        const threeC: BeatVariationPolicy = {
            id: "3c",
            beats: [
                { title: "center", signature: true },
                { title: "left" },
                { title: "center" },
                { title: "right" },
                { title: "center" },
            ],
        };
        const r = checkBeatConstraints(resolveBeatTemplates(threeC));
        expect(r.centerBeats).toBe(3);
        expect(r.ok).toBe(false);

        const noSig: BeatVariationPolicy = { id: "0s", beats: [{ title: "left" }, { title: "right" }] };
        expect(checkBeatConstraints(resolveBeatTemplates(noSig)).signatureBeats).toBe(0);
        expect(checkBeatConstraints(resolveBeatTemplates(noSig)).ok).toBe(false);
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

describe("O-A15 · expandStory zips ResolvedBeatTemplate onto each masthead beat", () => {
    const variation: BeatVariationPolicy = {
        id: "essay",
        beats: [{ title: "left", signature: true }, { title: "center" }, { title: "right" }, {}],
    };
    const inst = {
        template: STORY_TEMPLATES["reveal-compare-drill-conclude"],
        fills: {
            cover: { icon: stub, eyebrow: "e", title: "Cover", dek: "d", viz: "hero" as const },
            reveal: { icon: stub, eyebrow: "e", title: "Reveal", dek: "d", viz: stub },
            compare: { icon: stub, eyebrow: "e", title: "Compare", dek: "d", viz: stub },
            drill: { icon: stub, eyebrow: "e", title: "Drill", dek: "d", viz: stub },
            conclude: { icon: stub, eyebrow: "e", title: "Conclude", dek: "d", viz: stub },
        },
        variation,
    };

    it("the 4 masthead beats carry a template; the hero SENTINEL carries none (phase-skipped)", () => {
        const { chapters } = expandStory(inst);
        const cover = chapters.find((c) => c.id === "cover")!;
        expect(cover.template).toBeUndefined(); // the sentinel consumes no phase
        const masthead = chapters.filter((c) => c.viz === stub) as StoryChapter[];
        expect(masthead).toHaveLength(4);
        expect(masthead.map((c) => c.template?.title)).toEqual(["left", "center", "right", "right"]);
        // the resolved reveal folded onto the chapter — resolveLayout produces the same pole
        expect(masthead.map((c) => c.template?.phase)).toEqual([0, 1, 2, 3]);
    });

    it("WITHOUT a variation policy no chapter carries a template (byte-identical un-varied route)", () => {
        const { variation: _drop, ...bare } = inst;
        const { chapters } = expandStory(bare);
        expect(chapters.every((c) => c.template === undefined)).toBe(true);
    });
});

describe("O-A15 · the CENTER third pole through resolveLayout (useBeatLayout)", () => {
    it("an explicit center title resolves L/C/R + rises + docks right (the counterweight default)", () => {
        const layout = resolveLayout({ reveal: { layout: { title: "center" } }, viz: stub } as never, 0);
        expect(layout.title).toBe("center");
        expect(layout.scrollIn).toBe("up");
        expect(layout.dock).toBe("right");
    });
    it("the zebra still alternates L/R when unauthored (center is authored-only, never auto-picked)", () => {
        expect(resolveLayout({ viz: stub } as never, 0).title).toBe("left");
        expect(resolveLayout({ viz: stub } as never, 1).title).toBe("right");
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

describe("O-A15 · vizAlternates (Q-30) — the registry + expand-menu binding + catalog (facility)", () => {
    it("the full brainstormed set is declared; ONE exemplar is built (facility+one-example)", () => {
        expect(VIZ_ALTERNATES.length).toBeGreaterThanOrEqual(7);
        expect(VIZ_ALTERNATES.filter((a) => a.built).map((a) => a.id)).toEqual(["dumbbell"]);
        expect(VIZ_ALTERNATES.every((a) => a.mobileCompat)).toBe(true); // the 390 compat tooth target
    });
    it("alternatesFor + vizMenuOptions — the base is the default option, alternates follow", () => {
        expect(alternatesFor("speedtest-hex").map((a) => a.id)).toEqual([
            "county-choropleth",
            "dot-density",
        ]);
        const opts = vizMenuOptions("speedtest-hex", "Hex map");
        expect(opts[0]).toMatchObject({ id: "speedtest-hex", isBase: true, label: "Hex map" });
        expect(opts).toHaveLength(3);
    });
    it("useVizAlternates — select swaps, an unknown id is a no-op, reset returns to base", () => {
        const m = useVizAlternates("usf-ranked-strip");
        expect(m.selected.value).toBe("usf-ranked-strip");
        expect(m.hasAlternates.value).toBe(true);
        m.select("dumbbell");
        expect(m.selected.value).toBe("dumbbell");
        m.select("not-a-viz");
        expect(m.selected.value).toBe("dumbbell"); // no-op
        m.reset();
        expect(m.selected.value).toBe("usf-ranked-strip");
    });
    it("the storybook CATALOG groups every base with alternates (the gallery data source)", () => {
        expect(VIZ_ALTERNATE_CATALOG.map((g) => g.base)).toContain("speedtest-hex");
        const hex = VIZ_ALTERNATE_CATALOG.find((g) => g.base === "speedtest-hex")!;
        expect(hex.options).toHaveLength(3);
    });
});

describe("O-A15 · rotateRuleVariant — restraint-first, tier-offset cadence", () => {
    it("`rule` dominates the register (restraint-first — most junctions stay static)", () => {
        const seq = Array.from({ length: 8 }, (_, i) => rotateRuleVariant("support", i));
        const rules = seq.filter((v) => v === "rule").length;
        expect(rules).toBeGreaterThanOrEqual(4); // ≥ half stay the static rule
        expect(seq.every((v) => (RULE_VARIANTS as readonly string[]).includes(v))).toBe(true);
    });
    it("the tier OFFSETS the cadence (lede vs ancillary escalate on different beats)", () => {
        const lede = Array.from({ length: 4 }, (_, i) => rotateRuleVariant("lede", i));
        const anc = Array.from({ length: 4 }, (_, i) => rotateRuleVariant("ancillary", i));
        expect(lede).not.toEqual(anc);
    });
});
