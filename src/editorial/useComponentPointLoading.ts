import { ref, watch, type Ref } from "vue";
import { useActiveBeat } from "../platform/stores/useActiveBeat.js";

export interface ComponentPointLoad {
    id: string;
    component: boolean;
    eager?: boolean;
}

/** Load plain component points from the dock's existing active-beat signal, retaining each mounted
    point once reached. The window is the active point and its neighbour on EACH side (U·B3): a
    short, still-unloaded point can sit in view above the beat the observer makes active (an anchor
    jump to /sci#trend activates the scatter beat below it), so the point before the active one is
    warmed as well as the one after. No extra visibility observer is created. */
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
            for (const point of points.slice(Math.max(0, index - 1), index + 2)) {
                if (point.component) next.add(point.id);
            }
            if (next.size !== loaded.value.size) loaded.value = next;
        },
        { immediate: true },
    );

    return loaded;
}
