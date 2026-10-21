// StickyScene in a real engine: U RULINGS §K K-5 (3). The figure holds its grid track and is never
// sized by its content. ECharts writes its painter root as a fixed-px box; after an Enlarge closes,
// that box still carries the expanded width until the host's ResizeObserver runs `resize()`. Without
// `min-inline-size: 0` the graphic's automatic minimum is that stale width, the chain from the figure
// to the ECharts host stays wide, and `resize()` collapses it inside the observer callback ("ResizeObserver
// loop completed with undelivered notifications"). The period control's contract (O-12 S-1) is in
// StickyScene.year-control.browser.spec.ts.
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StickyScene from "./StickyScene.vue";
import { installDashboardRegistry } from "../../contract/registry-inject.js";
import type { ChapterScene } from "../contract/scene-contract.js";

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
        it(`${focal ? "focal" : "default"}: a wider painter root never widens the graphic or its host`, async () => {
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
