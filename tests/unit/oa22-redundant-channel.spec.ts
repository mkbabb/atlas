// tests/unit/oa22-redundant-channel.spec.ts — O-A22 ACCEPTANCE teeth at the pure-mechanism +
// live-source layer (this library's DOM-less test idiom — the `checkOrdinalRainbowPassthrough`
// executable-proof pattern + the gate corpus's "read LIVE source off disk" scan):
//
//   · checkRedundantChannel — the four collapsed invariants (disjointness · uniqueness · tier-bin
//     agreement · the density decision + the NEG).
//   · buildDataFillBins — same fill → same bin; distinct fills → distinct bins (agreement source).
//   · resolveRedundantChannel — few bins → pattern; many bins → value-label; the NEG (`none`).
//   · the absence-vs-data disjointness — a no-data fill (excluded by the caller) mints no data bin,
//     and no data texture reuses the reserved absence-hatch id / kind.
//   · the LIVE GeoChoropleth.vue wiring — the `redundantChannel:'auto'` inherited default, the fill
//     routed through `fillFor`, the tier-texture `<pattern>` emitted, the reserved hatch kept ONE.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
    checkRedundantChannel,
    buildDataFillBins,
    resolveRedundantChannel,
    patternIdForBin,
    DATA_PATTERNS,
    PATTERN_TIER_MAX,
    ABSENCE_HATCH_ID,
    ABSENCE_HATCH_KIND,
} from "@/charts/geo/redundant-channel";

const SFC = readFileSync(
    fileURLToPath(new URL("../../src/charts/geo/GeoChoropleth.vue", import.meta.url)),
    "utf8",
);

describe("O-A22 · checkRedundantChannel — the collapsed executable proof", () => {
    it("passes every invariant (disjointness · uniqueness · agreement · density + NEG)", () => {
        const { ok, failures } = checkRedundantChannel();
        expect(failures).toEqual([]);
        expect(ok).toBe(true);
    });
});

describe("O-A22 · the tier-bin AGREEMENT (the one shared bin source)", () => {
    it("the SAME data fill maps to the SAME bin (idempotent — a pure function of the colour)", () => {
        const bins = buildDataFillBins(["rgb(1,2,3)", "rgb(1,2,3)", "rgb(9,9,9)"]);
        // one bin per distinct colour (the duplicate collapses).
        expect(bins.size).toBe(2);
        expect(bins.get("rgb(1,2,3)")).toBe(bins.get("rgb(1,2,3)"));
    });

    it("DISTINCT data fills map to DISTINCT bins → DISTINCT texture ids (never disagree)", () => {
        const bins = buildDataFillBins(["rgb(1,2,3)", "rgb(9,9,9)", "rgb(4,5,6)"]);
        const ids = [...bins.values()].map(patternIdForBin);
        expect(new Set(ids).size).toBe(ids.length); // a bijection tier↔texture
    });

    it("the bin index is DETERMINISTIC across feature order (the texture never re-shuffles)", () => {
        const a = buildDataFillBins(["rgb(3,3,3)", "rgb(1,1,1)", "rgb(2,2,2)"]);
        const b = buildDataFillBins(["rgb(1,1,1)", "rgb(2,2,2)", "rgb(3,3,3)"]);
        expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
        expect(a.get("rgb(2,2,2)")).toBe(b.get("rgb(2,2,2)"));
    });
});

describe("O-A22 · the density decision (auto) + the NEG control", () => {
    it("a FEW-bin frame resolves to the PATTERN channel (a tiered / dense grid)", () => {
        expect(resolveRedundantChannel("auto", 4, false)).toBe("pattern");
        expect(resolveRedundantChannel("auto", PATTERN_TIER_MAX, false)).toBe("pattern");
    });

    it("a MANY-bin frame with a label source resolves to VALUE-LABEL (a sparse district set)", () => {
        expect(resolveRedundantChannel("auto", PATTERN_TIER_MAX + 1, true)).toBe("value-label");
        expect(resolveRedundantChannel("auto", 100, true)).toBe("value-label");
    });

    it("a MANY-bin frame with NO label source resolves to NONE (an honest non-answer)", () => {
        expect(resolveRedundantChannel("auto", 100, false)).toBe("none");
    });

    it("NEG — the disabled posture is colour-only (fails the distinguishability assert)", () => {
        // `none` never mounts a channel regardless of density — the negative control the O-A22
        // colour-blind-simulation assert measures against.
        expect(resolveRedundantChannel("none", 4, true)).toBe("none");
        expect(resolveRedundantChannel("none", 100, true)).toBe("none");
    });

    it("a forced channel is honoured when viable, else degrades honestly", () => {
        expect(resolveRedundantChannel("pattern", 3, false)).toBe("pattern");
        expect(resolveRedundantChannel("pattern", 0, false)).toBe("none"); // no data bins to texture
        expect(resolveRedundantChannel("value-label", 1, true)).toBe("value-label");
        expect(resolveRedundantChannel("value-label", 1, false)).toBe("none"); // no word source
    });
});

describe("O-A22 · the absence-vs-data disjointness (a no-data region reads as absent)", () => {
    it("a no-data fill excluded by the caller mints NO data bin", () => {
        // The caller passes ONLY data-shape fills; the absence grey never reaches the binner, so it
        // can never receive a tier texture (it reads as absent, not as a data tier — the O-A22 NEG).
        const dataFills = ["rgb(10,80,120)", "rgb(20,120,90)"]; // the absence grey is NOT among them
        const bins = buildDataFillBins(dataFills);
        expect(bins.has("rgb(230,230,230)")).toBe(false); // a no-data grey — unbinned
        expect(bins.size).toBe(2);
    });

    it("no data texture reuses the reserved absence-hatch id or kind", () => {
        for (let i = 0; i < DATA_PATTERNS.length; i++) {
            expect(patternIdForBin(i)).not.toBe(ABSENCE_HATCH_ID);
        }
        for (const p of DATA_PATTERNS) {
            expect(p.kind).not.toBe(ABSENCE_HATCH_KIND); // never the lone 45° diagonal
        }
        // every texture carries at least one ink primitive (a real, distinguishable texture).
        for (const p of DATA_PATTERNS) {
            const n =
                (p.lines?.length ?? 0) + (p.circles?.length ?? 0) + (p.rects?.length ?? 0);
            expect(n).toBeGreaterThan(0);
        }
    });
});

describe("O-A22 · the LIVE GeoChoropleth.vue wiring (the inheritance-breadth law)", () => {
    it("the redundantChannel prop DEFAULTS to 'auto' (every choropleth inherits it)", () => {
        expect(SFC).toMatch(/redundantChannel\?:\s*RedundantChannel/);
        expect(SFC).toMatch(/redundantChannel:\s*"auto"/);
    });

    it("the shape fill is routed through the tier-texture-aware fillFor", () => {
        expect(SFC).toContain(':fill="fillFor(s)"');
    });

    it("the tier textures are emitted into <defs> and referenced by their bin id", () => {
        expect(SFC).toContain("v-for=\"p in patternDefs\"");
        expect(SFC).toContain(':id="p.id"');
        expect(SFC).toContain("patternUnits=\"userSpaceOnUse\"");
    });

    it("the reserved absence hatch stays a SINGLE reserved pattern (never a data texture)", () => {
        const hatchDefs = SFC.match(new RegExp(`id="${ABSENCE_HATCH_ID}"`, "g")) ?? [];
        expect(hatchDefs.length).toBe(1);
    });

    it("the value-label layer carries the resting redundant-visibility hook", () => {
        expect(SFC).toContain("geo-value-labels--redundant");
    });
});
