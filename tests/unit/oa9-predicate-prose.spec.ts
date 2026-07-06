// tests/unit/oa9-predicate-prose.spec.ts — O-A9 ACCEPTANCE tooth (1): the FILTER-PROSE unit. Feed
// `humanizePredicate` a known `Predicate` fixture and assert the EXACT reader prose — the cheapest
// strong signal (provenance-surface §7). Pure, no mount.
import { describe, it, expect } from "vitest";
import type { Predicate, Leaf } from "@/filter/engine/predicate";
import {
    humanizePredicate,
    IDENTITY_DIM_LABELS,
    type DimLabels,
} from "@/platform/provenance/predicate-prose";

const dummyField = (): string | null => null;

// A route dictionary: `flow=receivers` → "receivers only"; `region` values title-cased; year/enrollment
// bounds formatted (year bare, enrollment thousands-separated).
const labels: DimLabels = {
    labelOf: (key) =>
        ({ region: "Region", year: "year", enrollment: "enrollment" })[key] ?? key,
    valueOf: (key, value) => {
        if (key === "flow" && value === "receivers") return "receivers only";
        if (key === "schoolType" && value === "charter") return "charter schools";
        const regionNames: Record<string, string> = { W: "West", S: "Sandhills" };
        if (key === "region") return regionNames[value] ?? value;
        return value;
    },
    formatBound: (key, n) => (key === "year" ? String(n) : n.toLocaleString("en-US")),
};

const oneOf = (key: string, ...values: string[]): Leaf<unknown> => ({
    op: "oneOf",
    field: dummyField,
    values: new Set(values),
    key,
});
const range = (key: string, lo: number, hi: number): Leaf<unknown> => ({
    op: "range",
    field: dummyField,
    lo,
    hi,
    key,
});

describe("humanizePredicate — the reader-facing formatter", () => {
    it("tooth (1): the canonical AND fixture returns EXACT prose", () => {
        const p: Predicate<unknown> = {
            op: "and",
            kids: [oneOf("flow", "receivers"), range("year", 2020, Infinity)],
        };
        expect(humanizePredicate(p, labels)).toEqual(["receivers only", "year ≥ 2020"]);
    });

    it("a single-value oneOf reads as the value token", () => {
        expect(humanizePredicate(oneOf("schoolType", "charter"), labels)).toEqual([
            "charter schools",
        ]);
    });

    it("a multi-value oneOf reads as 'Label: a, b'", () => {
        expect(humanizePredicate(oneOf("region", "W", "S"), labels)).toEqual([
            "Region: West, Sandhills",
        ]);
    });

    it("range bounds: ≥ / ≤ / lo–hi", () => {
        expect(humanizePredicate(range("year", 2020, Infinity), labels)).toEqual(["year ≥ 2020"]);
        expect(humanizePredicate(range("enrollment", -Infinity, 5000), labels)).toEqual([
            "enrollment ≤ 5,000",
        ]);
        expect(humanizePredicate(range("enrollment", 500, 5000), labels)).toEqual([
            "enrollment 500–5,000",
        ]);
    });

    it("an OR reads as one '(a or b)' phrase", () => {
        const p: Predicate<unknown> = {
            op: "or",
            kids: [oneOf("region", "W"), oneOf("region", "S")],
        };
        expect(humanizePredicate(p, labels)).toEqual(["(West or Sandhills)"]);
    });

    it("the IDENTITY predicate and all inert leaves return [] (no dead '0 filters' rung)", () => {
        expect(humanizePredicate(null)).toEqual([]);
        expect(humanizePredicate({ op: "any" })).toEqual([]);
        expect(humanizePredicate(oneOf("region"), labels)).toEqual([]); // empty set ⇒ inert
        expect(humanizePredicate(range("year", -Infinity, Infinity), labels)).toEqual([]);
        expect(
            humanizePredicate({ op: "and", kids: [oneOf("region"), { op: "any" }] }, labels),
        ).toEqual([]);
    });

    it("the identity dictionary passes tokens through unmapped (forward-safe)", () => {
        expect(humanizePredicate(oneOf("flow", "receivers"), IDENTITY_DIM_LABELS)).toEqual([
            "receivers",
        ]);
    });
});
