import { describe, expect, it, vi } from "vitest";
import { nextTick, shallowRef } from "vue";
import type { EChartsOption } from "echarts";
import type { EChartsType } from "echarts/core";
import {
    createStageMorphDriver,
    type StageMorphTarget,
} from "@/charts/scene/stage-morph";
import type { SceneOption } from "@/charts/contract/scene-contract";

const scene = (id: string): SceneOption<"district"> => ({
    id,
    prose: id,
    state: {},
    encode: { x: "district:x", y: "district:y" },
});

function target(option: () => EChartsOption = () => ({ series: [] })) {
    const setOption = vi.fn();
    const chart = shallowRef({ setOption } as unknown as EChartsType);
    return {
        setOption,
        target: { chart, option } satisfies StageMorphTarget,
    };
}

describe("createStageMorphDriver", () => {
    it("pushes exactly one identity-keyed option for each genuine forward and reverse boundary", async () => {
        const option = {
            series: [{ data: [{ leaNumber: "3700010" }] }],
        } as EChartsOption;
        const bound = target(() => option);
        const driver = createStageMorphDriver<"district">({
            initialSceneId: "one",
            identity: { field: "leaNumber" },
            transition: { mode: "blend", reduced: false },
        });
        const release = driver.bind(bound.target);

        driver.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        driver.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        driver.applyScene(scene("one"), { dir: "back" });
        await nextTick();

        expect(bound.setOption).toHaveBeenCalledTimes(2);
        expect(bound.setOption).toHaveBeenLastCalledWith(
            expect.objectContaining({
                animation: true,
                animationDurationUpdate: 520,
                series: [
                    expect.objectContaining({
                        id: "leaNumber:0",
                        universalTransition: expect.objectContaining({
                            seriesKey: "leaNumber",
                        }),
                        data: [expect.objectContaining({ id: "3700010" })],
                    }),
                ],
            }),
            { notMerge: true, lazyUpdate: true },
        );
        release();
    });

    it("arms staged motion and disables it under the declared reduced transition", async () => {
        const animated = target();
        const staged = createStageMorphDriver({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "staged", reduced: false },
        });
        staged.bind(animated.target);
        staged.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        expect(animated.setOption.mock.calls[0]?.[0]).toMatchObject({
            animation: true,
            animationDurationUpdate: 760,
        });

        const reduced = target();
        const still = createStageMorphDriver({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "blend", reduced: true },
        });
        still.bind(reduced.target);
        still.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        expect(reduced.setOption.mock.calls[0]?.[0]).toMatchObject({ animation: false });
    });

    it("retains only the latest scene until a lazy chart instance binds", async () => {
        let active = "one";
        const setOption = vi.fn();
        const chart = shallowRef<EChartsType | null>(null);
        const driver = createStageMorphDriver<"district">({
            initialSceneId: active,
            identity: { field: "id" },
            transition: { mode: "blend", reduced: false },
        });
        driver.bind({ chart, option: () => ({ title: { text: active } }) });

        active = "two";
        driver.applyScene(scene(active), { dir: "forward" });
        active = "three";
        driver.applyScene(scene(active), { dir: "forward" });
        await nextTick();
        expect(setOption).not.toHaveBeenCalled();

        chart.value = { setOption } as unknown as EChartsType;
        await nextTick();
        await nextTick();
        expect(setOption).toHaveBeenCalledOnce();
        expect(setOption.mock.calls[0]?.[0]).toMatchObject({ title: { text: "three" } });
        expect(driver.sceneId.value).toBe("three");
    });

    it("rejects a second persistent chart target", () => {
        const driver = createStageMorphDriver({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "blend", reduced: false },
        });
        driver.bind(target().target);
        expect(() => driver.bind(target().target)).toThrow(
            "A ChapterStage can bind only one ECharts instance.",
        );
    });
});
