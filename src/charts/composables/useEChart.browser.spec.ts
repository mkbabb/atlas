// useEChart in a real engine (the engine lane: vitest.browser.config.ts, playwright 1.60.0).
// Every case acts inside the lazy first-paint window (`__pendingUpdate` true, the series pipeline
// not yet built), where a raw `highlight` throws (`_pipelineMap` in Firefox and WebKit, "reading
// 'get'" in Chromium). Node and happy-dom never run ECharts' frame loop, so this is observable only here.
import { describe, expect, it } from "vitest";
import { createApp, defineComponent, h, onMounted, ref } from "vue";
import { use } from "echarts/core";
import { ScatterChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { useEChart, type UseEChart } from "./useEChart";

use([ScatterChart, GridComponent]);

const KEYS = { a: 0, b: 1 };
type Run = { pending: boolean; thrown: string | null; log: string[]; errors: string[]; emphasis0: boolean | null };
type Ctx = { host: HTMLElement; unmount: () => void; tick: () => void };
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
        const data = ref([[1, 2], [3, 4]]);
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
                            const c: any = api.chart.value;
                            const dispatch = c.dispatchAction.bind(c);
                            c.dispatchAction = (p: { type: string; dataIndex?: number }, ...r: unknown[]) => {
                                log.push(`${p.type}${p.dataIndex ?? ""}`);
                                return dispatch(p, ...r);
                            };
                            pending = !!c.__pendingUpdate;
                            const ctx: Ctx = {
                                host: host.value!,
                                unmount: () => {
                                    if (mounted) {
                                        mounted = false;
                                        app.unmount();
                                    }
                                },
                                tick: () => {
                                    data.value = [[1, 2], [3, 4], [5, 6]];
                                },
                            };
                            try {
                                act(api, ctx);
                            } catch (e) {
                                thrown = (e as Error).message;
                            }
                            setTimeout(() => {
                                let emphasis0: boolean | null = null;
                                if (mounted) {
                                    const g = c.getModel().getSeriesByIndex(0).getData().getItemGraphicEl(0);
                                    // ECharts marks emphasis as `hoverState === 2` on the element or a child.
                                    let on = false;
                                    g?.traverse?.((x: { hoverState?: number }) => {
                                        if (x.hoverState === 2) on = true;
                                    });
                                    emphasis0 = g ? on || g.hoverState === 2 : null;
                                }
                                ctx.unmount();
                                el.remove();
                                window.removeEventListener("error", onErr);
                                resolve({ pending, thrown, log, errors, emphasis0 });
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

const SIZED = "width:400px;height:300px";

describe("useEChart in a real engine", () => {
    it("R1 a highlight in the first lazy window does not throw and lands once", async () => {
        const r = await run(SIZED, (api) => api.highlight("a", KEYS), 600);
        expect(r.pending).toBe(true);
        expect(r.thrown).toBeNull();
        expect(r.errors).toEqual([]);
        expect(r.log).toEqual(["highlight0"]);
        expect(r.emphasis0).toBe(true);
    });
});
