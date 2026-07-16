// Redundant-channel paint and label decisions.
import { describe, it, expect } from "vitest";
import {
    buildDataFillBins,
    resolveRedundantChannel,
    regionClearsLabelGate,
    patternIdForBin,
    DATA_PATTERNS,
    PATTERN_TIER_MAX,
    LABEL_MINOR_AXIS_FLOOR_PX,
    LABEL_CONTRAST_FLOOR,
    ABSENCE_HATCH_ID,
    ABSENCE_HATCH_KIND,
} from "../../src/charts/geo/redundant-channel";

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

describe("O-A22 · the >8 quantize SAFETY-NET (buildDataFillBins maxBins)", () => {
    it("collapses a >maxBins distinct set into ≤maxBins MONOTONE buckets", () => {
        const fills = Array.from({ length: 51 }, (_, i) => `rgb(${i},0,0)`);
        const bins = buildDataFillBins(fills, PATTERN_TIER_MAX);
        expect(new Set(bins.values()).size).toBeLessThanOrEqual(PATTERN_TIER_MAX);
        // monotone by rank: the sorted-first colour lands in bucket 0, the sorted-last in the top.
        expect(bins.get("rgb(0,0,0)")).toBe(0);
        expect(bins.get("rgb(9,0,0)")).toBe(PATTERN_TIER_MAX - 1); // "rgb(9,..)" sorts LAST of 0..50
        // deterministic + a pure function of rank (tier-k-texture == tier-k-colour agreement holds).
        const again = buildDataFillBins(fills, PATTERN_TIER_MAX);
        expect([...bins.entries()].sort()).toEqual([...again.entries()].sort());
    });

    it("is an IDENTITY when the distinct set already fits maxBins (each colour its own bin)", () => {
        const fills = ["rgb(3,0,0)", "rgb(1,0,0)", "rgb(2,0,0)"];
        const capped = buildDataFillBins(fills, PATTERN_TIER_MAX);
        const raw = buildDataFillBins(fills);
        expect([...capped.entries()].sort()).toEqual([...raw.entries()].sort());
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

    it("a MANY-bin, label-less DATA frame falls to the PATTERN safety-net (never colour-only)", () => {
        // The >8 quantize safety-net: a continuous frame with NO word source rank-collapses into the
        // ≤PATTERN_TIER_MAX texture set rather than resolving to `none` (the auto→none-on-data hole).
        expect(resolveRedundantChannel("auto", 100, false)).toBe("pattern");
        expect(resolveRedundantChannel("auto", PATTERN_TIER_MAX + 1, false)).toBe("pattern");
    });

    it("POSITIVE CONTROL — auto NEVER yields `none` on a DATA frame (the hole is unrepresentable)", () => {
        for (const n of [1, 4, PATTERN_TIER_MAX, PATTERN_TIER_MAX + 1, 51, 200]) {
            expect(resolveRedundantChannel("auto", n, false)).not.toBe("none");
            expect(resolveRedundantChannel("auto", n, true)).not.toBe("none");
        }
        // The SOLE auto→none: a truly EMPTY frame (0 data bins) — an honest non-answer, not a data map.
        expect(resolveRedundantChannel("auto", 0, false)).toBe("none");
        expect(resolveRedundantChannel("auto", 0, true)).toBe("none");
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

describe("X10-LIB · regionClearsLabelGate — the per-region declutter gate (the label-vs-A22 reconcile)", () => {
    it("clears only when BOTH the size and contrast floors hold", () => {
        expect(regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX, LABEL_CONTRAST_FLOOR)).toBe(true);
        expect(regionClearsLabelGate(200, 10)).toBe(true);
    });

    it("FAILS on a region under the size floor, however high the contrast", () => {
        expect(regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX - 0.01, 21)).toBe(false);
        expect(regionClearsLabelGate(1, 21)).toBe(false);
    });

    it("FAILS on a region under the contrast floor, however large the box", () => {
        expect(regionClearsLabelGate(500, LABEL_CONTRAST_FLOOR - 0.01)).toBe(false);
        expect(regionClearsLabelGate(500, 1)).toBe(false);
    });

    it("is a pure, deterministic function (no hidden state)", () => {
        const a = regionClearsLabelGate(60, 4);
        const b = regionClearsLabelGate(60, 4);
        expect(a).toBe(b);
    });
});
