// U/B7d D1 · item 5. `TimeSeries` emits `@hover` from ECharts' series `mouseover`, which a
// `showSymbol:false` line dispatches on its stroke only under `triggerLineEvent`. The builder set it
// only under the curve-latch opt-in (`selectableCurves`), so a hover listener got nothing unless the
// consumer also accepted the click latch (sci /demand's crossover latched its lines for that reason).
// Every real drawn line is now a stroke target whatever the latch; bands and hidden bases are not.
import { describe, expect, it } from "vitest";
import { buildTimeSeriesOption } from "../../src/charts/composables/useTimeSeriesOption";
import type { LineSeries } from "../../src/charts/marks/TimeSeries.vue";

const palette = {
    muted: "rgb(120,120,120)",
    grid: "rgb(220,220,220)",
    fontMono: "Fira Code",
    figureAxisPx: 14,
    diverging: { low: "rgb(190,90,60)" },
} as unknown as Parameters<typeof buildTimeSeriesOption>[2];

const series: LineSeries[] = [
    { key: "demand", label: "Demand", color: "rgb(20,120,120)", points: [{ x: 2020, y: 1 }, { x: 2025, y: 4 }] },
    { key: "capacity", label: "Capacity", color: "rgb(190,90,60)", points: [{ x: 2020, y: 3 }, { x: 2025, y: 3 }] },
];

type Row = Record<string, unknown> & { name?: string };

describe("a TimeSeries line is a hover target without the curve latch", () => {
    it("every real line carries triggerLineEvent with no latch dial", () => {
        const rows = buildTimeSeriesOption(series, {}, palette).series as Row[];
        expect(rows.filter((r) => r.name === "Demand" || r.name === "Capacity").map((r) => r.triggerLineEvent)).toEqual([
            true,
            true,
        ]);
    });
});
