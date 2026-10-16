// A-39, THE PLATE (RULINGS §I · U/B4 atlas-plate). Per-figure actions (Enlarge, export, options) live
// AT the figure, in its act row; the dock carries no per-figure action. Three properties are pinned:
//
//   1. SUBJECT IDENTITY (U-F58). Every act-row control names ONE subject, its own plate: two plates on
//      one page give 0 foreign subjects, and each control's accessible name carries its figure's title.
//   2. KEYBOARD REACH. Every act is a native button (focusable, never `tabindex=-1`, never under
//      `aria-hidden`), and the row is the figure's LAST child, after the chart body: Tab from the
//      figure reaches its own acts before the next figure. The enlarged figure claims Escape above
//      every page claim, so one Escape closes the figure and nothing else (S2-1).
//   3. THE DOCK CARRIES NO PER-FIGURE ACTION: `a39-dock-no-figure-action.spec.ts`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { REGISTRY_KEY } from "../../src/contract/registry-inject";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlateAct from "../../src/charts/frame/PlateAct.vue";
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

/** The opening tags of every element carrying `data-action` (an act-row control). */
function actTags(html: string): string[] {
    return html.match(/<[a-z]+\b[^>]*\bdata-action="[^"]+"[^>]*>/g) ?? [];
}
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

beforeEach(() => setActivePinia(createPinia()));

/** An app with the platform's bootstrap installs (pinia, a router, an empty dashboard registry). */
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

describe("A-39 · subject identity: every act names its own plate (U-F58)", () => {
    it("two act rows on one page carry 0 foreign subjects, and every control names its figure", async () => {
        const html = await renderToString(
            createSSRApp({
                render: () => [
                    h(PlateAct, {
                        id: "usf-fund-ledger",
                        title: "Where the fund goes",
                        enlarge: () => undefined,
                        exportCsv: () => undefined,
                        exportImage: () => undefined,
                        browse: null,
                    }),
                    h(
                        PlateAct,
                        {
                            id: "sci-bandcake",
                            title: "Bandwidth by tier",
                            enlarge: () => undefined,
                            browse: () => undefined,
                        },
                        { options: () => h("div", "dials") },
                    ),
                ],
            }),
        );
        const boxes = html.split(/(?=<div[^>]*data-act-of=)/).slice(1);
        expect(boxes).toHaveLength(2);
        let foreign = 0;
        let own = 0;
        for (const box of boxes) {
            const of = box.match(/data-act-of="([^"]+)"/)![1];
            for (const tag of actTags(box)) {
                if (attr(tag, "data-subject") === of) own += 1;
                else foreign += 1;
                expect(PLATE_ACTS).toContain(attr(tag, "data-action"));
            }
        }
        expect(foreign).toBe(0);
        expect(own).toBeGreaterThanOrEqual(6);
        // Names: the icon-only acts carry the title; the labelled acts are described by the subject line.
        expect(html).toContain('aria-label="Enlarge Where the fund goes"');
        expect(html).toContain('aria-label="Enlarge Bandwidth by tier"');
        expect(html).toContain('aria-label="Options for Bandwidth by tier"');
        expect(html).toMatch(/id="usf-fund-ledger-act-subject"[^>]*>Where the fund goes</);
        for (const tag of actTags(html)) {
            const described = attr(tag, "aria-describedby");
            if (described) expect(described).toBe(`${attr(tag, "data-subject")}-act-subject`);
        }
    });

    it("a plate with a declared scope offers its source data, not a second export path", async () => {
        const html = await renderToString(
            createSSRApp({
                render: () =>
                    h(PlateAct, {
                        id: "ecf-choropleth",
                        title: "ECF by district",
                        enlarge: () => undefined,
                        exportCsv: () => undefined,
                        exportImage: () => undefined,
                        browse: () => undefined,
                    }),
            }),
        );
        const actions = actTags(html).map((t) => attr(t, "data-action"));
        expect(actions).toContain("source");
        expect(actions).not.toContain("download");
    });

    it("VizPlate seats the act row inside its own figure, bound to its contract id", async () => {
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
            expect(figure).toMatch(new RegExp(`data-plate-act[^>]*data-subject="${id}"`));
            for (const tag of actTags(figure)) expect(attr(tag, "data-subject")).toBe(id);
        }
    });
});

describe("A-39 · keyboard reach, focus and Escape", () => {
    it("every act is a native, focusable button, never removed from the tab order", async () => {
        const html = await renderToString(
            createSSRApp({
                render: () =>
                    h(
                        PlateAct,
                        {
                            id: "sci-schoolmap",
                            title: "Schools on the map",
                            enlarge: () => undefined,
                            exportCsv: () => undefined,
                            exportImage: () => undefined,
                            browse: null,
                        },
                        { options: () => h("div", "dials") },
                    ),
            }),
        );
        const tags = actTags(html);
        // wide row: options, download, enlarge; narrow row: take (the sheet's acts mount on open).
        expect(tags.map((t) => attr(t, "data-action"))).toEqual(["options", "download", "enlarge", "take"]);
        for (const tag of tags) {
            expect(tag.startsWith("<button")).toBe(true);
            expect(attr(tag, "tabindex")).not.toBe("-1");
            expect(tag).not.toMatch(/\baria-hidden="true"/);
            expect(tag).not.toMatch(/\bdisabled\b/);
        }
        // The disclosing acts announce what they open.
        const [options, download, , take] = tags;
        expect(attr(options!, "aria-haspopup")).toBeTruthy();
        expect(attr(download!, "aria-haspopup")).toBeTruthy();
        expect(attr(take!, "aria-haspopup")).toBe("dialog");
    });

    it("the act row is the figure's last child, after the chart body (Tab reaches it from the figure)", async () => {
        const VizPlate = (await import("../../src/charts/frame/VizPlate.vue")).default;
        const html = await renderApp({
            render: () =>
                h(VizPlate, { contract: contract("sci-trend", "The trend") }, {
                    default: () => h("div", { "data-chart-body": "" }, "chart"),
                }),
        });
        const body = html.indexOf("data-chart-body");
        const act = html.indexOf("data-plate-act");
        const close = html.lastIndexOf("</figure>");
        expect(body).toBeGreaterThan(-1);
        expect(act).toBeGreaterThan(body);
        expect(act).toBeLessThan(close);
        // Nothing focusable follows the act row inside the figure.
        expect(html.slice(html.indexOf("</div>", html.lastIndexOf('data-action="take"')), close)).not.toMatch(
            /<(button|a|input|select|textarea)\b/,
        );
    });

    it("an enlarged figure outranks every page claim: one Escape closes the figure and nothing else", () => {
        const doc = new EventTarget() as unknown as Document;
        const arbiter = createDismissArbiter(doc);
        const dismissed: string[] = [];
        // The page's standing claims, at their shipped priorities (PlatformShell selection 0, HoverCard
        // 10, FilterPanel 30, the dock sheet 40).
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

    it("the frame wires the claim while open and hands its act row ONE enlarge of its own", () => {
        const frame = readFileSync(join(SRC, "charts/frame/ChartFrame.vue"), "utf8");
        expect(frame).toMatch(/useDismissArbiter\(\)\.claim\(\(\) =>\s*open\.value\s*\?\s*figureEscapeClaim\(/);
        expect(frame).toMatch(/<slot name="act" :enlarge="enlarge"/);
        // focus return: the `open` setter records the opener and restores it on close.
        expect(frame).toMatch(/returnFocusEl = \(document\.activeElement/);
        expect(frame).toMatch(/if \(el\) void nextTick\(\(\) => el\.focus\?\.\(\)\)/);
    });
});
