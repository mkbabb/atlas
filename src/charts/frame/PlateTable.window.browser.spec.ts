// DV-3 (U/B8 REPORT-B8 §6.2): the figure's table view windows its rows. The /bead provider strip has
// 546 export rows, and PlateTable gave the glass DataTable every one (`:rows="sorted"`), so the phone
// open was one 108-169 ms task (4x CPU, 390 px; B8-DESIGN §13). The table now hands the DataTable the
// slice atlas's `useVirtualWindow` keeps in view, through glass's caller-windowed API (aria-row-count,
// get-row-attrs, row-ref), the way SourceDataBrowser and DataViewerRoute already do. Sorting stays
// over all the rows, blanks last.
// Fails before: every row is in the DOM, and the open is one task over the 50 ms budget at 4x CPU.
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { cdp, page, server, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import PlateTable from "./PlateTable.vue";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}

/** The /bead provider strip's size and shape: 546 providers, a formatted count, some blank. */
const N = 546;
const ROWS = Array.from({ length: N }, (_, i) => ({
    key: `p${i}`,
    name: `Provider ${String(i).padStart(3, "0")} Broadband Communications LLC`,
    value: i % 37 === 5 ? "—" : `${((i * 7919) % 9973).toLocaleString("en-US")} locations`,
}));

let app: App | null = null;
let host: HTMLElement | null = null;
afterEach(async () => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
    await page.viewport(1280, 720);
});

/** The provider strip's composed value cell: six fields in one text cell. */
const TEXT_ROWS = ROWS.slice(0, 60).map((r, i) => ({
    ...r,
    value: `Cooperative · Parent Holdings ${i} · $${i}.2M · 3 · 12 · Provider ${i} Inc.; Provider ${i} Broadband LLC`,
}));

/** A phone plate: a 390 px column, a 360 px figure box, the table seated in it on demand. */
async function mount(rows = ROWS, valueHeader = "Locations"): Promise<{ root: HTMLElement; open: { value: boolean } }> {
    host = document.createElement("div");
    host.style.width = "390px";
    document.body.appendChild(host);
    const open = ref(false);
    app = createApp(
        defineComponent({
            setup: () => () =>
                h("div", { class: "stage", style: "position:relative;height:360px" }, [
                    open.value
                        ? h(PlateTable, { id: "bead-providers", title: "Providers", rows, rowHeader: "Provider", valueHeader })
                        : null,
                ]),
        }),
    );
    app.mount(host);
    await nextTick();
    return { root: host, open };
}

const bodyRows = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>("[data-plate-table] tbody tr")];
const names = (root: HTMLElement) => bodyRows(root).map((tr) => tr.querySelector("td")!.textContent!.trim());
/** Scroll to the foot until `done` holds, following the foot as measured rows move it. */
async function scrollToFoot(sc: HTMLElement, done: () => boolean): Promise<boolean> {
    return until(() => {
        if (done()) return true;
        sc.scrollTop = sc.scrollHeight;
        return false;
    }, 3000);
}
const scrollerOf = (root: HTMLElement) => root.querySelector<HTMLElement>("[data-plate-table-viewport]")!;

