import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import type { EChartsOption } from "echarts";

// W-SCI SS3-5 — the platform StackedBar y-axis unit/format arm. This binds the SHIPPED StackedBar's
// COMPILED ECharts option: `useEChart` is mocked to CAPTURE the option factory the SFC hands it, so
// the assertion reads the real y-axis the component assembles — not a re-derivation. If the SFC stops
// threading `yAxisFormat` into `yAxis.axisLabel`, the captured formatter disappears and the with-format
// test goes RED; the no-format case proves today's number ticks are byte-for-byte unchanged.

const captured = vi.hoisted(() => ({ option: null as null | (() => EChartsOption) }));

vi.mock("../../src/charts/composables/useEChart", async () => {
    const { shallowRef } = await import("vue");
    return {
        useEChart: (opts: { option: () => EChartsOption }) => {
            captured.option = opts.option;
            return {
                chart: shallowRef(null),
                stageMorphOwned: false,
                highlight: () => {},
                downplay: () => {},
            };
        },
    };
});

// A deterministic palette so the option assembles without a live getComputedStyle read.
vi.mock("../../src/charts/composables/useVizPalette", () => ({
    useVizPalette: () => ({
        value: { grid: "#ccc", muted: "#666", fontMono: "mono", figureAxisPx: 13 },
    }),
}));

import StackedBar from "../../src/charts/marks/StackedBar.vue";

const base = {
    categories: [2019, 2020],
    series: [
        { tier: 1, label: "A", values: [10, 20] },
        { tier: 2, label: "B", values: [5, 8] },
    ],
    colorScale: (t: number) => `c${t}`,
    tierOrder: [1, 2],
};

async function yAxisOf(props: Record<string, unknown>): Promise<Record<string, any>> {
    captured.option = null;
    const App = defineComponent({ setup: () => () => h(StackedBar, props as never) });
    await renderToString(createSSRApp(App));
    // The mock reassigns `captured.option` during render; TS cannot see that, so read it back through
    // an explicit type (its control-flow still holds the top-of-function `= null`).
    const factory = captured.option as (() => EChartsOption) | null;
    if (!factory) throw new Error("StackedBar did not call useEChart");
    return factory().yAxis as Record<string, any>;
}

describe("W-SCI SS3-5 — the StackedBar y-axis unit/format arm", () => {
    it("carries the consumer's unit at the tick when yAxisFormat is wired", async () => {
        const yAxis = await yAxisOf({ ...base, yAxisFormat: (v: number) => `${v} Mbps` });
        expect(typeof yAxis.axisLabel.formatter).toBe("function");
        expect(yAxis.axisLabel.formatter(573)).toBe("573 Mbps");
    });

    it("leaves the y-axis on ECharts' default number labels when omitted (byte-for-byte)", async () => {
        const yAxis = await yAxisOf(base);
        expect(yAxis.axisLabel.formatter).toBeUndefined();
    });

    it("does not disturb the share-domain close on a composition stack", async () => {
        // A share stack (Σ≤1) still closes on 1 with the format arm present — the arm touches only
        // the tick label, never the domain.
        const shareSeries = [
            { tier: 1, label: "A", values: [0.6, 0.5] },
            { tier: 2, label: "B", values: [0.4, 0.5] },
        ];
        const yAxis = await yAxisOf({
            ...base,
            series: shareSeries,
            yAxisFormat: (v: number) => `${Math.round(v * 100)}%`,
        });
        expect(yAxis.max).toBe(1);
        expect(yAxis.axisLabel.formatter(0.4)).toBe("40%");
    });
});
