// O-18, THE FIGURE DOCK (U/B7, R-FIGDOCK §4, §6). Per-figure actions live in the figure's own dock in
// its plate head's top-right seat; the plate has no act row at its foot. Pinned here: the dock sits in
// the header's control zone, bound to its own contract id; the enlarged figure outranks every page
// claim; the frame hands the dock one enlarge of its own. The dock's live behaviour (one tab stop,
// Escape order, seat yield, pointer sweep) is in src/charts/frame/PlateDock.browser.spec.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { REGISTRY_KEY } from "../../src/contract/registry-inject";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    FIGURE_ESCAPE_PRIORITY,
    PLATE_ACTS,
    figureEscapeClaim,
} from "../../src/charts/frame/plate-act";
import { createDismissArbiter } from "../../src/platform/interaction/dismiss-arbiter";
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

const SRC = join(__dirname, "../../src");
const contract = (id: string, title: string): VizContract =>
    ({
        id,
        title,
        description: "",
        options: [],
        export: { rows: () => [], rowHeader: "Row", valueHeader: "Value" },
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

describe("O-18 · the figure dock's seat", () => {
    it("VizPlate seats one dock in its own header's control zone, bound to its contract id; no foot act row", async () => {
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
        for (const [figure, id] of [
            [figures[0]!, "usf-net-retention"],
            [figures[1]!, "usf-strip"],
        ] as const) {
            expect(figure).not.toMatch(/data-plate-act/);
            const seat = figure.indexOf("data-figure-dock-seat");
            const dock = figure.search(new RegExp(`data-plate-dock[^>]*data-subject="${id}"`));
            expect(seat).toBeGreaterThan(-1);
            expect(dock).toBeGreaterThan(seat);
            expect(figure.match(/data-plate-dock(?!-)/g)?.length).toBe(1);
            expect(dock).toBeLessThan(figure.indexOf('data-chart-body'));
        }
    });
});

describe("O-18 · Escape and the frame", () => {
    it("an enlarged figure outranks every page claim: one Escape closes the figure and nothing else", () => {
        const doc = new EventTarget() as unknown as Document;
        const arbiter = createDismissArbiter(doc);
        const dismissed: string[] = [];
        for (const [id, priority] of [
            ["selection", 0],
            ["hover-card", 10],
            ["filter-drawer", 30],
            ["dock-sheet", 40],
        ] as const)
            arbiter.claim({ id, priority, escape: true, onDismiss: () => dismissed.push(id) });
        arbiter.claim(figureEscapeClaim("usf-net-retention", () => dismissed.push("figure")));
        const escape = Object.assign(new Event("keydown", { cancelable: true }), { key: "Escape" });
        doc.dispatchEvent(escape);
        expect(dismissed).toEqual(["figure"]);
        expect(escape.defaultPrevented).toBe(true);
        expect(FIGURE_ESCAPE_PRIORITY).toBeGreaterThan(40);
        arbiter.destroy();
    });

    it("the frame wires the claim while open and hands its dock ONE enlarge of its own; PlateAct is gone", () => {
        const frame = readFileSync(join(SRC, "charts/frame/ChartFrame.vue"), "utf8");
        expect(frame).toMatch(/useDismissArbiter\(\)\.claim\(\(\) =>\s*open\.value\s*\?\s*figureEscapeClaim\(/);
        expect(frame).toMatch(/<slot name="dock" :enlarge="enlarge"/);
        expect(frame).not.toMatch(/<slot name="act"/);
        expect(frame).toMatch(/returnFocusEl = \(document\.activeElement/);
        expect(PLATE_ACTS).not.toContain("take");
        expect(() => readFileSync(join(SRC, "charts/frame/PlateAct.vue"), "utf8")).toThrow();
    });
});
