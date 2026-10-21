import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
    ATMOSPHERE_PRESETS,
    atmosphereCssVars,
    DEFAULT_INTENSITY,
    selectAtmosphere,
} from "../../src/platform/chrome/background/composables/atmosphere";
import { versalRegisters } from "../../src/story/manifest";
import type { ManifestChapter } from "../../src/story/manifest";
import { AMERICA, EARTHTONE } from "../../src/contract/theme";

// W-ATMOS — the RENDER half. Every assertion here reads a SHIPPED artefact: the `:root` sheet is
// parsed off `elevation.css` on disk (never a transcription of it), the ladder is read off
// `ATMOSPHERE_PRESETS`, and the occasional law is run through the exported `versalRegisters`. Edit
// the sheet or the table and these fail; edit only this file and nothing is proven.

const ELEVATION_CSS = readFileSync(
    fileURLToPath(new URL("../../src/design/tokens/elevation.css", import.meta.url)),
    "utf8",
);

/** The value the SHIPPED sheet declares for a token at `:root`, comments stripped. */
function shipped(token: string): string {
    const bare = ELEVATION_CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    const hit = new RegExp(`${token}\\s*:\\s*([^;]+);`).exec(bare);
    if (!hit) throw new Error(`${token} is not declared in elevation.css`);
    return hit[1].trim();
}

/** Resolve an `--attn-*` reference (or a bare number) to its shipped scalar. */
function rung(expr: string): number {
    const ref = /^var\((--[\w-]+)\)$/.exec(expr);
    return ref ? Number(shipped(ref[1])) : Number(expr);
}

describe("the versal rung (acceptance #1 — `--attn-versal` was grep 0 at the pin)", () => {
    it("is minted, and sits strictly between ④ chrome and ⑤ atmosphere", () => {
        const versal = Number(shipped("--attn-versal"));
        expect(versal).toBe(0.16);
        expect(versal).toBeGreaterThan(Number(shipped("--attn-atmosphere")));
        expect(versal).toBeLessThan(Number(shipped("--attn-chrome")));
    });

    it("keeps the INVERSION LAW — the watermark never out-weighs the eyebrow it echoes", () => {
        expect(Number(shipped("--attn-versal"))).toBeLessThan(
            Number(shipped("--attn-chrome")),
        );
    });

    it("pins `--versal-ink`'s :root default to the table's DEFAULT rung", () => {
        // The one place the sheet and the table could silently disagree: an undeclared route reads
        // the `:root` value, a declared one reads `atmosphereCssVars`. They must name one rung.
        expect(shipped("--versal-ink")).toBe(
            ATMOSPHERE_PRESETS[DEFAULT_INTENSITY].versalInk,
        );
    });
});

describe("the recession ladder (the preset's versal ink)", () => {
    it("resolves each rung against the shipped sheet", () => {
        const quiet = rung(ATMOSPHERE_PRESETS.quiet.versalInk);
        const data = rung(ATMOSPHERE_PRESETS.data.versalInk);
        const hero = rung(ATMOSPHERE_PRESETS.hero.versalInk);
        expect(quiet).toBeLessThan(data);
        expect(hero).toBe(data);
        // the quiet rung IS the pre-wave uniform ink — the fallback the ruling keeps
        expect(quiet).toBe(Number(shipped("--attn-atmosphere")));
    });

    it("keeps NO preset above the eyebrow — acceptance #1 pins every lead to 0.16", () => {
        // the ③ legend rung is reachable by DECLARATION only; a loudness preset may not buy it,
        // or a route's own section lead would out-weigh the numeral it echoes (the INVERSION LAW).
        const eyebrow = Number(shipped("--attn-chrome"));
        for (const preset of Object.values(ATMOSPHERE_PRESETS)) {
            expect(rung(preset.versalInk)).toBeLessThan(eyebrow);
        }
        expect(rung(ATMOSPHERE_PRESETS.hero.versalInk)).toBe(
            Number(shipped("--attn-versal")),
        );
    });
});

