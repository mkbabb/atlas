// PlateDock in a real engine (U/B7 O-18, PLAN §5.2, R-FIGDOCK §4–§7). Two figures on one page each
// carry one handle and one tab stop; every control names its own figure; Enter on the handle opens the dock; Escape
// closes it and returns focus to the handle; a sheet taking a screen seat closes it. The pointer
// sweep (hover opens nothing) needs glass's `expandOn: "press"`, so it runs once installed glass
// declares that prop.
import "../../../tests/browser/glass-root.css";
import { walkKey } from "../../../tests/browser/walk-key.js";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import PlateDock from "./PlateDock.vue";
import { provideDismissArbiter } from "../../platform/interaction/useDismissArbiter";
import { useSurfaceSeats } from "../../platform/chrome/surfaces/useSurfaceSeat";

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
let pinia: Pinia;
afterEach(() => {
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
});

async function mount(): Promise<HTMLElement> {
    host = document.createElement("div");
    host.style.width = "720px";
    document.body.appendChild(host);
    pinia = createPinia();
    setActivePinia(pinia);
    app = createApp(
        defineComponent({
            setup() {
                provideDismissArbiter();
                return () =>
                    h("div", [
                        h(PlateDock, { id: "a", title: "Bandwidth per student", enlarge: () => {}, exportCsv: () => {}, exportImage: () => {} }),
                        h(PlateDock, { id: "b", title: "Cost per Mbps", enlarge: () => {}, browse: () => {} }),
                    ]);
            },
        }),
    );
    app.use(pinia);
    app.mount(host);
    await nextTick();
    await sleep(200);
    return host;
}
const dockOf = (root: HTMLElement, id: string) => root.querySelector<HTMLElement>(`[data-plate-dock][data-subject="${id}"]`)!;
const handleOf = (dock: HTMLElement) => dock.querySelector("[data-plate-dock-handle]")!.closest<HTMLElement>("[tabindex]")!;
const visible = (el: Element | null) => !!el && el.getClientRects().length > 0 && !el.closest("[inert]");

describe("PlateDock: one handle per figure, press opens, Escape closes to the handle", () => {
    it("each figure carries one handle and every control names its own figure", async () => {
        const root = await mount();
        for (const [id, title] of [["a", "Bandwidth per student"], ["b", "Cost per Mbps"]] as const) {
            const dock = dockOf(root, id);
            expect(dock.querySelectorAll("[data-plate-dock-handle]")).toHaveLength(1);
            const controls = [...dock.querySelectorAll<HTMLElement>("[data-action]")];
            expect(controls.length).toBeGreaterThan(0);
            for (const c of controls) {
                expect(c.getAttribute("data-subject")).toBe(id);
                expect(c.getAttribute("aria-label")).toContain(title);
            }
        }
        // A figure with a source scope offers View data and no Download; one without offers Download.
        expect(dockOf(root, "a").querySelector('[data-action="download"]')).not.toBeNull();
        expect(dockOf(root, "a").querySelector('[data-action="source"]')).toBeNull();
        expect(dockOf(root, "b").querySelector('[data-action="source"]')).not.toBeNull();
        expect(dockOf(root, "b").querySelector('[data-action="download"]')).toBeNull();
    });

    // R-FIGDOCK §4: a closed dock is one tab stop. Walk the engine's navigation key from a sentinel before the figures to one
    // after them and count the stops inside each figure's dock.
    it("Tab stops once on each closed figure dock", async () => {
        const root = await mount();
        const before = document.createElement("button");
        const after = document.createElement("button");
        before.textContent = "before";
        after.textContent = "after";
        root.prepend(before);
        root.append(after);
        before.focus();
        const stops: Element[] = [];
        for (let i = 0; i < 40 && document.activeElement !== after; i++) {
            await userEvent.keyboard(walkKey); // Option+Tab in WebKit
            if (document.activeElement !== after) stops.push(document.activeElement!);
        }
        expect(document.activeElement, "the walk reaches the sentinel after the figures").toBe(after);
        for (const id of ["a", "b"]) {
            const dock = dockOf(root, id);
            expect(stops.filter((el) => dock.contains(el)), `stops in figure ${id}`).toEqual([handleOf(dock)]);
        }
        expect(stops).toHaveLength(2);
    });

    it("Enter opens the dock; Escape closes it and focus returns to the handle", async () => {
        const root = await mount();
        const dock = dockOf(root, "a");
        const handle = handleOf(dock);
        expect(visible(dock.querySelector('[data-action="enlarge"]'))).toBe(false);
        handle.focus();
        await userEvent.keyboard("{Enter}");
        expect(await until(() => dock.hasAttribute("data-expanded"), 1500)).toBe(true);
        expect(await until(() => visible(dock.querySelector('[data-action="enlarge"]')), 1500)).toBe(true);
        expect(dockOf(root, "b").hasAttribute("data-expanded"), "the other figure's dock stays closed").toBe(false);
        await userEvent.keyboard("{Escape}");
        expect(await until(() => !dock.hasAttribute("data-expanded"), 1500)).toBe(true);
        expect(await until(() => document.activeElement === handle, 1000)).toBe(true);
    });

    it("with Options present, Escape still returns focus to the handle", async () => {
        host = document.createElement("div");
        host.style.width = "720px";
        document.body.appendChild(host);
        pinia = createPinia();
        setActivePinia(pinia);
        app = createApp(
            defineComponent({
                setup() {
                    provideDismissArbiter();
                    return () =>
                        h(PlateDock, { id: "o", title: "Cost per Mbps", enlarge: () => {} }, { options: () => h("p", "Options") });
                },
            }),
        );
        app.use(pinia);
        app.mount(host);
        await nextTick();
        await sleep(200);
        const dock = dockOf(host, "o");
        const handle = handleOf(dock);
        expect(handle.getAttribute("role")).toBe("button");
        handle.focus();
        await userEvent.keyboard("{Enter}");
        expect(await until(() => dock.hasAttribute("data-expanded"), 1500)).toBe(true);
        await userEvent.keyboard("{Escape}");
        expect(await until(() => !dock.hasAttribute("data-expanded"), 1500)).toBe(true);
        expect(await until(() => document.activeElement === handle, 1000), "focus lands on the handle, not the inert Options button").toBe(true);
    });

    it("a sheet taking a screen seat closes an open dock", async () => {
        const root = await mount();
        const dock = dockOf(root, "a");
        handleOf(dock).focus();
        await userEvent.keyboard("{Enter}");
        expect(await until(() => dock.hasAttribute("data-expanded"), 1500)).toBe(true);
        useSurfaceSeats(pinia).open("right", "entity-detail");
        expect(await until(() => !dock.hasAttribute("data-expanded"), 1500)).toBe(true);
    });

    it("hovering the handle opens nothing", async () => {
        const root = await mount();
        const dock = dockOf(root, "a");
        await userEvent.hover(handleOf(dock));
        await sleep(600);
        expect(dock.hasAttribute("data-expanded")).toBe(false);
    });
});

