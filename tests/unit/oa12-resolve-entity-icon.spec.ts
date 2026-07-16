// tests/unit/oa12-resolve-entity-icon.spec.ts — O-A12 ACCEPTANCE teeth at the pure layer: the
// generalized `resolveEntityIcon` discriminated union (glyph/hex/point/hub + the unknown NEG floor)
// and the abstract-grain primitive MATH (the hexagon ring, the hub node+stubs, the school-dot anchor,
// the px→LOD band). Node-env pure specs — no mount (the DESIGNED render is the visual evidence pack;
// this asserts the DATA the render binds is exact + self-gates). Includes the never-incriminate
// governance assert: a consultant resolves to a LETTER pseudonym only, no real-firm affordance.
import { describe, it, expect } from "vitest";
import {
    resolveEntityIcon,
    resolveEntityIconForSelection,
    grainForKind,
    tierForSize,
    type EntityIconDescriptor,
} from "../../src/charts/glyph/resolveEntityIcon";
import {
    pxToLod,
    hexPolygonPoints,
    hubGeometry,
    viewBoxCenter,
} from "../../src/charts/glyph/iconPrimitives";
import type { SelectionKey } from "../../src/charts/contract/selection-contract";
import { loadGlyphRegistry } from "../../src/data/entityGeometry";
import { loadSchoolPoints, schoolPoint, districtOf, schoolPointSeed } from "../../src/data/schoolPoints";

// ── The px → LOD band (icon-facility §2.4) ──────────────────────────────────────────────────────
describe("pxToLod — the icon-scale band router", () => {
    it("routes 16–24px marks to the new `icon` tier (≤18 → icon)", () => {
        expect(pxToLod(16)).toBe("icon");
        expect(pxToLod(18)).toBe("icon");
    });
    it("bands coarse / med / fine at 32 / 64 / above", () => {
        expect(pxToLod(24)).toBe("coarse");
        expect(pxToLod(32)).toBe("coarse");
        expect(pxToLod(48)).toBe("med");
        expect(pxToLod(64)).toBe("med");
        expect(pxToLod(120)).toBe("fine");
    });
    it("floors a degenerate size to the smallest band (never over-fetches fine)", () => {
        expect(pxToLod(0)).toBe("icon");
        expect(pxToLod(-5)).toBe("icon");
        expect(pxToLod(Number.NaN)).toBe("icon");
    });
});

// ── Class B math — the flat-top hexagon ring ────────────────────────────────────────────────────
describe("hexPolygonPoints — the Class-B hexagon primitive (pure math, zero bake bytes)", () => {
    it("emits six vertices", () => {
        const pts = hexPolygonPoints().split(" ");
        expect(pts).toHaveLength(6);
    });
    it("is a FLAT-TOP hexagon — the top and bottom edges are horizontal (two equal-y vertex pairs)", () => {
        const ys = hexPolygonPoints(50, 50, 46, true)
            .split(" ")
            .map((p) => Number(p.split(",")[1]));
        // a flat-top hexagon has two vertices sharing the max y (bottom edge) + two sharing the min y
        // (top edge) — a horizontal edge, the H3 map orientation.
        const maxY = Math.max(...ys);
        const minY = Math.min(...ys);
        expect(ys.filter((y) => Math.abs(y - maxY) < 1e-6)).toHaveLength(2);
        expect(ys.filter((y) => Math.abs(y - minY) < 1e-6)).toHaveLength(2);
    });
    it("is centred + regular — every vertex sits at the circumradius from the centre", () => {
        const r = 40;
        for (const p of hexPolygonPoints(50, 50, r, true).split(" ")) {
            const [x, y] = p.split(",").map(Number);
            const dist = Math.hypot(x - 50, y - 50);
            expect(dist).toBeCloseTo(r, 3);
        }
    });
});

// ── Class C math — the hub node + radiating stubs ───────────────────────────────────────────────
describe("hubGeometry — the Class-C consultant hub (pure math)", () => {
    it("defaults to ~6 radiating stubs + a centre node (never a building pictogram)", () => {
        const hub = hubGeometry();
        expect(hub.spokes).toHaveLength(6);
        expect(hub.node.r).toBeGreaterThan(0);
    });
    it("radiates every stub OUTWARD from the node rim (inner end past the node, outer near the edge)", () => {
        const hub = hubGeometry(6, 15, 50, 50, 46);
        for (const s of hub.spokes) {
            const inner = Math.hypot(s.x1 - 50, s.y1 - 50);
            const outer = Math.hypot(s.x2 - 50, s.y2 - 50);
            expect(inner).toBeGreaterThan(hub.node.r); // starts off the node rim
            expect(outer).toBeGreaterThan(inner); // reaches outward
        }
    });
    it("honours an arbitrary stub count", () => {
        expect(hubGeometry(4).spokes).toHaveLength(4);
        expect(hubGeometry(8).spokes).toHaveLength(8);
    });
});

// ── Class C math — the school-dot anchor fallback ───────────────────────────────────────────────
describe("viewBoxCenter — the school-dot `district-centroid` fallback anchor", () => {
    it("returns the centre of a real viewBox", () => {
        expect(viewBoxCenter("0 0 58.38 100")).toEqual({ x: 29.19, y: 50 });
    });
    it("floors a malformed / empty viewBox to the [0,100]-box centre (never a throw)", () => {
        expect(viewBoxCenter("")).toEqual({ x: 50, y: 50 });
        expect(viewBoxCenter(null)).toEqual({ x: 50, y: 50 });
        expect(viewBoxCenter("garbage")).toEqual({ x: 50, y: 50 });
    });
});

