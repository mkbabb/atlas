// tests/unit/oa14-icon-tier-supply.spec.ts — O-A14 ACCEPTANCE teeth: the `icon` LOD bake tier flips
// the A12 degrade (a ≤18px mark now resolves the true `icon` geometry, not the `coarse` floor), and
// the school-point supply resolves (the C1 point-in-district dot seats from `school-points.json`).
// Node-env pure specs reading the LIVE resolver + the BAKED assets (the additive-lazy tiers loaded
// through the same memo the runtime rides) — the visual A/B captures are the evidence pack; this
// asserts the DATA the render binds is exact + self-gating.
import { describe, it, expect } from "vitest";
import { resolveEntityIcon, tierForSize } from "@/charts/glyph/resolveEntityIcon";
import { loadGlyphRegistry } from "@/data/entityGeometry";
import {
    loadSchoolPoints,
    schoolPoint,
    districtOf,
    schoolPointSeed,
} from "@/data/schoolPoints";

// ── The icon-tier resolution (the A12 degrade flip — icon-facility §2.4 · §3.1) ──────────────────
describe("the `icon` bake tier — the A12 coarse-floor degrade flips", () => {
    it("a ≤18px district resolves the ICON tier (a DISTINCT, coarser geometry than the coarse band)", async () => {
        // `icon` is additive-LAZY (off the eager floor) — warm the memo, exactly as the runtime does.
        await loadGlyphRegistry("district", "icon");

        // The px path: ≤18 → the icon tier; 24 → the coarse tier (the former icon FLOOR). A known LEA.
        const icon = resolveEntityIcon("100", "district", { size: 16 });
        const coarse = resolveEntityIcon("100", "district", { size: 24 });

        expect(icon.mark).toBe("glyph");
        expect(coarse.mark).toBe("glyph");
        if (icon.mark === "glyph" && coarse.mark === "glyph") {
            expect(icon.geom.id).toBe(coarse.geom.id); // the SAME district…
            expect(icon.geom.d).not.toBe(coarse.geom.d); // …but a DISTINCT tier (the degrade flipped)
            expect(icon.geom.d.length).toBeGreaterThan(0); // a real pebble, never the void-ring
        }
    });

    it("the icon tier is COARSER than coarse registry-wide (fewer vertices — the clean-pebble reduction)", async () => {
        const iconReg = await loadGlyphRegistry("district", "icon");
        const coarseReg = await loadGlyphRegistry("district", "coarse");
        const verts = (reg: Record<string, { d: string }>) =>
            Object.values(reg).reduce((s, e) => s + (e.d.match(/[ML]/g)?.length ?? 0), 0);
        // the whole icon registry carries fewer path vertices than coarse — the LOD reduction is real.
        expect(verts(iconReg)).toBeLessThan(verts(coarseReg));
    });

    it("the four Class-A grains each bake an `icon` tier with well-formed entries", async () => {
        for (const grain of ["state", "county", "district", "charter"] as const) {
            const reg = await loadGlyphRegistry(grain, "icon");
            const entries = Object.values(reg) as { d: string; viewBox: string; aspect: number }[];
            expect(entries.length).toBeGreaterThan(0);
            const e = entries[0];
            expect(e.d.length).toBeGreaterThan(0);
            expect(e.viewBox).toMatch(/^0 0 [\d.]+ [\d.]+$/);
            expect(Number.isFinite(e.aspect)).toBe(true);
        }
    });

    it("`tierForSize` routes px → tier directly (icon/coarse/med/fine), names pass through", () => {
        expect(tierForSize(16)).toBe("icon"); // the flipped band (was → 'sm'/coarse)
        expect(tierForSize(24)).toBe("coarse");
        expect(tierForSize(48)).toBe("med");
        expect(tierForSize(120)).toBe("fine");
        expect(tierForSize("md")).toBe("md"); // a named rung passes through unchanged
    });
});

// ── The school-point supply (the C1 point-in-district dot — icon-facility §1 C1 · §3.1-2) ────────
describe("the school-point supply — `school-points.json` resolves the C1 dot", () => {
    it("loads a non-empty supply of geocoded, in-district school points", async () => {
        const reg = await loadSchoolPoints();
        const codes = Object.keys(reg);
        expect(codes.length).toBeGreaterThan(0);
        for (const code of codes) {
            const e = reg[code];
            expect(e.district).toMatch(/^37\d{5}$/); // an NC district GEOID
            expect(e.point).toHaveLength(2);
            expect(Number.isFinite(e.point[0])).toBe(true);
            expect(Number.isFinite(e.point[1])).toBe(true);
        }
    });

    it("the sync accessors resolve a seated dot (point + district GEOID + `school-point` seed)", async () => {
        const reg = await loadSchoolPoints(); // warm the memo (the sync accessors read it)
        const [code, entry] = Object.entries(reg)[0];
        expect(schoolPoint(code)).toEqual({ x: entry.point[0], y: entry.point[1] });
        expect(districtOf(code)).toBe(entry.district);
        expect(schoolPointSeed(code)).toBe("school-point");
    });

    it("resolveEntityIcon(school) seats the SUPPLY point (not the centroid fallback) when injected", async () => {
        const reg = await loadSchoolPoints();
        const [code, entry] = Object.entries(reg)[0];
        const d = resolveEntityIcon(code, "school", { size: 48, schoolPoint, districtOf });
        expect(d.mark).toBe("point");
        if (d.mark === "point") {
            expect(d.seed).toBe("school-point"); // the geocoded supply, NOT district-centroid
            expect(d.point).toEqual({ x: entry.point[0], y: entry.point[1] });
            expect(d.geom?.id).toBe(entry.district); // the district context silhouette resolved
        }
    });

    it("an un-supplied school still resolves a `point` (the district-centroid honesty seed, never a pin)", () => {
        const d = resolveEntityIcon("nonexistent-code", "school", {
            size: 48,
            schoolPoint,
            districtOf,
        });
        // districtOf() returns null → the id is tried as a district key directly (it is not one),
        // so the geom is null and the dot degrades to the box-centre seed — never a floating pin.
        expect(d.mark).toBe("point");
        if (d.mark === "point") expect(d.seed).toBe("district-centroid");
    });
});
