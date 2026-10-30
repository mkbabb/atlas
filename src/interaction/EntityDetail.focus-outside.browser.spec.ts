// M-02 (U/B7d M3): focus moving onto a figure closed the detail and cleared the selection, so a chord on
// the next mark replaced the unit the sheet showed instead of adding to it.
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
const settle = async () => {
    for (let i = 0; i < 5; i++) {
        await nextTick();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
};

describe("the detail sheet and a figure", () => {
    it("keeps the selection when focus moves onto a figure", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        const el = document.createElement("div");
        document.body.appendChild(el);
        const plate = document.createElement("div");
        plate.setAttribute("data-viz-plate", "");
        plate.tabIndex = 0;
        document.body.appendChild(plate);
        const app = createApp(defineComponent({ setup: () => () => h(SelectionDrilldownPanel) }));
        app.use(pinia).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.mount(el);
        await router.isReady();
        cleanups.push(() => {
            app.unmount();
            el.remove();
            plate.remove();
        });
        useEntityDetail(pinia).register(() => ({ name: "Wyoming", kind: "State", ids: [], place: "", measures: [], series: [] }));
        const selection = useSelection(pinia);
        selection.select("state:56");
        await settle();
        expect(document.querySelector(".entity-detail__name")?.textContent?.trim()).toBe("Wyoming");
        plate.focus();
        await settle();
        expect([...selection.selectedKeys]).toEqual(["state:56"]);
        selection.select("state:19", { additive: true });
        await settle();
        expect([...selection.selectedKeys]).toEqual(["state:56", "state:19"]);
    });
});
