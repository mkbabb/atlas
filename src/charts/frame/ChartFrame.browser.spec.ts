// ChartFrame's URL arm in a real engine (U/B5 land, after §K K-2). With the overlay push verb an
// enlarged figure owns a history entry: `openFig` pushes, and `closeFig` goes Back, so `?fig` clears
// on the popstate, not inside the close call. Focus returns to the control that opened the figure
// when the figure has actually collapsed. Returning it inside the close call (while the figure was
// still open over a scroll-locked page) moved the page under the reader: on /sci at 1440 the walk
// saw 1605 -> 1035 px and 1924 -> 4463 px on close. Since O-18 the Enlarge control sits in the
// figure's dock: the dock closes as the figure opens, and focus returns to the dock's handle.
import { describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import ChartFrame from "./ChartFrame.vue";
import PlateDock from "./PlateDock.vue";
import { provideDismissArbiter } from "../../platform/interaction/useDismissArbiter";
import { installDashboardRegistry } from "../../contract/registry-inject";

declare module "vitest/browser" {
    interface BrowserCommands {
        emulateMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
    }
}

const ID = "fig-under-test";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}
const fig = () => new URLSearchParams(location.search).get("fig");

describe("ChartFrame ?fig: Escape goes Back, the page stays put, focus returns to Enlarge", () => {
    for (const motion of ["no-preference", "reduce"] as const) {
        it(`motion ${motion}`, async () => {
            await commands.emulateMotion(motion);
            history.replaceState(null, "", "/");
            const host = document.createElement("div");
            host.innerHTML = `<div style="height:2400px"></div><div id="frame-host" style="width:720px"></div><div style="height:2400px"></div>`;
            document.body.appendChild(host);
            const app = createApp(
                defineComponent({
                    setup() {
                        provideDismissArbiter();
                        return () =>
                            h(
                                ChartFrame,
                                { ariaLabel: "The figure", figId: ID },
                                {
                                    default: () => h("div", { style: "height:240px" }, "chart"),
                                    dock: ({ enlarge }: { enlarge: () => void }) =>
                                        h(PlateDock, { id: ID, title: "The figure", enlarge, browse: null }),
                                },
                            );
                    },
                }),
            );
            app.use(createPinia());
            app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] }));
            installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
            app.mount(host.querySelector("#frame-host")!);
            try {
                await nextTick();
                const dockRoot = host.querySelector<HTMLElement>(`[data-plate-dock][data-subject="${ID}"]`)!;
                expect(dockRoot).not.toBeNull();
                dockRoot.scrollIntoView({ block: "center" });
                await sleep(100);
                const y0 = window.scrollY;
                expect(y0).toBeGreaterThan(1000);
                const handle = dockRoot.querySelector<HTMLElement>("[aria-expanded][aria-controls]")!;
                handle.focus();
                await userEvent.keyboard("{Enter}");
                const enlarge = await (async () => {
                    await until(() => !!dockRoot.querySelector(`[data-action="enlarge"]`)?.getClientRects().length, 1500);
                    return dockRoot.querySelector<HTMLElement>(`[data-action="enlarge"]`)!;
                })();
                enlarge.focus();
                await userEvent.keyboard("{Enter}");
                expect(await until(() => fig() === ID, 2000)).toBe(true);
                expect((history.state as Record<string, unknown> | null)?.["atlas:overlay"]).toBe("fig");
                await sleep(400);
                await userEvent.keyboard("{Escape}");
                expect(await until(() => fig() === null, 2500)).toBe(true);
                await sleep(400);
                const returned = document.activeElement as HTMLElement | null;
                expect(returned?.closest(`[data-plate-dock][data-subject="${ID}"]`), "focus returns into the figure's dock").not.toBeNull();
                expect(returned?.getAttribute("aria-expanded"), "the handle, not the inert Enlarge").toBe("false");
                expect(Math.abs(window.scrollY - y0)).toBeLessThanOrEqual(2);
            } finally {
                app.unmount();
                host.remove();
                history.replaceState(null, "", "/");
                window.scrollTo(0, 0);
            }
        });
    }
});
