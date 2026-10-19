// U §L 6(f) / X-5′ / X-11′: one set-valued period codec and restatement operator, bound by
// `useYearScope`. Element-wise on a set, gaps preserved, school years spelled `sy=2014-15..2025-26`;
// the integer `years=` (and `yearMode`, and `year` on a school-year feed) is read once with a notice
// and never written; every reader write goes through the one codec; nothing is written on load; a
// scene's year is held in memory, never written.
import { describe, expect, it } from "vitest";

import type { Feed } from "../../src/data/contract";
import { isFeed } from "../../src/data/contract";
import {
    calendarYearToSchoolYear,
    periodCodecFor,
    restatePeriod,
    type PeriodScope,
} from "../../src/data/period";

const SY = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const USF = [2015, 2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025]; // 2021 skipped

function feed(years: number[], schoolYear: boolean): Feed {
    return {
        meta: {
            schemaVersion: 2,
            dataset: schoolYear ? "sci" : "usf",
            keyField: "id",
            entityGrain: "district",
            years,
            latestYear: years[years.length - 1]!,
            generatedAt: "2026-10-19T00:00:00Z",
            measures: ["v"],
            aggregable: { v: "sum" },
            ...(schoolYear ? { period: { axis: "school-year" as const, param: "sy" } } : {}),
        },
        rows: years.flatMap((year) => [
            { id: "A", year, v: 1 },
            { id: "B", year, v: 2 },
        ]),
    };
}
const sci = feed(SY, true);
const usf = feed(USF, false);
const syCodec = periodCodecFor(sci.meta);
const yCodec = periodCodecFor(usf.meta);

describe("the codec (one key, set-valued, gaps kept)", () => {
    it("derives the key and the noun from the declared axis (X-11′)", () => {
        expect(syCodec.param).toBe("sy");
        expect(syCodec.noun.singular).toBe("school year");
        expect(syCodec.noun.label(2024)).toBe("2024–25");
        expect(yCodec.param).toBe("year");
        expect(yCodec.noun.label(2024)).toBe("2024");
    });

    it.each<[string, PeriodScope]>([
        ["2024-25", { mode: "single", year: 2024 }],
        ["2014-15..2025-26", { mode: "aggregate", years: SY }],
        ["2014-15,2025-26", { mode: "aggregate", years: [2014, 2025] }],
        ["2014-15,2016-17..2018-19,2025-26", { mode: "aggregate", years: [2014, 2016, 2017, 2018, 2025] }],
        ["2019-20..2019-20", { mode: "aggregate", years: [2019] }],
        ["range:2014-15..2016-17", { mode: "range", years: [2014, 2015, 2016] }],
        ["range:2020-21", { mode: "range", years: [2020] }],
    ])("school years: %s round-trips", (raw, scope) => {
        expect(syCodec.parse(raw)).toEqual(scope);
        expect(syCodec.format(scope)).toBe(raw);
    });

    it.each<[string, PeriodScope]>([
        ["2024", { mode: "single", year: 2024 }],
        ["2016..2020", { mode: "aggregate", years: [2016, 2017, 2018, 2019, 2020] }],
        ["2016,2025", { mode: "aggregate", years: [2016, 2025] }],
        ["range:2022..2024", { mode: "range", years: [2022, 2023, 2024] }],
    ])("plain years: %s round-trips", (raw, scope) => {
        expect(yCodec.parse(raw)).toEqual(scope);
        expect(yCodec.format(scope)).toBe(raw);
    });

    it.each(["2014", "2014-16", "2015-16..2014-15", "aggregate:2014-15", "2014-15...2015-16", "", "range:"])(
        "refuses %j on a school-year axis",
        (raw) => expect(syCodec.parse(raw)).toBeNull(),
    );

    it("a school-year feed's legacy keys include `year`; a plain-year feed writes `year`", () => {
        expect(syCodec.legacyParams).toEqual(["year", "yearMode", "years"]);
        expect(yCodec.legacyParams).toEqual(["yearMode", "years"]);
    });

    it("refuses an unknown declared axis at the contract and at the codec", () => {
        const bad = { ...sci.meta, period: { axis: "fiscal-year", param: "fy" } };
        expect(isFeed({ meta: bad, rows: sci.rows })).toBe(false);
        expect(isFeed(sci)).toBe(true);
        expect(() => periodCodecFor(bad as never)).toThrow(/unknown period axis/);
    });
});

