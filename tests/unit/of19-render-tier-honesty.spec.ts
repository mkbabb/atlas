// tests/unit/of19-render-tier-honesty.spec.ts — O-F19 (G-N5b): render-tier honesty teeth.
//
// The inert webgl/canvas-large/progressive advisory ladder described a transport nothing uses —
// PRUNED at src/charts/scale/render-tier.ts. This spec is the ACCEPTANCE-named pure unit test of
// the ONE real boundary (SVG ≤~1000 marks → canvas) — real corpus-adjacent inputs, NOT a
// synthetic-data sentinel (`tierForMarkCount(1e6) === "webgl"` stays BANNED: `webgl` no longer
// exists as a value at all) — plus a source-scan assert that no live plate reads the pruned
// fields (the L22 SPEC-THEATER class).
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
    tierForMarkCount,
    renderPolicyForCount,
    RENDER_TIER_SVG_CEIL,
    type RenderTier,
} from "@/charts/scale/render-tier";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC_DIR = resolve(ROOT, "src");

/** Every .ts/.vue file under src/, recursive — the whole library tree the L22 SPEC-THEATER
    sweep must clear. */
function liveSourceFiles(): string[] {
    return readdirSync(SRC_DIR, { recursive: true, encoding: "utf8" })
        .filter((f) => f.endsWith(".ts") || f.endsWith(".vue"))
        .map((f) => resolve(SRC_DIR, f));
}

describe("O-F19 1 — tierForMarkCount: the ONE real SVG↔canvas boundary", () => {
    it("returns svg at and below the ceil, canvas above it — the exact boundary, not a range guess", () => {
        expect(tierForMarkCount(0)).toBe("svg");
        expect(tierForMarkCount(RENDER_TIER_SVG_CEIL)).toBe("svg");
        expect(tierForMarkCount(RENDER_TIER_SVG_CEIL + 1)).toBe("canvas");
    });

    it("resolves the LIVE corpus correctly: every geo figure (~300 marks) is svg; the densest live frame (the /sci all-year scatter, 3243 marks) is canvas", () => {
        expect(tierForMarkCount(300)).toBe("svg");
        expect(tierForMarkCount(3243)).toBe("canvas");
    });

    it("the return type is closed to svg|canvas — no third tier value is constructible (a type-level assert, not a runtime one)", () => {
        const tiers: RenderTier[] = ["svg", "canvas"];
        for (const t of tiers) {
            expect(["svg", "canvas"]).toContain(t);
        }
    });
});

describe("O-F19 2 — renderPolicyForCount: the pruned VizRenderPolicy shape", () => {
    it("returns ONLY markCount + tier — no large/largeThreshold/progressive keys survive", () => {
        const policy = renderPolicyForCount(3243);
        expect(policy).toEqual({ markCount: 3243, tier: "canvas" });
        expect(Object.keys(policy).sort()).toEqual(["markCount", "tier"]);
    });
});

describe("O-F19 3 — no live consumer reads the pruned symbols (the source-scan assert)", () => {
    const RENDER_TIER_SRC = read("../../src/charts/scale/render-tier.ts");

    // The CODE region only — from the first export onward. The file's header comment narrates the
    // O-F19 prune in backticks ON PURPOSE (a history note is exactly what "reduced to a typed
    // stub-comment" sanctions); scanning past it is what makes this a LIVE-code assert, not a
    // prose-collision trap.
    const CODE_ONLY = RENDER_TIER_SRC.slice(RENDER_TIER_SRC.indexOf("export type RenderTier"));

    it("the header comment is the ONLY place the pruned terms survive — the code region names none of them", () => {
        expect(CODE_ONLY).not.toMatch(/canvas-large/);
        expect(CODE_ONLY).not.toMatch(/webgl/);
        expect(CODE_ONLY).not.toMatch(/progressive/);
        expect(CODE_ONLY).not.toMatch(/largeThreshold/);
        expect(CODE_ONLY).not.toMatch(/RENDER_LARGE_THRESHOLD/);
        expect(CODE_ONLY).not.toMatch(/RENDER_TIER_CANVAS_CEIL/);
        expect(CODE_ONLY).not.toMatch(/RENDER_TIER_CANVAS_LARGE_CEIL/);
    });

    it("RenderTier is closed to exactly svg|canvas and VizRenderPolicy carries exactly markCount+tier (the pruned fields don't survive as optional either)", () => {
        expect(CODE_ONLY).toMatch(/export type RenderTier = "svg" \| "canvas";/);
        const ifaceStart = CODE_ONLY.indexOf("export interface VizRenderPolicy {");
        const iface = CODE_ONLY.slice(ifaceStart, CODE_ONLY.indexOf("}", ifaceStart));
        expect(iface).toMatch(/markCount:\s*number;/);
        expect(iface).toMatch(/tier:\s*RenderTier;/);
        expect(iface).not.toMatch(/large/);
        expect(iface).not.toMatch(/progressive/);
    });

    // Distinctive, non-colliding identifiers (never bare "webgl" — Aurora's OWN unrelated
    // `renderMode` union legitimately carries that string elsewhere in the library).
    const DEAD_IDENTIFIERS = [
        /"canvas-large"/,
        /\blargeThreshold\b/,
        /\bRENDER_LARGE_THRESHOLD\b/,
        /\bRENDER_TIER_CANVAS_CEIL\b/,
        /\bRENDER_TIER_CANVAS_LARGE_CEIL\b/,
    ];

    it("no other file under src/ (a live plate) references the pruned symbols — the whole library tree, walked", () => {
        const offenders = liveSourceFiles()
            .filter((path) => !path.endsWith("charts/scale/render-tier.ts"))
            .filter((path) => {
                const text = readFileSync(path, "utf8");
                return DEAD_IDENTIFIERS.some((pattern) => pattern.test(text));
            });
        expect(offenders, `pruned symbols still referenced in: ${offenders.join(", ")}`).toEqual(
            [],
        );
    });
});