// ── The resolver — the discriminated union (icon-facility §2.2) ──────────────────────────────────
describe("resolveEntityIcon — the generalized 4-variant resolver", () => {
    it("resolves a Class-A grain to a `glyph` mark (the baked silhouette)", () => {
        const d = resolveEntityIcon("06", "state", { size: 48 });
        expect(d.mark).toBe("glyph");
        if (d.mark === "glyph") {
            expect(d.grain).toBe("state");
            expect(d.geom).toBeTruthy();
            expect(d.geom.d.length).toBeGreaterThan(0);
            expect(d.label).toBe(d.geom.name);
        }
    });

    it("resolves a `hex` grain to a hex mark (the H3 cell — no geometry, math)", () => {
        const d = resolveEntityIcon("8a2a1072b59ffff", "hex", {
            cellLabel: () => "Raleigh",
        });
        expect(d.mark).toBe("hex");
        if (d.mark === "hex") {
            expect(d.id).toBe("8a2a1072b59ffff");
            expect(d.label).toBe("Raleigh"); // the injected place name, never the feed reached
        }
    });

    it("falls a `hex` cell with no place resolver to its raw id (honest, never blank)", () => {
        const d = resolveEntityIcon("cell-123", "hex");
        expect(d.mark).toBe("hex");
        if (d.mark === "hex") expect(d.label).toBe("cell-123");
    });

    it("resolves a `school` to a `point` mark — the district context + a seated dot", () => {
        const d = resolveEntityIcon("A", "school", {
            size: 48,
            districtOf: () => "37", // an NC LEA whose district silhouette resolves
            schoolPoint: () => ({ x: 42, y: 71 }),
        });
        expect(d.mark).toBe("point");
        if (d.mark === "point") {
            expect(d.grain).toBe("district");
            expect(d.point).toEqual({ x: 42, y: 71 });
            expect(d.seed).toBe("school-point"); // a geocoded anchor
        }
    });

    it("degrades a `school` with no geocoded point to the district-centroid seed (never a floating pin)", () => {
        const d = resolveEntityIcon("999", "school", { size: 16 });
        expect(d.mark).toBe("point");
        if (d.mark === "point") {
            expect(d.seed).toBe("district-centroid");
            expect(d.point).toBeTruthy(); // an interior anchor always resolves
        }
    });

    it("NEG: an unknown grain falls to a DESIGNED `unknown` mark, never a crash", () => {
        const d = resolveEntityIcon(
            "junk",
            // deliberately outside the taxonomy
            "galaxy" as unknown as Parameters<typeof resolveEntityIcon>[1],
        );
        expect(d.mark).toBe("unknown");
        if (d.mark === "unknown") expect(d.label).toBe("junk");
    });

    it("NEG: a Class-A grain whose silhouette does not resolve floors to `unknown` (never the void-ring)", () => {
        const d = resolveEntityIcon("ZZ-not-a-fips", "state", { size: 16 });
        expect(d.mark).toBe("unknown");
    });
});

// ── The never-incriminate governance assert (dashboard-facing) ──────────────────────────────────
describe("resolveEntityIcon — the consultant never-incriminate fence", () => {
    it("resolves a consultant to a `hub` with a LETTER pseudonym only — no real-firm affordance", () => {
        const d = resolveEntityIcon("A", "consultant");
        expect(d.mark).toBe("hub");
        if (d.mark === "hub") {
            expect(d.pseudonym).toBe("A");
            // the descriptor is STRUCTURALLY pseudonymous — no field can carry a real firm name.
            expect(Object.keys(d).sort()).toEqual(["label", "mark", "pseudonym"]);
        }
    });

    it("coerces ANY key to a short letter token — a firm name never seats in the node", () => {
        // even if a raw firm string leaked to the resolver, it is clamped to a short UPPER token.
        const d = resolveEntityIcon("Ferrara Consulting Group LLC", "consultant");
        expect(d.mark).toBe("hub");
        if (d.mark === "hub") {
            // the trailing letter run ("LLC") is not a firm name; the token is short + upper.
            expect(d.pseudonym).toMatch(/^[A-Z]{1,3}$/);
            expect(d.pseudonym.length).toBeLessThanOrEqual(3);
        }
    });

    it("honours an injected de-identify letter resolver (the supply's ordinal letter)", () => {
        const d = resolveEntityIcon("crn-8891", "consultant", {
            pseudonym: () => "AB",
        });
        expect(d.mark).toBe("hub");
        if (d.mark === "hub") expect(d.pseudonym).toBe("AB");
    });
});

// ── The selection-kind adapter (the mini-map path — the folded resolveMinimapMark) ──────────────
describe("grainForKind / resolveEntityIconForSelection — the folded mini-map resolver", () => {
    it("maps the wire kinds to icon grains (cell→hex, firm→consultant, geo→identity)", () => {
        expect(grainForKind("cell")).toBe("hex");
        expect(grainForKind("firm")).toBe("consultant");
        expect(grainForKind("state")).toBe("state");
        expect(grainForKind("district")).toBe("district");
    });

    it("resolves a SelectionKey through ONE resolver — a firm becomes a hub (was `building-2`)", () => {
        const key: SelectionKey = { kind: "firm", id: "B", key: "firm:B" };
        const d: EntityIconDescriptor = resolveEntityIconForSelection(key);
        expect(d.mark).toBe("hub"); // the never-incriminate upgrade over the old building-2 icon
    });

    it("resolves a cell SelectionKey to a hex mark", () => {
        const key: SelectionKey = { kind: "cell", id: "8a2a", key: "cell:8a2a" };
        const d = resolveEntityIconForSelection(key, { cellLabel: () => "Durham" });
        expect(d.mark).toBe("hex");
        if (d.mark === "hex") expect(d.label).toBe("Durham");
    });
});

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
