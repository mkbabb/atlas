import { describe, expect, expectTypeOf, it } from "vitest";
import type { EntityGrain as DashboardEntityGrain } from "../../src/contract/types";
import {
    decodeColumnar,
    isColumnarFeed,
    isFeed,
    type EntityGrain,
    type FeedColumnar,
    type FeedRow,
} from "../../src/data/contract";

function meta(overrides: Record<string, unknown> = {}) {
    return {
        schemaVersion: 2,
        dataset: "sci",
        keyField: "leaNumber",
        entityGrain: "district",
        years: [2024, 2025],
        latestYear: 2025,
        generatedAt: "2026-07-15T00:00:00Z",
        measures: ["value"],
        aggregable: { value: "sum" },
        ...overrides,
    };
}

const rows = [
    { leaNumber: "001", year: 2024, value: 1 },
    { leaNumber: "001", year: 2025, value: 2 },
];

function rowFeed(
    metaOverrides: Record<string, unknown> = {},
    feedRows: unknown[] = rows,
) {
    return { meta: meta(metaOverrides), rows: feedRows };
}

function columnar(overrides: Record<string, unknown> = {}) {
    return {
        meta: meta(),
        columnar: true,
        rowCount: 2,
        fields: ["leaNumber", "year", "value"],
        columns: { leaNumber: ["001", "001"], year: [2024, 2025], value: [1, 2] },
        ...overrides,
    };
}

describe("v2 feed contract", () => {
    it.each([
        ["usf", "fips", "state", { fips: "37", year: 2025, value: 1 }],
        ["sci", "leaNumber", "district", { leaNumber: "001", year: 2025, value: 1 }],
        ["sci-schools", "schoolCode", "school", { schoolCode: "A", year: 2025, value: 1 }],
        ["speedtest", "h3Index", "entity", { h3Index: "abc", year: 2025, value: 1 }],
        ["erate-demand", "year", "year", { year: 2025, value: 1 }],
    ])("accepts the %s %s grain", (dataset, keyField, entityGrain, row) => {
        expect(isFeed(rowFeed({ dataset, keyField, entityGrain, years: [2025] }, [row]))).toBe(true);
    });

    it("shares one EntityGrain type across data and dashboard contracts", () => {
        expectTypeOf<DashboardEntityGrain>().toEqualTypeOf<EntityGrain>();
    });

    it.each<[string, Record<string, unknown>]>([
        ["v1", { schemaVersion: 1 }],
        ["empty dataset", { dataset: " " }],
        ["empty key", { keyField: "" }],
        ["invalid timestamp", { generatedAt: "later" }],
        ["unknown grain", { entityGrain: "nation" }],
        ["empty years", { years: [] }],
        ["unsorted years", { years: [2025, 2024], latestYear: 2024 }],
        ["duplicate years", { years: [2024, 2024], latestYear: 2024 }],
        ["fractional year", { years: [2024.5, 2025] }],
        ["latest year mismatch", { latestYear: 2024 }],
        ["missing measures", { measures: undefined }],
        ["empty measure", { measures: [""] }],
        ["duplicate measure", { measures: ["value", "value"] }],
        ["missing aggregable", { aggregable: null }],
        ["missing aggregate rule", { aggregable: {} }],
        ["extra aggregate rule", { aggregable: { value: "sum", extra: "sum" } }],
        ["invalid aggregate rule", { aggregable: { value: "median" } }],
        ["unknown ratio measure", { aggregable: { value: { ratio: ["value", "count"] } } }],
        ["invalid optional field", { frozen: "yes" }],
        ["legacy year", { year: 2025 }],
    ])("rejects %s metadata", (_name, overrides) => {
        expect(isFeed(rowFeed(overrides))).toBe(false);
    });

    it.each([
        ["missing key", [{ year: 2024, value: 1 }, { leaNumber: "001", year: 2025, value: 2 }]],
        ["empty key", [{ leaNumber: " ", year: 2024, value: 1 }, rows[1]]],
        ["fractional row year", [{ leaNumber: "001", year: 2024.5, value: 1 }, rows[1]]],
        ["year spine mismatch", [{ leaNumber: "001", year: 2024, value: 1 }]],
        ["duplicate identity", [rows[0], rows[0], rows[1]]],
        ["missing measure", [{ leaNumber: "001", year: 2024 }, rows[1]]],
        ["non-numeric measure", [{ leaNumber: "001", year: 2024, value: "one" }, rows[1]]],
        ["invalid cell", [{ leaNumber: "001", year: 2024, value: 1, extra: {} }, rows[1]]],
    ])("rejects %s rows", (_name, invalidRows) => {
        expect(isFeed(rowFeed({}, invalidRows))).toBe(false);
    });

    it("rejects state identities that collide after key normalization", () => {
        expect(isFeed(rowFeed(
            {
                dataset: "usf",
                keyField: "fips",
                entityGrain: "state",
                years: [2025],
                latestYear: 2025,
            },
            [
                { fips: 1, year: 2025, value: 1 },
                { fips: "01", year: 2025, value: 2 },
            ],
        ))).toBe(false);
    });

    it("rejects primitive, array, and columnar-dual row envelopes", () => {
        expect(isFeed(rowFeed({}, [rows[0], 42, rows[1]]))).toBe(false);
        expect(isFeed(rowFeed({}, [[]]))).toBe(false);
        expect(isFeed({ ...rowFeed(), columnar: true })).toBe(false);
    });
});

