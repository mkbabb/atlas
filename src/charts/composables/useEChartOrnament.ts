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
    watch(
        [() => toValue(chart), () => toValue(key)] as const,
        ([instance, itemKey], _previous, cleanup) => {
            const update = (): void => {
                anchor.value = instance && itemKey
                    ? resolveOrnamentAnchor(instance, itemKey)
                    : null;
            };
            update();
            if (!instance || !itemKey) return;
            instance.on("rendered", update);
            cleanup(() => instance.off("rendered", update));
        },
        { immediate: true },
    );
    return { anchor };
}