// U/B8r I-2 and I-3 (REPORT-B8 §6.1). With a `view`, the closed dock carries two cells: the Table
// view toggle and the handle. I-2: the toggle scaled under the pointer (glass's dock hover lift,
// 1.1), against register MO-09's "no hover scale". I-3: glass drew every closed dock as a circle
// (50%), so this 100 x 52 dock became an oval lozenge, a full-radius box over 40 px (F-20). The
// cures are glass's (u/b8r-glass); this spec reads the served cascade in each engine.
describe("PlateDock with the Table view toggle: no hover scale, a bar corner", () => {
    async function mountView(): Promise<HTMLElement> {
        host = document.createElement("div");
        host.style.width = "720px";
        document.body.appendChild(host);
        pinia = createPinia();
        setActivePinia(pinia);
        app = createApp(
            defineComponent({
                setup() {
                    provideDismissArbiter();
                    return () =>
                        h("div", { style: "display:flex;flex-direction:column;align-items:flex-end;gap:24px" }, [
                            h(PlateDock, { id: "v", title: "Total contracted", view: "chart", enlarge: () => {}, exportCsv: () => {}, exportImage: () => {} }),
                            h(PlateDock, { id: "o", title: "Cost per Mbps", enlarge: () => {}, browse: () => {} }),
                        ]);
                },
            }),
        );
        app.use(pinia);
        app.mount(host);
        await nextTick();
        await sleep(400);
        return host;
    }
    const shell = (dock: HTMLElement) => dock.querySelector<HTMLElement>(".plate-dock__dock")!;
    /** The rq1 stadium rule: a box 40 px or taller, at least 1.3 times as wide, with a full radius. */
    const isStadium = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        const rad = parseFloat(getComputedStyle(el).borderTopLeftRadius);
        return r.height >= 40 && r.width >= 1.3 * r.height && rad >= r.height / 2 - 1;
    };

    it("the closed two-cell dock keeps the bar corner; the one-cell dock stays a circle", async () => {
        const root = await mountView();
        const two = shell(dockOf(root, "v"));
        const r = two.getBoundingClientRect();
        expect(r.width, "the toggle sits beside the handle").toBeGreaterThan(1.3 * r.height);
        const radius = getComputedStyle(two).borderTopLeftRadius;
        expect(radius, `closed two-cell dock ${Math.round(r.width)} x ${Math.round(r.height)}`).toMatch(/px$/);
        expect(parseFloat(radius)).toBeLessThan(r.height / 2 - 1);
        expect(isStadium(two)).toBe(false);
        const one = shell(dockOf(root, "o"));
        const o = one.getBoundingClientRect();
        expect(Math.abs(o.width - o.height)).toBeLessThan(1);
        expect(getComputedStyle(one).borderTopLeftRadius).toBe("50%");
    });

    it("hovering the Table view toggle scales nothing", async () => {
        const root = await mountView();
        const toggle = dockOf(root, "v").querySelector<HTMLElement>('[data-action="view"]')!;
        const before = toggle.getBoundingClientRect();
        await userEvent.hover(toggle);
        await sleep(450);
        const cs = getComputedStyle(toggle);
        expect(["none", "1"]).toContain(cs.scale);
        expect(cs.transform).toBe("none");
        const after = toggle.getBoundingClientRect();
        expect(Math.abs(after.width - before.width)).toBeLessThan(0.5);
        expect(Math.abs(after.height - before.height)).toBeLessThan(0.5);
    });
});