describe("v2 columnar contract", () => {
    it("validates and decodes a generic envelope without changing field order", () => {
        interface SciRow extends FeedRow { leaNumber: string; value: number; }
        const envelope = columnar() as FeedColumnar<SciRow>;
        expect(isColumnarFeed<SciRow>(envelope)).toBe(true);
        expect(decodeColumnar(envelope)).toEqual(rowFeed());
    });

    it("rejects empty, duplicate, reordered, extra, and misaligned columns", () => {
        expect(isColumnarFeed(columnar({ fields: [], columns: {} }))).toBe(false);
        expect(isColumnarFeed(columnar({ fields: ["leaNumber", "", "value"], columns: {} }))).toBe(false);
        expect(isColumnarFeed(columnar({
            fields: ["leaNumber", "year", "year"],
            columns: { leaNumber: ["001", "001"], year: [2024, 2025] },
        }))).toBe(false);
        expect(isColumnarFeed(columnar({
            columns: { year: [2024, 2025], leaNumber: ["001", "001"], value: [1, 2] },
        }))).toBe(false);
        expect(isColumnarFeed(columnar({
            fields: ["leaNumber", "year"],
            columns: { leaNumber: ["001", "001"], year: [2024, 2025] },
        }))).toBe(false);
        expect(isColumnarFeed(columnar({
            columns: { leaNumber: ["001", "001"], year: [2024, 2025], value: [1, 2], extra: [1, 2] },
        }))).toBe(false);
        expect(isColumnarFeed(columnar({ rowCount: 1 }))).toBe(false);
    });

    it("applies the same identity, year-spine, measure, and scalar laws", () => {
        expect(isColumnarFeed(columnar({ columns: { leaNumber: ["001", "001"], year: [2024, 2024], value: [1, 2] } }))).toBe(false);
        expect(isColumnarFeed(columnar({ columns: { leaNumber: ["", "001"], year: [2024, 2025], value: [1, 2] } }))).toBe(false);
        expect(isColumnarFeed(columnar({ columns: { leaNumber: ["001", "001"], year: [2024.5, 2025], value: [1, 2] } }))).toBe(false);
        expect(isColumnarFeed(columnar({ columns: { leaNumber: ["001", "001"], year: [2024, 2025], value: [1, "two"] } }))).toBe(false);
        expect(isColumnarFeed(columnar({ columns: { leaNumber: ["001", "001"], year: [2024, 2025], value: [1, {}] } }))).toBe(false);
    });

    it("rejects columnar state identities that collide after key normalization", () => {
        expect(isColumnarFeed(columnar({
            meta: meta({
                dataset: "usf",
                keyField: "fips",
                entityGrain: "state",
                years: [2025],
                latestYear: 2025,
            }),
            fields: ["fips", "year", "value"],
            columns: { fips: [1, "01"], year: [2025, 2025], value: [1, 2] },
        }))).toBe(false);
    });

    it("rejects invalid counts, metadata, columns, and row/columnar dual shapes", () => {
        expect(isColumnarFeed(columnar({ rowCount: -1 }))).toBe(false);
        expect(isColumnarFeed(columnar({ rowCount: 1.5 }))).toBe(false);
        expect(isColumnarFeed(columnar({ meta: meta({ dataset: "" }) }))).toBe(false);
        expect(isColumnarFeed(columnar({ columns: [] }))).toBe(false);
        expect(isColumnarFeed({ ...columnar(), rows: [] })).toBe(false);
        expect(isColumnarFeed({ ...columnar(), extra: true })).toBe(false);
        expect(isFeed(columnar())).toBe(false);
    });
});
