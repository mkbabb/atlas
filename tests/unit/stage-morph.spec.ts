import { describe, expect, it, vi } from "vitest";
import { nextTick, shallowRef } from "vue";
import type { EChartsOption } from "echarts";
import type { EChartsType } from "echarts/core";
import {
    createStageMorphDriver,
    type StageMorphTarget,
} from "@/charts/scene/stage-morph";
import type { SceneOption } from "@/charts/contract/scene-contract";

const scene = (
    id: string,
    morph?: SceneOption<"district">["morph"],
): SceneOption<"district"> => ({
    id,
    prose: id,
    state: {},
    encode: { x: "district:x", y: "district:y" },
    morph,
});

function target(option: () => EChartsOption = () => ({ series: [] })) {
    const setOption = vi.fn();
    const chart = shallowRef({ setOption } as unknown as EChartsType);
    const host = shallowRef({ style: { opacity: "" } } as HTMLElement);
    return {
        setOption,
        host,
        target: { chart, host, option } satisfies StageMorphTarget,
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
            transition: { mode: "blend" },
            reducedMotion: false,
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

    it("arms staged motion and reads reduced motion at each scene boundary", async () => {
        const animated = target();
        const staged = createStageMorphDriver({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "staged" },
            reducedMotion: false,
        });
        staged.bind(animated.target);
        staged.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        expect(animated.setOption.mock.calls[0]?.[0]).toMatchObject({
            animation: true,
            animationDurationUpdate: 760,
        });

        const reduced = target(() => ({
            series: [{ universalTransition: { enabled: true }, data: [] }],
        }));
        reduced.host.value.animate = vi
            .fn()
            .mockReturnValueOnce({ finished: Promise.resolve(), cancel: vi.fn() })
            .mockReturnValueOnce({ finished: Promise.resolve(), cancel: vi.fn() });
        const reducedMotion = shallowRef(true);
        const still = createStageMorphDriver({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "blend" },
            reducedMotion,
        });
        still.bind(reduced.target);
        still.applyScene(scene("two"), { dir: "forward" });
        await nextTick();
        await Promise.resolve();
        await Promise.resolve();
        expect(reduced.setOption.mock.calls[0]?.[0]).toMatchObject({
            animation: false,
            series: [expect.not.objectContaining({ universalTransition: expect.anything() })],
        });
        expect(reduced.host.value.animate).toHaveBeenNthCalledWith(
            1,
            [{ opacity: "1" }, { opacity: "0" }],
            { duration: 60, easing: "ease-in", fill: "forwards" },
        );
        expect(reduced.host.value.animate).toHaveBeenNthCalledWith(
            2,
            [{ opacity: "0" }, { opacity: "1" }],
            { duration: 80, easing: "ease-out", fill: "forwards" },
        );

        reducedMotion.value = false;
        still.applyScene(scene("three"), { dir: "forward" });
        await nextTick();
        expect(reduced.setOption.mock.calls[1]?.[0]).toMatchObject({
            animation: true,
            series: [expect.objectContaining({ universalTransition: expect.anything() })],
        });
    });

    it("crossfades host opacity around one non-spatial option push", async () => {
        const bound = target(() => ({
            series: [{ universalTransition: { enabled: true }, data: [] }],
        }));
        const animations = [
            { finished: Promise.resolve(), cancel: vi.fn() },
            { finished: Promise.resolve(), cancel: vi.fn() },
        ] as unknown as Animation[];
        bound.host.value.animate = vi
            .fn()
            .mockReturnValueOnce(animations[0])
            .mockReturnValueOnce(animations[1]);
        const driver = createStageMorphDriver({
            initialSceneId: "one",
            identity: { field: "id" },
            transition: { mode: "blend" },
            reducedMotion: false,
        });
        driver.bind(bound.target);

        driver.applyScene(scene("two", "crossfade"), { dir: "forward" });
        await nextTick();
        await Promise.resolve();
        await Promise.resolve();

        expect(bound.host.value.animate).toHaveBeenNthCalledWith(
            1,
            [{ opacity: "1" }, { opacity: "0" }],
            { duration: 120, easing: "ease-in", fill: "forwards" },
        );
        expect(bound.setOption).toHaveBeenCalledOnce();
        expect(bound.setOption.mock.calls[0]?.[0]).toMatchObject({
            animation: false,
            series: [expect.not.objectContaining({ universalTransition: expect.anything() })],
        });
        expect(bound.host.value.animate).toHaveBeenNthCalledWith(
            2,
            [{ opacity: "0" }, { opacity: "1" }],
            { duration: 140, easing: "ease-out", fill: "forwards" },
        );
    });

    it("retargets an interrupted fade from its live opacity and lands only the latest scene", async () => {
        let active = "one";
        let opacity = "1";
        let rejectFirst!: (reason?: unknown) => void;
        let resolveSecond!: () => void;
        const first = {
            finished: new Promise<void>((_resolve, reject) => {
                rejectFirst = reject;
            }),
            cancel: vi.fn(() => rejectFirst()),
        } as unknown as Animation;
        const second = {
            finished: new Promise<void>((resolve) => {
                resolveSecond = resolve;
            }),
            cancel: vi.fn(),
        } as unknown as Animation;
        const into = {
            finished: Promise.resolve(),
            cancel: vi.fn(),
        } as unknown as Animation;
        const bound = target(() => ({ title: { text: active }, series: [] }));
        bound.host.value = {
            style: { opacity: "" },
            ownerDocument: {
                defaultView: { getComputedStyle: () => ({ opacity }) },
            },
            animate: vi
                .fn()
                .mockReturnValueOnce(first)
                .mockReturnValueOnce(second)
                .mockReturnValueOnce(into),
        } as unknown as HTMLElement;
        const driver = createStageMorphDriver({
            initialSceneId: active,
            identity: { field: "id" },
            transition: { mode: "blend" },
            reducedMotion: false,
        });
        driver.bind(bound.target);

        active = "two";
        driver.applyScene(scene(active, "crossfade"), { dir: "forward" });
        await nextTick();
        opacity = "0.42";
        active = "three";
        driver.applyScene(scene(active, "crossfade"), { dir: "forward" });
        await nextTick();

        expect(first.cancel).toHaveBeenCalledOnce();
        expect(bound.host.value.animate).toHaveBeenNthCalledWith(
            2,
            [{ opacity: "0.42" }, { opacity: "0" }],
            { duration: 120, easing: "ease-in", fill: "forwards" },
        );
        expect(bound.setOption).not.toHaveBeenCalled();

        resolveSecond();
        await Promise.resolve();
        await Promise.resolve();
        expect(bound.setOption).toHaveBeenCalledOnce();
        expect(bound.setOption.mock.calls[0]?.[0]).toMatchObject({
            animation: false,
            title: { text: "three" },
        });
    });

    it("retains only the latest scene until a lazy chart instance binds", async () => {
        let active = "one";
        const setOption = vi.fn();
        const chart = shallowRef<EChartsType | null>(null);
        const driver = createStageMorphDriver<"district">({
            initialSceneId: active,
            identity: { field: "id" },
            transition: { mode: "blend" },
            reducedMotion: false,
        });
        driver.bind({
            chart,
            host: shallowRef({ style: { opacity: "" } } as HTMLElement),
            option: () => ({ title: { text: active } }),
        });

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
            transition: { mode: "blend" },
            reducedMotion: false,
        });
        driver.bind(target().target);
        expect(() => driver.bind(target().target)).toThrow(
            "A ChapterStage can bind only one ECharts instance.",
        );
    });
});
