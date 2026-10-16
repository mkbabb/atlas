import { describe, expect, it } from "vitest";
import { effectScope, nextTick, ref, shallowRef } from "vue";
import type { EChartsType } from "echarts/core";
import { useEChartOrnament } from "../../src/charts/composables/useEChartOrnament";
import type { EChartReadiness } from "../../src/charts/composables/useEChart";

interface FakeChart {
    echart: EChartReadiness;
    /** The lazy frame's flush: build the pipeline, then `finished` (useEChart opens the gate). */
    render(): void;
    /** A later structural paint: the pipeline is rebuilt lazily, so `getData()` throws again. */
    repaint(): void;
}

function rectEl(x: number, y: number) {
    return {
        getBoundingRect: () => ({ x, y, width: 4, height: 4 }),
        transformCoordToGlobal: (a: number, b: number): [number, number] => [a + 100, b + 200],
    };
}

/** A chart whose series pipeline — the thing `getData()` reads — does NOT exist until a paint's
    lazy flush, the exact cold-mount / `lazyUpdate` shape that makes `getData()` throw
    `TypeError: Cannot read properties of undefined (reading 'get')` (SeriesModel.getData →
    Scheduler.getPipeline). The readiness handle is driven the way useEChart drives it: a paint
    closes `settled`; the flush builds the pipeline, then `finished` bumps `frame` and opens it. */
function makeFakeChart(marks: Record<string, { x: number; y: number }>): FakeChart {
    let pipelineReady = false;
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
    const chart = shallowRef({ getModel: () => model } as unknown as EChartsType);
    const settled = shallowRef(false);
    const frame = shallowRef(0);
    return {
        echart: { chart, settled, frame },
        render() {
            pipelineReady = true;
            frame.value++;
            settled.value = true;
        },
        repaint() {
            pipelineReady = false;
            settled.value = false;
        },
    };
}

describe("useEChartOrnament — cold-mount painted gate", () => {
    it("cold-mounts with a live key without throwing, resolving after render", async () => {
        const fake = makeFakeChart({ "district:37": { x: 10, y: 20 } });
        const scope = effectScope();
        let anchor!: ReturnType<typeof useEChartOrnament>["anchor"];
        // The immediate watch fires synchronously here; before the cure this touched the
        // unbuilt pipeline through `getData()` and threw.
        expect(() => {
            scope.run(() => {
                anchor = useEChartOrnament(fake.echart, () => "district:37").anchor;
            });
        }).not.toThrow();
        expect(anchor.value).toBeNull(); // the gate holds until the chart has drawn
        fake.render();
        await nextTick();
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
            anchor = useEChartOrnament(fake.echart, () => key.value).anchor;
        });
        fake.render();
        await nextTick();
        expect(anchor.value).toEqual({ x: 112, y: 222 });
        key.value = "district:42";
        await nextTick();
        expect(anchor.value).toEqual({ x: 132, y: 242 });
        scope.stop();
    });

    it("clears inside a later paint window and never reads the unbuilt pipeline there", async () => {
        const fake = makeFakeChart({ "district:37": { x: 10, y: 20 }, "district:42": { x: 30, y: 40 } });
        const key = ref<string | null>("district:37");
        const scope = effectScope();
        let anchor!: ReturnType<typeof useEChartOrnament>["anchor"];
        scope.run(() => {
            anchor = useEChartOrnament(fake.echart, () => key.value).anchor;
        });
        fake.render();
        await nextTick();
        expect(anchor.value).toEqual({ x: 112, y: 222 });
        fake.repaint(); // a structural paint: the old mark position is superseded
        await nextTick();
        expect(anchor.value).toBeNull();
        key.value = "district:42"; // a key change inside the window: getData() would throw here
        await nextTick();
        expect(anchor.value).toBeNull();
        fake.render();
        await nextTick();
        expect(anchor.value).toEqual({ x: 132, y: 242 });
        scope.stop();
    });
});
