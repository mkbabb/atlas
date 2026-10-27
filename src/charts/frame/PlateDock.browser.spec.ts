// PlateDock in a real engine (U/B7 O-18, PLAN §5.2, R-FIGDOCK §4–§7). Two figures on one page each
// carry one handle and one tab stop; every control names its own figure; Enter on the handle opens the dock; Escape
// closes it and returns focus to the handle; a sheet taking a screen seat closes it. The pointer
// sweep (hover opens nothing) needs glass's `expandOn: "press"`, so it runs once installed glass
// declares that prop.
import "../../../tests/browser/glass-root.css";
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

    // R-FIGDOCK §4: a closed dock is one tab stop. Walk Tab from a sentinel before the figures to one
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
            await userEvent.keyboard("{Tab}");
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
