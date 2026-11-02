// U/B8 A4 — THE TABLE VIEW TOGGLE (owner O-18, O-19). Every figure's dock carries one Table view
// toggle in the dock's persistent seat, so it is one click while the dock is collapsed; the figure
// sits in a view stage that starts on the chart. The click path and the sort are in
// src/charts/frame/PlateTable.browser.spec.ts. Fails before: the dock had no view toggle and the
// plate no stage.
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { REGISTRY_KEY } from "../../src/contract/registry-inject";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VizContract } from "../../src/charts/contract/viz-contract";

vi.mock("../../src/charts/legend/VizDescription.vue", async () => {
    const { defineComponent } = await import("vue");
    return { default: defineComponent(() => () => null) };
});

// The host composable is stubbed (the story-card-stats.spec pattern) so the REAL VizPlate and the REAL
// ChartFrame templates render: the assertion reads the seating those templates own.
vi.mock("../../src/charts/frame/useVizPlate", async () => {
    const { computed, ref, useSlots } = await import("vue");
    return {
        useVizPlate: (props: { contract: VizContract }) => ({
            slots: useSlots(),
            showOwnTitle: true,
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
            sourceData: null,
            sourceEventHub: null,
            sourceDataOpen: false,
            sourceDataRegionId: `viz-source-data-${props.contract.id}`,
            openSourceData: () => undefined,
            closeSourceData: () => undefined,
            isFullscreen: false,
            hasOptions: false,
            optionsController: null,
            ariaLabel: props.contract.title,
            size: "default",
            frameRef: ref(null),
        }),
    };
});

const contract = (id: string, title: string): VizContract =>
    ({
        id,
        title,
        description: "",
        options: [],
        export: { rows: () => [{ name: "Wake", value: "$1.86B" }], rowHeader: "County", valueHeader: "Funding" },
    }) as unknown as VizContract;

beforeEach(() => setActivePinia(createPinia()));

async function renderApp(root: Parameters<typeof createSSRApp>[0], pinia = createPinia()): Promise<string> {
    const app = createSSRApp(root);
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:slug?", component: { render: () => null } }],
    });
    app.use(pinia);
    app.use(router);
    app.provide(REGISTRY_KEY, { findDashboard: () => undefined } as never);
    await router.push("/usf");
    await router.isReady();
    return renderToString(app);
}

describe("A4 · the table view toggle", () => {
    it("every VizPlate dock carries one Table view toggle in its persistent seat, unpressed, over a chart stage", async () => {
        const VizPlate = (await import("../../src/charts/frame/VizPlate.vue")).default;
        const html = await renderApp({
            render: () => [
                h(VizPlate, { contract: contract("usf-net-retention", "Net retention") }, {
                    default: () => h("div", { "data-chart-body": "a" }, "chart a"),
                }),
                h(VizPlate, { contract: contract("usf-strip", "The ranked strip") }, {
                    default: () => h("div", { "data-chart-body": "b" }, "chart b"),
                }),
            ],
        });
        const figures = html.split(/(?=<figure[^>]*data-chart-frame)/).slice(1);
        expect(figures).toHaveLength(2);
        for (const [figure, id, title] of [
            [figures[0]!, "usf-net-retention", "Net retention"],
            [figures[1]!, "usf-strip", "The ranked strip"],
        ] as const) {
            const toggles = figure.match(/<[^>]*data-action="view"[^>]*>/g) ?? [];
            expect(toggles).toHaveLength(1);
            const toggle = toggles[0]!;
            expect(toggle).toContain(`aria-label="Table view of ${title}"`);
            expect(toggle).toContain('aria-pressed="false"');
            expect(toggle).toContain(`data-subject="${id}"`);
            // The persistent seat is live while the dock is collapsed: the toggle is not in the face.
            const persistent = figure.indexOf('class="dock-persistent"');
            expect(persistent).toBeGreaterThan(-1);
            expect(figure.indexOf('data-action="view"')).toBeGreaterThan(persistent);
            expect(figure).toMatch(/class="viz-plate__stage" data-view="chart"/);
            expect(figure).not.toMatch(/data-plate-table/);
        }
    });
});
