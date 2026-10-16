import { shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import type { EChartsType } from "echarts/core";
import type { EChartReadiness } from "./useEChart.js";

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

/**
 * The ornament seat follows the host chart's readiness primitive (useEChart, U RULINGS §J J-1): it
 * resolves only while the chart is `settled` (`resolveOrnamentAnchor` reads `getData()`, which throws
 * in any lazy paint window before `prepare` builds the series pipeline: the cold-mount throw on a
 * reloaded `/sci?at=scatter&sel=district:*`, and every later structural paint), re-resolves on its
 * `frame` clock, and clears while a paint is in flight, so it never circles where a superseded mark
 * stood (CX-4). It subscribes to no chart event of its own: useEChart owns the one `finished` site.
 */
export function useEChartOrnament(echart: EChartReadiness, key: MaybeRefOrGetter<string | null>) {
    const anchor = shallowRef<OrnamentAnchor | null>(null);

    const resolve = (): void => {
        const instance = echart.chart.value;
        const itemKey = toValue(key);
        anchor.value =
            instance && itemKey && echart.settled.value
                ? resolveOrnamentAnchor(instance, itemKey)
                : null;
    };

    watch(() => echart.frame.value, resolve);
    watch(() => echart.settled.value, resolve);
    watch(() => echart.chart.value, resolve);
    watch(() => toValue(key), resolve, { immediate: true });

    return { anchor };
}
