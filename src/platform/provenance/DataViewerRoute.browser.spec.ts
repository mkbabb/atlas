// The data viewer route in a real engine (U/B7 O-19, PLAN §5.4, R-SOURCES §3.3). The expected counts
// are derived from the fixture, never typed: rows, columns (the served column list), the rows of one
// period, the rows of one entity. The CSV opens with its source; the dictionary names every column.
import "../../../tests/browser/glass-root.css";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, h, nextTick, type App } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory, RouterView, type Router } from "vue-router";
import DataViewerRoute, { type DataViewerDataset } from "./DataViewerRoute.vue";
import { installDashboardRegistry } from "../../contract/registry-inject";
import { FIXTURE_COLUMNS, FIXTURE_DICTIONARY, FIXTURE_ROWS } from "../../../tests/fixtures/feed-dictionary";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}

const DATASETS: DataViewerDataset[] = [
    {
        id: "sci",
        label: "SCI district feed",
        periodColumn: "year",
        load: async () => ({ rows: FIXTURE_ROWS, columns: FIXTURE_COLUMNS, meta: FIXTURE_DICTIONARY, sha: "3f42c060aa" }),
    },
    { id: "broken", label: "A dataset that fails", load: async () => Promise.reject(new Error("404")) },
];

beforeAll(async () => {
    await page.viewport(1280, 900);
});

// The viewer reads and writes the address through the view store's bag (U-F60 cl. 4), so the router
// runs on the real History; each spec restores the runner's own address afterwards.
const runnerUrl = location.href;
let app: App | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
    history.replaceState(history.state, "", runnerUrl);
});

async function mount(path: string): Promise<{ root: HTMLElement; router: Router }> {
    host = document.createElement("div");
    host.style.width = "1200px";
    document.body.appendChild(host);
    const router = createRouter({
        history: createWebHistory(),
        routes: [
            { path: "/data", component: DataViewerRoute, props: () => ({ datasets: DATASETS }) },
            { path: "/data/:dataset", component: DataViewerRoute, props: (r) => ({ datasets: DATASETS, dataset: r.params.dataset }) },
            {
                path: "/data/:dataset/inputs/:file",
                component: DataViewerRoute,
                props: (r) => ({ datasets: DATASETS, dataset: r.params.dataset, file: r.params.file }),
            },
        ],
    });
    app = createApp({ render: () => h(RouterView) });
    app.use(createPinia());
    app.use(router);
    // The view store resolves the active dashboard; a host always installs its registry at bootstrap.
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    await router.push(path);
    await router.isReady();
    app.mount(host);
    await nextTick();
    await sleep(150);
    return { root: host, router };
}
const text = (root: HTMLElement, id: string) => root.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
const fmt = (n: number) => n.toLocaleString("en-US");

