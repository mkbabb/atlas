// U §L 6(f) / §K K-3: `useYearScope` writes the period through one set-valued codec, only on a
// reader act; the integer `years=`/`yearMode` keys are read once and never written; a program hold
// (a scene step) never writes. This file imports only the year scope and the URL bag, so every case
// runs, and fails by behaviour, against the atlas 7 year scope as well.
import { describe, expect, it } from "vitest";
import { effectScope } from "vue";

import type { Feed } from "../../src/data/contract";
import { resolveScope, useYearScope } from "../../src/data/useYearScope";
import { useUrlState } from "../../src/platform/composables/useUrlState";

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
// `useUrlState` outside a browser is the bag plus its helpers: the bag IS the URL here, so a
// write is a key change on it and "nothing written" is "the bag is unchanged".
function harness(f: Feed, query: Record<string, string>) {
    const scope = effectScope();
    const url = scope.run(() => useUrlState<string>())!;
    Object.assign(url.params, query);
    const ys = scope.run(() => useYearScope(f, url))!;
    return { url, ys, stop: () => scope.stop() };
}

describe("useYearScope binds the one codec (§L 6(f), §K K-3)", () => {
    it("reads a pooled legacy link once, writes nothing on load, and discloses it", () => {
        const h = harness(sci, { yearMode: "aggregate", years: "2014,2025", at: "rainbow" });
        expect(h.ys.scope.value).toEqual({ mode: "aggregate", years: [2014, 2025] });
        expect(h.ys.text.value).toBe("2014–15, 2025–26");
        expect(h.ys.notice.value?.causes).toEqual(["legacy"]);
        expect({ ...h.url.params }).toEqual({ yearMode: "aggregate", years: "2014,2025", at: "rainbow" });
        const frame = resolveScope(sci, h.ys.scope.value);
        expect(frame.kind).toBe("agg");
        h.stop();
    });

    it("a reader write goes through the codec, retires the legacy keys and closes the notice", () => {
        const h = harness(sci, { yearMode: "aggregate", years: "2014,2025" });
        h.ys.setAggregate([2014, 2016, 2017, 2018, 2025]);
        expect({ ...h.url.params }).toEqual({ sy: "2014-15,2016-17..2018-19,2025-26" });
        expect(h.ys.notice.value).toBeNull();
        expect(h.ys.scope.value).toEqual({ mode: "aggregate", years: [2014, 2016, 2017, 2018, 2025] });
        h.ys.setSingle(2019);
        expect({ ...h.url.params }).toEqual({ sy: "2019-20" });
        h.ys.setRange([2022, 2023]);
        expect({ ...h.url.params }).toEqual({ sy: "range:2022-23..2023-24" });
        expect(h.ys.mode.value).toBe("range");
        h.stop();
    });

    it("integer `years=` is never written, on either axis", () => {
        const h = harness(usf, {});
        h.ys.setAggregate([2016, 2017, 2018]);
        expect({ ...h.url.params }).toEqual({ year: "2016..2018" });
        h.ys.setSingle(2024);
        expect({ ...h.url.params }).toEqual({ year: "2024" });
        h.stop();
    });

    it("the axis key is read live (Back and Forward re-read it)", () => {
        const h = harness(sci, { sy: "2019-20" });
        expect(h.ys.scope.value).toEqual({ mode: "single", year: 2019 });
        h.url.params.sy = "2014-15..2016-17";
        expect(h.ys.scope.value).toEqual({ mode: "aggregate", years: [2014, 2015, 2016] });
        h.stop();
    });

    it("refuses loudly a reader write of a period the feed does not carry", () => {
        const h = harness(usf, {});
        expect(() => h.ys.setAggregate([2020, 2021])).toThrow(/2021 are not carried/);
        expect({ ...h.url.params }).toEqual({});
        h.stop();
    });

    it("a program hold moves the scope in memory and never writes; release returns the reader's", () => {
        const h = harness(sci, { sy: "2014-15..2025-26" });
        const release = h.ys.hold({ mode: "single", year: 2018 });
        expect(h.ys.scope.value).toEqual({ mode: "single", year: 2018 });
        expect({ ...h.url.params }).toEqual({ sy: "2014-15..2025-26" });
        release();
        expect(h.ys.scope.value).toEqual({ mode: "aggregate", years: SY });
        h.stop();
    });

    it("a reader write releases a program hold (latest intent wins)", () => {
        const h = harness(sci, {});
        h.ys.hold({ mode: "single", year: 2018 });
        h.ys.setSingle(2020);
        expect(h.ys.scope.value).toEqual({ mode: "single", year: 2020 });
        h.stop();
    });
});
