// PlateAct's dismissal in a real engine with real key events (U RULINGS §K K-1).
//
// Each plate layer (the Options popover, the Download menu, the phone sheet) holds a claim on the
// page's dismiss arbiter while it is open. One Escape closes the topmost plate layer, and nothing
// else, and focus returns to the control that opened it. Both motion settings are exercised, because
// the B4-LAND F-1 miss (about 1 Escape in 6 left the sheet open with focus on BODY) appeared only with
// motion on: the plate seat's 136/136 ran under reduced motion.
import { afterAll, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick, ref } from "vue";
import PlateAct from "./PlateAct.vue";
import { provideDismissArbiter, useDismissArbiter } from "../../platform/interaction/useDismissArbiter";

declare module "vitest/browser" {
    interface BrowserCommands {
        emulateMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
    }
}

const ID = "plate-under-test";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Poll until `pred` holds or `ms` elapses; returns whether it held. */
async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}

function mount(width: number, { selection = false }: { selection?: boolean } = {}) {
    const host = document.createElement("div");
    host.style.cssText = `width:${width}px`;
    document.body.appendChild(host);
    const dismissed: string[] = [];
    const held = ref(selection);
    const app = createApp(
        defineComponent({
            setup() {
                // The page's arbiter and a standing selection claim at its shipped priority (PlatformShell
                // selection 0): the claim a plate layer must outrank.
                const arbiter = provideDismissArbiter();
                useDismissArbiter(arbiter).claim(() =>
                    held.value
                        ? {
                              id: "selection",
                              priority: 0,
                              escape: true,
                              onDismiss: () => {
                                  dismissed.push("selection");
                                  held.value = false;
                              },
                          }
                        : null,
                );
                return () =>
                    h(
                        PlateAct,
                        {
                            id: ID,
                            title: "The figure",
                            enlarge: () => dismissed.push("enlarge"),
                            exportCsv: () => undefined,
                            exportImage: () => undefined,
                            browse: null,
                        },
                        { options: () => h("button", { "data-testid": "dial" }, "A dial") },
                    );
            },
        }),
    );
    app.mount(host);
    const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T & HTMLElement>(sel);
    return {
        q,
        dismissed,
        held,
        done: () => {
            app.unmount();
            host.remove();
        },
    };
}

const sheetOpen = () => document.querySelector(`[data-plate-sheet="${ID}"][data-state="open"]`) !== null;
/** The sheet is closed: unmounted, or closed and inert. With motion on, glass keeps a closing sheet
    mounted (`inert`, data-state="closed") for its exit spring and unmounts it when the spring settles
    at 1. About 1 close in 3 at 350 ms the spring settles at 0.9999999999999999 (keyframes.js
    `SpringProgress.checkSettled` rests at `origin + 1·(target − origin)`, not at `target`), glass's
    `value >= 1` test never passes, and the inert sheet stays mounted until the next open. That is the
    B4-LAND F-1 "still open after 5 s"; its root is upstream of atlas and is relayed (B5-ATLAS-FIX). */
const sheetClosed = () => {
    const el = document.querySelector(`[data-plate-sheet="${ID}"]`);
    return el === null || (el.getAttribute("data-state") === "closed" && el.hasAttribute("inert"));
};

afterAll(async () => {
    await commands.emulateMotion("no-preference");
});

