import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import type { VizContract } from "../../src/charts/contract/viz-contract";

vi.mock("../../src/charts/frame/ChartFrame.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return {
        default: defineComponent({
            setup(_, { slots }) {
                return () => h("figure", { "data-chart-frame": "" }, slots.default?.({ fullscreen: false }));
            },
        }),
    };
});

vi.mock("../../src/editorial/Beat.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return { default: defineComponent({ setup: (_, { slots }) => () => h("section", slots.figure?.()) }) };
});
vi.mock("../../src/editorial/GhostNumeral.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});
vi.mock("../../src/editorial/AnimatedRule.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});
vi.mock("@mkbabb/glass-ui/card", async () => {
    const { defineComponent, h } = await import("vue");
    return { Card: defineComponent({ setup: (_, { slots }) => () => h("article", slots.default?.()) }) };
});
vi.mock("../../src/charts/legend/VizAggregateStats.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return {
        default: defineComponent({
            props: ["stats", "placement"],
            setup: (props) => () =>
                props.stats.length
                    ? h("dl", { "data-testid": "viz-aggregate-stats", "data-placement": props.placement })
                    : null,
        }),
    };
});

vi.mock("../../src/charts/frame/useVizPlate", async () => {
    const { computed, ref, useSlots } = await import("vue");
    return { useVizPlate: (props: { contract: VizContract }) => ({
        slots: useSlots(),
        showOwnTitle: false,
        legend: null,
        legendDock: "none",
        legendIsStepped: false,
        onExportCsv: () => undefined,
        onExportImage: () => undefined,
        platePhase: "figure",
        errorAction: undefined,
        hasNav: false,
        liveSentence: "",
        focusRim: { visible: false, x: 0, y: 0 },
        onFigureKey: () => undefined,
        focusedStat: null,
        filterDimensions: [],
        reveal: null,
        glyphs: null,
        aggregateStats: computed(() => props.contract.aggregateStats?.() ?? []),
        keyStats: computed(() => props.contract.keyStats?.() ?? []),
        provenance: null,
        archetype: null,
        filterDockOpen: false,
        toggleFilterDock: () => undefined,
        activeDimChips: [],
        activeFilterCount: 0,
        showAppliedSummary: false,
        sourceData: null,
        sourceDataOpen: false,
        openSourceData: () => undefined,
        closeSourceData: () => undefined,
        isFullscreen: false,
        toggleEnlarge: () => undefined,
        ariaLabel: props.contract.title,
        size: "default",
        frameRef: ref(null),
    }) };
});

import StoryCard from "../../src/editorial/StoryCard.vue";
import VizPlate from "../../src/charts/frame/VizPlate.vue";

describe("StoryCard aggregate-stat registration", () => {
    it("hoists a wrapper component's VizPlate stats into sector 3 without an internal duplicate", async () => {
        const contract: VizContract = {
            id: "wrapped",
            title: "Wrapped figure",
            description: { prose: "A figure.", axes: [] },
            aggregateStats: () => [{ value: "42", caption: "districts" }],
            export: { rows: () => [], rowHeader: "District", valueHeader: "Value" },
        };
        const Wrapper = defineComponent({
            setup: () => () =>
                h(VizPlate, { contract }, {
                    default: () => h("div", { "data-viz-body-probe": "" }),
                    "aggregate-stats": () => h("div", { "data-internal-stats": "" }),
                }),
        });
        const App = defineComponent({
            setup: () => () =>
                h(StoryCard, {}, {
                    header: () => h("h2", "Wrapped"),
                    figure: () => h(Wrapper),
                }),
        });
        const html = await renderToString(createSSRApp(App));
        expect(html).toContain('data-testid="viz-aggregate-stats"');
        expect(html.match(/data-testid="viz-aggregate-stats"/g) ?? []).toHaveLength(1);
        expect(html).not.toContain("data-internal-stats");
        expect(html).not.toContain('data-testid="viz-plate-foot"');
    });
});
