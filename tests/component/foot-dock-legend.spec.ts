import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import type { VizContract } from "../../src/charts/contract/viz-contract";

// E5 — the LegendSpec.dock:"foot" resolution. Two halves: (1) `resolveLegendDock` maps a declared
// `LegendSpec.dock` onto the seat (the pure resolution), and (2) VizPlate SEATS the resolved dock —
// a `foot` dock lays the legend BENEATH the body (`.viz-plate__foot-legend`) while ChartFrame VACATES
// the header KEY column + side rail (it receives `legendDock: "foot"` and NO forwarded `#legend`
// slot). The mock host DERIVES legendDock from the contract through the REAL resolver (re-exported via
// importOriginal), so the render exercises the true contract→seat mapping, not a restated constant.

// The frame primitive, stubbed to REPORT the resolved dock + whether a header legend was forwarded,
// and to render the default slot (where the foot seat lives).
vi.mock("../../src/charts/frame/ChartFrame.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return {
        default: defineComponent({
            props: { legendDock: { type: String, default: "inline" } },
            inheritAttrs: false,
            setup(props, { slots }) {
                return () =>
                    h(
                        "figure",
                        {
                            "data-chart-frame": "",
                            "data-legend-dock": props.legendDock,
                            "data-legend-forwarded": slots.legend ? "yes" : "no",
                        },
                        [slots.default?.({ fullscreen: false })],
                    );
            },
        }),
    };
});
vi.mock("../../src/charts/legend/ChartLegend.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return { default: defineComponent(() => () => h("div", { "data-chart-legend": "" })) };
});
vi.mock("../../src/charts/legend/VizDescription.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});

// The host composable stub — legendDock DERIVED from the contract by the REAL `resolveLegendDock`
// (re-exported here), so the render tests the true resolution+seating without the plate's full store
// bootstrap (dashboard registry + router). The rest is the minimal render surface.
vi.mock("../../src/charts/frame/useVizPlate", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("../../src/charts/frame/useVizPlate")>();
    const { computed, ref, useSlots } = await import("vue");
    return {
        ...actual,
        useVizPlate: (props: { contract: VizContract }) => ({
            slots: useSlots(),
            showOwnTitle: false,
            legend: props.contract.legend ?? null,
            legendDock: actual.resolveLegendDock(
                props.contract.legend,
                props.contract.size,
                false,
            ),
            legendIsStepped: props.contract.legend?.mode === "stepped",
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
            aggregateStats: computed(() => []),
            keyStats: computed(() => []),
            provenance: null,
            archetype: null,
            filterDockOpen: false,
            toggleFilterDock: () => undefined,
            activeDimChips: [],
            activeFilterCount: 0,
            showAppliedSummary: false,
            sourceData: null,
            sourceEventHub: null,
            sourceDataOpen: false,
            sourceDataRegionId: `viz-source-data-${props.contract.id}`,
            openSourceData: () => undefined,
            closeSourceData: () => undefined,
            isFullscreen: false,
            toggleEnlarge: () => undefined,
            ariaLabel: props.contract.title,
            size: "default",
            frameRef: ref(null),
        }),
    };
});

// Stub the glass-ui UI subpaths in VizPlate's (and useVizPlate's) static graph — load isolation past
// the glass-6/value-4 dist boundary; none render here (ChartFrame's #actions / the appendix foot are
// not invoked).
const inert = vi.hoisted(() => async () => {
    const { defineComponent } = await import("vue");
    const Stub = defineComponent({ setup: (_, { slots }) => () => slots.default?.() });
    return new Proxy({}, { get: () => Stub });
});
vi.mock("@mkbabb/glass-ui/dock", inert);
vi.mock("@mkbabb/glass-ui/badge", inert);
vi.mock("@mkbabb/glass-ui/dropdown-menu", inert);
vi.mock("@mkbabb/glass-ui/drawer", inert);
vi.mock("@mkbabb/glass-ui/button", inert);

import VizPlate from "../../src/charts/frame/VizPlate.vue";
import { resolveLegendDock } from "../../src/charts/frame/useVizPlate";

function contractWith(legend: VizContract["legend"]): VizContract {
    return {
        id: "legend-plate",
        title: "Legend plate",
        description: { prose: "A figure.", axes: [] },
        legend,
        export: { rows: () => [], rowHeader: "Area", valueHeader: "Value" },
    };
}

async function render(contract: VizContract): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(VizPlate, { contract }, { default: () => h("div", { "data-body": "" }) }),
    });
    return renderToString(createSSRApp(App));
}

describe("resolveLegendDock", () => {
    it("maps the declared LegendSpec.dock onto the seat", () => {
        expect(resolveLegendDock({ mode: "inline", dock: "foot" }, "default", false)).toBe(
            "foot",
        );
        // rail is hero-only — it falls back to inline off the hero register
        expect(resolveLegendDock({ mode: "inline", dock: "rail" }, "hero", false)).toBe("rail");
        expect(resolveLegendDock({ mode: "inline", dock: "rail" }, "default", false)).toBe(
            "inline",
        );
        // an undocked legend is inline; no legend + no slot is none; a bespoke #legend slot is inline
        expect(resolveLegendDock({ mode: "inline" }, "default", false)).toBe("inline");
        expect(resolveLegendDock(undefined, "default", false)).toBe("none");
        expect(resolveLegendDock(undefined, "default", true)).toBe("inline");
    });
});

describe("VizPlate foot-dock seating", () => {
    it("seats a foot-docked legend beneath the body and vacates ChartFrame's header/rail", async () => {
        const html = await render(
            contractWith({ mode: "inline", dock: "foot", colorKind: "sequential" }),
        );
        // the beneath-body foot seat renders (in the default slot flow, below the figure)
        expect(html).toContain("viz-plate__foot-legend");
        // ChartFrame resolved the foot dock …
        expect(html).toContain('data-legend-dock="foot"');
        // … and the header KEY column / side rail are vacated — NO `#legend` forwarded to the frame
        expect(html).toContain('data-legend-forwarded="no"');
    });

    it("keeps a default (undocked) legend in ChartFrame's inline header seat", async () => {
        const html = await render(contractWith({ mode: "inline", colorKind: "sequential" }));
        expect(html).not.toContain("viz-plate__foot-legend");
        expect(html).toContain('data-legend-dock="inline"');
        // the inline dock forwards `#legend` to the frame's header KEY column
        expect(html).toContain('data-legend-forwarded="yes"');
    });
});