for (const motion of ["no-preference", "reduce"] as const) {
    describe(`PlateAct dismissal, motion ${motion} (K-1)`, () => {
        it("the phone sheet: one Escape closes it, focus returns to Take this figure, every time", async () => {
            await commands.emulateMotion(motion);
            const m = mount(360);
            try {
                await nextTick();
                const take = m.q(`[data-subject="${ID}"][data-action="take"]`)!;
                const misses: string[] = [];
                for (let i = 0; i < 12; i++) {
                    take.focus();
                    await userEvent.keyboard("{Enter}");
                    if (!(await until(sheetOpen, 2000))) {
                        misses.push(`${i}: never opened`);
                        continue;
                    }
                    // The B4-LAND probe pressed Escape 350 ms after the sheet was visible; the spread
                    // covers an Escape mid-entrance as well as after it has settled.
                    await sleep([0, 60, 150, 350][i % 4]);
                    await userEvent.keyboard("{Escape}");
                    // Focus never falls to BODY between the Escape and the close.
                    let lost = false;
                    const closed = await until(() => {
                        if (document.activeElement === document.body) lost = true;
                        return sheetClosed() && document.activeElement === take;
                    }, 1500);
                    if (!closed) {
                        const el = document.querySelector<HTMLElement>(`[data-plate-sheet="${ID}"]`);
                        misses.push(
                            `${i}: still open (state=${el?.getAttribute("data-state")} inert=${el?.hasAttribute("inert")} translate=${el?.style.translate} active=${document.activeElement?.getAttribute("data-action") ?? document.activeElement?.tagName})`,
                        );
                    }
                    if (lost) misses.push(`${i}: focus fell to BODY`);
                    if (document.activeElement !== take) misses.push(`${i}: focus not on take`);
                }
                expect(misses).toEqual([]);
            } finally {
                m.done();
            }
        });

        it("the phone sheet outranks a held selection: Escape closes the sheet and keeps the selection", async () => {
            await commands.emulateMotion(motion);
            const m = mount(360, { selection: true });
            try {
                await nextTick();
                const take = m.q(`[data-subject="${ID}"][data-action="take"]`)!;
                take.focus();
                await userEvent.keyboard("{Enter}");
                expect(await until(sheetOpen, 2000)).toBe(true);
                await sleep(350);
                await userEvent.keyboard("{Escape}");
                expect(await until(sheetClosed, 2500)).toBe(true);
                expect(m.dismissed).toEqual([]);
                expect(m.held.value).toBe(true);
                expect(document.activeElement).toBe(take);
                // The next Escape reaches the page claim.
                await userEvent.keyboard("{Escape}");
                expect(m.dismissed).toEqual(["selection"]);
            } finally {
                m.done();
            }
        });

        it("the Options popover outranks a held selection and returns focus to Options", async () => {
            await commands.emulateMotion(motion);
            const m = mount(720, { selection: true });
            try {
                await nextTick();
                const trigger = m.q(`[data-subject="${ID}"][data-action="options"]`)!;
                trigger.focus();
                await userEvent.keyboard("{Enter}");
                expect(await until(() => m.q('[data-testid="dial"]') !== null && m.q(".plate-act__options") !== null, 2000)).toBe(true);
                await sleep(200);
                await userEvent.keyboard("{Escape}");
                expect(await until(() => m.q(".plate-act__options") === null, 2500)).toBe(true);
                expect(m.dismissed).toEqual([]);
                expect(m.held.value).toBe(true);
                expect(document.activeElement).toBe(trigger);
            } finally {
                m.done();
            }
        });

        it("the Download menu outranks a held selection and returns focus to Download", async () => {
            await commands.emulateMotion(motion);
            const m = mount(720, { selection: true });
            try {
                await nextTick();
                const trigger = m.q(`[data-subject="${ID}"][data-action="download"]`)!;
                trigger.focus();
                await userEvent.keyboard("{Enter}");
                expect(await until(() => m.q(`[role="menu"][data-subject="${ID}"]`) !== null, 2000)).toBe(true);
                await sleep(200);
                await userEvent.keyboard("{Escape}");
                expect(await until(() => m.q(`[role="menu"][data-subject="${ID}"]`) === null, 2500)).toBe(true);
                expect(m.dismissed).toEqual([]);
                expect(m.held.value).toBe(true);
                expect(document.activeElement).toBe(trigger);
            } finally {
                m.done();
            }
        });
    });
}

// K-4: the enlarged figure's focus return, mounted (B4 pinned it only by source regexes). The real
// ChartFrame with the real PlateAct in its `#act` seat, inside a page arbiter: Enlarge opens the
// figure, one real Escape closes it, and focus returns to the Enlarge control that opened it.
describe("ChartFrame enlarge: Escape closes the figure and returns focus to Enlarge (K-4)", () => {
    for (const motion of ["no-preference", "reduce"] as const) {
        it(`motion ${motion}`, async () => {
            await commands.emulateMotion(motion);
            const { default: ChartFrame } = await import("./ChartFrame.vue");
            const { createPinia } = await import("pinia");
            const { createMemoryHistory, createRouter } = await import("vue-router");
            const { installDashboardRegistry } = await import("../../contract/registry-inject");
            const host = document.createElement("div");
            host.style.cssText = "width:720px";
            document.body.appendChild(host);
            const app = createApp(
                defineComponent({
                    setup() {
                        provideDismissArbiter();
                        return () =>
                            h(
                                ChartFrame,
                                { ariaLabel: "The figure" },
                                {
                                    default: () => h("div", { style: "height:120px" }, "chart"),
                                    act: ({ enlarge }: { enlarge: () => void }) =>
                                        h(PlateAct, { id: ID, title: "The figure", enlarge, browse: null }),
                                },
                            );
                    },
                }),
            );
            app.use(createPinia());
            app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] }));
            installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
            app.mount(host);
            try {
                await nextTick();
                const enlarge = host.querySelector<HTMLElement>(`[data-subject="${ID}"][data-action="enlarge"]`)!;
                expect(enlarge).not.toBeNull();
                enlarge.focus();
                await userEvent.keyboard("{Enter}");
                const fullscreen = () => document.querySelector('[role="dialog"], .fixed.inset-0') !== null;
                expect(await until(fullscreen, 2000)).toBe(true);
                await sleep(300);
                await userEvent.keyboard("{Escape}");
                expect(await until(() => document.activeElement === enlarge, 2500)).toBe(true);
            } finally {
                app.unmount();
                host.remove();
            }
        });
    }
});