describe("DataViewerRoute", () => {
    it("lists every row and every served column, named from the dictionary", async () => {
        const { root } = await mount("/data/sci");
        expect(await until(() => text(root, "data-viewer-stats") !== "", 2000)).toBe(true);
        expect(text(root, "data-viewer-stats")).toBe(`${fmt(FIXTURE_ROWS.length)} rows, ${FIXTURE_COLUMNS.length} columns, sha 3f42c060`);
        expect(text(root, "data-viewer-sources")).toBe("NC SVF, FY2025; MCNC, June 2026 (preliminary)");
        const heads = [...root.querySelectorAll("thead th")].map((th) => th.textContent?.replace(/[↕↑↓]/g, "").trim());
        expect(heads).toHaveLength(FIXTURE_COLUMNS.length);
        expect(heads).toContain("Contracted bandwidth (Mbps)");
        expect(heads).not.toContain("bandwidth");
        expect(text(root, "data-viewer-count")).toBe(`${fmt(FIXTURE_ROWS.length)} rows`);
        expect(root.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });

    it("filters by period through the Select and by entity through the address", async () => {
        const { root, router } = await mount("/data/sci");
        await until(() => !!root.querySelector('[data-testid="data-viewer-period"]'), 2000);
        await userEvent.click(root.querySelector<HTMLElement>('[data-testid="data-viewer-period"]')!);
        expect(await until(() => !!document.querySelector('[role="option"]'), 1500)).toBe(true);
        const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === "2024")!;
        await userEvent.click(option);
        const in2024 = FIXTURE_ROWS.filter((r) => r.year === "2024").length;
        expect(await until(() => text(root, "data-viewer-count") === `Showing ${fmt(in2024)} of ${fmt(FIXTURE_ROWS.length)} rows`, 1500)).toBe(true);
        expect(new URLSearchParams(location.search).get("year")).toBe("2024");

        await router.replace({ path: "/data/sci", query: { lea: "0003" } });
        const forLea = FIXTURE_ROWS.filter((r) => r.lea === "0003").length;
        expect(await until(() => text(root, "data-viewer-count") === `Showing ${fmt(forLea)} of ${fmt(FIXTURE_ROWS.length)} rows`, 1500)).toBe(true);
    });

    it("writes the period through the view store's bag, never a router write (U-F60 cl. 4)", async () => {
        const { root, router } = await mount("/data/sci");
        const routerWrites: string[] = [];
        const push = router.push.bind(router);
        const replace = router.replace.bind(router);
        router.push = (to) => (routerWrites.push(`push ${JSON.stringify(to)}`), push(to));
        router.replace = (to) => (routerWrites.push(`replace ${JSON.stringify(to)}`), replace(to));
        const length = history.length;
        await until(() => !!root.querySelector('[data-testid="data-viewer-period"]'), 2000);
        await userEvent.click(root.querySelector<HTMLElement>('[data-testid="data-viewer-period"]')!);
        expect(await until(() => !!document.querySelector('[role="option"]'), 1500)).toBe(true);
        await userEvent.click([...document.querySelectorAll<HTMLElement>('[role="option"]')].find((o) => o.textContent?.trim() === "2025")!);
        expect(await until(() => new URLSearchParams(location.search).get("year") === "2025", 1500)).toBe(true);
        expect(routerWrites).toEqual([]);
        expect(history.length).toBe(length);
    });

    it("an in-app link with a query filters the viewer it lands on, and Clear drops only served keys", async () => {
        const { root, router } = await mount("/data");
        await router.push("/data/sci?lea=0003&keep=1");
        const forLea = FIXTURE_ROWS.filter((r) => r.lea === "0003").length;
        expect(await until(() => text(root, "data-viewer-count") === `Showing ${fmt(forLea)} of ${fmt(FIXTURE_ROWS.length)} rows`, 2000)).toBe(true);
        await userEvent.type(root.querySelector<HTMLInputElement>('input[type="search"]')!, "no such district");
        expect(await until(() => !!root.querySelector('[data-testid="data-viewer-empty"]'), 1500)).toBe(true);
        await userEvent.click(root.querySelector<HTMLElement>('[data-testid="data-viewer-empty"] button')!);
        expect(await until(() => text(root, "data-viewer-count") === `${fmt(FIXTURE_ROWS.length)} rows`, 1500)).toBe(true);
        const query = new URLSearchParams(location.search);
        expect(query.has("lea")).toBe(false);
        expect(query.get("keep")).toBe("1");
    });

    it("downloads a CSV that opens with its source and filter, and a JSON with its meta", async () => {
        const blobs: Blob[] = [];
        const real = URL.createObjectURL;
        URL.createObjectURL = (b: Blob | MediaSource) => {
            blobs.push(b as Blob);
            return "blob:captured";
        };
        try {
            const { root } = await mount("/data/sci?year=2025");
            await until(() => !!root.querySelector('[data-testid="data-viewer-csv"]'), 2000);
            await userEvent.click(root.querySelector<HTMLElement>('[data-testid="data-viewer-csv"]')!);
            await userEvent.click(root.querySelector<HTMLElement>('[data-testid="data-viewer-json"]')!);
            expect(blobs).toHaveLength(2);
            const csv = await blobs[0]!.text();
            const lines = csv.split("\r\n");
            expect(lines[0]).toBe('Source,"SCI district feed (NC SVF, FY2025; MCNC, June 2026 (preliminary))"');
            expect(lines[3]).toBe("Filter,School year is 2025");
            const header = lines[6]!;
            expect(header).toContain("Contracted bandwidth (Mbps)");
            expect(lines.length - 7).toBe(FIXTURE_ROWS.filter((r) => r.year === "2025").length);
            const json = JSON.parse(await blobs[1]!.text());
            expect(json.meta.source.label).toContain("SCI district feed");
            expect(json.rows).toHaveLength(FIXTURE_ROWS.filter((r) => r.year === "2025").length);
        } finally {
            URL.createObjectURL = real;
        }
    });

    it("says when no row matches, and clears back to every row", async () => {
        const { root } = await mount("/data/sci");
        await until(() => !!root.querySelector('input[type="search"]'), 2000);
        await userEvent.type(root.querySelector<HTMLInputElement>('input[type="search"]')!, "no such district");
        expect(await until(() => !!root.querySelector('[data-testid="data-viewer-empty"]'), 1500)).toBe(true);
        expect(text(root, "data-viewer-empty")).toContain("No rows match these filters.");
        const clear = [...root.querySelectorAll<HTMLElement>('[data-testid="data-viewer-empty"] button')][0]!;
        await userEvent.click(clear);
        expect(await until(() => text(root, "data-viewer-count") === `${fmt(FIXTURE_ROWS.length)} rows`, 1500)).toBe(true);
    });

    it("says when a dataset did not load", async () => {
        const { root } = await mount("/data/broken");
        expect(await until(() => root.querySelector('[role="alert"]')?.textContent?.includes("This dataset did not load.") ?? false, 2000)).toBe(true);
    });

    it("opens the dictionary with each column's definition, source and coverage", async () => {
        const { root } = await mount("/data/sci");
        await until(() => !!root.querySelector('[data-testid="data-viewer-dictionary"]'), 2000);
        await userEvent.click(root.querySelector<HTMLElement>('[data-testid="data-viewer-dictionary"]')!);
        expect(await until(() => !!document.querySelector('[data-testid="data-viewer-dictionary-sheet"]'), 1500)).toBe(true);
        const sheet = document.querySelector<HTMLElement>('[data-testid="data-viewer-dictionary-sheet"]')!;
        expect(sheet.textContent).toContain("The bandwidth the district contracts for.");
        expect(sheet.textContent).toContain("117 of 120 rows");
        expect(sheet.textContent).toContain("owner export pending");
        expect(sheet.querySelector('a[href="/data/sci/inputs/svf_nslp.csv"]')).not.toBeNull();
    });

    it("shows one published input with its sha and a byte-exact download", async () => {
        const { root } = await mount("/data/sci/inputs/svf_nslp.csv");
        expect(await until(() => !!root.querySelector('[data-testid="data-viewer-input"]'), 2000)).toBe(true);
        const panel = root.querySelector<HTMLElement>('[data-testid="data-viewer-input"]')!;
        expect(panel.textContent).toContain(FIXTURE_DICTIONARY.vintages[0]!.files[0]!.sha256);
        expect(panel.querySelector('a[download][href="data/inputs/2026/svf_nslp.csv"]')).not.toBeNull();
    });
});
