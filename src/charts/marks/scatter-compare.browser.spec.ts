// The compare mark painted by ECharts in a real engine (U/B7b · PLAN §8.1 E6): two rings and two
// separate join segments for two pairs. A join that ran on across the "-" break would draw one
// segment from the first pair's later dot to the second pair's earlier ring (one move-to, not two).
import { afterEach, describe, expect, it } from "vitest";
import { init, use, type ECharts } from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { scatterCompareSeries, type ComparePair } from "./scatter-compare";

use([ScatterChart, LineChart, GridComponent, SVGRenderer]);

let chart: ECharts | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
    chart?.dispose();
    host?.remove();
    chart = null;
    host = null;
});

const JOIN = "rgb(80,80,80)";
const PAIRS: ComparePair[] = [
    { key: "a", from: [1, 1], to: [2, 3], color: "rgb(20,90,160)" },
    { key: "b", from: [6, 2], to: [8, 5], color: "rgb(160,60,20)" },
    { key: "c", from: null, to: [4, 4], color: "rgb(30,120,60)" },
];

describe("scatterCompareSeries in ECharts", () => {
    it("paints a hollow ring per pair and one join segment per pair", () => {
        host = document.createElement("div");
        host.style.cssText = "width:400px;height:300px";
        document.body.appendChild(host);
        chart = init(host, undefined, { renderer: "svg" });
        const [ring, join] = scatterCompareSeries(PAIRS, { symbolSize: 10, joinColor: JOIN });
        chart.setOption({
            animation: false,
            xAxis: { type: "value", min: 0, max: 10 },
            yAxis: { type: "value", min: 0, max: 6 },
            series: [ring, join],
        });
        const paths = [...host.querySelectorAll("path")];
        const stroke = (el: Element) => (el.getAttribute("stroke") ?? "").replace(/\s+/g, "");
        // ECharts paints a broken polyline as one path with one move-to per segment.
        const joins = paths.filter((p) => stroke(p) === JOIN);
        expect(joins).toHaveLength(1);
        expect((joins[0]!.getAttribute("d") ?? "").match(/M/g)).toHaveLength(2);
        const rings = paths.filter((p) => ["rgb(20,90,160)", "rgb(160,60,20)"].includes(stroke(p)));
        expect(rings).toHaveLength(2);
        for (const r of rings) expect(["none", "transparent", "rgba(0,0,0,0)"]).toContain(r.getAttribute("fill"));
    });
});
