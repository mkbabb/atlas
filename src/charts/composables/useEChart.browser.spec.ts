// useEChart's readiness primitive in a real engine (U RULINGS §J J-1, §I CX-4; the engine lane:
// vitest.browser.config.ts on playwright 1.60.0). Node and happy-dom never run ECharts' frame loop,
// so `finished` and the lazy paint window are observable only here.
//
// Every verb case acts inside a lazy paint window (`__pendingUpdate` true, the series pipeline not
// yet built), where a raw `highlight` throws (`_pipelineMap` in Firefox and WebKit, "reading 'get'"
// in Chromium). The primitive must (a) not throw, (b) land the reader's LATEST intent exactly once
// after `finished`, and (c) never paint the result of a superseded act.
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
    createApp,
    defineComponent,
    h,
    nextTick,
    onMounted,
    ref,
    shallowRef,
    watch,
    type Component,
} from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { installDashboardRegistry } from "../../contract/registry-inject";
import { use } from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { useEChart, type UseEChart } from "./useEChart";
import { useVizOverlay } from "./useVizOverlay";
import VizTextOverlay from "../legend/VizTextOverlay.vue";

use([ScatterChart, GridComponent]);

// Every useEChart a figure mounts is captured, so a figure's settle can be read off its own gate.
const captured = vi.hoisted(() => ({ apis: [] as unknown[] }));
vi.mock("./useEChart", async (importOriginal) => {
    const real = await importOriginal<typeof import("./useEChart")>();
    return {
        ...real,
        useEChart: (o: Parameters<typeof real.useEChart>[0]) => {
            const api = real.useEChart(o);
            captured.apis.push(api);
            return api;
        },
    };
});
// ScatterPlate's frame (title, dock, source bar) is not under test: render its figure slot bare.
vi.mock("../frame/VizPlate.vue", async () => {
    const { defineComponent: dc, h: hh } = await import("vue");
    return {
        default: dc({
            setup: (_p, { slots }) => () => hh("div", slots.default?.({ fullscreen: false })),
        }),
    };
});

const KEYS = { a: 0, b: 1 };
type Run = {
    pending: boolean;
    thrown: string | null;
    log: string[];
    errors: string[];
    emphasis0: boolean | null;
    emphasis1: boolean | null;
};
type Ctx = {
    host: HTMLElement;
    log: string[];
    unmount: () => void;
    /** A data change: the next paint carries three points. */
    tick: () => void;
    /** Run `fn` synchronously right after the next `setOption` (inside that paint's lazy window). */
    afterNextPaint: (fn: () => void) => void;
    /** Run `fn` on the chart's next `finished`. */
    onNextFinished: (fn: () => void) => void;
};
type Act = (api: UseEChart, ctx: Ctx) => void;

