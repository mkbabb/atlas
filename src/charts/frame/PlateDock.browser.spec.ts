// PlateDock in a real engine (U/B7 O-18, PLAN §5.2, R-FIGDOCK §4–§7). Two figures on one page each
// carry one handle; every control names its own figure; Enter on the handle opens the dock; Escape
// closes it and returns focus to the handle; a sheet taking a screen seat closes it. The pointer
// sweep (hover opens nothing) needs glass's `expandOn: "press"`, so it runs once installed glass
// declares that prop.
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, type App } from "vue";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { GlassDock } from "@mkbabb/glass-ui/dock";
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
const GLASS_PRESS = Boolean((GlassDock as { props?: Record<string, unknown> }).props?.expandOn);

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
const handleOf = (dock: HTMLElement) => dock.querySelector<HTMLElement>("[aria-expanded][aria-controls]")!;
const visible = (el: Element | null) => !!el && el.getClientRects().length > 0 && !el.closest("[inert]");

describe("PlateDock: one handle per figure, press opens, Escape closes to the handle", () => {
    it("each figure carries one handle and every control names its own figure", async () => {
        const root = await mount();
        for (const [id, title] of [["a", "Bandwidth per student"], ["b", "Cost per Mbps"]] as const) {
            const dock = dockOf(root, id);
            expect(dock.querySelectorAll("[aria-expanded][aria-controls]")).toHaveLength(1);
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

    it("a sheet taking a screen seat closes an open dock", async () => {
        const root = await mount();
        const dock = dockOf(root, "a");
        handleOf(dock).focus();
        await userEvent.keyboard("{Enter}");
        expect(await until(() => dock.hasAttribute("data-expanded"), 1500)).toBe(true);
        useSurfaceSeats(pinia).open("right", "entity-detail");
        expect(await until(() => !dock.hasAttribute("data-expanded"), 1500)).toBe(true);
    });

    it.runIf(GLASS_PRESS)("hovering the handle opens nothing", async () => {
        const root = await mount();
        const dock = dockOf(root, "a");
        await userEvent.hover(handleOf(dock));
        await sleep(600);
        expect(dock.hasAttribute("data-expanded")).toBe(false);
    });
});
