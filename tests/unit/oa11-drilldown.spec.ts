// tests/unit/oa11-drilldown.spec.ts — @mkbabb/atlas · THE DRILL-DOWN GATE (O-A11, Part F).
//
// The composition asserts (single shows hover-info ALONE, multi shows mini-map+aggregate+dropdowns) are
// DRIVEN in the consumer's playwright on a prod build (the node-env library runner has no DOM). This
// spec pins the PURE, node-safe laws the panel's correctness rests on — the strongest cheap signals:
//
//   (4) THE AGGREGATE LAW — the Simpson trap. A 3-member intensive fixture reduces to `Σnum/Σden`
//       (POOLED / weighted), NEVER `mean(ratios)` — and the MEDIAN rides ALONGSIDE ([ANSWERS Q-38]).
//       There is no `mean-of-ratios` fold to call, so the trap is unrepresentable by construction.
//   (6) THE `?sel` ROUND-TRIP — `?sel=state:48,37,cell:x` parses to [state:48, cell:x] (the bare `37`
//       + no foreign token here) → SINGLE-vs-MULTI is the POST-drop count; `state:48,state:02` → 2.
//   §B.3 THE BOUNDED-MINIMAP EXTENT — the union viewBox reduce (a mid-load box drops out, never NaN).
//
// BAN THE SENTINEL (Part F §7): none of these pass because "the panel exists" — each drives the actual
// reduce / codec / extent a reader's panel renders off. Born-RED goes to the ledger, never a green shell.

import { describe, it, expect } from "vitest";
import {
    reduceOpForKind,
    reduceExtensive,
    reduceIntensive,
} from "@/charts/contract/aggregate";
import {
    parseViewBox,
    unionExtent,
    boundedMinimapViewBox,
} from "@/interaction/minimapExtent";
import { parseSelKey } from "@/charts/contract/selection-contract";

describe("O-A11 · the aggregate LAW (the Simpson trap)", () => {
    it("selects the honest op by measure KIND — extensive Σ, intensive pooled", () => {
        expect(reduceOpForKind("extensive")).toBe("Σ");
        expect(reduceOpForKind("intensive")).toBe("pooled");
    });

    it("reduces an EXTENSIVE measure by SUM (no median rides a Σ)", () => {
        const r = reduceExtensive([100, 1000, 1000]);
        expect(r.op).toBe("Σ");
        expect(r.value).toBe(2100);
        expect(r.median).toBeNull();
        expect(r.n).toBe(3);
    });

    it("reduces an INTENSIVE measure by POOLED Σnum/Σden — NOT mean(ratios) — with the median alongside", () => {
        // 3 districts: $ (extensive numerator) over enrollment (extensive denominator). The per-student
        // RATIO of each differs wildly (3000 vs 100 vs 100), so the naive mean(per-student) LIES.
        const members = [
            { ratio: 3000, numerator: 300_000, denominator: 100 },
            { ratio: 100, numerator: 100_000, denominator: 1000 },
            { ratio: 100, numerator: 100_000, denominator: 1000 },
        ];
        const r = reduceIntensive(members);

        // THE HONEST AGGREGATE — Σ$ / Σenroll (the enrollment-weighted per-student).
        const pooled = 500_000 / 2100; // ≈ 238.0952
        expect(r.op).toBe("pooled");
        expect(r.value).toBeCloseTo(pooled, 6);

        // THE MEDIAN rides ALONGSIDE (the typical member's rate) — [100, 100, 3000] → 100.
        expect(r.median).toBe(100);
        expect(r.n).toBe(3);

        // THE TRAP — mean(per-student) is 1066.67, WILDLY apart from the pooled 238.10. The compute
        // never computes it; assert the pooled value is nowhere near the arithmetic mean of the ratios.
        const meanOfRatios = (3000 + 100 + 100) / 3; // 1066.67 — the Simpson lie
        expect(r.value).not.toBeCloseTo(meanOfRatios, 1);
    });

    it("degrades safely — an empty intensive set pools to NaN, an empty extensive sums to 0", () => {
        const intensive = reduceIntensive([]);
        expect(Number.isNaN(intensive.value)).toBe(true);
        expect(intensive.n).toBe(0);

        const extensive = reduceExtensive([]);
        expect(extensive.value).toBe(0);
        expect(extensive.n).toBe(0);
    });
});

describe("O-A11 · the `?sel` round-trip (parse-guarded, post-drop count)", () => {
    /** Mirror `useViewParams.selKeys`: split the `?sel` list, parse each, drop the nulls. */
    function selKeysFrom(sel: string) {
        return sel
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .map(parseSelKey)
            .filter((s): s is NonNullable<typeof s> => s !== null);
    }

    it("drops the BARE token — `state:48,37,cell:x` → [state:48, cell:x] (n=2)", () => {
        const keys = selKeysFrom("state:48,37,cell:x");
        expect(keys.map((k) => k.key)).toEqual(["state:48", "cell:x"]);
        expect(keys.length).toBe(2);
    });

    it("round-trips two well-formed keys — `state:48,state:02` → MULTI×2", () => {
        const keys = selKeysFrom("state:48,state:02");
        expect(keys.length).toBe(2);
        expect(keys.map((k) => k.id)).toEqual(["48", "02"]);
    });

    it("a lone valid key parses to SINGLE (n=1) — the mode is the post-drop count", () => {
        expect(selKeysFrom("state:48").length).toBe(1);
        // a single valid + a foreign-shaped bare token still lands SINGLE (the bare drops).
        expect(selKeysFrom("state:48,999").length).toBe(1);
    });
});

describe("O-A11 · the bounded-minimap extent (§B.3 tier 1)", () => {
    it("parses a viewBox and rejects a malformed / zero-area box", () => {
        expect(parseViewBox("0 0 50 100")).toEqual({ x: 0, y: 0, w: 50, h: 100 });
        expect(parseViewBox("bad")).toBeNull();
        expect(parseViewBox("0 0 0 10")).toBeNull();
        expect(parseViewBox(null)).toBeNull();
    });

    it("unions boxes to the tightest frame", () => {
        const u = unionExtent([
            { x: 0, y: 0, w: 50, h: 100 },
            { x: 60, y: 20, w: 40, h: 60 },
        ]);
        expect(u).toEqual({ x: 0, y: 0, w: 100, h: 100 });
    });

    it("reduces co-projected viewBoxes to one padded frame — a mid-load (null) box drops out", () => {
        const vb = boundedMinimapViewBox(["0 0 50 100", null, "60 0 40 80"], 0);
        expect(vb).toBe("0 0 100 100"); // pad=0 → the exact union
        // nothing parseable → null (the caller falls to the glyph-row tier).
        expect(boundedMinimapViewBox([null, "bad"])).toBeNull();
    });
});