function run(hostStyle: string, act: Act, waitMs: number): Promise<Run> {
    return new Promise((resolve) => {
        const el = document.createElement("div");
        document.body.appendChild(el);
        const log: string[] = [];
        const errors: string[] = [];
        const onErr = (e: ErrorEvent) => errors.push(String(e.message));
        window.addEventListener("error", onErr);
        let pending = false;
        let thrown: string | null = null;
        let mounted = true;
        const data = ref([
            [1, 2],
            [3, 4],
        ]);
        const app = createApp(
            defineComponent({
                setup() {
                    const host = ref<HTMLElement | null>(null);
                    const api = useEChart({
                        host,
                        option: () => ({
                            animation: false,
                            xAxis: {},
                            yAxis: {},
                            series: [{ type: "scatter", data: data.value }],
                        }),
                    });
                    onMounted(() =>
                        queueMicrotask(() => {
                            const c = api.chart.value as unknown as {
                                dispatchAction: (p: { type: string; dataIndex?: number }) => void;
                                setOption: (...a: unknown[]) => unknown;
                                on: (ev: string, fn: () => void) => void;
                                getModel: () => any;
                                __pendingUpdate?: unknown;
                            };
                            const dispatch = c.dispatchAction.bind(c);
                            c.dispatchAction = (p) => {
                                log.push(`${p.type}${p.dataIndex ?? ""}`);
                                return dispatch(p);
                            };
                            const setOption = c.setOption.bind(c);
                            let onPaint: (() => void) | null = null;
                            c.setOption = (...a: unknown[]) => {
                                log.push("paint");
                                const out = setOption(...a);
                                const f = onPaint;
                                onPaint = null;
                                f?.();
                                return out;
                            };
                            let onFinished: (() => void) | null = null;
                            c.on("finished", () => {
                                const f = onFinished;
                                onFinished = null;
                                f?.();
                            });
                            pending = !!c.__pendingUpdate;
                            const ctx: Ctx = {
                                host: host.value!,
                                log,
                                unmount: () => {
                                    if (mounted) {
                                        mounted = false;
                                        app.unmount();
                                    }
                                },
                                tick: () => {
                                    data.value = [
                                        [1, 2],
                                        [3, 4],
                                        [5, 6],
                                    ];
                                },
                                afterNextPaint: (fn) => {
                                    onPaint = fn;
                                },
                                onNextFinished: (fn) => {
                                    onFinished = fn;
                                },
                            };
                            try {
                                act(api, ctx);
                            } catch (e) {
                                thrown = (e as Error).message;
                            }
                            setTimeout(() => {
                                const emphasisOf = (i: number): boolean | null => {
                                    if (!mounted) return null;
                                    const g = c.getModel().getSeriesByIndex(0).getData().getItemGraphicEl(i);
                                    if (!g) return null;
                                    // ECharts marks emphasis as `hoverState === 2` on the element or a child.
                                    let on = g.hoverState === 2;
                                    g.traverse?.((x: { hoverState?: number }) => {
                                        if (x.hoverState === 2) on = true;
                                    });
                                    return on;
                                };
                                const emphasis0 = emphasisOf(0);
                                const emphasis1 = emphasisOf(1);
                                ctx.unmount();
                                el.remove();
                                window.removeEventListener("error", onErr);
                                resolve({ pending, thrown, log, errors, emphasis0, emphasis1 });
                            }, waitMs);
                        }),
                    );
                    return () => h("div", { ref: host, style: hostStyle });
                },
            }),
        );
        app.mount(el);
    });
}

const dispatches = (r: Run) => r.log.filter((s) => s !== "paint");
const SIZED = "width:400px;height:300px";
const HIDDEN = "display:none;width:400px;height:300px";

