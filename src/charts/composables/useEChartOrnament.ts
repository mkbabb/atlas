import { shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import type { EChartsType } from "echarts/core";

export interface OrnamentAnchor { x: number; y: number }

interface GraphicElement {
    getBoundingRect(): { x: number; y: number; width: number; height: number };
    transformCoordToGlobal?(x: number, y: number): [number, number];
}
interface SeriesData {
    indexOfName(name: string): number;
    getItemGraphicEl(index: number): GraphicElement | null | undefined;
}
interface SeriesModel { getData(): SeriesData }
interface GlobalModel { getSeries(): SeriesModel[] }
interface OrnamentChart { getModel(): GlobalModel }

/** Read one keyed mark's live display element through the pinned ECharts 6 ornament seam. */
export function resolveOrnamentAnchor(chart: EChartsType, key: string): OrnamentAnchor | null {
    const model = (chart as unknown as OrnamentChart).getModel();
    for (const series of model.getSeries()) {
        const data = series.getData();
        const index = data.indexOfName(key);
        if (index < 0) continue;
        const element = data.getItemGraphicEl(index);
        if (!element) continue;
        const box = element.getBoundingRect();
        const local: [number, number] = [box.x + box.width / 2, box.y + box.height / 2];
        const [x, y] = element.transformCoordToGlobal?.(...local) ?? local;
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
    return null;
}

/** Follow ECharts' own rendered event; no private rAF loop or per-frame setOption is introduced. */
export function useEChartOrnament(
    chart: MaybeRefOrGetter<EChartsType | null>,
    key: MaybeRefOrGetter<string | null>,
) {
    const anchor = shallowRef<OrnamentAnchor | null>(null);

    // THE PAINTED GATE (the R11 painted-gate family; mirrors VizTextOverlay's `painted`). The
    // ornament seat may resolve ONLY once the chart has drawn ≥1 pass: `useEChart` paints with
    // `lazyUpdate: true`, so the series PIPELINE that `resolveOrnamentAnchor`'s `getData()` reads
    // is built on the DEFERRED flush — it does NOT exist at this composable's synchronous
    // (`immediate`) watch tick. Resolving before that flush is the cold-mount throw
    // (`SeriesModel.getData → Scheduler.getPipeline`, reproduced by a reloaded deep link such as
    // `/sci?at=scatter&sel=district:*`). ECharts' own `rendered` event is the truth-bearing "the
    // chart can answer" signal — the gate never probes the throwing API, opens no rAF loop, and
    // masks no throw.
    let painted = false;

    const resolve = (): void => {
        const instance = toValue(chart);
        const itemKey = toValue(key);
        anchor.value =
            painted && instance && itemKey
                ? resolveOrnamentAnchor(instance, itemKey)
                : null;
    };
    const onRendered = (): void => {
        painted = true;
        resolve();
    };

    // Re-arm the gate on each chart INSTANCE change: reset readiness, drop the stale anchor, and
    // (re)bind `rendered`. `cleanup` runs before the next instance binds AND on scope teardown,
    // so the handler never leaks and a disposed instance never re-anchors.
    watch(
        () => toValue(chart),
        (instance, _previous, cleanup) => {
            painted = false;
            anchor.value = null;
            instance?.on("rendered", onRendered);
            cleanup(() => instance?.off("rendered", onRendered));
        },
        { immediate: true },
    );
    // A key change re-resolves against the already-painted instance (its pipeline exists — no
    // throw); the gate keeps a pre-render key from ever touching `getData()`.
    watch(() => toValue(key), resolve);

    return { anchor };
}
