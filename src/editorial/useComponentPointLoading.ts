import { ref, watch, type Ref } from "vue";
import { useActiveBeat } from "../platform/stores/useActiveBeat.js";

export interface ComponentPointLoad {
    id: string;
    component: boolean;
    eager?: boolean;
}

/** Load plain component points from the dock's existing active-beat signal, retaining each mounted
    point once reached. The adjacent point is warmed without creating another visibility observer. */
export function useComponentPointLoading(
    points: readonly ComponentPointLoad[],
): Ref<ReadonlySet<string>> {
    const activeBeat = useActiveBeat();
    const loaded = ref<ReadonlySet<string>>(
        new Set(points.filter((point) => point.component && point.eager).map((point) => point.id)),
    );

    watch(
        () => activeBeat.activeBeatId,
        (id) => {
            const index = points.findIndex((point) => point.id === id);
            if (index < 0) return;
            const next = new Set(loaded.value);
            for (const point of points.slice(index, index + 2)) {
                if (point.component) next.add(point.id);
            }
            if (next.size !== loaded.value.size) loaded.value = next;
        },
        { immediate: true },
    );

    return loaded;
}