describe("useEChart readiness primitive: the emphasis verbs", () => {
    it("R1 a highlight in the first lazy window does not throw and lands once", async () => {
        const r = await run(SIZED, (api) => api.highlight("a", KEYS), 600);
        expect(r.pending).toBe(true);
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(dispatches(r)).toEqual(["highlight0"]);
        expect(r.emphasis0).toBe(true);
    });

    it("L1 a hidden host revealed after 300 ms: the held highlight lands once, no error", async () => {
        const r = await run(
            HIDDEN,
            (api, { host }) => {
                api.highlight("a", KEYS);
                setTimeout(() => (host.style.display = "block"), 300);
            },
            1500,
        );
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(dispatches(r)).toEqual(["highlight0"]);
    });

    it("L2 a zero-size host resized after 300 ms: the held highlight lands once, no error", async () => {
        const r = await run(
            "width:0;height:0",
            (api, { host }) => {
                api.highlight("a", KEYS);
                setTimeout(() => {
                    host.style.width = "400px";
                    host.style.height = "300px";
                }, 300);
            },
            1500,
        );
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(dispatches(r)).toEqual(["highlight0"]);
    });

    it("L3 latest intent wins: a newer highlight in the window supersedes the held one", async () => {
        const r = await run(
            SIZED,
            (api) => {
                api.highlight("a", KEYS);
                api.highlight("b", KEYS);
            },
            600,
        );
        expect(r.thrown).toBeNull();
        expect(dispatches(r)).toEqual(["highlight1"]);
        expect(r.emphasis0).toBe(false);
        expect(r.emphasis1).toBe(true);
    });

    it("L4 a downplay in the window cancels the held highlight: nothing is dispatched", async () => {
        const r = await run(
            SIZED,
            (api) => {
                api.highlight("a", KEYS);
                api.downplay();
            },
            600,
        );
        expect(r.thrown).toBeNull();
        expect(dispatches(r)).toEqual([]);
        expect(r.emphasis0).toBe(false);
    });

    it("L5 unmount before finished: no error, nothing dispatched to the disposed instance", async () => {
        const r = await run(
            SIZED,
            (api, { unmount }) => {
                api.highlight("a", KEYS);
                unmount();
            },
            600,
        );
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(dispatches(r)).toEqual([]);
    });

    it("L6 a data re-paint supersedes a held highlight: its stale index is never painted", async () => {
        const r = await run(
            SIZED,
            (api, { tick }) => {
                api.highlight("a", KEYS);
                tick();
            },
            900,
        );
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(r.log.filter((s) => s === "paint").length).toBe(1); // the tick (the mount paint precedes the log)
        expect(dispatches(r)).toEqual([]);
        expect(r.emphasis0).toBe(false);
    });

    it("L6c a highlight between a later re-paint and its finished is held, then lands once", async () => {
        let settledAtCall: boolean | null = null;
        let heldGap = -1;
        const r = await run(
            SIZED,
            (api, { tick, afterNextPaint, onNextFinished, log }) => {
                onNextFinished(() => {
                    afterNextPaint(() => {
                        settledAtCall = api.settled.value;
                        const before = log.length;
                        api.highlight("a", KEYS);
                        heldGap = log.length - before; // 0 when held, > 0 when dispatched synchronously
                    });
                    tick();
                });
            },
            1200,
        );
        expect(settledAtCall).toBe(false);
        expect(heldGap).toBe(0);
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(dispatches(r)).toEqual(["highlight0"]);
        expect(r.emphasis0).toBe(true);
    });

    it("E1 once settled: highlight, downplay, highlight dispatch in order, one action each", async () => {
        const r = await run(
            SIZED,
            (api, { onNextFinished }) => {
                onNextFinished(() => {
                    api.highlight("a", KEYS);
                    api.highlight("a", KEYS); // same key: no re-dispatch
                    api.downplay();
                    api.downplay(); // nothing raised: no redundant downplay
                    api.highlight("b", KEYS);
                });
            },
            600,
        );
        expect(dispatches(r)).toEqual(["highlight0", "downplay", "highlight1"]);
        expect(r.emphasis1).toBe(true);
    });

    it("E2 after a re-paint, the same key dispatches again against the new data", async () => {
        const r = await run(
            SIZED,
            (api, { tick, afterNextPaint, onNextFinished }) => {
                onNextFinished(() => {
                    api.highlight("a", KEYS);
                    afterNextPaint(() => onNextFinished(() => api.highlight("a", KEYS)));
                    tick();
                });
            },
            1200,
        );
        expect(r.thrown).toBeNull();
        expect(dispatches(r)).toEqual(["highlight0", "downplay", "highlight0"]);
        expect(r.emphasis0).toBe(true);
    });
});

describe("useEChart's public surface", () => {
    // RULINGS §J H-A3: no `select` verb until a consumer exists (it had 0); the first consumer brings
    // it back with K6/K6b as its test, and CX-3 (a stale `selectedIndex` after a re-paint) closes by
    // deletion. §J J-1: no `ready` latch beside `settled`. Checked at the type (vue-tsc) and at runtime.
    it("carries exactly chart, stageMorphOwned, highlight, downplay, push, settled and frame", async () => {
        expectTypeOf<UseEChart>().not.toHaveProperty("select");
        expectTypeOf<UseEChart>().not.toHaveProperty("ready");
        let keys: string[] = [];
        await run(SIZED, (api) => (keys = Object.keys(api).sort()), 50);
        expect(keys).toEqual(["chart", "downplay", "frame", "highlight", "push", "settled", "stageMorphOwned"]);
    });
});

