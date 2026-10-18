// StickyScene in a real engine: U-F60 clause 3 (U RULINGS §K K-3). A scene's `apply` writes the
// URL (the /sci map writes the global year), and nothing writes a vocabulary key on load. A step
// crossed by a program scroll (load, layout, the `?at` restore) is shown, but its world effect waits
// for the reader: the reader's first trusted act applies the step the scene is showing.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StickyScene from "./StickyScene.vue";
import { installDashboardRegistry } from "../../contract/registry-inject.js";
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
