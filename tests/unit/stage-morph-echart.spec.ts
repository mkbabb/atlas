import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createRenderer,
    defineComponent,
    h,
    nextTick,
    provide,
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
vi.mock("@/charts/composables/echart-pumps", () => ({
    RETINTING: Object.freeze({ retinting: true }),
    enqueuePaint: (paint: () => void) => paint(),
    scheduleRetint: vi.fn(),
}));

import { init } from "echarts/core";
import { useEChart, type UseEChart } from "@/charts/composables/useEChart";
import {
    createStageMorphDriver,
    STAGE_MORPH_KEY,
} from "@/charts/scene/stage-morph";
import type { SceneOption } from "@/charts/contract/scene-contract";

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

const scene = (id: string): SceneOption<"district"> => ({
    id,
    prose: id,
    state: {},
    encode: { x: "district:x", y: "district:y" },
});

beforeEach(() => vi.clearAllMocks());

describe("useEChart stage ownership", () => {
    it("skips the ordinary boundary paint and resumes it for same-scene data", async () => {
        const setOption = vi.fn();
        const chart = {
            setOption,
            on: vi.fn(),
            resize: vi.fn(),
            dispose: vi.fn(),
            dispatchAction: vi.fn(),
        } as unknown as EChartsType;
        vi.mocked(init).mockReturnValue(chart);
        const value = ref(0);
        const driver = createStageMorphDriver<"district">({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "blend" },
            reducedMotion: false,
        });
        let api: UseEChart | undefined;

        const Chart = defineComponent({
            setup() {
                const host = ref<HTMLElement | null>(null);
                api = useEChart({
                    host,
                    option: () => ({ series: [{ data: [{ id: value.value }] }] }),
                });
                return () => h("div", { ref: host });
            },
        });
        const App = defineComponent({
            setup() {
                provide(STAGE_MORPH_KEY, driver);
                return () => h(Chart);
            },
        });
        const root: HostNode = { children: [], parent: null };
        const app = renderer.createApp(App);
        app.mount(root);
        await nextTick();

        expect(api?.stageMorphOwned).toBe(true);
        expect(setOption).toHaveBeenCalledTimes(1);

        value.value = 1;
        await nextTick();
        expect(setOption).toHaveBeenCalledTimes(2);

        value.value = 2;
        driver.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        await nextTick();
        expect(setOption).toHaveBeenCalledTimes(3);
        expect(setOption.mock.calls[2]?.[1]).toEqual({
            notMerge: true,
            lazyUpdate: true,
        });

        value.value = 3;
        await nextTick();
        expect(setOption).toHaveBeenCalledTimes(4);
        app.unmount();
    });
});