describe("useEChart readiness primitive: settled and frame", () => {
    it("S1 settled closes at each paint and opens at its finished; frame counts every finished", async () => {
        const seen: Array<[string, boolean, boolean]> = [];
        await run(
            SIZED,
            (api, { tick, afterNextPaint, onNextFinished }) => {
                seen.push(["first window", api.settled.value, api.frame.value === 0]);
                onNextFinished(() => {
                    // `onFinished` in useEChart ran first (it subscribed at init), so the gate is open.
                    seen.push(["first finished", api.settled.value, api.frame.value > 0]);
                    afterNextPaint(() => {
                        seen.push(["later window", api.settled.value, api.frame.value > 0]);
                        const before = api.frame.value;
                        onNextFinished(() =>
                            seen.push(["later finished", api.settled.value, api.frame.value === before + 1]),
                        );
                    });
                    tick();
                });
            },
            1200,
        );
        // [moment, settled, the frame clock as expected: 0 before any finished, counting after]
        expect(seen).toEqual([
            ["first window", false, true],
            ["first finished", true, true],
            ["later window", false, true],
            ["later finished", true, true],
        ]);
    });
});

// ── Each atlas figure that awaits readiness states a settle bound (CX-4, J-1), tested here in a
// real engine against its own gate: from the act (the mount, then a data change) to `settled`
// reopening. Animation runs (headless engines report no reduced-motion preference). ──

import StackedBar, { SETTLE_BOUND_MS as STACKED_BAR } from "../marks/StackedBar.vue";
import RankedBar, { SETTLE_BOUND_MS as RANKED_BAR } from "../marks/RankedBar.vue";
import Treemap, { SETTLE_BOUND_MS as TREEMAP } from "../marks/Treemap.vue";
import TimeSeries, { SETTLE_BOUND_MS as TIME_SERIES } from "../marks/TimeSeries.vue";
import DiscreteColumns, { SETTLE_BOUND_MS as DISCRETE_COLUMNS } from "../marks/DiscreteColumns.vue";
import ScatterPlate, { SETTLE_BOUND_MS as SCATTER_PLATE } from "../marks/ScatterPlate.vue";

type Props = Record<string, unknown>;

/** Mount `comp`, time mount → settled, then apply `next` (or `act`) and time that act → settled. */
function settleTimes(
    comp: Component,
    first: Props,
    next: Props,
    act?: () => void,
): Promise<{ first: number; update: number }> {
    return new Promise((resolve, reject) => {
        const style = document.createElement("style");
        style.textContent = ".chart-h-lg{height:320px}.chart-h-md{height:280px}.w-full{width:100%}";
        document.head.appendChild(style);
        const el = document.createElement("div");
        el.style.width = "640px";
        document.body.appendChild(el);
        const props = shallowRef<Props>(first);
        captured.apis.length = 0;
        const app = createApp(defineComponent({ setup: () => () => h(comp, props.value) }));
        app.use(createPinia());
        app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] }));
        installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
        const t0 = performance.now();
        app.mount(el);
        const api = captured.apis[0] as UseEChart | undefined;
        if (!api) return reject(new Error("the figure mounted no useEChart"));
        const done = (r: { first: number; update: number }) => {
            app.unmount();
            el.remove();
            style.remove();
            resolve(r);
        };
        let firstMs = -1;
        let tAct = 0;
        let closed = false;
        const timeout = setTimeout(() => done({ first: firstMs, update: -1 }), 5000);
        watch(
            api.settled,
            (open) => {
                if (!open) {
                    closed = true;
                    return;
                }
                if (firstMs < 0) {
                    firstMs = performance.now() - t0;
                    tAct = performance.now();
                    if (act) act(); // the reader's act (a view change)
                    else props.value = next; // the reader's data act
                    return;
                }
                if (closed) {
                    clearTimeout(timeout);
                    done({ first: firstMs, update: performance.now() - tAct });
                }
            },
            { flush: "sync" },
        );
    });
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `k${i}`, name: `Row ${i}`, value: (n - i) * 10 }));
const scatterOption = (n: number) => () => ({
    animation: false,
    xAxis: { type: "value" as const },
    yAxis: { type: "value" as const },
    series: [{ type: "scatter" as const, data: Array.from({ length: n }, (_, i) => [i, (i * 7) % 11]) }],
});
const scatterProps = (n: number): Props => ({
    contract: { id: "settle-probe", title: "Settle probe" },
    option: scatterOption(n),
    fingerprint: () => String(n),
    keyOf: () => null,
    onHover: () => undefined,
    figureLabel: "Settle probe",
    hostClass: "chart-h-md",
    testid: "settle-probe",
    xLockup: { measure: "x" },
    origin: "settle-probe",
});

