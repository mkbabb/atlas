// PR-03 (U/B7d M3): a unit a route draws but holds no row for states why its sheet is empty.
import "../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import SelectionDrilldownPanel from "./SelectionDrilldownPanel.vue";
import { useSelection } from "../platform/stores/useSelection.js";
import { useEntityDetail } from "./describe-entity.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});

describe("the detail's note", () => {
    it("names the unit and prints why it has no measures", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        const el = document.createElement("div");
        document.body.appendChild(el);
        const app = createApp(defineComponent({ setup: () => () => h(SelectionDrilldownPanel) }));
        app.use(pinia).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.mount(el);
        await router.isReady();
        cleanups.push(() => {
            app.unmount();
            el.remove();
        });
        useEntityDetail(pinia).register(() => ({
            name: "Caswell County Schools",
            kind: "District (LEA)",
            ids: [],
            place: "",
            measures: [],
            series: [],
            note: "No ECF request in this view.",
        }));
        useSelection(pinia).select("district:170");
        for (let i = 0; i < 4; i++) {
            await nextTick();
            await new Promise((r) => requestAnimationFrame(() => r(null)));
        }
        expect(document.querySelector(".entity-detail__name")?.textContent?.trim()).toBe("Caswell County Schools");
        expect(document.querySelector('[data-testid="entity-detail-note"]')?.textContent?.trim()).toBe("No ECF request in this view.");
    });
});
