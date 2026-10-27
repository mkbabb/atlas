// O-13 (PLAN §5.3, §2.5): a click on one unit opens the entity detail. The name is its heading (never
// a code), no hover card stays open under it, there are at least six measure rows each with a period
// and a source link, the series has a Table toggle, and Escape closes it, returns focus to the
// opener and moves the page 0 px. At 390 the detail is a bottom sheet at half height with a title
// and rows. Before B7 there is no EntityDetail; the single selection opened the 280 px drilldown card.
import "../../tests/browser/glass-root.css";
import { atRest } from "../../tests/browser/at-rest.js";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { installDashboardRegistry } from "../contract/registry-inject.js";
import SelectionDrilldownPanel from "./SelectionDrilldownPanel.vue";
import HoverCard from "./HoverCard.vue";
import { useSelection } from "../platform/stores/useSelection.js";
import { useHoverReadout } from "../platform/stores/useHoverReadout.js";
import { useEntityDetail, type EntityDescription } from "./describe-entity.js";

// The sheet's own position and detent size are glass's (R-INTERACT D-1: `.glass-floating` beat the
// sheet's `:where()` fixed rule on 10.1.0; the cure is glass `release/10.1.1` / lane G1, PLAN §5.5).

const PERIODS = ["2019–20", "2020–21", "2021–22", "2022–23", "2023–24", "2024–25", "2025–26"];
const m = (id: string, label: string, value: number, unit: string, sm: number, pm: number, rank: number, n: number) => ({
    id, label, value, unit, period: "2025–26", sourceId: "sci", sourceLabel: "SCI feed", stateMedian: sm, peerMedian: pm, rank, n,
});
const PINE: EntityDescription = {
    name: "Pine Springs Preparatory Academy",
    kind: "Charter school",
    ids: [{ label: "LEA", value: "93N", param: "lea" }],
    place: "Wake County",
    measures: [
        m("enrollment", "Enrollment (ADM)", 307, "", 2900, 410, 98, 115),
        m("contracted", "Contracted bandwidth", 250, "Mbps", 1000, 300, 61, 115),
        m("perStudent", "Contracted per student", 814, "kbps", 212, 640, 12, 115),
        m("peak", "Peak utilization", 41, "%", 58, 47, 80, 115),
        m("avg", "Average utilization", 18, "%", 22, 20, 70, 115),
        m("nslp", "NSLP/EDS", 32, "%", 57, 40, 90, 115),
        m("c2", "Category 2 funded per student", 167, "$", 171, 160, 40, 115),
    ],
    series: [
        {
            measureId: "contracted",
            label: "Contracted bandwidth",
            unit: "Mbps",
            points: PERIODS.map((p, i) => ({ period: p, value: 100 + i * 25, covered: true })),
        },
    ],
};

const cleanups: Array<() => void> = [];
afterEach(async () => {
    while (cleanups.length) cleanups.pop()!();
    await page.viewport(1440, 900);
});

async function mountShell() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: { render: () => null } }, { path: "/data/:dataset", component: { render: () => null } }],
    });
    const el = document.createElement("div");
    document.body.appendChild(el);
    const spacer = document.createElement("div");
    spacer.style.blockSize = "4000px";
    document.body.appendChild(spacer);
    const app = createApp(
        defineComponent({
            setup: () => () => [
                h("button", { "data-testid": "mark", type: "button" }, "93N mark"),
                h(SelectionDrilldownPanel),
                h(HoverCard),
            ],
        }),
    );
    app.use(pinia).use(router);
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.mount(el);
    await router.isReady();
    cleanups.push(() => {
        app.unmount();
        el.remove();
        spacer.remove();
        window.scrollTo(0, 0);
    });
    useEntityDetail(pinia).register((key) => (key.id === "93N" ? PINE : null));
    return { selection: useSelection(pinia), hover: useHoverReadout(pinia) };
}