const FIGURES: Array<[string, Component, number, Props, Props]> = [
    [
        "StackedBar",
        StackedBar,
        STACKED_BAR,
        { categories: [2024, 2025], series: [{ tier: 1, label: "A", values: [10, 20] }], colorScale: () => "#777", tierOrder: [1] },
        { categories: [2024, 2025], series: [{ tier: 1, label: "A", values: [12, 26] }], colorScale: () => "#777", tierOrder: [1] },
    ],
    ["RankedBar", RankedBar, RANKED_BAR, { rows: rows(6), hue: () => ({ mode: "tier", fill: "#777" }) }, { rows: rows(4), hue: () => ({ mode: "tier", fill: "#777" }) }],
    ["Treemap", Treemap, TREEMAP, { items: rows(6), fill: () => "#777" }, { items: rows(4), fill: () => "#777" }],
    [
        "TimeSeries",
        TimeSeries,
        TIME_SERIES,
        { series: [{ key: "a", label: "A", color: "#777", points: [{ x: 2023, y: 1 }, { x: 2024, y: 3 }, { x: 2025, y: 2 }] }] },
        { series: [{ key: "a", label: "A", color: "#777", points: [{ x: 2023, y: 2 }, { x: 2024, y: 1 }, { x: 2025, y: 4 }] }] },
    ],
    [
        "DiscreteColumns",
        DiscreteColumns,
        DISCRETE_COLUMNS,
        { columns: [{ key: "w1", label: "W1", value: 3 }, { key: "w2", label: "W2", value: 5 }], color: "#777" },
        { columns: [{ key: "w1", label: "W1", value: 6 }, { key: "w2", label: "W2", value: 2 }], color: "#777" },
    ],
    ["ScatterPlate", ScatterPlate, SCATTER_PLATE, scatterProps(12), scatterProps(18)],
];

describe("each atlas figure settles within its stated bound", () => {
    for (const [name, comp, bound, first, next] of FIGURES) {
        it(`${name}: mount and a data act each settle within ${bound} ms`, async ({ annotate }) => {
            const t = await settleTimes(comp, first, next);
            await annotate(`settle ${name} bound=${bound} first=${Math.round(t.first)} update=${Math.round(t.update)}`);
            expect(t.first).toBeGreaterThan(0);
            expect(t.first).toBeLessThanOrEqual(bound);
            expect(t.update).toBeGreaterThan(0);
            expect(t.update).toBeLessThanOrEqual(bound);
        });
    }
});

// ScatterPlate's stated bound is the staged view-change morph (`armMorphPush`, 760 ms): the data act
// above is an ordinary paint and never runs it. Here the act is the reader's view change, timed from
// `activeView` moving to `settled` reopening. The floor proves the morph actually ran (U B5 K-7).
const morphView = (view: string) => () => ({
    animation: false,
    xAxis: { type: "value" as const, min: 0, max: 40 },
    yAxis: { type: "value" as const, min: 0, max: 40 },
    series: [
        {
            type: "scatter" as const,
            data: Array.from({ length: 24 }, (_, i) => ({
                id: `m${i}`,
                value: view === "a" ? [i, (i * 7) % 11] : [(i * 3) % 40, i],
            })),
        },
    ],
});

