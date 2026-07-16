import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    toValue,
    watch,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";
import {
    resolveVirtualRange,
    roundedVirtualWidth,
    virtualMeasurementSession,
    virtualOffset,
} from "./virtual-window-core";

export interface VirtualSectionWindowOptions {
    readonly overscanBefore?: number;
    readonly overscanAfter?: number;
    readonly keepAlive?: MaybeRefOrGetter<boolean>;
}

/** Thin block-grain adapter over the shared offset/range/measurement engine. */
export function useVirtualSectionWindow(
    host: Ref<HTMLElement | null>,
    options: VirtualSectionWindowOptions = {},
) {
    const materialized = ref(true);
    const measuredBlockSize = ref(0);
    const placeholderStyle = computed(() =>
        materialized.value || measuredBlockSize.value <= 0
            ? undefined
            : { blockSize: `${measuredBlockSize.value}px` },
    );
    let inWindow = true;
    let observed: HTMLElement | null = null;
    let intersection: IntersectionObserver | null = null;
    let resize: ResizeObserver | null = null;
    let measurements: Map<"block", number> | undefined;
    let measuringWidth = false;

    const reconcile = (): void => {
        materialized.value =
            measuringWidth || inWindow || Boolean(toValue(options.keepAlive));
    };
    const stopKeepAlive = options.keepAlive
        ? watch(() => toValue(options.keepAlive), reconcile)
        : () => undefined;

    const bindMeasurements = (element: HTMLElement): boolean => {
        const surface = element.dataset.stageId
            ? `stage:${element.dataset.stageId}`
            : element;
        const next = virtualMeasurementSession<"block">(
            surface,
            roundedVirtualWidth(element.clientWidth || window.innerWidth),
        );
        if (next === measurements) return next.has("block");
        measurements = next;
        const cached = measurements.get("block");
        measuringWidth = cached == null;
        if (cached != null) measuredBlockSize.value = cached;
        reconcile();
        return cached != null;
    };
    const commitMeasurement = (size: number): void => {
        if (!(size > 0)) return;
        if (measurements?.get("block") !== size) measurements?.set("block", size);
        measuringWidth = false;
        if (measuredBlockSize.value !== size) measuredBlockSize.value = size;
        reconcile();
    };

    const bindIntersection = (): void => {
        if (!observed) return;
        const viewport = window.innerHeight;
        const before = options.overscanBefore ?? 1;
        const after = options.overscanAfter ?? 2;
        intersection?.disconnect();
        intersection = new IntersectionObserver(
            ([entry]) => {
                if (!entry) return;
                const rect = entry.boundingClientRect;
                inWindow =
                    resolveVirtualRange(
                        [virtualOffset("block", 0, rect.top, rect.height)],
                        -before * viewport,
                        (1 + after) * viewport,
                    )[1] > 0;
                reconcile();
            },
            {
                rootMargin: `${before * viewport}px 0px ${after * viewport}px 0px`,
            },
        );
        intersection.observe(observed);
    };
    const onViewportResize = (): void => {
        if (observed && !bindMeasurements(observed)) {
            const element = observed;
            void nextTick(() => commitMeasurement(element.getBoundingClientRect().height));
        }
        bindIntersection();
    };

    onMounted(() => {
        const element = host.value;
        if (!element || typeof IntersectionObserver === "undefined") return;
        observed = element;
        bindMeasurements(element);
        commitMeasurement(element.getBoundingClientRect().height);
        if (typeof ResizeObserver !== "undefined") {
            resize = new ResizeObserver(([entry]) => {
                if (!materialized.value || !entry) return;
                if (!bindMeasurements(element)) {
                    void nextTick(() =>
                        commitMeasurement(element.getBoundingClientRect().height),
                    );
                    return;
                }
                commitMeasurement(
                    entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height,
                );
            });
            resize.observe(element);
        }
        bindIntersection();
        window.addEventListener("resize", onViewportResize, { passive: true });
    });

    onBeforeUnmount(() => {
        window.removeEventListener("resize", onViewportResize);
        intersection?.disconnect();
        resize?.disconnect();
        stopKeepAlive();
    });

    return { materialized, placeholderStyle };
}
