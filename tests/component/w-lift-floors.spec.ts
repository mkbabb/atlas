import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import ChartLegend from "../../src/charts/legend/ChartLegend.vue";
import { endLabelGutterCollapsed } from "../../src/charts/composables/useTimeSeriesOption";
import {
    cellFloorScale,
    CELL_TAP_FLOOR_PX,
    type Shape,
} from "../../src/charts/geo/useChoroplethShapes";
import {
    rankedBarRegister,
    barDesktopMinPx,
    BAR_TRACK_FLOOR_PX,
    BAR_LABEL_MIN_PX,
    BAR_LABEL_LINE_PX,
    NARROW_LABEL_MARGIN_PX,
    type RankedBarRegister,
} from "../../src/charts/marks/ranked-bar-register";

// W-LIFT (A-04 · A-29) — the mark legibility floors are POLICY, so their predicates are pure and
// tested here as arithmetic; the floors' rendered proof is the live 390 walk (the four proof sites),
// not a snapshot. The legend clamp line is rendered because it is a SENTENCE — its grammar belongs
// to the primitive, and a consumer that hands facts must get that sentence back.

/** A congruent binned cell field (the H3 hex layer's shape), sized in viewport units. */
function cells(n: number, minorAxis: number): Shape[] {
    return Array.from({ length: n }, (_, i) => ({
        key: `c${i}`,
        d: "",
        name: "",
        cx: 0,
        cy: 0,
        label: "",
        fill: "",
        minorAxis,
        hasValue: true,
    }));
}

describe("A-04 — the end-label gutter floor", () => {
    it("holds the declared gutter while the plot clears the floor", () => {
        // A desktop plate: 900px box, the crossover's own 96px end-label reserve.
        expect(endLabelGutterCollapsed(900, 96)).toBe(false);
    });

    it("collapses at the phone measure the fixed reserve starves", () => {
        // The live /demand crossover host at 390 (356px box) with `grid-right="96"`.
        expect(endLabelGutterCollapsed(356, 96)).toBe(true);
    });

    it("never fires on an unmeasured host (SSR/jsdom byte-parity)", () => {
        expect(endLabelGutterCollapsed(0, 96)).toBe(false);
        expect(endLabelGutterCollapsed(undefined, undefined)).toBe(false);
    });
});

describe("A-04 — the aggregated-cell tap floor", () => {
    it("clamps an under-floor congruent cell field to the tappable floor", () => {
        // The live speedtest field: 14 congruent hexes, ~8 viewport units minor axis, drawn at the
        // 356/975 px-per-unit the phone measure yields.
        const pxPerUnit = 356 / 975;
        const scale = cellFloorScale(cells(14, 8), pxPerUnit);
        expect(8 * pxPerUnit).toBeLessThan(CELL_TAP_FLOOR_PX); // RED without the floor
        expect(8 * pxPerUnit * scale).toBeCloseTo(CELL_TAP_FLOOR_PX, 6);
    });

    it("leaves an administrative geography alone (the congruence fence)", () => {
        // Counties: same rendered scale, but wildly unequal shapes — never a binned cell field.
        const counties = [...cells(1, 6), ...cells(1, 30), ...cells(1, 44)];
        expect(cellFloorScale(counties, 356 / 975)).toBe(1);
    });

    it("leaves a field already above the floor alone", () => {
        expect(cellFloorScale(cells(14, 40), 356 / 975)).toBe(1);
    });
});

