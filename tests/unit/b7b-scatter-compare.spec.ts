// U/B7b X1 · PLAN §8.1 E6: the scatter's pre/post compare mark. The earlier period is a hollow ring in
// the entity's colour, joined by one hairline to the later dot; only entities with both ends pair
// (an NSLP x axis carries 2025–26 only, so earlier NSLP ends are null and draw nothing).
import { describe, expect, it } from "vitest";
import {
    COMPARE_JOIN_ID,
    COMPARE_RING_ID,
    comparablePairs,
    scatterCompareSeries,
    type ComparePair,
} from "../../src/charts/marks";

const PAIRS: ComparePair[] = [
    { key: "district:010", from: [0.4, 120], to: [0.45, 310], color: "rgb(20, 90, 160)" },
    { key: "district:020", from: null, to: [0.6, 220], color: "rgb(160, 60, 20)" },
    { key: "district:030", from: [0.2, 80], to: [0.25, 95], color: "rgb(30, 120, 60)" },
    { key: "district:040", from: [Number.NaN, 50], to: [0.3, 60], color: "rgb(90, 90, 90)" },
];

describe("scatterCompareSeries (E6)", () => {
    it("pairs only the entities with both ends", () => {
        expect(comparablePairs(PAIRS).map((p) => p.key)).toEqual(["district:010", "district:030"]);
    });

    it("draws each earlier position as a hollow ring in its entity's colour, under the dots", () => {
        const [ring] = scatterCompareSeries(PAIRS, { symbolSize: 9, joinColor: "rgb(80, 80, 80)" });
        expect(ring.id).toBe(COMPARE_RING_ID);
        expect(ring.type).toBe("scatter");
        expect(ring.silent).toBe(true);
        expect(ring.symbolSize).toBe(9);
        expect(ring.data).toEqual([
            { name: "district:010", value: [0.4, 120], itemStyle: { color: "transparent", borderColor: "rgb(20, 90, 160)", borderWidth: 1.5 } },
            { name: "district:030", value: [0.2, 80], itemStyle: { color: "transparent", borderColor: "rgb(30, 120, 60)", borderWidth: 1.5 } },
        ]);
    });

    it("joins each pair with its own segment, broken between pairs", () => {
        const [, join] = scatterCompareSeries(PAIRS, { symbolSize: 9, joinColor: "rgb(80, 80, 80)" });
        expect(join.id).toBe(COMPARE_JOIN_ID);
        expect(join.type).toBe("line");
        expect(join.connectNulls).toBe(false);
        expect(join.silent).toBe(true);
        expect(join.data).toEqual([[0.4, 120], [0.45, 310], ["-", "-"], [0.2, 80], [0.25, 95]]);
    });

    it("is two empty series when nothing pairs", () => {
        const [ring, join] = scatterCompareSeries([PAIRS[1]!], { symbolSize: 9, joinColor: "rgb(80, 80, 80)" });
        expect(ring.data).toEqual([]);
        expect(join.data).toEqual([]);
    });
});
