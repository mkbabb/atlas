// Dashboard TBT (U/B7c C1): a chart's `init` and first `setOption` parse run as a job of the
// frame-budgeted paint pump. Before, every chart in view at load initialized in one task (the Vue
// mount, or the one IntersectionObserver callback for all of them) and their costs summed into one
// long task.
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import TimeSeries, { type LineSeries } from "../marks/TimeSeries.vue";
import { installDashboardRegistry } from "../../contract/registry-inject";

const until = async (ok: () => boolean, ms = 6000) => {
    const t0 = performance.now();
    while (!ok()) {
        if (performance.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 20));
    }
};

const series: LineSeries[] = [
    { key: "a", label: "A", color: "#3366aa", points: [2019, 2020, 2021, 2022].map((x, i) => ({ x, y: 10 + i })) },
];

describe("useEChart mounts through the paint pump", () => {
    it("each chart initializes inside a pump frame, not in the task that mounts it", async () => {
        // Every eager or in-view chart used to init in the task that mounted it (the Vue mount, or
        // the one IntersectionObserver callback for every chart in view), so their costs summed.
        // echarts `init` stamps its host with `_echarts_instance_`: record whether that happens
        // inside a requestAnimationFrame callback (the pump's frame slice).
        const realRaf = window.requestAnimationFrame.bind(window);
        let inFrame = 0;
        window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
            realRaf((t) => {
                inFrame++;
                try {
                    cb(t);
                } finally {
                    inFrame--;
                }
            })) as typeof window.requestAnimationFrame;
        const realSet = Element.prototype.setAttribute;
        const created: boolean[] = [];
        Element.prototype.setAttribute = function (this: Element, name: string, value: string) {
            if (name === "_echarts_instance_") created.push(inFrame > 0);
            return realSet.call(this, name, value);
        };
        const style = document.createElement("style");
        style.textContent = ".chart-h-lg{height:240px}.w-full{width:100%}";
        document.head.appendChild(style);
        const el = document.createElement("div");
        el.style.width = "480px";
        document.body.prepend(el);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        await router.push("/");
        const app = createApp(
            defineComponent({ setup: () => () => [0, 1, 2].map((i) => h(TimeSeries, { key: i, series, showLegend: false })) }),
        );
        app.use(createPinia()).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        try {
            app.mount(el);
            await until(() => el.querySelectorAll("canvas").length >= 3);
            expect(created.length).toBeGreaterThanOrEqual(3);
            expect(created.every(Boolean), "every chart initialized in a pump frame").toBe(true);
        } finally {
            window.requestAnimationFrame = realRaf;
            Element.prototype.setAttribute = realSet;
            app.unmount();
            el.remove();
            style.remove();
        }
    });

    it("a chart unmounted before its queued mount runs creates nothing", async () => {
        const el = document.createElement("div");
        el.style.width = "480px";
        document.body.append(el);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        await router.push("/");
        const app = createApp(defineComponent({ setup: () => () => h(TimeSeries, { series, showLegend: false }) }));
        app.use(createPinia()).use(router);
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.mount(el);
        const host = el.querySelector<HTMLElement>('[data-testid="time-series"]');
        app.unmount();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        expect(host?.querySelector("canvas") ?? null).toBeNull();
        el.remove();
    });
});
