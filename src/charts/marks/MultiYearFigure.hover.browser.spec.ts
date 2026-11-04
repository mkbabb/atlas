// U/B7d D1 · items 5 and 6. A pointer on a drawn line emits `@hover` with the line's key:
// - on a bare TimeSeries without the curve-latch opt-in (the stroke was no event target unless
//   `selectableCurves` was set, so sci /demand latched its crossover lines only to hover them);
// - on MultiYearFigure, which declared no hover emit, so the /sci utilization and /usf decade
//   figures could publish no line readout.
// U/B8 I-1: the spec waits on the figure's own `settled` gate (tests/browser/echart-capture.ts), not on
// a private `finished` it subscribed to late. The first paint is at rest (P-G4), so that `finished`
// passed before the spec subscribed and it waited forever, in all three engines.
import "../../../tests/browser/utilities.css";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { createApp, defineComponent, h, type Component } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { getInstanceByDom } from "echarts/core";
import TimeSeries, { type LineSeries } from "./TimeSeries.vue";
import MultiYearFigure from "./MultiYearFigure.vue";
import { trajectoryFeed } from "../../data/multiYear";
import { installDashboardRegistry } from "../../contract/registry-inject";
import type { UseEChart } from "../composables/useEChart";

// Every useEChart the figure mounts, so the spec reads the line chart's own readiness gate.
const captured = vi.hoisted(() => ({ apis: [] as UseEChart[] }));
vi.mock("../composables/useEChart", async (importOriginal) =>
    (await import("../../../tests/browser/echart-capture")).captureEChart(await importOriginal(), captured),
);

const until = async (ok: () => boolean, ms = 6000) => {
    const t0 = performance.now();
    while (!ok()) {
        if (performance.now() - t0 > ms) throw new Error("timed out");
        await new Promise((r) => setTimeout(r, 20));
    }
};

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
    captured.apis.length = 0;
});

async function mount(component: Component, props: Record<string, unknown>) {
    await page.viewport(1280, 900);
    const style = document.createElement("style");
    style.textContent = ".chart-h-lg{height:320px}.w-full{width:100%}";
    document.head.appendChild(style);
    const el = document.createElement("div");
    el.style.width = "720px";
    document.body.prepend(el);
    const hovered: Array<string | null> = [];
    const pinia = createPinia();
    setActivePinia(pinia);
    const app = createApp(defineComponent({ setup: () => () => h(component, { ...props, onHover: (k: string | null) => hovered.push(k) }) }));
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] });
    app.use(pinia).use(router);
    await router.push("/");
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.mount(el);
    cleanups.push(() => {
        app.unmount();
        el.remove();
        style.remove();
    });
    return { el, hovered };
}

/**
 * The line chart's `settled` gate from `useEChart`: open once ECharts has drawn the data it holds
 * and can answer `convertToPixel` and a pointer. The first paint is at rest (P-G4), so the line is
 * whole when the gate opens. The gate is state, not an event, so a spec that reads it late still
 * sees it open.
 */
function readinessOf(host: HTMLElement): UseEChart {
    const chart = getInstanceByDom(host);
    const api = captured.apis.find((a) => a.chart.value !== null && a.chart.value === chart);
    if (!api) throw new Error("the line chart mounted no useEChart");
    return api;
}

/** Move the pointer onto the drawn line `name` at x, the way zrender reads a real pointer. */
async function pointAtLine(el: HTMLElement, name: string, x: number, y: number) {
    const host = el.querySelector<HTMLElement>('[data-testid="time-series"]')!;
    await until(() => host.querySelector("canvas") !== null && getInstanceByDom(host) !== undefined);
    const readiness = readinessOf(host);
    await until(() => readiness.settled.value);
    const chart = readiness.chart.value!;
    const [px, py] = chart.convertToPixel({ seriesName: name }, [x, y]) as number[];
    const box = host.getBoundingClientRect();
    const surface = host.querySelector("canvas")!.parentElement as HTMLElement;
    const init = { clientX: box.left + px!, clientY: box.top + py!, bubbles: true };
    surface.dispatchEvent(new PointerEvent("pointermove", { ...init, pointerType: "mouse" }));
    surface.dispatchEvent(new MouseEvent("mousemove", init));
}

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];

describe("a pointer on a drawn line emits @hover", () => {
    it("TimeSeries, without the curve latch", async () => {
        const series: LineSeries[] = [
            { key: "demand", label: "Demand", color: "#3366aa", points: YEARS.map((x) => ({ x, y: 300 })) },
        ];
        const { el, hovered } = await mount(TimeSeries, { series, showLegend: false, yMin: 0, yMax: 600 });
        await pointAtLine(el, "Demand", 2019.5, 300);
        await until(() => hovered.includes("demand"));
        expect(hovered).toContain("demand");
    });

    it("MultiYearFigure, with the line's measure key", async () => {
        const feed = trajectoryFeed(
            "sci",
            "state",
            YEARS.map((year) => ({ year, values: { peak: 60 } })),
            ["peak"],
        );
        const { el, hovered } = await mount(MultiYearFigure, {
            feed,
            measures: ["peak"],
            seriesMeta: { peak: { label: "Peak utilization", color: "#3366aa" } },
            activeYear: 2023,
            ariaLabel: "Peak utilization by year",
        });
        await pointAtLine(el, "Peak utilization", 2019.5, 60);
        await until(() => hovered.includes("peak"));
        expect(hovered).toContain("peak");
    });
});
