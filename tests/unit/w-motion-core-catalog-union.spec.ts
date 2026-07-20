// THE SEALED CATALOG, COMPLETED (W-MOTION-CORE · spec-motion §a.2). The two spec-C additions land
// here and nowhere else: preset `CurvePersist` (W-64) and preset `Breath` over the net-new
// compositor-idle mechanism `breath` (W-71). 14 → 16 presets; the trigger taxonomy is untouched.
//
// The ONE BREATH LAW (A-21 · β-gate F5) is asserted as an IDENTITY, not a coincidence: the preset's
// magnitude is read out of the atmosphere's clamp table, so a future re-tune of the ground moves the
// ornament with it and a second envelope cannot be authored without the census below going RED.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
    BREATH_ENVELOPE,
    K_CATALOG_NAMES,
    LEAN_CATALOG,
    LEAN_MECHANISMS,
    LEAN_METRICS,
    PRESET_TRIGGERS,
    type LeanPresetName,
} from "../../src/motion/lean-catalog";
import { compileSegment, compileTarget } from "../../src/motion/compileSegment";
import { MOTION_TRIGGERS } from "../../src/motion/triggers";
import { ATMOSPHERE_PRESETS } from "../../src/platform/chrome/background/composables/atmosphere";
import type { AnyMotionSegment } from "../../src/motion/motion-director";

const SRC = join(__dirname, "../../src");
const BREATH_CSS = readFileSync(join(SRC, "design/overlays/breath.css"), "utf8");
/** The register's RULES — the prose header stripped, so a citation in a comment proves nothing. */
const BREATH_RULES = BREATH_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const PRESETS = Object.keys(LEAN_CATALOG) as LeanPresetName[];
const seg = (use: LeanPresetName, on: AnyMotionSegment["on"]): AnyMotionSegment => ({
    id: `${use}-${on}`,
    use,
    target: { kind: "host" },
    on,
});

/** Every `.ts`/`.css` file under `src/` — the census surface for the one-constant-set proof. */
function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|css|vue)$/.test(entry)) out.push(p);
    }
    return out;
}

describe("the catalog union — exactly 16 over the completed mechanism set", () => {
    it("the preset union is the census 14 plus CurvePersist plus Breath", () => {
        expect(PRESETS).toEqual([
            "RevealUp",
            "RevealBlur",
            "RevealScale",
            "BarRise",
            "ClipWipe",
            "DrawIn",
            "CurvePersist",
            "Typewriter",
            "Scramble",
            "CountDial",
            "SeriesMorph",
            "SelectRing",
            "HoverRaise",
            "ActiveRim",
            "Reorder",
            "Breath",
        ]);
        expect(LEAN_METRICS.presetCount).toBe(16);
    });

    it("the mechanism roster gains `breath` and nothing else; `oscillate` stays cut", () => {
        expect(LEAN_MECHANISMS).toContain("breath");
        expect(LEAN_MECHANISMS).not.toContain("oscillate");
        expect(LEAN_METRICS.mechanismCount).toBe(9); // 8 live + the reserved `path`
        expect(new Set(Object.values(LEAN_CATALOG).map((p) => p.mechanism)).size).toBe(8);
    });

    it("the trigger taxonomy is untouched — the sealed six plus `pin`", () => {
        expect(MOTION_TRIGGERS).toHaveLength(7);
        for (const use of PRESETS)
            for (const on of PRESET_TRIGGERS[use]) expect(MOTION_TRIGGERS).toContain(on);
    });

    it("the PARKED ambient names do NOT ship as presets — they stay under ActiveRim's cover", () => {
        expect(PRESETS).not.toContain("MarkBreath" as LeanPresetName);
        expect(PRESETS).not.toContain("AmbientPulse" as LeanPresetName);
        expect(LEAN_CATALOG.ActiveRim.subsumes).toContain("MarkBreath");
        expect(LEAN_CATALOG.ActiveRim.subsumes).toContain("AmbientPulse");
        expect(LEAN_CATALOG.Breath.subsumes).toEqual([]);
    });

    it("the 57-name cover stays TOTAL and DISJOINT across the widened roster", () => {
        const all = Object.values(LEAN_CATALOG).flatMap((p) => p.subsumes);
        expect(all).toHaveLength(K_CATALOG_NAMES.length); // disjoint: no name claimed twice
        expect(new Set(all)).toEqual(new Set(K_CATALOG_NAMES)); // total
        expect(LEAN_METRICS.kNamesSubsumed).toBe(57);
    });
});

