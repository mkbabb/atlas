// U/B8 P-G4 — the ECharts first paint is at rest. A plate with a base `animation: true` (TimeSeries,
// DiscreteColumns, RankedBar, Treemap) played its first-render rise at mount, which for an eager
// chart below the fold, or a lazy one mounted 200 px early, ran off the reader's screen. The first
// push now carries `animation: false`; later data pushes keep the plate's own flag. Fails before:
// the first setOption carried the plate's `animation: true`.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createRenderer,
    defineComponent,
    h,
    nextTick,
    ref,
} from "vue";
import type { EChartsType } from "echarts/core";

vi.mock("echarts/core", () => ({ init: vi.fn(), use: vi.fn() }));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));
vi.mock("@vueuse/core", () => ({
    useResizeObserver: vi.fn(),
    useIntersectionObserver: vi.fn(() => ({ stop: vi.fn() })),
}));
vi.mock("@mkbabb/glass-ui/dark", async () => {
    const { ref } = await import("vue");
    return {
        useGlobalDark: () => ({
            isDark: ref(false),
            onFlipSettled: () => () => undefined,
        }),
    };
});
vi.mock("../../src/charts/composables/echart-pumps", () => ({
    RETINTING: Object.freeze({ retinting: true }),
    enqueuePaint: (paint: () => void) => paint(),
    scheduleRetint: vi.fn(),
}));

import { init } from "echarts/core";
import { useEChart } from "../../src/charts/composables/useEChart";

interface HostNode {
    children: HostNode[];
    parent: HostNode | null;
    text?: string;
}

const renderer = createRenderer<HostNode, HostNode>({
    patchProp: () => undefined,
    insert(child, parent) {
        child.parent = parent;
        parent.children.push(child);
    },
    remove(child) {
        const index = child.parent?.children.indexOf(child) ?? -1;
        if (index >= 0) child.parent?.children.splice(index, 1);
    },
    createElement: () => ({ children: [], parent: null }),
    createText: (text) => ({ children: [], parent: null, text }),
    createComment: (text) => ({ children: [], parent: null, text }),
    setText: (node, text) => {
        node.text = text;
    },
    setElementText: (node, text) => {
        node.text = text;
    },
    parentNode: (node) => node.parent,
    nextSibling: () => null,
    querySelector: () => null,
    setScopeId: () => undefined,
    cloneNode: (node) => ({ ...node, children: [...node.children] }),
    insertStaticContent: () => {
        const node = { children: [], parent: null };
        return [node, node];
    },
});

beforeEach(() => vi.clearAllMocks());

function mountChart(option: () => Record<string, unknown>) {
    const setOption = vi.fn();
    const chart = {
        setOption,
        on: vi.fn(),
        resize: vi.fn(),
        dispose: vi.fn(),
        dispatchAction: vi.fn(),
    } as unknown as EChartsType;
    vi.mocked(init).mockReturnValue(chart);
    const Chart = defineComponent({
        setup() {
            const host = ref<HTMLElement | null>(null);
            useEChart({ host, option: option as never });
            return () => h("div", { ref: host });
        },
    });
    const root: HostNode = { children: [], parent: null };
    const app = renderer.createApp(Chart);
    app.mount(root);
    return { setOption, app };
}

describe("useEChart first paint (P-G4)", () => {
    it("pushes the first frame at rest and keeps the plate's animation for later paints", async () => {
        const value = ref(0);
        const { setOption, app } = mountChart(() => ({
            animation: true,
            animationDuration: 600,
            series: [{ data: [value.value] }],
        }));
        await nextTick();
        expect(setOption).toHaveBeenCalledTimes(1);
        expect(setOption.mock.calls[0]?.[0]).toMatchObject({ animation: false, animationDuration: 600 });
        value.value = 1;
        await nextTick();
        expect(setOption).toHaveBeenCalledTimes(2);
        expect(setOption.mock.calls[1]?.[0]).toMatchObject({ animation: true });
        app.unmount();
    });

    it("leaves a plate that never animates byte-identical", async () => {
        const option = { animation: false, series: [] };
        const { setOption, app } = mountChart(() => option);
        await nextTick();
        expect(setOption.mock.calls[0]?.[0]).toBe(option);
        app.unmount();
    });
});
