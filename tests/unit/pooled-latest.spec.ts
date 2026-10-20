// U §L horn 8 (ii) "latest" (the F-D4S-8 rule): a unit is admitted to a pooled frame on its row in
// the scope's latest selected period. Closed units leave; a `latest` measure reads that row with no
// fall-back to an older contract (the entitynn fall-back is deleted). The fixtures are hand-built so
// the test reads no gitignored data (§H M-3); P4 D4-shared S2 holds the snapshot oracle for the same
// rule (loop/P4/research/D4-shared/pooled-latest.spec.ts), run as evidence in the B6 lane doc.
import { describe, expect, it } from "vitest";

import type { Feed, FeedRow } from "../../src/data/contract";
import { aggregateRows, trajectory, trajectoryFeed } from "../../src/data/multiYear";

function feedOf(rows: FeedRow[], years: number[]): Feed {
    return {
        meta: {
            schemaVersion: 2,
            dataset: "sci",
            keyField: "id",
            entityGrain: "district",
            years,
            latestYear: years[years.length - 1]!,
            generatedAt: "2026-10-19T00:00:00Z",
            measures: ["contracted", "days", "adm", "undeclared"],
            aggregable: { contracted: "latest", days: "sum", adm: "latest" },
        },
        rows,
    };
}

const fixture = feedOf(
    [
        // A: present in every period; its 2025 contract is null (the entitynn site).
        { id: "A", year: 2024, flag: "LEA", contracted: 500, days: 10, adm: 1800, undeclared: 1 },
        { id: "A", year: 2025, flag: "CHARTER", contracted: null, days: 5, adm: 2100, undeclared: 2 },
        // B: a closed charter, absent from the latest period.
        { id: "B", year: 2024, flag: "CHARTER", contracted: 900, days: 7, adm: 400, undeclared: 3 },
        // C: a late joiner, present only in the latest period.
        { id: "C", year: 2025, flag: "LEA", contracted: 1000, days: 2, adm: 900, undeclared: 4 },
    ],
    [2024, 2025],
);

describe("aggregateRows admits a unit on its row in the latest selected period (§L horn 8 (ii))", () => {
    const pooled = aggregateRows(fixture, [2024, 2025]);

    it("a closed unit leaves the pooled frame", () => {
        expect([...pooled.keys()].sort()).toEqual(["A", "C"]);
    });

    it("no masking fall-back: a null latest-period contract stays null", () => {
        expect(pooled.get("A")!.contracted).toBeNull();
    });

    it("a pooled filter tests the latest-period row (attributes ride)", () => {
        const charters = [...pooled.values()].filter((r) => r.flag === "CHARTER");
        expect(charters.map((r) => r.id)).toEqual(["A"]);
        const small = [...pooled.values()].filter((r) => (r.adm as number) <= 2000);
        // entitynn admitted {B, C}: B is the closed unit, filtered on its 2024 row. latest: {C}.
        expect(small.map((r) => r.id)).toEqual(["C"]);
    });

    it("non-latest rules still fold over the whole scope", () => {
        expect(pooled.get("A")!.days).toBe(15);
        expect(pooled.get("C")!.days).toBe(2);
    });

    it("the reduced row carries the latest period as its year", () => {
        expect(pooled.get("A")!.year).toBe(2025);
    });

    it("a declared measure with no aggregate rule is dropped (refuse-to-default)", () => {
        expect("undeclared" in pooled.get("A")!).toBe(false);
    });

    it("the latest period is the latest selected one, not the feed's", () => {
        const early = aggregateRows(fixture, [2024]);
        expect([...early.keys()].sort()).toEqual(["A", "B"]);
        expect(early.get("A")!.contracted).toBe(500);
        expect(early.get("A")!.flag).toBe("LEA");
    });

    it("a gapped scope admits on its latest period: a unit present only before the gap leaves", () => {
        const gapped = feedOf(
            [
                { id: "A", year: 2014, flag: "CHARTER", contracted: 100, days: 1, adm: 50 },
                { id: "A", year: 2025, flag: "CHARTER", contracted: 200, days: 1, adm: 60 },
                { id: "D", year: 2014, flag: "CHARTER", contracted: 300, days: 1, adm: 70 },
                { id: "D", year: 2020, flag: "CHARTER", contracted: 300, days: 1, adm: 70 },
            ],
            [2014, 2020, 2025],
        );
        const pooled = aggregateRows(gapped, [2014, 2025]);
        expect([...pooled.keys()]).toEqual(["A"]);
        expect(pooled.get("A")!.contracted).toBe(200);
        expect(pooled.get("A")!.days).toBe(2);
    });

    it("an empty scope yields an empty frame", () => {
        expect(aggregateRows(fixture, [2019]).size).toBe(0);
    });
});

describe("trajectory refuses `latest` over a cross-entity period (U-F-D4S-18)", () => {
    it("throws instead of returning an arbitrary entity's value", () => {
        expect(() => trajectory(fixture, ["contracted"])).toThrow(/declared latest over 2 rows/);
    });

    it("still reads a trajectoryFeed singleton per period", () => {
        const feed = trajectoryFeed(
            "sci",
            "id",
            [
                { year: 2024, values: { peak: 1 } },
                { year: 2025, values: { peak: null } },
            ],
            ["peak"],
        );
        expect(trajectory(feed, ["peak"]).map((p) => p.values.peak)).toEqual([1, null]);
    });
});
