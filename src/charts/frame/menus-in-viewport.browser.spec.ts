// O-11 (PLAN §5.5), the atlas half at component grain: every menu a figure opens (the dock's Download
// menu, its Options popover, the period Select) lies inside the viewport at 1440 and 390, leaves
// `body` overflow `visible`, and does not move a sticky element. The route walk over a sci clone (9
// routes × 2 widths × 2 schemes × 2 engines) is the integ half. The Select's scroll lock is glass's
// (G1, D-2), planted from u/b7-glass.
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, ref, type App } from "vue";
import { createPinia } from "pinia";
import PlateDock from "./PlateDock.vue";
import PeriodControl from "../scene/PeriodControl.vue";
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
afterEach(async () => {
    await userEvent.keyboard("{Escape}");
    app?.unmount();
    host?.remove();
    app = null;
    host = null;
    window.scrollTo(0, 0);
    await page.viewport(1440, 900);
});

async function mount(width: number): Promise<{ sticky: HTMLElement; fig: HTMLElement }> {
    host = document.createElement("div");
    host.innerHTML = `<header id="sticky" style="position:sticky;top:0;height:48px;background:#ddd;z-index:5">Page head</header><div style="height:1400px"></div><div id="fig" style="inline-size:${width - 32}px;margin-inline:16px"></div><div style="height:2400px"></div>`;
    document.body.appendChild(host);
    const year = ref(2024);
    app = createApp(
        defineComponent({
            setup() {
                provideDismissArbiter();
                return () =>
                    h("div", { style: "display:grid;gap:12px" }, [
                        h("div", { style: "display:flex;justify-content:flex-end" }, [
                            h(PeriodControl, {
                                periods: [2019, 2020, 2021, 2022, 2023, 2024],
                                modelValue: year.value,
                                label: (k: number) => `${k}–${String((k + 1) % 100).padStart(2, "0")}`,
                                noun: "school year",
                                "onUpdate:modelValue": (k: number) => (year.value = k),
                            }),
                        ]),
                        h(
                            PlateDock,
                            { id: "f", title: "Bandwidth per student", enlarge: () => {}, exportCsv: () => {}, exportImage: () => {} },
                            { options: () => h("div", { style: "inline-size:18rem;block-size:12rem" }, "Options") },
                        ),
                        h("div", { style: "height:420px;background:#eee" }, "chart"),
                    ]);
            },
        }),
    );
    app.use(createPinia());
    app.mount(host.querySelector("#fig")!);
    await nextTick();
    await sleep(150);
    const fig = host.querySelector<HTMLElement>("#fig")!;
    fig.scrollIntoView({ block: "center" });
    await sleep(100);
    return { sticky: host.querySelector<HTMLElement>("#sticky")!, fig };
}

function inViewport(el: Element): boolean {
    const r = el.getBoundingClientRect();
    return r.top >= -0.5 && r.left >= -0.5 && r.bottom <= innerHeight + 0.5 && r.right <= innerWidth + 0.5 && r.width > 0;
}

async function openDock(fig: HTMLElement): Promise<HTMLElement> {
    const dock = fig.querySelector<HTMLElement>("[data-plate-dock]")!;
    dock.querySelector("[data-plate-dock-handle]")!.closest<HTMLElement>("[tabindex]")!.focus({ preventScroll: true });
    await userEvent.keyboard("{Enter}");
    expect(await until(() => dock.hasAttribute("data-expanded"), 1500)).toBe(true);
    return dock;
}
/** Open a dock menu from the keyboard as soon as the dock opens. */
async function openFrom(dock: HTMLElement, action: "download" | "options"): Promise<void> {
    await until(() => !dock.querySelector(`[data-action="${action}"]`)?.closest("[inert]"), 1000);
    dock.querySelector<HTMLElement>(`[data-action="${action}"]`)!.focus({ preventScroll: true });
    await userEvent.keyboard("{Enter}");
}

for (const [vw, vh] of [[1440, 900], [390, 844]] as const)
    describe(`menus at ${vw}`, () => {
        it("the Download menu lies in the viewport; body overflow stays visible; the sticky head stays put", async () => {
            await page.viewport(vw, vh);
            const { sticky, fig } = await mount(vw);
            const s0 = sticky.getBoundingClientRect().top;
            const dock = await openDock(fig);
            await openFrom(dock, "download");
            expect(await until(() => !!document.querySelector('[role="menu"]'), 1500)).toBe(true);
            await sleep(200);
            const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
            expect(inViewport(menu), JSON.stringify(menu.getBoundingClientRect())).toBe(true);
            expect(getComputedStyle(document.body).overflow).toBe("visible");
            expect(sticky.getBoundingClientRect().top).toBe(s0);
        });

        it("the Options popover lies in the viewport and locks nothing", async () => {
            await page.viewport(vw, vh);
            const { sticky, fig } = await mount(vw);
            const s0 = sticky.getBoundingClientRect().top;
            const dock = await openDock(fig);
            await openFrom(dock, "options");
            expect(await until(() => !!document.querySelector('[data-plate-layer="f:options"]'), 1500)).toBe(true);
            await sleep(200);
            const pop = document.querySelector<HTMLElement>('[data-plate-layer="f:options"]')!;
            expect(inViewport(pop), JSON.stringify(pop.getBoundingClientRect())).toBe(true);
            expect(getComputedStyle(document.body).overflow).toBe("visible");
            expect(sticky.getBoundingClientRect().top).toBe(s0);
        });

        it("a press-opened dock stays open under the pointer, and Download opens on a click", async () => {
            await page.viewport(vw, vh);
            const { fig } = await mount(vw);
            const dock = fig.querySelector<HTMLElement>("[data-plate-dock]")!;
            await userEvent.click(dock.querySelector("[data-plate-dock-handle]")!.closest<HTMLElement>("[tabindex]")!);
            await until(() => dock.hasAttribute("data-expanded"), 1500);
            await sleep(1200);
            expect(dock.hasAttribute("data-expanded")).toBe(true);
            await userEvent.click(dock.querySelector<HTMLElement>('[data-action="download"]')!);
            expect(await until(() => !!document.querySelector('[role="menu"]'), 1500)).toBe(true);
            expect(inViewport(document.querySelector('[role="menu"]')!)).toBe(true);
        });

        it("the period Select lies in the viewport", async () => {
            await page.viewport(vw, vh);
            const { fig } = await mount(vw);
            await userEvent.click(fig.querySelector<HTMLElement>('[data-testid="period-select"]')!);
            expect(await until(() => !!document.querySelector('[role="listbox"]'), 1500)).toBe(true);
            await sleep(200);
            const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
            expect(inViewport(list), JSON.stringify(list.getBoundingClientRect())).toBe(true);
        });

        it("the period Select leaves body overflow visible and the sticky head in place", async () => {
            await page.viewport(vw, vh);
            const { sticky, fig } = await mount(vw);
            const s0 = sticky.getBoundingClientRect().top;
            await userEvent.click(fig.querySelector<HTMLElement>('[data-testid="period-select"]')!);
            await until(() => !!document.querySelector('[role="listbox"]'), 1500);
            expect(getComputedStyle(document.body).overflow).toBe("visible");
            expect(sticky.getBoundingClientRect().top).toBe(s0);
        });
    });
