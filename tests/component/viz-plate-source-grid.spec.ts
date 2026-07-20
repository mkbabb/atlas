import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VizContract } from "../../src/charts/contract/viz-contract";

// CD-09 (PA-9) — the atlas half: VizPlate suppresses its passive off-screen ChartDataTable when the
// plate declares a `sourceData` grid (capability-keyed), and binds `aria-details` on the figure to the
// grid region id ONLY while that grid is OPEN (CHALLENGE-3 A1) — the source-data <aside> that carries
// the id renders only then, so a rest-state binding would dangle the IDREF. This renders the REAL
// VizPlate template against a mocked host composable (the story-card-stats.spec pattern) so the
// assertion reads the SEATING the template owns, not the composable internals. ChartFrame is mocked to
// a single-root figure that lets attrs (the `aria-details` VizPlate passes) fall through so the figure
// binding is inspectable. `sourceDataOpen` is driven per-test so both states are pinned.

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

// The ONE generic browser the host mounts from a declared scope (A-33) — stubbed to a marker div so
// the assertion reads the SEATING, not the browser's own machinery.
vi.mock("../../src/filter/ui/SourceDataBrowser.vue", async () => {
    const { defineComponent, h } = await import("vue");
    // `__esModule` so the host's `defineAsyncComponent` unwraps `.default`, exactly as a real
    // dynamic-import namespace does.
    return {
        __esModule: true,
        default: defineComponent({
            name: "SourceDataBrowser",
            setup: () => () => h("div", { "data-source-panel": "" }, "grid"),
        }),
    };
});

// The open-state knob the host would derive from the `?browse=` param — driven per-test so the closed
// and open renders are both pinned off the ONE real template.
const host = vi.hoisted(() => ({ sourceDataOpen: false }));

// The host composable stub — sourceData is DRIVEN BY THE CONTRACT (the declared `DataScope`), so
// each test declares/omits the grid via the contract it passes, exactly as a real plate does. The
// region id is the real per-contract slug so the aria-details assertion pins the true binding.
vi.mock("../../src/charts/frame/useVizPlate", async () => {
    const { computed, ref, useSlots } = await import("vue");
    return {
        useVizPlate: (props: { contract: VizContract }) => ({
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
            sourceData: props.contract.sourceData ? { columns: [] } : null,
            sourceEventHub: props.contract.sourceData ? {} : null,
            sourceDataOpen: host.sourceDataOpen,
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

/** A minimal declared scope — the shape only; the fold itself is unit-proven beside the browser. */
function scopeStub(): VizContract["sourceData"] {
    return {
        source: {
            id: "grid-plate-rows",
            kind: "exact",
            label: "Grid plate rows",
            snapshot: "data/grid.snapshot.json",
        },
        encoding: { x: "area", y: "value" },
        grainNoun: "rows",
        dataset: () => [],
        filterPredicate: () => ({ op: "any" }),
        selectionKey: () => "row:1",
        routeUniverse: () => "sci-lea",
        grains: [],
        columns: [{ key: "value", label: "Value", value: () => 1 }],
        browseKey: () => "row-1",
    };
}

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
    beforeEach(() => {
        host.sourceDataOpen = false;
    });

    it("mounts the passive data table and binds no aria-details when no source grid is declared", async () => {
        const html = await render(baseContract());
        // the passive off-screen table (ChartDataTable's `<caption> — data table` aria-label) is present
        expect(html).toContain("Grid plate — data table");
        // no aria-details ATTRIBUTE bound on the figure (the bare word appears in template comments)
        expect(html).not.toContain("aria-details=");
    });

    it("suppresses the passive table but binds NO aria-details while the declared grid is CLOSED (no dangling IDREF)", async () => {
        const contract = baseContract({ sourceData: scopeStub() });
        const html = await render(contract);
        // PA-9 stands: the capability suppresses the passive table even at rest (no resurrection)
        expect(html).not.toContain("Grid plate — data table");
        // at rest the grid <aside> is unmounted, so the figure binds NO aria-details…
        expect(html).not.toContain("aria-details=");
        // …and there is no region id anywhere for a stale IDREF to dangle at
        expect(html).not.toContain('id="viz-source-data-grid-plate"');
    });

    it("binds aria-details to the grid region — which exists in the same render — while the grid is OPEN", async () => {
        host.sourceDataOpen = true;
        const contract = baseContract({ sourceData: scopeStub() });
        const html = await render(contract);
        // the passive table stays suppressed (capability-keyed, unaffected by open state)
        expect(html).not.toContain("Grid plate — data table");
        // the figure binds aria-details to the grid region id…
        expect(html).toContain('aria-details="viz-source-data-grid-plate"');
        // …and the region carrying that id is present in the SAME render (no dangling reference)
        expect(html).toContain('id="viz-source-data-grid-plate"');
    });
});
