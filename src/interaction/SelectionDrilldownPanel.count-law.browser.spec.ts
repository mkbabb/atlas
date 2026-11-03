// N-4 / N-W3 (U/B8, REPORT-B7E §6): the comparison panel printed two counts in two words. /ecf read
// "SELECTION 2 districts" over "1 DISTRICTS SELECTED" (the beat's reduce left out a district with no
// request and wrote its own sentence); /sci read "2 districts" over "2 SCHOOL UNITS SELECTED". The
// panel now owns the one count law: every count is the selection's, every noun is the grain's one noun.
import "../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import SelectionDrilldownPanel from "./SelectionDrilldownPanel.vue";
import { useSelection } from "../platform/stores/useSelection.js";
import { useSelectionStat } from "../platform/stores/useSelectionStat.js";
import { useActiveBeat } from "../platform/stores/useActiveBeat.js";
import { installDashboardRegistry } from "../contract/registry-inject.js";
import { countNoun } from "../editorial/evidence-floor.js";

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

async function mount() {
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
    useActiveBeat(pinia).setActiveBeat("beat");
    return pinia;
}
const text = (id: string) => document.querySelector(`[data-testid='${id}']`)?.textContent?.replace(/\s+/g, " ").trim();

describe("the comparison panel's one count law", () => {
    it("prints the selection's count when the beat's figures leave a unit out (/ecf)", async () => {
        const pinia = await mount();
        // The beat holds a figure for one of the two districts only.
        useSelectionStat(pinia).registerAggregate("beat", (items) => ({
            facts: [{ label: "Total requested", value: "$1.2M" }],
            covered: items.filter((it) => it.id === "180").length,
        }));
        const selection = useSelection(pinia);
        selection.select("district:180");
        selection.select("district:730", { additive: true });
        await settle();
        expect(text("drilldown-count")).toBe("2 districts");
        expect(text("drilldown-aggregate-label")).toBe("2 districts selected");
        expect(text("drilldown-aggregate-coverage")).toBe("Figures cover 1 of 2 districts");
    });

    it("prints the beat's noun in the header and the aggregate alike (/sci, a charter as B)", async () => {
        const pinia = await mount();
        useSelectionStat(pinia).registerAggregate("beat", (items) => ({
            facts: [{ label: "Total contracted bandwidth", value: "12 Gb/s" }],
            covered: items.length,
            noun: countNoun("school unit"),
        }));
        const selection = useSelection(pinia);
        selection.select("district:920");
        selection.select("district:68C", { additive: true });
        await settle();
        expect(text("drilldown-count")).toBe("2 school units");
        expect(text("drilldown-aggregate-label")).toBe("2 school units selected");
        expect(document.querySelector("[data-testid='drilldown-aggregate-coverage']")).toBeNull();
    });

    it("prints the count alone, in the same words, when no beat reduces the grain", async () => {
        const pinia = await mount();
        const selection = useSelection(pinia);
        selection.select("county:37001");
        selection.select("county:37003", { additive: true });
        await settle();
        expect(text("drilldown-count")).toBe("2 counties");
        expect(text("drilldown-aggregate-label")).toBe("2 counties selected");
    });
});
