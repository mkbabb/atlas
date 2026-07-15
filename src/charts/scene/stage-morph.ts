import {
    inject,
    nextTick,
    readonly,
    ref,
    watch,
    type InjectionKey,
    type Ref,
    type ShallowRef,
} from "vue";
import type { EChartsOption } from "echarts";
import type { EChartsType } from "echarts/core";
import type { Grain, SceneOption } from "@/charts/contract/scene-contract";
import { armMorphPush, withMorphIdentity } from "@/charts/morph";
import type { MarkIdentity, MorphTransition } from "@/charts/viz-set";

export interface StageMorphTarget {
    chart: Readonly<ShallowRef<Pick<EChartsType, "setOption"> | null>>;
    option(): EChartsOption;
}

export interface StageMorphDriver<G extends Grain = Grain> {
    readonly sceneId: Readonly<Ref<string>>;
    bind(target: StageMorphTarget): () => void;
    applyScene(scene: SceneOption<G>, context: { dir: "forward" | "back" }): void;
}

export interface StageMorphOptions {
    initialSceneId: string;
    identity: MarkIdentity;
    transition: MorphTransition;
}

/** One keyed ECharts push per genuine scene boundary, over one persistent chart instance. */
export function createStageMorphDriver<G extends Grain = Grain>(
    options: StageMorphOptions,
): StageMorphDriver<G> {
    const sceneId = ref(options.initialSceneId);
    let target: StageMorphTarget | null = null;
    let pending = false;
    let queued = false;

    function flush(): void {
        queued = false;
        const current = target?.chart.value;
        if (!pending || !current || !target) return;
        pending = false;
        current.setOption(
            armMorphPush(withMorphIdentity(target.option(), options.identity), options.transition),
            { notMerge: true, lazyUpdate: true },
        );
    }

    function queueFlush(): void {
        if (queued) return;
        queued = true;
        void nextTick(flush);
    }

    function bind(next: StageMorphTarget): () => void {
        if (target) throw new Error("A ChapterStage can bind only one ECharts instance.");
        target = next;
        const stop = watch(next.chart, (chart) => {
            if (chart) queueFlush();
        });
        if (next.chart.value) queueFlush();
        return () => {
            stop();
            if (target === next) target = null;
        };
    }

    function applyScene(
        scene: SceneOption<G>,
        _context: { dir: "forward" | "back" },
    ): void {
        if (scene.id === sceneId.value) return;
        sceneId.value = scene.id;
        pending = true;
        queueFlush();
    }

    return { sceneId: readonly(sceneId), bind, applyScene };
}

export const STAGE_MORPH_KEY: InjectionKey<StageMorphDriver | null> =
    Symbol("stage-morph");

export function useOptionalStageMorphDriver(): StageMorphDriver | null {
    return inject(STAGE_MORPH_KEY, null);
}
