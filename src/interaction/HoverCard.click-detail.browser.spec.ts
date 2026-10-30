// F-14 (U/B7d D1): the hover card can come to rest over its own mark (after the pointer visits the card
// and returns, the mark's centre lies under it), and the next click lands on the card. The card stands
// for one entity, so a click on it opens that entity's detail. A card for a period offers no detail.
import "../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import HoverCard from "./HoverCard.vue";
import SelectionDrilldownPanel from "./SelectionDrilldownPanel.vue";
import { useHoverReadout } from "../platform/stores/useHoverReadout.js";
import { useSelection } from "../platform/stores/useSelection.js";
import { useEntityDetail } from "./describe-entity.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});
const settle = async () => {
    for (let i = 0; i < 4; i++) {
        await nextTick();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
};

async function mount() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const app = createApp(defineComponent({ setup: () => () => [h(SelectionDrilldownPanel), h(HoverCard)] }));
    app.use(pinia).use(router);
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.mount(el);
    await router.isReady();
    cleanups.push(() => {
        app.unmount();
        el.remove();
    });
    useEntityDetail(pinia).register((key) =>
        key.id === "73A"
            ? { name: "Bethel Hill Charter School", kind: "Charter school", ids: [], place: "Person County", measures: [], series: [] }
            : null,
    );
    return { selection: useSelection(pinia), readout: useHoverReadout(pinia) };
}

const card = () => document.querySelector<HTMLElement>('[data-testid="hover-card"]');

describe("a click on the hover card", () => {
    it("opens the detail of the entity the card stands for", async () => {
        await page.viewport(1440, 900);
        const { selection, readout } = await mount();
        selection.hover("district:73A", "sci-map");
        readout.publish({
            origin: "sci-map",
            title: "Bethel Hill Charter School",
            facts: [{ label: "Contracted bandwidth", value: "250 Mbps" }],
            anchor: { x: 400, y: 300 },
            density: "compact",
        });
        await settle();
        expect(card(), "the card opened").not.toBeNull();
        expect(card()!.textContent).toContain("Click for detail");
        card()!.click();
        await settle();
        expect([...selection.selectedKeys]).toEqual(["district:73A"]);
        const sheet = document.querySelector('[data-testid="entity-detail"]');
        expect(sheet, "the detail opens").not.toBeNull();
        expect(sheet!.querySelector(".entity-detail__name")?.textContent?.trim()).toBe("Bethel Hill Charter School");
    });

    it("names the entity when the route hovers a raw id with its kind (U/B7d M3)", async () => {
        await page.viewport(1440, 900);
        const { selection, readout } = await mount();
        selection.hover("73A", "sci-map", "district");
        readout.publish({
            origin: "sci-map",
            title: "Bethel Hill Charter School",
            facts: [{ label: "Contracted bandwidth", value: "250 Mbps" }],
            anchor: { x: 400, y: 300 },
            density: "compact",
        });
        await settle();
        card()!.click();
        await settle();
        expect([...selection.selectedKeys]).toEqual(["district:73A"]);
    });

    it("a chord on the card adds the entity, as a chord on its mark does (M-02)", async () => {
        await page.viewport(1440, 900);
        const { selection, readout } = await mount();
        selection.select("district:310");
        selection.hover("73A", "sci-map", "district");
        readout.publish({
            origin: "sci-map",
            title: "Bethel Hill Charter School",
            facts: [{ label: "Contracted bandwidth", value: "250 Mbps" }],
            anchor: { x: 400, y: 300 },
            density: "compact",
        });
        await settle();
        card()!.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
        await settle();
        expect([...selection.selectedKeys]).toEqual(["district:310", "district:73A"]);
    });

    it("on a period card offers no detail and selects nothing", async () => {
        await page.viewport(1440, 900);
        const { selection, readout } = await mount();
        selection.hover("x:2019", "sci-trend");
        readout.publish({
            origin: "sci-trend",
            title: "2019–20",
            facts: [{ label: "School units", value: "284" }],
            anchor: { x: 400, y: 300 },
            density: "compact",
        });
        await settle();
        expect(card()).not.toBeNull();
        expect(card()!.textContent).not.toContain("Click for detail");
        card()!.click();
        await settle();
        expect(selection.selectedKeys.size).toBe(0);
        expect(document.querySelector('[data-testid="entity-detail"]')).toBeNull();
    });
});
