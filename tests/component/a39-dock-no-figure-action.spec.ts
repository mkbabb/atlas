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

    it("the dock's filter trigger is route-level: no figure id, no pin, no Enlarge (B6 · §L D3-1)", async () => {
        const { DASHBOARD_KEY } = await import("../../src/contract/index");
        const { useVizRegistry } = await import("../../src/charts/composables/useVizRegistry");
        const { useActiveBeat } = await import("../../src/platform/stores/useActiveBeat");
        const DockFilterTrigger = (await import("../../src/platform/chrome/dock/components/DockFilterTrigger.vue")).default;
        const pinia = createPinia();
        setActivePinia(pinia);
        const registry = useVizRegistry();
        registry.__resetRegistry();
        registry.register({ vizId: "usf-net-retention", dims: [], filterResponse: "responsive" } as never);
        // A figure is centred: the retired zone stamped and pinned exactly this id (D3-B N4, CX-K2).
        useActiveBeat().$patch({ activeVizId: "usf-net-retention" } as never);
        const Host = defineComponent({
            setup() {
                provide(DASHBOARD_KEY, { title: "USF", filterBody: {} } as never);
                return () => h(DockFilterTrigger);
            },
        });
        const html = await renderApp(Host, pinia);
        expect(html).toContain("data-membrane-filter-trigger"); // the route filter trigger stays
        expect(html).toContain('data-testid="dock-filter-trigger"');
        expect(html).not.toContain("usf-net-retention"); // no figure subject anywhere on the control
        expect(html).not.toMatch(/data-active-viz/);
        expect(html).not.toMatch(/Enlarge|Collapse the figure|data-viz-context-enlarge/);
        expect(html).not.toMatch(/data-action=|viz-options/);
        // The trigger never pins a figure: the panel's pin has no dock writer.
        const trigger = readFileSync(join(SRC, "platform/chrome/dock/components/DockFilterTrigger.vue"), "utf8");
        expect(trigger).not.toMatch(/useFilterPanel|\bpin\(|useDialVizId/);
        registry.__resetRegistry();
    });

    it("the dock hosts no figure's provenance: the facet-6 teleport seam is deleted (B6 · §L D3-1)", () => {
        const dock = readFileSync(join(SRC, "platform/chrome/dock/Dock.vue"), "utf8");
        expect(dock).not.toMatch(/MembraneProvenanceDetent|MembraneVizContext/);
        const provenance = readFileSync(join(SRC, "platform/provenance/index.ts"), "utf8");
        expect(provenance).not.toContain("useMembraneProvenance");
    });
});
