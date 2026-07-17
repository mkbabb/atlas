import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import type { VizContract } from "../../src/charts/contract/viz-contract";

// CD-09 (PA-9) — the atlas half: VizPlate suppresses its passive off-screen ChartDataTable when the
// plate declares a `sourceData` grid, and binds `aria-details` on the figure to the grid region id;
// the passive table mounts otherwise. This renders the REAL VizPlate template against a mocked host
// composable (the story-card-stats.spec pattern) so the assertion reads the SEATING the template
// owns, not the composable internals. ChartFrame is mocked to a single-root figure that lets attrs
// (the `aria-details` VizPlate passes) fall through so the figure binding is inspectable.

vi.mock("../../src/charts/frame/ChartFrame.vue", async () => {
    const { defineComponent, h } = await import("vue");
    return {
        default: defineComponent({
            inheritAttrs: false,
            setup(_, { slots, attrs }) {
                return () =>
                    h(
                        "figure",
                        { "data-chart-frame": "", ...attrs },
                        slots.default?.({ fullscreen: false }),
                    );
            },
        }),
    };
});

vi.mock("../../src/charts/legend/VizDescription.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});

// The host composable stub — sourceData is DRIVEN BY THE CONTRACT (`contract.sourceData?.panel`), so
// each test declares/omits the grid via the contract it passes, exactly as a real plate does. The
// region id is the real per-contract slug so the aria-details assertion pins the true binding.
vi.mock("../../src/charts/frame/useVizPlate", async () => {
    const { computed, ref, useSlots } = await import("vue");
    return {
        useVizPlate: (props: { contract: VizContract & { sourceData?: { panel?: unknown } } }) => ({
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
            aggregateStats: computed(() => []),
            keyStats: computed(() => []),
            provenance: null,
            archetype: null,
            filterDockOpen: false,
            toggleFilterDock: () => undefined,
            activeDimChips: [],
            activeFilterCount: 0,
            showAppliedSummary: false,
            sourceData: props.contract.sourceData?.panel ?? null,
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

// Stub the glass-ui UI subpaths VizPlate's static graph imports (dock/badge/dropdown/drawer/button).
// They render only in ChartFrame's #actions / the appendix foot — neither invoked here — so stubbing
// them is pure LOAD isolation: it sidesteps the glass-6/value-4 dist boundary (the known load-RED)
// without touching the sourceData gate under test. The stubs stay inert once the real boundary clears.
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

function baseContract(overrides: Partial<VizContract> = {}): VizContract {
    return {
        id: "grid-plate",
        title: "Grid plate",
        description: { prose: "A figure.", axes: [] },
        export: {
            rows: () => [{ name: "row A", value: "1" }],
            rowHeader: "Area",
            valueHeader: "Value",
        },
        ...overrides,
    };
}

async function render(contract: VizContract): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(VizPlate, { contract }, { default: () => h("div", { "data-body": "" }) }),
    });
    return renderToString(createSSRApp(App));
}

describe("VizPlate source-grid capability (CD-09)", () => {
    it("mounts the passive data table and binds no aria-details when no source grid is declared", async () => {
        const html = await render(baseContract());
        // the passive off-screen table (ChartDataTable's `<caption> — data table` aria-label) is present
        expect(html).toContain("Grid plate — data table");
        // no aria-details ATTRIBUTE bound on the figure (the bare word appears in template comments)
        expect(html).not.toContain("aria-details=");
    });

    it("suppresses the passive table and binds aria-details to the grid region when a source grid is declared", async () => {
        const contract = baseContract({
            // the declared capability — a SourceDataSpec panel (the SourceDataBrowser class)
            sourceData: { panel: {} },
        } as Partial<VizContract>);
        const html = await render(contract);
        expect(html).not.toContain("Grid plate — data table");
        expect(html).toContain('aria-details="viz-source-data-grid-plate"');
    });
});