function morphSettle(mode: "staged" | "blend"): Promise<{ first: number; update: number }> {
    const active = shallowRef("a");
    const contract = {
        id: "morph-probe",
        title: "Morph probe",
        viewSet: {
            views: [
                { id: "a", label: "A", option: morphView("a") },
                { id: "b", label: "B", option: morphView("b") },
            ],
            identity: { field: "id" },
            transition: { mode, reduced: false },
        },
    };
    const Host = defineComponent({
        setup: () => () =>
            h(ScatterPlate as Component, {
                ...scatterProps(24),
                contract,
                option: () => morphView(active.value)(),
                activeView: active.value,
            }),
    });
    return settleTimes(Host, {}, {}, () => {
        active.value = "b";
    });
}

describe("ScatterPlate: the view-change morph push settles within its stated bound", () => {
    for (const [mode, ms] of [["staged", 760], ["blend", 520]] as const)
        it(`${mode} (${ms} ms) settles within ${SCATTER_PLATE} ms and actually animates`, async ({ annotate }) => {
            const t = await morphSettle(mode);
            await annotate(`morph ${mode} bound=${SCATTER_PLATE} update=${Math.round(t.update)}`);
            expect(t.update).toBeGreaterThanOrEqual(ms * 0.9);
            expect(t.update).toBeLessThanOrEqual(SCATTER_PLATE);
        });
});

// ── CX-5 (atlas half): the overlays ride the primitive. The paint windows on a real engine: the first
// lazy paint (W0), after the first `finished` (W1), a later lazy paint (W2), after the later
// `finished` (W3). In W2 `convertToPixel` answers `undefined`, so a projector that latched "painted"
// at the first `finished` projects garbage there; the overlays project only while `settled` and
// re-project on `frame`, with no private `finished` subscription and no try/catch. ──

type Probe = { settled: boolean; out: string; slot: string; d: string };

function windows(): Promise<Record<string, Probe>> {
    return new Promise((resolve) => {
        const el = document.createElement("div");
        document.body.appendChild(el);
        const seen: Record<string, Probe> = {};
        const data = ref([
            [1, 2],
            [3, 4],
        ]);
        const span = ref(10);
        const placements = ref([{ id: "p", x: 5, y: 5 }]);
        const app = createApp(
            defineComponent({
                setup() {
                    const host = ref<HTMLElement | null>(null);
                    const wrap = ref<HTMLElement | null>(null);
                    const svg = ref<SVGSVGElement | null>(null);
                    const api = useEChart({
                        host,
                        option: () => ({
                            animation: false,
                            xAxis: { min: 0, max: span.value },
                            yAxis: { min: 0, max: 10 },
                            series: [{ type: "scatter", data: data.value }],
                        }),
                    });
                    const echart = { chart: api.chart, settled: api.settled, frame: api.frame };
                    useVizOverlay(echart, svg, [
                        { className: "hero-line", as: "path", points: () => [[0, [1, 2]], [0, [5, 5]]] },
                    ]);
                    const slotLeft = () => {
                        const sl = wrap.value?.querySelector<HTMLElement>(".viz-text-overlay__slot");
                        return sl && sl.style.display !== "none" ? sl.style.left : "hidden";
                    };
                    const probe = (name: string) => {
                        const c = api.chart.value as unknown as {
                            convertToPixel: (f: unknown, v: unknown) => [number, number] | undefined;
                        };
                        const px = c.convertToPixel({ gridIndex: 0 }, [5, 5]);
                        seen[name] = {
                            settled: api.settled.value,
                            out: px ? `px:${Math.round(px[0])}` : `value:${String(px)}`,
                            slot: slotLeft(),
                            d: svg.value?.querySelector(".hero-line")?.getAttribute("d") ?? "none",
                        };
                    };
                    let step = 0;
                    const poll = () => {
                        const c = api.chart.value as unknown as {
                            setOption: (...a: unknown[]) => unknown;
                            on: (e: string, fn: () => void) => void;
                        } | null;
                        if (!c) return void setTimeout(poll, 0);
                        probe("W0 first lazy window");
                        step = 1;
                        const setOption = c.setOption.bind(c);
                        c.setOption = (...a: unknown[]) => {
                            const out = setOption(...a);
                            if (step === 2) {
                                step = 3;
                                placements.value = [{ id: "p", x: 5, y: 5 }]; // asked to re-anchor inside W2
                                void nextTick(() => probe("W2 later lazy window"));
                            }
                            return out;
                        };
                        c.on("finished", async () => {
                            await nextTick(); // the overlays' `frame` watchers have run
                            if (step === 1) {
                                step = 2;
                                probe("W1 after first finished");
                                span.value = 20; // a later paint: the x scale doubles
                                data.value = [
                                    [1, 2],
                                    [3, 4],
                                    [5, 6],
                                ];
                            } else if (step === 3) {
                                step = 4;
                                probe("W3 after later finished");
                                app.unmount();
                                el.remove();
                                resolve(seen);
                            }
                        });
                    };
                    queueMicrotask(poll);
                    return () =>
                        h("div", { ref: wrap, style: "position:relative;width:400px;height:300px" }, [
                            h("div", { ref: host, style: "width:400px;height:300px" }),
                            h("svg", { ref: svg, class: "viz-overlay", style: "position:absolute;inset:0" }),
                            h(VizTextOverlay, { echart, placements: placements.value }, { p: () => h("span", "chip") }),
                        ]);
                },
            }),
        );
        app.mount(el);
    });
}

