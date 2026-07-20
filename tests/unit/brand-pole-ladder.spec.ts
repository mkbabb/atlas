// W-ATMOS — the A-25 BRAND POLE LADDER + the CD-17 aurora-down half.
//
// Every assertion binds to the SHIPPED artefact: `brandTheme`/`brandPoleRung` are imported and
// CALLED (never a re-listed precedence table), and the ceiling laws read `ATMOSPHERE_PRESETS`
// itself. Mutating either source flips these red — which is the whole point of a test.

import { describe, expect, it } from "vitest";
import {
    brandPoleRung,
    brandTheme,
    SKINS,
    type BrandFieldSource,
} from "../../src/skin/index.js";
import {
    ATMOSPHERE_PRESETS,
    selectAtmosphere,
} from "../../src/platform/chrome/background/composables/atmosphere.js";

/** The roster the home actually wears — the shipped card accents, in gallery order. */
const ROSTER = ["var(--viz-diverging-low)", "var(--rainbow-signature-1)", "var(--viz-speedtest-bright)"];

/** Resolve a brand source the way `Aurora.vue` does: build the theme, run the EXTANT ladder. */
function resolveThroughLadder(source: BrandFieldSource) {
    return selectAtmosphere(brandTheme(source)?.atmosphere, brandTheme(source)?.chrome);
}

describe("A-25 · the brand pole ladder", () => {
    it("takes its rungs in the declared order — poles, then category, then roster", () => {
        const full: BrandFieldSource = {
            poles: { warm: "var(--a)", cool: "var(--b)" },
            categoryAccent: "var(--c)",
            roster: ROSTER,
        };
        expect(brandPoleRung(full)).toBe("declared");
        expect(brandPoleRung({ categoryAccent: "var(--c)", roster: ROSTER })).toBe("category");
        expect(brandPoleRung({ roster: ROSTER })).toBe("roster");
    });

    it("reaches NEUTRAL only as the LAST rung — the null-wash trap's cure", () => {
        // Nothing offered ⇒ no theme at all ⇒ the extant ladder's own neutral floor.
        expect(brandPoleRung({})).toBe("neutral");
        expect(brandTheme({})).toBeUndefined();
        expect(resolveThroughLadder({}).rung).toBe("neutral");

        // And every richer rung is NOT neutral — this is the assertion that fails at the pre-wave
        // tree, where a `/c/*` surface passed no theme and the field resolved to `--viz-no-data`.
        for (const skin of Object.values(SKINS)) {
            const sel = resolveThroughLadder({ categoryAccent: skin.accent });
            expect(sel.rung).not.toBe("neutral");
            expect(sel.warmExpr).toContain(skin.accent);
        }
        expect(resolveThroughLadder({ roster: ROSTER }).rung).not.toBe("neutral");
    });

    it("gives every category surface a DIRECTIONAL field, never a flat one-hue wash", () => {
        for (const skin of Object.values(SKINS)) {
            const sel = resolveThroughLadder({ categoryAccent: skin.accent });
            expect(sel.warmExpr).not.toBe(sel.coolExpr);
            expect(sel.biasCap).toBeGreaterThan(0);
        }
    });

    it("mints no pigment — every resolved pole is a token expr, at every rung", () => {
        const sources: BrandFieldSource[] = [
            { poles: { warm: "var(--viz-diverging-low)", cool: "var(--viz-diverging-high)" } },
            { categoryAccent: SKINS.connectivity.accent },
            { roster: ROSTER },
        ];
        for (const source of sources) {
            const sel = resolveThroughLadder(source);
            for (const expr of [sel.warmExpr, sel.coolExpr]) expect(expr).toMatch(/var\(--/);
        }
    });

    it("spans the roster end to end — the home's poles are its first and last card", () => {
        const sel = resolveThroughLadder({ roster: ROSTER });
        expect(sel.warmExpr).toBe(ROSTER[0]);
        expect(sel.coolExpr).toBe(ROSTER[ROSTER.length - 1]);
    });

    it("carries the declared intensity through to the preset key", () => {
        expect(resolveThroughLadder({ roster: ROSTER, intensity: "hero" }).intensity).toBe("hero");
        expect(
            resolveThroughLadder({ categoryAccent: SKINS.outcomes.accent, intensity: "quiet" })
                .intensity,
        ).toBe("quiet");
    });
});

describe("CD-17 · the aurora-down half", () => {
    // The ruling: "the aurora-down half lands; the grain is NOT raised". The pre-wave tree
    // composited EVERY route at one pair — 0.30 light / 0.36 dark. The honest aurora-down is that
    // the rung six of seven routes wear now sits BELOW that pair, on both stocks.
    const SHIPPED_BEFORE = { light: 0.3, dark: 0.36 };

    it("dims the rung an undeclared route wears, on both stocks", () => {
        const { opacityCeiling } = ATMOSPHERE_PRESETS.data;
        expect(opacityCeiling.light).toBeLessThan(SHIPPED_BEFORE.light);
        expect(opacityCeiling.dark).toBeLessThan(SHIPPED_BEFORE.dark);
    });

    it("dims quiet below data below hero — the un-strangle survives the dim", () => {
        const [q, d, h] = (["quiet", "data", "hero"] as const).map(
            (k) => ATMOSPHERE_PRESETS[k].opacityCeiling,
        );
        expect(q.light).toBeLessThan(d.light);
        expect(d.light).toBeLessThan(h.light);
        expect(q.dark).toBeLessThan(d.dark);
        expect(d.dark).toBeLessThan(h.dark);
    });

    it("keeps quiet below the shipped pair too — the quiet rung is the deepest recession", () => {
        const { opacityCeiling } = ATMOSPHERE_PRESETS.quiet;
        expect(opacityCeiling.light).toBeLessThan(SHIPPED_BEFORE.light);
        expect(opacityCeiling.dark).toBeLessThan(SHIPPED_BEFORE.dark);
    });

    it("holds the dock plate at or above its guard as the ceiling dims (the d.3 pair law)", () => {
        // The pair moves in lockstep in ONE direction only: a ceiling may not rise past the plate
        // that guards its bleed. A DIMMER ceiling under the same plate is strictly safer, so the
        // law is an inequality, and it is the ceiling ORDER that must track the dock order.
        for (const key of ["quiet", "data", "hero"] as const) {
            const preset = ATMOSPHERE_PRESETS[key];
            expect(preset.dockOpacity).toBeGreaterThanOrEqual(0.9);
            expect(preset.opacityCeiling.dark).toBeLessThan(preset.dockOpacity);
        }
        expect(ATMOSPHERE_PRESETS.hero.dockOpacity).toBeGreaterThanOrEqual(
            ATMOSPHERE_PRESETS.data.dockOpacity,
        );
    });

    it("raises NO grain — the dial-gated half did not ship", () => {
        // The ratification: "the grain is NOT raised — re-judged by eye after the wash dims". The
        // live mounts are 0.025 light / 0.03 dark (Atmosphere.vue); no preset may exceed them, and
        // no surface reads the column at all until the dial lands.
        for (const key of ["quiet", "data", "hero"] as const) {
            expect(ATMOSPHERE_PRESETS[key].grain).toBeLessThanOrEqual(0.03);
        }
    });
});
