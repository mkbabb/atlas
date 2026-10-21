// O-12 S-1 (PLAN §5.1): the /sci map's year moves only by an explicit control. Wheeling 2,000 px
// through the figure leaves the year and the URL unchanged; the Select and the ‹ › steppers change
// it and write `?sy=` on that act only; ▶ advances once through the years and stops, stops on any
// pointer or key input, and is absent under reduced motion. Before B7 a step observer drove the year
// from scroll and the scene had no control.
import "../../../tests/browser/glass-root.css";
import { afterEach, describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import StickyScene from "./StickyScene.vue";
import { installDashboardRegistry } from "../../contract/registry-inject.js";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import { useYearScope } from "../../data/useYearScope.js";
import { useUrlState } from "../../platform/composables/useUrlState.js";
import type { Feed } from "../../data/contract.js";
import type { ChapterScene } from "../contract/scene-contract.js";

declare module "vitest/browser" {
    interface BrowserCommands {
        emulateMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
    }
}

const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sy = () => new URLSearchParams(window.location.search).get("sy");
const startUrl = window.location.href;

function mount() {
    window.history.replaceState(window.history.state, "", startUrl.split("?")[0]);
    const feed = {
        meta: { dataset: "sci", years: YEARS, latestYear: 2025, period: { axis: "school-year", param: "sy" } },
    } as unknown as Feed;
    const scene: ChapterScene = {
        kind: "scene",
        graphic: defineComponent({ render: () => h("div", { "data-testid": "graphic", style: "height:600px" }, "map") }),
        period: "year",
        caption: "one line",
    };
    const host = document.createElement("div");
    host.innerHTML = `<div style="height:400px"></div><div id="scene-host"></div><div style="height:3000px"></div>`;
    document.body.appendChild(host);
    const pinia = createPinia();
    const app = createApp(defineComponent({ render: () => h(StickyScene, { scene, beatId: "map" }) }));
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] }));
    app.use(pinia);
    const view = useViewParams(pinia);
    const scope = useYearScope(feed, useUrlState<string>());
    view.yearScope = scope as never;
    app.mount(host.querySelector("#scene-host")!);
    return {
        scope,
        root: host,
        done: () => {
            app.unmount();
            host.remove();
            window.scrollTo(0, 0);
            window.history.replaceState(window.history.state, "", startUrl);
        },
    };
}

let done: (() => void) | null = null;
afterEach(async () => {
    done?.();
    done = null;
    await commands.emulateMotion("no-preference");
});

const q = (root: ParentNode, id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;

describe("StickyScene period control (O-12 S-1)", () => {
    it("wheeling 2,000 px through the figure leaves the year and the URL unchanged", async () => {
        const m = mount();
        done = m.done;
        await nextTick();
        const before = m.scope.activeYear.value;
        const url = window.location.href;
        const graphic = q(m.root, "graphic");
        graphic.scrollIntoView({ block: "start" });
        for (let i = 0; i < 20; i++) {
            await userEvent.wheel(graphic, { delta: { y: 100 } });
            await wait(20);
        }
        await wait(200);
        expect(m.scope.activeYear.value).toBe(before);
        expect(window.location.href).toBe(url);
        expect(sy()).toBeNull();
    });

    it("‹ and › change the year and write ?sy= on that act only", async () => {
        const m = mount();
        done = m.done;
        await nextTick();
        expect(m.scope.activeYear.value).toBe(2025);
        expect(sy()).toBeNull();
        await userEvent.click(q(m.root, "period-prev"));
        await nextTick();
        expect(m.scope.activeYear.value).toBe(2024);
        expect(sy()).toBe("2024-25");
        await userEvent.click(q(m.root, "period-prev"));
        await userEvent.click(q(m.root, "period-next"));
        await nextTick();
        expect(m.scope.activeYear.value).toBe(2024);
        expect(q(m.root, "period-select").textContent).toContain("2024–25");
    });

    it("the Select lists every carried year and choosing one writes it", async () => {
        const m = mount();
        done = m.done;
        await nextTick();
        await userEvent.click(q(m.root, "period-select"));
        await wait(150);
        const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')];
        expect(options.map((o) => o.textContent?.trim())).toEqual(YEARS.map((y) => `${y}–${String((y + 1) % 100).padStart(2, "0")}`));
        await userEvent.click(options.find((o) => o.textContent?.includes("2018–19"))!);
        await wait(50);
        expect(m.scope.activeYear.value).toBe(2018);
        expect(sy()).toBe("2018-19");
    });

    it("▶ plays once through the years at 900 ms each and stops at the last", async () => {
        const m = mount();
        done = m.done;
        await nextTick();
        // start two years from the end so the pass is short
        await userEvent.click(q(m.root, "period-prev"));
        await userEvent.click(q(m.root, "period-prev"));
        expect(m.scope.activeYear.value).toBe(2023);
        q(m.root, "period-play").click();
        await nextTick();
        expect(q(m.root, "period-play").getAttribute("aria-pressed")).toBe("true");
        await wait(600);
        expect(m.scope.activeYear.value, "no step before 900 ms").toBe(2023);
        await wait(500);
        expect(m.scope.activeYear.value).toBe(2024);
        await wait(900);
        expect(m.scope.activeYear.value).toBe(2025);
        await wait(1000);
        expect(m.scope.activeYear.value, "stops at the last year").toBe(2025);
        expect(q(m.root, "period-play").getAttribute("aria-pressed")).toBe("false");
    });

    it("play stops on a key or a pointer press", async () => {
        const m = mount();
        done = m.done;
        await nextTick();
        for (let i = 0; i < 6; i++) await userEvent.click(q(m.root, "period-prev"));
        const start = m.scope.activeYear.value;
        q(m.root, "period-play").click();
        await wait(1000);
        expect(m.scope.activeYear.value).toBe(start + 1);
        await userEvent.keyboard("{Shift}");
        await wait(2000);
        expect(m.scope.activeYear.value, "a key stops play").toBe(start + 1);

        q(m.root, "period-play").click();
        await wait(1000);
        const now = m.scope.activeYear.value;
        expect(now).toBe(start + 2);
        window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        await wait(2000);
        expect(m.scope.activeYear.value, "a pointer press stops play").toBe(now);
    });

    it("▶ is absent under reduced motion; the steppers stay", async () => {
        await commands.emulateMotion("reduce");
        const m = mount();
        done = m.done;
        await nextTick();
        expect(m.root.querySelector('[data-testid="period-play"]')).toBeNull();
        expect(m.root.querySelector('[data-testid="period-next"]')).not.toBeNull();
    });
});