const settle = async () => {
    for (let i = 0; i < 4; i++) {
        await nextTick();
        await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
};

describe("EntityDetail (O-13)", () => {
    it("1440: a click opens the right sheet with the name, measures, series; Escape closes it in place", async () => {
        await page.viewport(1440, 900);
        const { selection, hover } = await mountShell();
        window.scrollTo(0, 600);
        const mark = document.querySelector<HTMLElement>('[data-testid="mark"]')!;
        mark.focus({ preventScroll: true });
        hover.readout = { origin: "sci-map", title: "Pine Springs Preparatory Academy", facts: [], anchor: { x: 300, y: 300 }, density: "compact" };
        await settle();
        selection.select("district:93N");
        await settle();

        const sheet = document.querySelector<HTMLElement>('[data-testid="entity-detail"]');
        expect(sheet, "the detail opens").not.toBeNull();
        expect(sheet!.dataset.seat).toBe("right");
        const heading = sheet!.querySelector("h2,h3,[id*='dialog-title'],.entity-detail__name")!;
        expect(heading.textContent?.trim()).toBe("Pine Springs Preparatory Academy");
        expect(heading.textContent).not.toMatch(/^[0-9]{2,3}[A-Z]?$/);
        expect(document.activeElement).toBe(heading);
        expect(document.querySelector('[data-testid="hover-card"]'), "no hover card under the detail").toBeNull();
        const rect = sheet!.getBoundingClientRect();
        expect(Math.round(rect.width)).toBeLessThanOrEqual(26 * 16);
        expect(getComputedStyle(sheet!).position).toBe("fixed");

        const rows = [...sheet!.querySelectorAll('[data-testid="entity-detail-measures"] tbody tr')];
        expect(rows.length).toBeGreaterThanOrEqual(6);
        for (const r of rows) {
            expect(r.textContent).toContain("2025–26");
            const link = r.querySelector<HTMLAnchorElement>("a[data-source-link]");
            expect(link?.getAttribute("href")).toBe("/data/sci?lea=93N");
        }
        expect(rows.map((r) => r.querySelectorAll("td")[3]?.textContent?.trim())).toContain("12 of 115");
        expect(sheet!.querySelector('[data-testid="entity-detail-series"] svg polyline')).not.toBeNull();
        (sheet!.querySelector('[data-testid="entity-detail-table-toggle"]') as HTMLElement).click();
        await settle();
        expect(sheet!.querySelectorAll(".entity-detail__series-table tbody tr").length).toBe(PERIODS.length);

        const y = window.scrollY;
        await userEvent.keyboard("{Escape}");
        await settle();
        expect(document.querySelector('[data-testid="entity-detail"]'), "Escape closes").toBeNull();
        expect(selection.selectedKeys.size).toBe(0);
        expect(document.activeElement).toBe(mark);
        expect(window.scrollY - y, "Escape moves the page 0 px").toBe(0);
    });

    it("390: a tap opens the bottom sheet at half height with a title and rows", async () => {
        await page.viewport(390, 844);
        const { selection } = await mountShell();
        selection.select("district:93N");
        await settle();
        const sheet = document.querySelector<HTMLElement>('[data-testid="entity-detail"]')!;
        expect(sheet).not.toBeNull();
        expect(sheet.dataset.seat).toBe("bottom");
        expect(sheet.querySelector(".entity-detail__name")?.textContent?.trim()).toBe("Pine Springs Preparatory Academy");
        expect(sheet.querySelectorAll('[data-testid="entity-detail-measures"] tbody tr').length).toBeGreaterThanOrEqual(6);
        // The sheet rises on a spring; measure its detent, not a frame of the rise.
        expect(await atRest('[data-testid="entity-detail"]'), "the sheet comes to rest").toBe(true);
        const h = sheet.getBoundingClientRect().height;
        expect(h).toBeGreaterThan(844 * 0.35);
        expect(h).toBeLessThan(844 * 0.65);
    });

    it("an unnamed unit is titled by its kind, never by its code", async () => {
        await page.viewport(1440, 900);
        const { selection } = await mountShell();
        selection.select("district:43C");
        await settle();
        const name = document.querySelector('[data-testid="entity-detail"] .entity-detail__name')?.textContent?.trim();
        expect(name).toBeTruthy();
        expect(name).not.toMatch(/43C/);
    });
});