describe("the two additions compile where the spec says they do", () => {
    it("`breath` resolves to compositor-idle on EVERY trigger (mechanism-first, clock-free)", () => {
        for (const on of MOTION_TRIGGERS) expect(compileTarget("breath", on)).toBe("compositor-idle");
    });

    it("a Breath segment stamps its attribute and binds NO director scalar", () => {
        const compiled = compileSegment(seg("Breath", "load"));
        expect(compiled).toEqual({
            target: "compositor-idle",
            dataAttrs: { "data-motion": "Breath" },
        });
        expect(compiled.directorBind).toBeUndefined();
    });

    it("the director's trigger set loses one CONSULTED trigger, and it is exactly the cure", () => {
        // `useMotionDirector` now derives its active set from `compileSegment().directorBind` rather
        // than the raw `on` roster. The director consults that set only for the impulse springs and
        // the `load` one-shot, so a drop matters iff the trigger is one of those five. Exactly ONE
        // such drop exists — `Breath on: load` — and it IS the zero-idle-rAF cure: were the breath
        // counted, mounting an idle ornament would start the load clock and arm the rAF loop. Every
        // pre-existing declaration is untouched (its drops are all position triggers the set ignored).
        const CONSULTED = new Set(["select", "hover", "active", "filter", "load"]);
        const consultedDrops: string[] = [];
        for (const use of PRESETS)
            for (const on of PRESET_TRIGGERS[use])
                if (compileSegment(seg(use, on)).directorBind === undefined && CONSULTED.has(on))
                    consultedDrops.push(`${use}:${on}`);
        expect(consultedDrops).toEqual(["Breath:load"]);
    });

    it("CurvePersist is the W-64 pair in one preset: compositor trace + director-spring latch", () => {
        expect(PRESET_TRIGGERS.CurvePersist).toEqual(["scroll", "select"]);
        expect(compileSegment(seg("CurvePersist", "scroll")).target).toBe("compositor");
        expect(compileSegment(seg("CurvePersist", "select")).target).toBe("director-spring");
    });
});

describe("THE ONE BREATH LAW — one clamp set, two consumers", () => {
    it("the preset's magnitude DERIVES from the atmosphere clamp table, by identity", () => {
        const quiet = ATMOSPHERE_PRESETS.quiet.envelope;
        expect(BREATH_ENVELOPE.depth).toBe(quiet.breathDepthMax / 2);
        expect(BREATH_ENVELOPE.periodS).toBe(quiet.breathPeriodMin * 2);
        expect(LEAN_CATALOG.Breath.defaults.breathDepth).toBe(BREATH_ENVELOPE.depth);
        expect(LEAN_CATALOG.Breath.defaults.breathPeriodS).toBe(BREATH_ENVELOPE.periodS);
    });

    it("the ration holds on EVERY rung — the ornament never outbreathes any ground the table allows", () => {
        for (const preset of Object.values(ATMOSPHERE_PRESETS))
            expect(BREATH_ENVELOPE.depth).toBeLessThanOrEqual(preset.envelope.breathDepthMax / 2);
    });

    it("the CSS register's var() fallbacks carry the SAME derived pair (no drift)", () => {
        expect(BREATH_RULES).toContain(`var(--breath-depth, ${BREATH_ENVELOPE.depth})`);
        expect(BREATH_RULES).toContain(`var(--breath-period, ${BREATH_ENVELOPE.periodS}s)`);
    });

    it("NO SECOND clamp-constant set is authored anywhere in the tree", () => {
        const declares = walk(SRC).filter((f) => /breathDepthMax\s*:/.test(readFileSync(f, "utf8")));
        expect(declares).toHaveLength(1);
        expect(declares[0]).toMatch(/atmosphere\.ts$/);
    });

    it("PRM: the WHOLE register sits inside the no-preference fence, so `reduce` never attaches it", () => {
        const fence = BREATH_RULES.indexOf("@media (prefers-reduced-motion: no-preference)");
        expect(fence).toBeGreaterThan(-1);
        // Every rule and every keyframe block opens AFTER the fence — nothing escapes it.
        expect(BREATH_RULES.indexOf("@keyframes ornament-breath")).toBeGreaterThan(fence);
        expect(BREATH_RULES.indexOf('[data-motion="Breath"]')).toBeGreaterThan(fence);
        expect(BREATH_RULES.match(/@media/g)).toHaveLength(1); // one fence, no second media arm
        // …and the fence CLOSES only at the end: no rule follows it at file scope.
        expect(BREATH_RULES.trimEnd().endsWith("}")).toBe(true);
    });

    it("the substrate-guard holds: no per-component PRM gate, no allow-motion attribute", () => {
        expect(BREATH_RULES).not.toMatch(/data-allow-motion/);
        expect(BREATH_RULES).not.toMatch(/prefers-reduced-motion:\s*reduce/);
    });
});
