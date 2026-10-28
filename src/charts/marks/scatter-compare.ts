// platform/charts/marks/scatter-compare.ts — THE PRE/POST COMPARE MARK (U/B7b · PLAN §8.1 E6).
//
// When a scatter compares two periods (the dock's range mode), each entity is drawn twice: the later
// period is the plate's own filled dot, and this mark adds the earlier period as a HOLLOW ring in the
// entity's colour, joined to the later dot by a hairline. The reader sees where each district moved
// and which way.
//
// A pair is drawn only when BOTH ends have a value. On an x measure that a period does not carry
// (NSLP before 2025–26, PLAN §8.1 E6), the caller passes a null end and the entity has no compare
// mark; nothing is imputed.
//
// PURE: two ECharts series fragments the plate's option builder appends to its own series list (the
// `ScatterPlate` `option` seam). The ring and the join are `silent`: hover and selection stay on the
// later period's dot, which is the datum. Colours are RESOLVED strings, never a `var(--…)` (the
// canvas-colour law, `trajectory-marks.ts`). The consumer registers `ScatterChart` and `LineChart`.
import type { LineSeriesOption, ScatterSeriesOption } from "echarts";

/** One entity's two periods. A null end means the period has no value for this entity. */
export interface ComparePair {
    /** The entity key (the selection codec's `{kind}:{id}`), carried as the datum name. */
    key: string;
    /** The earlier period's [x, y], drawn hollow. */
    from: readonly [number, number] | null;
    /** The later period's [x, y], the plate's own dot. */
    to: readonly [number, number] | null;
    /** The entity's RESOLVED colour (the ring stroke). */
    color: string;
}

export interface CompareMarkOptions {
    /** The ring's diameter in px: the plate's own dot size, so the two read as one entity. */
    symbolSize: number;
    /** The join's RESOLVED colour (a recessive ink; the ring carries the entity's colour). */
    joinColor: string;
    /** The ring's stroke width in px. Default 1.5. */
    ringWidth?: number;
    /** The join's width in px. Default 1. */
    joinWidth?: number;
}

/** The series ids, so a plate's hover bridge and a test can find the two fragments. */
export const COMPARE_RING_ID = "compare-earlier";
export const COMPARE_JOIN_ID = "compare-join";

const finite = (p: readonly [number, number] | null): p is readonly [number, number] =>
    p !== null && Number.isFinite(p[0]) && Number.isFinite(p[1]);

/** The pairs that can be drawn: both ends present and finite. */
export function comparablePairs(pairs: readonly ComparePair[]): ComparePair[] {
    return pairs.filter((p) => finite(p.from) && finite(p.to));
}

/**
 * The compare mark: a hollow ring at each earlier position and a hairline from it to the later
 * position. Returns `[ring, join]`; both are empty series when no pair has two ends.
 */
export function scatterCompareSeries(
    pairs: readonly ComparePair[],
    options: CompareMarkOptions,
): [ScatterSeriesOption, LineSeriesOption] {
    const drawn = comparablePairs(pairs);
    const ring: ScatterSeriesOption = {
        id: COMPARE_RING_ID,
        type: "scatter",
        silent: true,
        // Under the later dots: a ring never hides the datum it points to.
        z: 1,
        symbol: "circle",
        symbolSize: options.symbolSize,
        animation: false,
        data: drawn.map((p) => ({
            name: p.key,
            value: [p.from![0], p.from![1]],
            itemStyle: { color: "transparent", borderColor: p.color, borderWidth: options.ringWidth ?? 1.5 },
        })),
    };
    // One line series for every join: a "-" point between pairs breaks the polyline, so each pair is
    // its own segment (ECharts reads a "-" coordinate as empty and does not connect across it).
    const join: LineSeriesOption = {
        id: COMPARE_JOIN_ID,
        type: "line",
        silent: true,
        z: 0,
        symbol: "none",
        connectNulls: false,
        animation: false,
        lineStyle: { color: options.joinColor, width: options.joinWidth ?? 1 },
        data: drawn.flatMap((p, i) => {
            const segment: (number | string)[][] = [
                [p.from![0], p.from![1]],
                [p.to![0], p.to![1]],
            ];
            return i < drawn.length - 1 ? [...segment, ["-", "-"]] : segment;
        }),
    };
    return [ring, join];
}