describe("the restatement operator (element-wise on a set)", () => {
    it("calendar year N is school year N–(N+1) by majority of days", () => {
        expect(calendarYearToSchoolYear(2024)).toBe(2024);
        expect(calendarYearToSchoolYear(2021)).toBe(2021);
    });

    it("an exact `sy` request carries no notice", () => {
        const r = restatePeriod({ sy: "2014-15,2025-26" }, SY, syCodec);
        expect(r).toEqual({ scope: { mode: "aggregate", years: [2014, 2025] }, source: "param", notice: null });
    });

    it("integer `years=` is read with a notice, element-wise, gaps kept (not a hull)", () => {
        const r = restatePeriod({ yearMode: "aggregate", years: "2014,2025" }, SY, syCodec);
        expect(r.scope).toEqual({ mode: "aggregate", years: [2014, 2025] });
        expect(r.source).toBe("legacy");
        expect(r.notice?.causes).toEqual(["legacy"]);
        expect(r.notice?.sentence).toBe(
            "This link asked for calendar years 2014, 2025, which the atlas reads as school years 2014–15, 2025–26.",
        );
    });

    it("a legacy `?year=` on a school-year feed is restated and disclosed", () => {
        const r = restatePeriod({ year: "2024" }, SY, syCodec);
        expect(r.scope).toEqual({ mode: "single", year: 2024 });
        expect(r.notice?.sentence).toBe(
            "This link asked for calendar year 2024, which the atlas reads as school year 2024–25.",
        );
    });

    it("on a plain-year feed `?year=` is the axis key (no notice) and `years=` is legacy", () => {
        expect(restatePeriod({ year: "2019" }, USF, yCodec).notice).toBeNull();
        const r = restatePeriod({ yearMode: "range", years: "2019-2023" }, USF, yCodec);
        expect(r.scope).toEqual({ mode: "range", years: [2019, 2020, 2022, 2023] });
        expect(r.notice?.causes).toEqual(["legacy", "clipped"]);
        expect(r.notice?.sentence).toBe(
            "This link asked for 2019 to 2023 in a retired spelling. This page has 4 of those 5 years, so it shows 2019, 2020, 2022, 2023.",
        );
    });

    it("a period the feed does not carry restates to the nearest, ties to the later", () => {
        const r = restatePeriod({ year: "2021" }, USF, yCodec);
        expect(r.scope).toEqual({ mode: "single", year: 2022 });
        expect(r.notice?.causes).toEqual(["not-carried"]);
    });

    it("the axis key decides; an unreadable value never falls through to a legacy key", () => {
        const r = restatePeriod({ sy: "2019", year: "2019" }, SY, syCodec);
        expect(r.scope).toEqual({ mode: "single", year: 2025 });
        expect(r.notice?.causes).toEqual(["unreadable"]);
    });

    it("no notice sentence names a calendar date (CX-LAPSE)", () => {
        const sentences = [
            restatePeriod({ yearMode: "aggregate", years: "2010-2030" }, SY, syCodec),
            restatePeriod({ sy: "garbage" }, SY, syCodec),
            restatePeriod({ year: "2031" }, SY, syCodec),
        ].map((r) => r.notice?.sentence ?? "");
        for (const s of sentences) expect(s).not.toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
    });

    it("a feed that carries no years is refused", () => {
        expect(() => restatePeriod({}, [], syCodec)).toThrow(/declares no years/);
    });
});

describe("a plate dial cannot write a period key around the codec", () => {
    it.each(["year", "years", "yearMode", "sy"])("refuses a global dial on %s", async (key) => {
        const { useVizOptions } = await import("../../src/charts/composables/useVizOptions");
        expect(() =>
            useVizOptions("sci-map", [
                { kind: "select", key, label: "School year", scope: "global", default: "2025", choices: [] },
            ]),
        ).toThrow(/declare it scope: "period"/);
    });
});
