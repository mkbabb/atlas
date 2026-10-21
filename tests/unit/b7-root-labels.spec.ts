// O-14 (PLAN §5.8, R-LABELS §3.9): the atlas root's reader-facing action and heading names.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/platform/stores/useSelection.js", () => ({
    useSelection: () => ({ isSelected: () => false, primaryKey: null, select() {}, focus() {} }),
}));

import ReadoutDrill from "../../src/interaction/ReadoutDrill.vue";

const read = (rel: string) => readFileSync(join(__dirname, "../../src", rel), "utf8");

describe("atlas root labels (R-LABELS §3.9)", () => {
    it("the readout actions are Show only this unit, Add to comparison, Zoom to this unit", async () => {
        const app = createSSRApp({ render: () => h(ReadoutDrill, { selectionKey: "district:93N" }) });
        const pinia = createPinia();
        setActivePinia(pinia);
        app.use(pinia);
        const html = (await renderToString(app)).replace(/<!--[\s\S]*?-->/g, "");
        for (const name of ["Show only this unit", "Add to comparison", "Zoom to this unit"]) {
            expect(html).toContain(name);
        }
        for (const old of [">Pin<", ">Compare<", ">Focus<", "re-aim", "isolate the selection"]) {
            expect(html).not.toContain(old);
        }
    });

    it("the filter panel's headings and the timeline's name", () => {
        const panel = read("filter/ui/UnifiedFilterPanel.vue");
        expect(panel).toContain('sr-only">Filter</h3>');
        expect(panel).toContain('sr-only">Filter this dashboard</h3>');
        expect(panel).not.toMatch(/sr-only">[^<]*fleet/);
        expect(read("charts/scene/ScrollTimeline.vue")).toContain('label: "Year"');
    });
});
