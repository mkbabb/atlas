import { afterEach, describe, expect, it, vi } from "vitest";
import { createRenderer, defineComponent, h, nextTick, ref } from "vue";

// U · B3 — the useEChart readiness defect (the Firefox /ecf `_pipelineMap` page error; the atlas half
// of U-F29). `mount()` paints with `lazyUpdate:true`, so ECharts defers `prepare` (which creates the
// scheduler's pipeline map) to its next frame. A linked `highlight()` landing in that window threw
// `this._pipelineMap is undefined` from `Scheduler.getPipeline`. These specs drive a REAL ECharts
// instance (the SVG SSR renderer, so it runs in node) behind the composable's `init`.

vi.mock("echarts/core", async () => {
    const real = await vi.importActual<typeof import("echarts/core")>("echarts/core");
    const { SVGRenderer } = await vi.importActual<typeof import("echarts/renderers")>(
        "echarts/renderers",
    );
    const { ScatterChart } = await vi.importActual<typeof import("echarts/charts")>(
        "echarts/charts",
    );
    const { GridComponent } = await vi.importActual<typeof import("echarts/components")>(
        "echarts/components",
    );
    real.use([SVGRenderer, ScatterChart, GridComponent]);
    return {
        ...real,
        use: vi.fn(),
        init: vi.fn(() => real.init(null, null, { renderer: "svg", ssr: true, width: 200, height: 120 })),
    };
});
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));
vi.mock("@vueuse/core", () => ({
    useResizeObserver: vi.fn(),
    useIntersectionObserver: vi.fn(() => ({ stop: vi.fn() })),
}));
vi.mock("@mkbabb/glass-ui/dark", async () => {
    const { ref } = await import("vue");
    return {
        useGlobalDark: () => ({ isDark: ref(false), onFlipSettled: () => () => undefined }),
    };
});

import * as echarts from "echarts/core";
import { useEChart, type UseEChart } from "../../src/charts/composables/useEChart";

interface HostNode {
    children: HostNode[];
    parent: HostNode | null;
}
const renderer = createRenderer<HostNode, HostNode>({
    patchProp: () => undefined,
    insert(child, parent) {
        child.parent = parent;
        parent.children.push(child);
    },
    remove(child) {
        const i = child.parent?.children.indexOf(child) ?? -1;
        if (i >= 0) child.parent?.children.splice(i, 1);
    },
    createElement: () => ({ children: [], parent: null }),
    createText: () => ({ children: [], parent: null }),
    createComment: () => ({ children: [], parent: null }),
    setText: () => undefined,
    setElementText: () => undefined,
    parentNode: (n) => n.parent,
    nextSibling: () => null,
    querySelector: () => null,
    setScopeId: () => undefined,
    cloneNode: (n) => ({ ...n, children: [...n.children] }),
    insertStaticContent: () => {
        const n = { children: [], parent: null };
        return [n, n];
    },
});

const KEYS: Record<string, number> = { a: 0, b: 1, c: 2 };
const option = () => ({
    animation: false,
    xAxis: { type: "value" as const },
    yAxis: { type: "value" as const },
    series: [{ type: "scatter" as const, data: [[1, 2], [2, 3], [3, 1]] }],
});

let unmount: (() => void) | null = null;
afterEach(() => {
    unmount?.();
    unmount = null;
});

function mountChart(): { api: UseEChart } {
    let api: UseEChart | undefined;
    const Chart = defineComponent({
        setup() {
            const host = ref<HTMLElement | null>(null);
            api = useEChart({ host, option });
            return () => h("div", { ref: host });
        },
    });
    const app = renderer.createApp(Chart);
    app.mount({ children: [], parent: null });
    unmount = () => app.unmount();
    return { api: api! };
}

const nextFrame = () => new Promise((r) => setTimeout(r, 60));

describe("U·B3 · useEChart readiness (the `_pipelineMap` first-frame race)", () => {
    it("the premise: ECharts itself throws on a highlight before the first lazy frame", () => {
        const c = echarts.init(null as unknown as HTMLElement, null, {
            renderer: "svg",
            ssr: true,
            width: 200,
            height: 120,
        });
        try {
            c.setOption(option(), { notMerge: true, lazyUpdate: true });
            expect(() =>
                c.dispatchAction({ type: "highlight", seriesIndex: 0, dataIndex: 1 }),
            ).toThrow(/_pipelineMap|reading 'get'/);
        } finally {
            c.dispose();
        }
    });

    it("a highlight inside the first lazy frame does not throw, and is applied once rendered", async () => {
        const { api } = mountChart();
        await nextTick();
        const c = api.chart.value!;
        expect(c).toBeTruthy();
        const spy = vi.spyOn(c, "dispatchAction");
        expect(() => api.highlight("b", KEYS)).not.toThrow();
        expect(spy).not.toHaveBeenCalled(); // held: the instance has not rendered yet
        await nextFrame();
        expect(spy).toHaveBeenCalledWith({ type: "highlight", seriesIndex: 0, dataIndex: 1 });
    });

    it("only the LATEST held emphasis is applied (a cleared hover leaves nothing raised)", async () => {
        const { api } = mountChart();
        await nextTick();
        const c = api.chart.value!;
        const spy = vi.spyOn(c, "dispatchAction");
        api.highlight("a", KEYS);
        api.highlight("c", KEYS);
        api.downplay();
        await nextFrame();
        expect(spy).not.toHaveBeenCalled();
        api.highlight("c", KEYS);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenLastCalledWith({ type: "highlight", seriesIndex: 0, dataIndex: 2 });
        api.highlight("a", KEYS);
        expect(spy.mock.calls.map((x) => (x[0] as { type: string }).type)).toEqual([
            "highlight",
            "downplay",
            "highlight",
        ]);
    });

    it("a hover after unmount neither throws nor reaches the disposed instance", async () => {
        const { api } = mountChart();
        await nextTick();
        const c = api.chart.value!;
        api.highlight("a", KEYS);
        unmount?.();
        unmount = null;
        expect(c.isDisposed()).toBe(true);
        const spy = vi.spyOn(c, "dispatchAction");
        expect(() => api.highlight("b", KEYS)).not.toThrow();
        await nextFrame();
        expect(spy).not.toHaveBeenCalled();
    });
});