describe("DV-3 · the table view windows its rows", () => {
    // CPU throttling and the long-task timeline are Chromium's (CDP); the window and sort cases run in
    // every engine.
    it.skipIf(server.browser !== "chromium")("the 546-row open stays under a 50 ms task at 4x CPU, 390 px", async () => {
        await page.viewport(390, 844);
        const { root, open } = await mount();
        // Warm the component, untimed, so the timed open measures the render, not compilation. One
        // warm open was not enough on the CI runner: the first timed open ran 52-61 ms and the two
        // after it raised no long task at all, so the cost was the engine's first optimizing pass
        // over the open's code, not the render. Three warm opens take the timed ones past it.
        for (let warm = 0; warm < 3; warm++) {
            open.value = true;
            expect(await until(() => bodyRows(root).length > 0, 2000)).toBe(true);
            open.value = false;
            await nextTick();
            await sleep(300);
        }

        // vitest types the CDP session without its methods; the Chromium session has `send`.
        const session = cdp() as unknown as { send(method: string, params?: object): Promise<unknown> };
        const longest: number[] = [];
        for (let rep = 0; rep < 3; rep++) {
            const tasks: number[] = [];
            const observer = new PerformanceObserver((list) => {
                for (const e of list.getEntries()) tasks.push(e.duration);
            });
            observer.observe({ type: "longtask" });
            await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
            try {
                open.value = true;
                await sleep(1000);
            } finally {
                await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
                observer.disconnect();
            }
            expect(bodyRows(root).length).toBeGreaterThan(0);
            longest.push(Math.max(0, ...tasks));
            open.value = false;
            await nextTick();
            await sleep(300);
        }
        console.log(`DV-3 open, 546 rows, 4x CPU, 390 px: longest task per open ${longest.map((t) => t.toFixed(1)).join(", ")} ms`);
        expect(Math.max(...longest), "the open's longest task").toBeLessThan(50);
    });

    it("renders a window of the rows and states the full count", async () => {
        const { root, open } = await mount();
        open.value = true;
        expect(await until(() => bodyRows(root).length > 0, 2000)).toBe(true);
        const rendered = bodyRows(root).length;
        expect(rendered, "a window, not every row").toBeLessThan(80);
        const table = root.querySelector<HTMLElement>("[data-plate-table] table")!;
        expect(table.getAttribute("aria-rowcount")).toBe(String(N + 1));
        expect(bodyRows(root)[0]!.getAttribute("aria-rowindex")).toBe("2");
        // Scrolling to the foot mounts the last rows, at their true row index. The foot moves as
        // rows are measured, so the scroll follows it, as a reader's would.
        const sc = scrollerOf(root);
        expect(await scrollToFoot(sc, () => names(root).includes(ROWS[N - 1]!.name))).toBe(true);
        const last = bodyRows(root).find((tr) => tr.querySelector("td")!.textContent!.trim() === ROWS[N - 1]!.name)!;
        expect(last.getAttribute("aria-rowindex")).toBe(String(N + 1));
    });

    it("sorts over every row, blanks last in both directions", async () => {
        const { root, open } = await mount();
        open.value = true;
        expect(await until(() => bodyRows(root).length > 0, 2000)).toBe(true);
        const value = root.querySelectorAll<HTMLButtonElement>("[data-plate-table] thead button")[1]!;
        const blanks = ROWS.filter((r) => r.value === "—").length;
        const numeric = ROWS.filter((r) => r.value !== "—").map((r) => Number(r.value.replace(/\D/g, "")));
        const minName = ROWS.find((r) => r.value !== "—" && Number(r.value.replace(/\D/g, "")) === Math.min(...numeric))!.name;
        const maxName = ROWS.find((r) => r.value !== "—" && Number(r.value.replace(/\D/g, "")) === Math.max(...numeric))!.name;
        const sc = scrollerOf(root);
        // At the foot, every mounted row past the last numeric row index is blank, and the foot is.
        const blanksLastAtFoot = async (): Promise<boolean> => {
            await scrollToFoot(sc, () => bodyRows(root).some((tr) => tr.getAttribute("aria-rowindex") === String(N + 1)));
            const tail = bodyRows(root).filter((tr) => Number(tr.getAttribute("aria-rowindex")) > N + 1 - blanks);
            const lastIndex = Math.max(...bodyRows(root).map((tr) => Number(tr.getAttribute("aria-rowindex"))));
            return lastIndex === N + 1 && tail.length > 0 && tail.every((tr) => tr.querySelectorAll("td")[1]!.textContent!.trim() === "—");
        };

        await userEvent.click(value);
        expect(await until(() => names(root)[0] === minName, 2000), "ascending: the global minimum first").toBe(true);
        expect(await blanksLastAtFoot(), "ascending: blanks last").toBe(true);
        sc.scrollTop = 0;
        sc.dispatchEvent(new Event("scroll"));
        await userEvent.click(value);
        expect(await until(() => names(root)[0] === maxName, 2000), "descending: the global maximum first").toBe(true);
        expect(await blanksLastAtFoot(), "descending: blanks last").toBe(true);
    });

    // The windowed rows are fixed-layout tables, so the value column's width is the table's to set.
    // The old auto layout let the provider strip's composed text cell widen the table to 2,572 px
    // inside a 238 px phone scroller, and squeezed the names to break mid-word.
    it("a figure column fits its figures; a text value wraps; nothing scrolls sideways", async () => {
        await page.viewport(390, 844);
        // The third case is sci-schoolmap's shape: 8-character figures under a 28-character head. A
        // head-sized column took 240 of a 252 px phone table and left the names 12 px.
        const cases = [
            [ROWS, false, "Locations"],
            [TEXT_ROWS, true, "Locations"],
            [ROWS.map((r) => ({ ...r, value: r.value === "—" ? "—" : "1.2 Mbps" })), false, "Bandwidth per student (kbps)"],
        ] as const;
        for (const [rows, text, head] of cases) {
            const { root, open } = await mount([...rows], head);
            open.value = true;
            expect(await until(() => bodyRows(root).length > 0, 2000)).toBe(true);
            await sleep(200);
            const sc =
                root.querySelector<HTMLElement>("[data-plate-table-viewport]") ??
                root.querySelector<HTMLElement>('[data-plate-table] [data-slot="table-container"]')!;
            const register = text ? "text" : "figure";
            expect(sc.scrollWidth, `${register}: no sideways scroll`).toBeLessThanOrEqual(sc.clientWidth + 1);
            const [nameHead, valueHead] = [...root.querySelectorAll<HTMLElement>("[data-plate-table] thead th")];
            const cell = bodyRows(root)[0]!.querySelectorAll<HTMLElement>("td")[1]!;
            expect(cell.scrollWidth, `${register}: the value fits its cell`).toBeLessThanOrEqual(cell.clientWidth + 1);
            const nameW = nameHead!.getBoundingClientRect().width;
            const valueW = valueHead!.getBoundingClientRect().width;
            if (text) {
                expect(valueW, "text: the value takes the wider share").toBeGreaterThan(nameW);
                expect(getComputedStyle(cell).textAlign).not.toBe("right");
                expect(getComputedStyle(cell).verticalAlign, "text: a tall row reads from its top").toBe("top");
            } else {
                expect(valueW, `figure (${head}): the name takes the wider share`).toBeLessThan(nameW);
                expect(getComputedStyle(cell).whiteSpace).toBe("nowrap");
            }
            app?.unmount();
            host?.remove();
            app = null;
            host = null;
        }
    });
});
