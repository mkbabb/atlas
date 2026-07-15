import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    toValue,
    watch,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";

export interface VirtualSectionWindowOptions {
    readonly overscanBefore?: number;
    readonly overscanAfter?: number;
    readonly keepAlive?: MaybeRefOrGetter<boolean>;
}

/** Pure asymmetric window predicate shared by the observer and focused coverage. */
export function sectionInWindow(
    rect: Pick<DOMRectReadOnly, "top" | "bottom">,
    viewport: number,
    before = 1,
    after = 2,
): boolean {
    return rect.bottom >= -before * viewport && rect.top <= (1 + after) * viewport;
}

/** Window one variable-height section as an indivisible block while preserving its last footprint. */
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

    const reconcile = (): void => {
        materialized.value = inWindow || Boolean(toValue(options.keepAlive));
    };
    const stopKeepAlive = options.keepAlive
        ? watch(() => toValue(options.keepAlive), reconcile)
        : () => undefined;

    const bindIntersection = (): void => {
        if (!observed) return;
        const viewport = window.innerHeight;
        const before = options.overscanBefore ?? 1;
        const after = options.overscanAfter ?? 2;
        intersection?.disconnect();
        intersection = new IntersectionObserver(
            ([entry]) => {
                if (!entry) return;
                inWindow = sectionInWindow(
                    entry.boundingClientRect,
                    viewport,
                    before,
                    after,
                );
                reconcile();
            },
            {
                rootMargin: `${before * viewport}px 0px ${after * viewport}px 0px`,
            },
        );
        intersection.observe(observed);
    };
    const onViewportResize = (): void => bindIntersection();

    onMounted(() => {
        const element = host.value;
        if (!element || typeof IntersectionObserver === "undefined") return;
        observed = element;
        measuredBlockSize.value = element.getBoundingClientRect().height;
        if (typeof ResizeObserver !== "undefined") {
            resize = new ResizeObserver(([entry]) => {
                if (materialized.value && entry)
                    measuredBlockSize.value =
                        entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
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