describe("the atmosphere render half (d.3 — the dock half retired at the glass 10.1 adopt)", () => {
    it("publishes the intensity's render config and no dead dock-opacity write", () => {
        // `--glass-opacity-dock` has no reader at glass 10.1.0 (glass 8 deleted the opacity alphas).
        expect(atmosphereCssVars("hero")).toEqual({
            "--versal-ink": ATMOSPHERE_PRESETS.hero.versalInk,
        });
        expect(atmosphereCssVars()).toEqual(atmosphereCssVars(DEFAULT_INTENSITY));
    });

    it("orders the ceilings by intensity", () => {
        const order = ["quiet", "data", "hero"] as const;
        for (let i = 1; i < order.length; i++) {
            const lo = ATMOSPHERE_PRESETS[order[i - 1]];
            const hi = ATMOSPHERE_PRESETS[order[i]];
            expect(hi.opacityCeiling.light).toBeGreaterThan(lo.opacityCeiling.light);
        }
    });

    it("leaves the CD-17 grain column INERT — no surface reads it (dial-gated)", () => {
        for (const preset of Object.values(ATMOSPHERE_PRESETS)) {
            expect(Object.keys(atmosphereCssVars())).not.toContain(
                "--paper-grain-opacity",
            );
            expect(preset.grain).toBeTypeOf("number");
        }
    });
});

describe("the chroma hero (W-70 arm a)", () => {
    it("spends chroma budget on `hero` ALONE — the recessive floor holds elsewhere", () => {
        expect(ATMOSPHERE_PRESETS.quiet.saturation).toBe(0.92);
        expect(ATMOSPHERE_PRESETS.data.saturation).toBe(0.92);
        expect(ATMOSPHERE_PRESETS.hero.saturation).toBeGreaterThan(0.92);
    });
});

// ── the occasional law ────────────────────────────────────────────────────────────────────────

function chapter(
    id: string,
    over: Partial<ManifestChapter> = {},
): ManifestChapter {
    return {
        id,
        eyebrow: id,
        title: id,
        dek: "",
        viz: {} as ManifestChapter["viz"],
        icon: (() => null) as ManifestChapter["icon"],
        ...over,
    } as ManifestChapter;
}

/** A flat corridor in the shipped shape: cover · N plate beats · colophon. */
function corridor(n: number): ManifestChapter[] {
    return [
        chapter("cover", { viz: "hero", isBeat: false }),
        ...Array.from({ length: n }, (_, i) => chapter(`beat-${i}`)),
        chapter("about", { viz: "colophon", isBeat: false }),
    ];
}

describe("the versal is off by default (U/B7 · PLAN §5.8: FigureInitial off unless declared)", () => {
    it("mounts no versal in an undeclared corridor, whatever its beat count", () => {
        for (const n of [1, 5, 8]) {
            expect(versalRegisters(corridor(n)).every((r) => r === "off")).toBe(true);
        }
    });

    it("never mounts one on a sentinel, even when declared", () => {
        const regs = versalRegisters([
            chapter("cover", { viz: "hero", isBeat: false, versal: "route" }),
            chapter("lead", { versal: "route" }),
        ]);
        expect(regs).toEqual(["off", "route"]);
    });

    it("mounts exactly what a route declares", () => {
        const declared = [
            chapter("lead", { versal: "route" }),
            chapter("key", { versal: "legend" }),
            chapter("rest"),
        ];
        expect(versalRegisters(declared)).toEqual(["route", "legend", "off"]);
    });
});

describe("the huePath seat (sci's spectral sweep, restored)", () => {
    it("rides the ladder through to the resolved deposition", () => {
        const sel = selectAtmosphere(
            { ...AMERICA.atmosphere, huePath: "increasing" },
            AMERICA.chrome,
        );
        expect(sel.deposition.huePath).toBe("increasing");
    });

    it("is CHARACTER, not loudness — the envelope never clamps it away", () => {
        const hero = selectAtmosphere(
            { ...EARTHTONE.atmosphere, huePath: "decreasing" },
            EARTHTONE.chrome,
        );
        expect(hero.deposition.huePath).toBe("decreasing");
        // and an undeclared arc stays undeclared (the OKLab-rectangular blend)
        expect(
            selectAtmosphere(AMERICA.atmosphere, AMERICA.chrome).deposition.huePath,
        ).toBeUndefined();
    });
});
