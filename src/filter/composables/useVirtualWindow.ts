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

export type VirtualKey = string | number;

export interface VirtualOffset<Key extends VirtualKey = VirtualKey> {
    readonly key: Key;
    readonly index: number;
    readonly top: number;
    readonly bottom: number;
}

export interface VirtualItem<Item, Key extends VirtualKey = VirtualKey>
    extends VirtualOffset<Key> {
    readonly item: Item;
}

export interface UseVirtualWindowOptions<Item, Key extends VirtualKey = VirtualKey> {
    items: MaybeRefOrGetter<readonly Item[]>;
    viewport: MaybeRefOrGetter<HTMLElement | null>;
    key: (item: Item, index: number) => Key;
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

/** Build cumulative offsets once per item/measurement change. */
export function buildVirtualOffsets<Item, Key extends VirtualKey>(
    items: readonly Item[],
    keyOf: (item: Item, index: number) => Key,
    sizes: ReadonlyMap<Key, number>,
    estimateSize: number,
): readonly VirtualItem<Item, Key>[] {
    let top = 0;
    return items.map((item, index) => {
        const key = keyOf(item, index);
        const size = sizes.get(key) ?? estimateSize;
        const row = { item, key, index, top, bottom: top + size };
        top = row.bottom;
        return row;
    });
}

/** Binary-search a cumulative layout for the visible interval. */
export function resolveVirtualRange<Key extends VirtualKey>(
    offsets: readonly VirtualOffset<Key>[],
    start: number,
    end: number,
): readonly [number, number] {
    let lo = 0;
    let hi = offsets.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (offsets[mid].bottom <= start) lo = mid + 1;
        else hi = mid;
    }
    const first = lo;
    lo = first;
    hi = offsets.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (offsets[mid].top < end) lo = mid + 1;
        else hi = mid;
    }
    return [first, lo];
}

/** One row-grain virtualizer: cumulative-offset binary search, 1×-before/2×-after overscan,
    resize remeasurement, and synchronous target mounting before focus. */
export function useVirtualWindow<Item, Key extends VirtualKey = VirtualKey>(
    options: UseVirtualWindowOptions<Item, Key>,
): UseVirtualWindowReturn<Item, Key> {
    const estimate = Math.max(1, options.estimateSize ?? 40);
    const sizes = shallowRef<ReadonlyMap<Key, number>>(new Map());
    const measurements = new Set<ResizeObserver>();
    const scrollTop = ref(0);
    const viewportSize = ref(0);
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
            const next = new Map(sizes.value);
            next.set(key, size);
            sizes.value = next;
        };
        commit(element.getBoundingClientRect().height);
        if (typeof ResizeObserver === "undefined") return () => undefined;
        const observer = new ResizeObserver(([entry]) => commit(entry.contentRect.height));
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
