import {
    inject,
    nextTick,
    readonly,
    ref,
    toValue,
    watch,
    type InjectionKey,
    type Ref,
    type ShallowRef,
    type MaybeRefOrGetter,
} from "vue";
import type { EChartsOption } from "echarts";
import type { EChartsType } from "echarts/core";
import type { Grain, SceneOption } from "../contract/scene-contract.js";
import {
    armMorphPush,
    withMorphIdentity,
    withoutMorphIdentity,
} from "../morph.js";
import type { StageTransition } from "../contract/scene-contract.js";
import type { MarkIdentity } from "../viz-set.js";

export interface StageMorphTarget {
    chart: Readonly<ShallowRef<Pick<EChartsType, "setOption"> | null>>;
    host: Readonly<Ref<HTMLElement | null>>;
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
    transition: StageTransition;
    reducedMotion: MaybeRefOrGetter<boolean>;
}

/** One ECharts push per genuine scene boundary, over one persistent chart instance. */
export function createStageMorphDriver<G extends Grain = Grain>(
    options: StageMorphOptions,
): StageMorphDriver<G> {
    const sceneId = ref(options.initialSceneId);
    let target: StageMorphTarget | null = null;
    let pending: SceneOption<G> | null = null;
    let queued = false;
    let fade: Animation | null = null;
    let fadeHost: HTMLElement | null = null;
    let fadeToken = 0;

    function cancelFade(clearOpacity = true): void {
        fadeToken += 1;
        fade?.cancel();
        fade = null;
        if (clearOpacity && fadeHost) fadeHost.style.opacity = "";
        fadeHost = null;
    }

    function liveOpacity(host: HTMLElement): string {
        return (
            host.ownerDocument?.defaultView?.getComputedStyle(host).opacity ||
            host.style.opacity ||
            "1"
        );
    }

    async function crossfade(
        bound: StageMorphTarget,
        chart: Pick<EChartsType, "setOption">,
        option: EChartsOption,
        reduced: boolean,
    ): Promise<void> {
        const host = bound.host.value;
        const from = host ? liveOpacity(host) : "1";
        cancelFade(false);
        const token = fadeToken;
        const still = { ...option, animation: false };
        if (!host?.animate) {
            if (host) host.style.opacity = "";
            chart.setOption(still, { notMerge: true, lazyUpdate: true });
            return;
        }

        fadeHost = host;
        host.style.opacity = from;
        const out = host.animate(
            [{ opacity: from }, { opacity: "0" }],
            { duration: reduced ? 60 : 120, easing: "ease-in", fill: "forwards" },
        );
        fade = out;
        try {
            await out.finished;
        } catch {
            return;
        }
        if (token !== fadeToken || target !== bound || bound.chart.value !== chart) return;

        host.style.opacity = "0";
        out.cancel();
        chart.setOption(still, { notMerge: true, lazyUpdate: true });

        const into = host.animate(
            [{ opacity: "0" }, { opacity: "1" }],
            { duration: reduced ? 80 : 140, easing: "ease-out", fill: "forwards" },
        );
        fade = into;
        try {
            await into.finished;
        } catch {
            return;
        }
        if (token !== fadeToken) return;
        into.cancel();
        host.style.opacity = "";
        fade = null;
        fadeHost = null;
    }

    function flush(): void {
        queued = false;
        const current = target?.chart.value;
        const scene = pending;
        if (!scene || !current || !target) return;
        pending = null;
        const reduced = toValue(options.reducedMotion);
        if (reduced || scene.morph === "crossfade") {
            void crossfade(
                target,
                current,
                withoutMorphIdentity(target.option()),
                reduced,
            );
        } else {
            cancelFade();
            current.setOption(
                armMorphPush(
                    withMorphIdentity(target.option(), options.identity),
                    { ...options.transition, reduced: false },
                ),
                { notMerge: true, lazyUpdate: true },
            );
        }
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
            if (target === next) {
                cancelFade();
                target = null;
            }
        };
    }

    function applyScene(
        scene: SceneOption<G>,
        _context: { dir: "forward" | "back" },
    ): void {
        if (scene.id === sceneId.value) return;
        sceneId.value = scene.id;
        pending = scene;
        queueFlush();
    }

    return { sceneId: readonly(sceneId), bind, applyScene };
}

export const STAGE_MORPH_KEY: InjectionKey<StageMorphDriver | null> =
    Symbol("stage-morph");

export function useOptionalStageMorphDriver(): StageMorphDriver | null {
    return inject(STAGE_MORPH_KEY, null);
}
