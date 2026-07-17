import {
    computed,
    onScopeDispose,
    ref,
    shallowRef,
    toValue,
    watch,
    type ComputedRef,
    type MaybeRefOrGetter,
} from "vue";
import {
    buildVirtualOffsets,
    resolveVirtualRange,
    roundedVirtualWidth,
    virtualMeasurementSession,
    type VirtualItem,
    type VirtualKey,
    type VirtualMeasurementSurface,
    type VirtualOffset,
} from "./virtual-window-core.js";

export { buildVirtualOffsets, resolveVirtualRange } from "./virtual-window-core.js";
export type {
    VirtualItem,
    VirtualKey,
    VirtualMeasurementSurface,
    VirtualOffset,
} from "./virtual-window-core.js";

export interface UseVirtualWindowOptions<Item, Key extends VirtualKey = VirtualKey> {
    items: MaybeRefOrGetter<readonly Item[]>;
    viewport: MaybeRefOrGetter<HTMLElement | null>;
    key: (item: Item, index: number) => Key;
    /** Measurement cache identity. Omit for instance-local measurements; share deliberately to
        reuse row heights across equivalent surfaces at the same rounded width. */
    measurementSurface?: VirtualMeasurementSurface;
    estimateSize?: number;
    overscan?: { readonly before?: number; readonly after?: number };
}

export interface UseVirtualWindowReturn<Item, Key extends VirtualKey = VirtualKey> {
    items: ComputedRef<readonly VirtualItem<Item, Key>[]>;
    offsets: ComputedRef<ReadonlyMap<Key, VirtualOffset<Key>>>;
    totalSize: ComputedRef<number>;
    ariaRowCount: ComputedRef<number>;
    ensureTargetWindow(key: Key): boolean;
    observe(key: Key, element: Element): () => void;
}

/** One row-grain virtualizer: cumulative-offset binary search, 1×-before/2×-after overscan,
    resize remeasurement, and synchronous target mounting before focus. */
export function useVirtualWindow<Item, Key extends VirtualKey = VirtualKey>(
    options: UseVirtualWindowOptions<Item, Key>,
): UseVirtualWindowReturn<Item, Key> {
    const estimate = Math.max(1, options.estimateSize ?? 40);
    const measurementSurface = options.measurementSurface ?? {};
    const sizes = shallowRef<ReadonlyMap<Key, number>>(new Map());
    const measurements = new Set<ResizeObserver>();
    const scrollTop = ref(0);
    const viewportSize = ref(0);
    let activeWidth: number | undefined;
    const layout = computed(() =>
        buildVirtualOffsets(toValue(options.items), options.key, sizes.value, estimate),
    );
    const totalSize = computed(() => layout.value.at(-1)?.bottom ?? 0);
    const offsets = computed<ReadonlyMap<Key, VirtualOffset<Key>>>(() =>
        new Map(layout.value.map((row) => [row.key, row])),
    );
    const range = computed(() => {
        const before = options.overscan?.before ?? viewportSize.value;
        const after = options.overscan?.after ?? viewportSize.value * 2;
        return resolveVirtualRange(
            layout.value,
            Math.max(0, scrollTop.value - before),
            scrollTop.value + viewportSize.value + after,
        );
    });
    const visible = computed(() => layout.value.slice(range.value[0], range.value[1]));

    onScopeDispose(() => {
        for (const observer of measurements) observer.disconnect();
        measurements.clear();
    });

    watch(
        () => toValue(options.viewport),
        (element, _old, cleanup) => {
            if (!element) return;
            const sync = (): void => {
                const width = roundedVirtualWidth(element.clientWidth);
                if (width !== activeWidth) {
                    activeWidth = width;
                    sizes.value = new Map(
                        virtualMeasurementSession<Key>(measurementSurface, width),
                    );
                }
                scrollTop.value = element.scrollTop;
                viewportSize.value = element.clientHeight;
            };
            sync();
            element.addEventListener("scroll", sync, { passive: true });
            const observer =
                typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
            observer?.observe(element);
            cleanup(() => {
                element.removeEventListener("scroll", sync);
                observer?.disconnect();
            });
        },
        { immediate: true },
    );

    function ensureTargetWindow(key: Key): boolean {
        const target = offsets.value.get(key);
        const element = toValue(options.viewport);
        if (!target || !element) return false;
        if (target.top < scrollTop.value || target.bottom > scrollTop.value + viewportSize.value) {
            scrollTop.value = target.top;
            element.scrollTop = target.top;
        }
        return true;
    }

    function observe(key: Key, element: Element): () => void {
        const commit = (size: number): void => {
            if (!(size > 0) || sizes.value.get(key) === size) return;
            const next =
                activeWidth == null
                    ? new Map(sizes.value)
                    : virtualMeasurementSession<Key>(measurementSurface, activeWidth);
            next.set(key, size);
            sizes.value = new Map(next);
        };
        commit(element.getBoundingClientRect().height);
        if (typeof ResizeObserver === "undefined") return () => undefined;
        // Commit the BORDER box, matching the seed's `getBoundingClientRect().height` above (and
        // the section-window observer's own `borderBoxSize` read). The row is stacked by its full
        // visual height — its `border-block-end` rule included — so the border box is the correct
        // measure. Reading `contentRect` (the CONTENT box, one border shorter) made the seed and
        // the observer disagree by that border: each re-observe re-seeded the border box, each
        // observer fire re-committed the content box, so `sizes` flip-flopped forever — the
        // never-settling loop that floods "ResizeObserver loop … undelivered notifications".
        const observer = new ResizeObserver(
            ([entry]) => commit(entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height),
        );
        measurements.add(observer);
        observer.observe(element);
        const stop = (): void => {
            observer.disconnect();
            measurements.delete(observer);
        };
        return stop;
    }

    return {
        items: visible,
        offsets,
        totalSize,
        ariaRowCount: computed(() => toValue(options.items).length),
        ensureTargetWindow,
        observe,
    };
}