describe("CX-5: the overlays project only while settled and re-project on frame", () => {
    for (let i = 0; i < 3; i++)
        it(`VizTextOverlay and useVizOverlay across the four paint windows (run ${i})`, async () => {
            const s = await windows();
            expect(s["W0 first lazy window"]).toMatchObject({ settled: false, slot: "hidden", d: "none" });
            expect(s["W1 after first finished"]).toMatchObject({ settled: true });
            expect(s["W1 after first finished"].out).toMatch(/^px:/);
            // a later lazy window: the chart cannot answer, so nothing may project here
            expect(s["W2 later lazy window"]).toMatchObject({ settled: false, out: "value:undefined" });
            expect(s["W3 after later finished"]).toMatchObject({ settled: true });
            expect(s["W3 after later finished"].out).not.toBe(s["W1 after first finished"].out);
            const left = (k: string) => Math.round(parseFloat(s[k].slot));
            const px = (k: string) => Number(s[k].out.slice(3));
            // the text overlay: seated at W1's projection, HELD through W2, re-seated at W3's
            expect(left("W1 after first finished")).toBe(px("W1 after first finished"));
            expect(left("W2 later lazy window")).toBe(left("W1 after first finished"));
            expect(left("W3 after later finished")).toBe(px("W3 after later finished"));
            // the hero leaf: drawn at W1, HELD through W2, re-projected at W3
            expect(s["W1 after first finished"].d).not.toBe("none");
            expect(s["W2 later lazy window"].d).toBe(s["W1 after first finished"].d);
            expect(s["W3 after later finished"].d).not.toBe(s["W1 after first finished"].d);
        });

    it("ScatterPlate mounts and unmounts without touching a disposed instance", async () => {
        const warned: string[] = [];
        const warn = console.warn;
        const error = console.error;
        console.warn = (...a: unknown[]) => void warned.push(a.map(String).join(" "));
        console.error = (...a: unknown[]) => void warned.push(a.map(String).join(" "));
        try {
            const p = { ...scatterProps(12), annotationPlacements: [{ id: "p", x: 3, y: 4 }] };
            await settleTimes(ScatterPlate, p, { ...p, option: scatterOption(14), fingerprint: () => "14" });
        } finally {
            console.warn = warn;
            console.error = error;
        }
        expect(warned.filter((w) => /disposed/i.test(w))).toEqual([]);
    });
});
