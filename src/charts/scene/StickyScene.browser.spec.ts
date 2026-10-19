// StickyScene in a real engine. Two contracts share this file (merged at U/B5 land):
//
// (1) U-F60 clause 3 (U RULINGS §K K-3). A scene's `apply` writes the URL (the /sci map writes the
// global year), and nothing writes a vocabulary key on load. A step crossed by a program scroll
// (load, layout, the `?at` restore) is shown, but its world effect waits for the reader: the
// reader's first trusted act applies the step the scene is showing.
//
// (2) U RULINGS §K K-5 (3): the pinned graphic holds its grid track and is never sized by its
// content. ECharts writes its painter root as a fixed-px box; after an Enlarge closes, that box
// still carries the expanded width until the host's ResizeObserver runs `resize()`. The graphic is
// a grid item, and `overflow: clip` does not make it a scroll container, so without
// `min-inline-size: 0` its automatic minimum is that stale min-content width: the whole chain from
// the figure to the ECharts host stays wide, `resize()` collapses it inside the observer callback,
// and the engine reports "ResizeObserver loop completed with undelivered notifications" (WebKit
// raises it as a page error on /sci at 1440; Chromium dispatches it as a window error event).
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StickyScene from "./StickyScene.vue";
import { installDashboardRegistry } from "../../contract/registry-inject.js";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import type { ChapterScene, SceneStep } from "../contract/scene-contract.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mount(applied: string[]) {
    const scene: ChapterScene = {
        kind: "scene",
        graphic: defineComponent({ render: () => h("div", { style: "height:300px" }, "graphic") }),
        steps: ["s-2014", "s-2018", "s-2021"].map((id) => ({ id, state: {}, prose: id })),
        apply: (step: SceneStep) => void applied.push(step.id),
    };
    const host = document.createElement("div");
    host.innerHTML = `<div style="height:1600px"></div><div id="scene-host"></div><div style="height:2400px"></div>`;
    document.body.appendChild(host);
    const app = createApp(defineComponent({ render: () => h(StickyScene, { scene, beatId: "map" }) }));
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] }));
    app.use(createPinia());
    app.mount(host.querySelector("#scene-host")!);
    return () => {
        app.unmount();
        host.remove();
    };
}

let done: (() => void) | null = null;
afterEach(() => {
    done?.();
    done = null;
    window.scrollTo(0, 0);
});

describe("a scene's world effect waits for a reader act (K-3)", () => {
    it("a program scroll shows a step without applying it; the reader's first key applies it", async () => {
        const applied: string[] = [];
        done = mount(applied);
        await wait(300);
        const first = document.querySelector<HTMLElement>('[data-scene-step-id="s-2014"]')!;
        first.scrollIntoView({ block: "center" }); // a program scroll: not a reader act
        await wait(600);
        expect(first.hasAttribute("data-active-step")).toBe(true); // the step is shown
        expect(applied).toEqual([]); // and its world effect is held

        await userEvent.keyboard("{Shift}"); // a trusted key that does not move the page
        await wait(100);
        expect(applied).toEqual(["s-2014"]);
    });
});

// ── U §L 6(f): a scene's year is HELD in memory, never written ──
// The /sci map scene's `apply` drives `runtime.setYear`. Under 6(f) the scroll write of the year is
// deleted: the step holds the year scope (`useYearScope.hold`), the URL is not written, and leaving
// the scene releases the hold. A recording stand-in for the year scope counts each verb.
describe("a scene's year is held, never written (§L 6(f))", () => {
    it("setYear holds the step's year, writes nothing, and releases on unmount", async () => {
        const calls: string[] = [];
        const scene: ChapterScene = {
            kind: "scene",
            graphic: defineComponent({ render: () => h("div", { style: "height:300px" }, "graphic") }),
            steps: [2014, 2018].map((year) => ({ id: `s-${year}`, state: { year }, prose: `y${year}` })),
            apply: (step: SceneStep, rt) => rt.setYear((step.state as { year: number }).year),
        };
        const host = document.createElement("div");
        host.innerHTML = `<div style="height:1600px"></div><div id="scene-host"></div><div style="height:2400px"></div>`;
        document.body.appendChild(host);
        const pinia = createPinia();
        const app = createApp(defineComponent({ render: () => h(StickyScene, { scene, beatId: "map" }) }));
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] }));
        app.use(pinia);
        app.mount(host.querySelector("#scene-host")!);
        const view = useViewParams(pinia);
        (view as unknown as { yearScope: unknown }).yearScope = {
            hold: (s: { year: number }) => {
                calls.push(`hold ${s.year}`);
                return () => calls.push(`release ${s.year}`);
            },
            setSingle: (y: number) => calls.push(`setSingle ${y}`),
            setPeriod: () => calls.push("setPeriod"),
        };
        done = () => {
            app.unmount();
            host.remove();
        };
        const urlBefore = location.href;
        await wait(300);
        document.querySelector<HTMLElement>('[data-scene-step-id="s-2014"]')!.scrollIntoView({ block: "center" });
        await wait(600);
        await userEvent.keyboard("{Shift}");
        await wait(100);
        expect(calls).toEqual(["hold 2014"]);
        expect(location.href).toBe(urlBefore);
        done();
        done = null;
        expect(calls).toEqual(["hold 2014", "release 2014"]);
    });
});

// ── K-5 (3): the graphic holds its track ──

const TRACK = 640;
const STALE = TRACK + 140; // the expanded width a not-yet-resized painter root still carries

// A stand-in for the ECharts host: a block host whose only child is a fixed-px painter root.
const Graphic = defineComponent({
    setup: () => () =>
        h("div", { class: "probe-host", style: { width: "100%" } }, [
            h("div", { class: "probe-painter", style: { width: `${STALE}px`, height: "120px" } }),
        ]),
});

function mountTrack(focal: boolean) {
    const host = document.createElement("div");
    host.style.width = `${TRACK}px`;
    document.body.appendChild(host);
    const scene: ChapterScene = {
        kind: "scene",
        graphic: Graphic,
        focal,
        side: "left",
        steps: [
            { id: "a", prose: "First step", state: {} },
            { id: "b", prose: "Second step", state: {} },
        ],
    };
    const app = createApp(defineComponent({ setup: () => () => h(StickyScene, { scene, index: 0 }) }));
    app.use(createPinia());
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] }));
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.mount(host);
    return { host, done: () => (app.unmount(), host.remove()) };
}
const width = (root: Element, sel: string) => root.querySelector(sel)!.getBoundingClientRect().width;

describe("StickyScene graphic track (K-5 (3))", () => {
    for (const focal of [true, false]) {
        it(`${focal ? "focal" : "split"}: a wider painter root never widens the graphic or its host`, async () => {
            const m = mountTrack(focal);
            try {
                await nextTick();
                const scene = width(m.host, ".sticky-scene");
                const graphic = width(m.host, ".sticky-scene__graphic");
                // The graphic stays inside the scene's own box (its track), whatever its content says.
                expect(graphic).toBeLessThanOrEqual(scene + 0.5);
                expect(graphic).toBeLessThan(STALE);
                // So the ECharts host reads the track width, and `resize()` has nothing to collapse.
                expect(width(m.host, ".probe-host")).toBeCloseTo(graphic, 0);
            } finally {
                m.done();
            }
        });
    }
});