describe("A-04 — the ranked-bar label register", () => {
    // The mark's declared insets (VIZ_GRID_BAR) — the register is reserved out of these.
    const grid = { left: 8, right: 80, top: 8, bottom: 8 };
    /** The drawn track the register implies: the box less every inset it reserves. */
    const track = (hostWidth: number, r: RankedBarRegister) =>
        hostWidth -
        grid.left -
        r.labelWidth -
        (r.narrow ? NARROW_LABEL_MARGIN_PX : 0) -
        r.valueGutter;

    it("renders the desktop shape on any box that affords it — and unmeasured", () => {
        // 396 = 8 + 80 + 168 + 140: the narrowest box that fits the ceiling AND the floor.
        expect(barDesktopMinPx(grid.left, grid.right)).toBe(396);
        for (const w of [396, 536, 1208]) {
            const r = rankedBarRegister(w, 640, 13, 7, grid);
            expect(r).toEqual({
                narrow: false,
                valueGutter: 80,
                labelWidth: 168,
                maxLines: 1,
                nameEveryRow: false,
            });
        }
        // 0 before the first measure (SSR/jsdom) ⇒ the same desktop shape, byte-unchanged.
        expect(rankedBarRegister(0, 0, 0, 0, grid).narrow).toBe(false);
    });

    it("reserves the track floor EXACTLY at the live 390 proof site", () => {
        // /ecf consultants at a true 390 viewport: a 262×560 box, 13 rows, "$646.9K" the longest face.
        const r = rankedBarRegister(262, 560, 13, 7, grid);
        expect(r.narrow).toBe(true);
        expect(r.valueGutter).toBe(53); // ceil(7 × 0.6 × 11) + 6 — the counted run, not the 80 blanket
        expect(r.labelWidth).toBe(57);
        expect(track(262, r)).toBe(BAR_TRACK_FLOOR_PX); // RED before the cure: 107px drawn
    });

    it("holds the track floor across every squeezed box the column can pay for", () => {
        // 261 = the crossover: below it the name floor binds first and the track must give.
        for (let w = 261; w < 396; w++) {
            const r = rankedBarRegister(w, 560, 13, 7, grid);
            expect(track(w, r)).toBeGreaterThanOrEqual(BAR_TRACK_FLOOR_PX);
        }
        expect(track(261, rankedBarRegister(261, 560, 13, 7, grid))).toBe(140);
        expect(track(260, rankedBarRegister(260, 560, 13, 7, grid))).toBe(139);
    });

    it("stops yielding at the name floor rather than un-naming a row", () => {
        // Past the crossover neither can be paid in full. The column holds at the width below
        // which it names nothing, and the TRACK gives — the ordering is stated, never inverted
        // silently, and the mark never trades a row's identity for a pixel of bar.
        const r = rankedBarRegister(200, 560, 13, 7, grid);
        expect(r.labelWidth).toBe(BAR_LABEL_MIN_PX);
        expect(track(200, r)).toBeLessThan(BAR_TRACK_FLOOR_PX);
    });

    it("caps the wrap at the whole lines the ROW BAND holds", () => {
        // 560px box, 8/8 insets ⇒ 544px of plot. The band is what bounds the block.
        expect(rankedBarRegister(262, 560, 13, 7, grid).maxLines).toBe(2); // band 41.8 ⇒ 2 × 15px
        expect(rankedBarRegister(262, 560, 6, 7, grid).maxLines).toBe(5); // band 90.7 ⇒ 5
        expect(rankedBarRegister(262, 560, 30, 7, grid).maxLines).toBe(1); // band 18.1 ⇒ 1
        // Every capped block fits inside its own band, so two can never intersect.
        for (const rows of [2, 6, 11, 13, 20, 30]) {
            const r = rankedBarRegister(262, 560, rows, 7, grid);
            expect(r.maxLines * BAR_LABEL_LINE_PX).toBeLessThanOrEqual(544 / rows);
        }
    });

    it("asks for every name only while the band can clear one line", () => {
        expect(rankedBarRegister(262, 560, 13, 7, grid).nameEveryRow).toBe(true);
        // 40 rows in the same box: a 13.6px band cannot clear a 15px line, so ECharts' own
        // thinning stays — dropping a name is honest where overprinting one is not.
        expect(rankedBarRegister(262, 560, 40, 7, grid).nameEveryRow).toBe(false);
    });

    it("reserves nothing for a value run a consumer never binds", () => {
        const r = rankedBarRegister(262, 560, 13, 0, grid);
        expect(r.valueGutter).toBe(0);
        expect(track(262, r)).toBeGreaterThanOrEqual(BAR_TRACK_FLOOR_PX);
    });
});

describe("A-29 — the clamped-ramp statement", () => {
    it("says the cap AND the maximum it hides, in the legend's own grammar", async () => {
        const html = await renderToString(
            createSSRApp(() =>
                h(ChartLegend, {
                    mode: "continuous",
                    lowLabel: "less",
                    highLabel: "more",
                    clamp: { cap: "$445", percentile: "P95", max: "$722", holder: "Hyde" },
                }),
            ),
        );
        expect(html).toContain("capped at $445");
        expect(html).toContain("(P95)");
        expect(html).toContain("max $722, Hyde");
    });

    it("stays silent on an unclamped ramp", async () => {
        const html = await renderToString(
            createSSRApp(() => h(ChartLegend, { mode: "continuous", lowLabel: "less" })),
        );
        expect(html).not.toContain("chart-legend__clamp");
    });
});
