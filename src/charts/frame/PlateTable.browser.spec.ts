// The figure's table view in a real engine (U/B8 A4, owner O-18 and O-19). One click on the dock's
// Table view toggle, with the dock still closed, swaps the figure for its export rows in the same
// box; a second click brings the figure back. Every column sorts and a blank stays last in both
// directions. Fails before: PlateDock had no `view` and PlateTable did not exist.
import "../../../tests/browser/glass-root.css";
import { walkKey } from "../../../tests/browser/walk-key.js";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import { createPinia, setActivePinia } from "pinia";
import PlateDock from "./PlateDock.vue";
import PlateTable from "./PlateTable.vue";
import type { PlateView } from "./plate-view";
import { provideDismissArbiter } from "../../platform/interaction/useDismissArbiter";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}

let app: App | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
});

const ROWS = [
    { name: "Ashe", value: "$730M" },
    { name: "Bladen", value: "—" },
    { name: "Wake", value: "$1.86B" },
    { name: "Clay", value: "" },
    { name: "Dare", value: "$48K" },
];

/** A plate-shaped harness: the dock in the head, a 320 px figure, and the table in its box. */
async function mount(): Promise<{ root: HTMLElement; view: { value: PlateView } }> {
    host = document.createElement("div");
    host.style.width = "720px";
    document.body.appendChild(host);
    const pinia = createPinia();
    setActivePinia(pinia);
    const view = ref<PlateView>("chart");
    app = createApp(
        defineComponent({
            setup() {
                provideDismissArbiter();
                return () =>
                    h("div", [
                        h(PlateDock, {
                            id: "a",
                            title: "Funding by county",
                            enlarge: () => {},
                            exportCsv: () => {},
                            exportImage: () => {},
                            view: view.value,
                            "onUpdate:view": (v: PlateView) => (view.value = v),
                        }),
                        h("div", { class: "stage", style: "position:relative;height:320px", "data-view": view.value }, [
                            h("div", { "data-figure": "", style: view.value === "table" ? "visibility:hidden;height:320px" : "height:320px" }, "chart"),
                            view.value === "table"
                                ? h(PlateTable, { id: "a", title: "Funding by county", rows: ROWS, rowHeader: "County", valueHeader: "Funding" })
                                : null,
                        ]),
                    ]);
            },
        }),
    );
    app.use(pinia);
    app.mount(host);
    await nextTick();
    await sleep(200);
    return { root: host, view };
}

const toggleOf = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-plate-dock] [data-action="view"]')!;
const names = (root: HTMLElement) =>
    [...root.querySelectorAll<HTMLElement>("[data-plate-table] tbody tr")].map((tr) => tr.querySelector("td")!.textContent!.trim());

describe("A4 · the table view", () => {
    it("one click on the closed dock shows the table; a second click shows the chart", async () => {
        const { root, view } = await mount();
        const dock = root.querySelector<HTMLElement>("[data-plate-dock]")!;
        const toggle = toggleOf(root);
        expect(dock.hasAttribute("data-expanded"), "the dock starts closed").toBe(false);
        expect(toggle.getClientRects().length, "the toggle is visible on the closed dock").toBeGreaterThan(0);
        expect(toggle.closest("[inert]")).toBeNull();
        expect(toggle.getAttribute("aria-pressed")).toBe("false");
        await userEvent.click(toggle);
        expect(await until(() => view.value === "table", 1000)).toBe(true);
        expect(await until(() => names(root).length === ROWS.length, 1000)).toBe(true);
        expect(toggleOf(root).getAttribute("aria-pressed")).toBe("true");
        expect(dock.hasAttribute("data-expanded"), "the toggle does not open the dock").toBe(false);
        // The table fills the figure's box and moves nothing else.
        const table = root.querySelector<HTMLElement>("[data-plate-table]")!.getBoundingClientRect();
        const stage = root.querySelector<HTMLElement>(".stage")!.getBoundingClientRect();
        expect(Math.round(table.height)).toBe(Math.round(stage.height));
        await userEvent.click(toggleOf(root));
        expect(await until(() => view.value === "chart", 1000)).toBe(true);
        expect(await until(() => !root.querySelector("[data-plate-table]"), 1000)).toBe(true);
    });

    it("every column sorts, blanks last in both directions", async () => {
        const { root, view } = await mount();
        view.value = "table";
        await nextTick();
        expect(await until(() => names(root).length === ROWS.length, 1000)).toBe(true);
        const heads = [...root.querySelectorAll<HTMLButtonElement>("[data-plate-table] thead button")];
        expect(heads.map((b) => b.textContent!.replace(/[↕↑↓]/g, "").trim())).toEqual(["County", "Funding"]);
        await userEvent.click(heads[1]!);
        expect(await until(() => names(root)[0] === "Dare", 1000)).toBe(true);
        expect(names(root)).toEqual(["Dare", "Ashe", "Wake", "Bladen", "Clay"]);
        await userEvent.click(heads[1]!);
        expect(await until(() => names(root)[0] === "Wake", 1000)).toBe(true);
        expect(names(root)).toEqual(["Wake", "Ashe", "Dare", "Bladen", "Clay"]);
        await userEvent.click(heads[0]!);
        expect(await until(() => names(root)[0] === "Ashe", 1000)).toBe(true);
        expect(names(root)).toEqual(["Ashe", "Bladen", "Clay", "Dare", "Wake"]);
    });

    // R-FIGDOCK §4 counted one stop per closed dock. The toggle is the second, by design: it is the
    // one control a reader reaches without opening the dock. This pins the count at two.
    it("a closed dock with the toggle is two tab stops: the toggle, then the handle", async () => {
        const { root } = await mount();
        const before = document.createElement("button");
        const after = document.createElement("button");
        root.prepend(before);
        root.append(after);
        before.focus();
        const stops: Element[] = [];
        for (let i = 0; i < 20 && document.activeElement !== after; i++) {
            await userEvent.keyboard(walkKey);
            if (document.activeElement !== after) stops.push(document.activeElement!);
        }
        expect(document.activeElement).toBe(after);
        const dock = root.querySelector<HTMLElement>("[data-plate-dock]")!;
        const inDock = stops.filter((el) => dock.contains(el));
        expect(inDock).toHaveLength(2);
        expect(inDock[0]).toBe(toggleOf(root));
        expect(inDock[1]!.querySelector("[data-plate-dock-handle]")).not.toBeNull();
    });
});
