// The per-x facts hook (U/B7c C1; sci T1/T2): a pointer over a TimeSeries plot snaps to the nearest
// drawn x and the platform hover card shows that period's facts; leaving the plot clears it.
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { createPinia, setActivePinia } from "pinia";
import TimeSeries, { type LineSeries } from "./TimeSeries.vue";
import { nearestX, type FactsAt } from "../composables/useXFacts";
import { useHoverReadout } from "../../platform/stores/useHoverReadout";
import { installDashboardRegistry } from "../../contract/registry-inject";
import { createMemoryHistory, createRouter } from "vue-router";

const until = async (ok: () => boolean, ms = 6000) => {
    const t0 = performance.now();
    while (!ok()) {
        if (performance.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 20));
    }
};

const series: LineSeries[] = [
    {
        key: "contracted",
        label: "Contracted",
        color: "#3366aa",
        points: [2015, 2016, 2017, 2018, 2019, 2020].map((x, i) => ({ x, y: 100 + i * 40 })),
    },
];
const factsAt: FactsAt = (x) => ({
    title: `${x}–${String((x + 1) % 100).padStart(2, "0")}`,
    facts: [
        { label: "School units", value: String(280 + (x - 2015)) },
        { label: "Bandwidth per student (kbps)", value: String(100 + (x - 2015) * 40) },
    ],
});

describe("nearestX", () => {
    it("snaps to the nearest drawn x with a value", () => {
        expect(nearestX(series, 2017.4)).toBe(2017);
        expect(nearestX(series, 2017.6)).toBe(2018);
        expect(nearestX(series, 1990)).toBe(2015);
        expect(nearestX([{ ...series[0], points: [{ x: 1, y: null }] }], 1)).toBeNull();
    });
});

describe("TimeSeries factsAt", () => {
    it("publishes the period card under the pointer and clears it on leave", async () => {
        const style = document.createElement("style");
        style.textContent = ".chart-h-lg{height:320px}.w-full{width:100%}";
        document.head.appendChild(style);
        const el = document.createElement("div");
        el.style.width = "640px";
        document.body.prepend(el);
        const pinia = createPinia();
        setActivePinia(pinia);
        const app = createApp(
            defineComponent({
                setup: () => () => h(TimeSeries, { series, factsAt, factsOrigin: "trend-test", showLegend: false }),
            }),
        );
        app.use(pinia);
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
        app.use(router);
        await router.push("/");
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        app.mount(el);
        try {
            const host = el.querySelector<HTMLElement>('[data-testid="time-series"]')!;
            await until(() => host.querySelector("canvas") !== null);
            await new Promise((r) => setTimeout(r, 300));
            const readout = useHoverReadout();
            const surface = host.querySelector("canvas")!.parentElement as HTMLElement; // zrender's viewport
            const box = host.getBoundingClientRect();
            const at = (fx: number) => {
                const init = { clientX: box.left + box.width * fx, clientY: box.top + box.height * 0.5, bubbles: true };
                // zrender listens for pointer events where the engine has them, else mouse events
                surface.dispatchEvent(new PointerEvent("pointermove", { ...init, pointerType: "mouse" }));
                surface.dispatchEvent(new MouseEvent("mousemove", init));
            };
            at(0.85); // inside the plot, near its right edge
            await until(() => /^20\d\d–\d\d$/.test(readout.readout?.title ?? ""));
            const late = readout.readout!.title;
            at(0.3);
            await until(() => /^20\d\d–\d\d$/.test(readout.readout?.title ?? "") && readout.readout?.title !== late);
            expect(Number(readout.readout!.title.slice(0, 4))).toBeLessThan(Number(late.slice(0, 4)));
            expect(readout.readout?.origin).toBe("trend-test");
            expect(readout.readout?.facts.map((f) => f.label)).toEqual(["School units", "Bandwidth per student (kbps)"]);
            expect(readout.readout?.anchor).not.toBeNull();
            surface.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse", relatedTarget: document.body }));
            surface.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }));
            await until(() => readout.readout === null);
        } finally {
            app.unmount();
            el.remove();
            style.remove();
        }
    });
});
