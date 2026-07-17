import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { EChartsType } from "echarts/core";
import { useEChartOrnament } from "../../src/charts/composables/useEChartOrnament";

interface FakeChart {
    chart: EChartsType;
    render(): void;
}

function rectEl(x: number, y: number) {
    return {
        getBoundingRect: () => ({ x, y, width: 4, height: 4 }),
        transformCoordToGlobal: (a: number, b: number): [number, number] => [a + 100, b + 200],
    };
}

/** A chart whose series pipeline — the thing `getData()` reads — does NOT exist until the first
    render flush, the exact cold-mount / `lazyUpdate` shape that makes `getData()` throw
    `TypeError: Cannot read properties of undefined (reading 'get')` (SeriesModel.getData →
    Scheduler.getPipeline) before ECharts emits `rendered`. `render()` builds the pipeline then
    emits, mirroring ECharts' own order. */
function makeFakeChart(marks: Record<string, { x: number; y: number }>): FakeChart {
    let pipelineReady = false;
    const listeners = new Map<string, Set<() => void>>();
    const names = Object.keys(marks);
    const data = {
        indexOfName: (name: string) => names.indexOf(name),
        getItemGraphicEl: (index: number) => {
            const name = names[index];
            const mark = name ? marks[name] : undefined;
            return mark ? rectEl(mark.x, mark.y) : null;
        },
    };
    const series = {
        getData() {
            if (!pipelineReady) {
                throw new TypeError("Cannot read properties of undefined (reading 'get')");
            }
            return data;
        },
    };
    const model = { getSeries: () => [series] };
    const chart = {
        getModel: () => model,
        on(event: string, fn: () => void) {
            (listeners.get(event) ?? listeners.set(event, new Set()).get(event)!).add(fn);
        },
        off(event: string, fn: () => void) {
            listeners.get(event)?.delete(fn);
        },
    } as unknown as EChartsType;
    return {
        chart,
        render() {
            pipelineReady = true; // the deferred flush builds the pipeline …
            for (const fn of listeners.get("rendered") ?? []) fn(); // … then emits `rendered`
        },
    };
}

describe("useEChartOrnament — cold-mount painted gate", () => {
    it("cold-mounts with a live key without throwing, resolving after render", () => {
        const fake = makeFakeChart({ "district:37": { x: 10, y: 20 } });
        const scope = effectScope();
        let anchor!: ReturnType<typeof useEChartOrnament>["anchor"];
        // The immediate watch fires synchronously here; before the cure this touched the
        // unbuilt pipeline through `getData()` and threw.
        expect(() => {
            scope.run(() => {
                anchor = useEChartOrnament(() => fake.chart, () => "district:37").anchor;
            });
        }).not.toThrow();
        expect(anchor.value).toBeNull(); // the gate holds until the chart has drawn
        fake.render();
        expect(anchor.value).toEqual({ x: 112, y: 222 }); // center (12,22) → +100/+200
        scope.stop();
    });

    it("re-resolves on a key change against an already-painted chart", async () => {
        const fake = makeFakeChart({
            "district:37": { x: 10, y: 20 },
            "district:42": { x: 30, y: 40 },
        });
        const key = ref<string | null>("district:37");
        const scope = effectScope();
        let anchor!: ReturnType<typeof useEChartOrnament>["anchor"];
        scope.run(() => {
            anchor = useEChartOrnament(() => fake.chart, () => key.value).anchor;
        });
        fake.render();
        expect(anchor.value).toEqual({ x: 112, y: 222 });
        key.value = "district:42";
        await nextTick();
        expect(anchor.value).toEqual({ x: 132, y: 242 });
        scope.stop();
    });
});
