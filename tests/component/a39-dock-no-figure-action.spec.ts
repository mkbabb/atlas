// A-39, THE PLATE (RULINGS §I · U/B4 atlas-plate): THE DOCK CARRIES NO PER-FIGURE ACTION. A figure's
// Enlarge, export and options live in its own act row (`a39-plate-act.spec.ts`). Here: the membrane's
// viz-context zone renders no Enlarge and no options band for the dial viz, the route filter panel
// renders no options band, and no page-chrome source reaches a figure's enlarge/export/options seam.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createSSRApp, defineComponent, h, provide } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import { REGISTRY_KEY } from "../../src/contract/registry-inject";

const SRC = join(__dirname, "../../src");

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

describe("A-39 · the dock carries no per-figure action", () => {
    function walk(dir: string): string[] {
        return readdirSync(dir).flatMap((name) => {
            const path = join(dir, name);
            return statSync(path).isDirectory() ? walk(path) : [path];
        });
    }

    it("no page-chrome source reaches a figure's enlarge, export or options seam", () => {
        const chrome = walk(join(SRC, "platform/chrome")).filter((p) => /\.(vue|ts)$/.test(p));
        expect(chrome.length).toBeGreaterThan(10);
        const offenders: string[] = [];
        const seams = [
            /\bopenFig\b/,
            /\bcloseFig\b/,
            /\bexportCsv\b|\bonExportCsv\b/,
            /\bexportImage\b|\bonExportImage\b/,
            /VizOptionsBand/,
            /optionsController/,
            /stageControlsFor/,
            /data-viz-context-enlarge/,
        ];
        for (const path of chrome) {
            const text = readFileSync(path, "utf8").replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, "");
            for (const seam of seams) if (seam.test(text)) offenders.push(`${path}: ${seam}`);
        }
        expect(offenders).toEqual([]);
        // The route filter panel is page chrome too: it hosts no figure's options.
        const panel = readFileSync(join(SRC, "filter/ui/UnifiedFilterPanel.vue"), "utf8");
        expect(panel).not.toContain("VizOptionsBand");
        // No plate source teleports an action into the dock.
        for (const file of ["charts/frame/VizPlate.vue", "charts/scene/ChapterStage.vue"])
            expect(readFileSync(join(SRC, file), "utf8")).not.toContain("useMembraneProvenanceSource");
    });

    it("the membrane's viz-context zone renders no Enlarge and no options for the dial viz", async () => {
        const { DASHBOARD_KEY } = await import("../../src/contract/index");
        const { useVizRegistry } = await import("../../src/charts/composables/useVizRegistry");
        const { useFilterPanel } = await import("../../src/filter/composables/useFilterPanel");
        const MembraneVizContext = (await import("../../src/platform/chrome/dock/MembraneVizContext.vue")).default;
        const pinia = createPinia();
        setActivePinia(pinia);
        const registry = useVizRegistry();
        registry.__resetRegistry();
        registry.register({
            vizId: "usf-net-retention",
            dims: [],
            filterResponse: "responsive",
            optionsController: { specs: [], values: {}, isDefault: { value: true } } as never,
        });
        useFilterPanel().pin("usf-net-retention");
        const Host = defineComponent({
            setup() {
                provide(DASHBOARD_KEY, { title: "USF", filterBody: {} } as never);
                return () => h(MembraneVizContext);
            },
        });
        const html = await renderApp(Host, pinia);
        expect(html).toContain('data-active-viz="usf-net-retention"'); // the zone is live for the dial viz
        expect(html).toContain("data-membrane-filter-trigger"); // the route filter trigger stays
        expect(html).not.toMatch(/Enlarge|Collapse the figure|data-viz-context-enlarge/);
        expect(html).not.toMatch(/data-action=|viz-options/);
        registry.__resetRegistry();
    });
});
