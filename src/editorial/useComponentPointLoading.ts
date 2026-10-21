import { onScopeDispose, ref, watch, type Ref } from "vue";

export interface ComponentPointLoad {
    id: string;
    component: boolean;
    eager?: boolean;
}

export interface ComponentPointLoadingOptions {
    /** The cold `#fragment` the page opened on (decoded, no `#`), or null. */
    fragment?: string | null;
    /** How far ahead of the viewport a beat queues its mount, in viewport heights. */
    aheadViewports?: number;
    /** The idle-callback deadline: the mount runs by then even on a busy main thread. */
    idleTimeoutMs?: number;
}

/** The look-ahead the plan fixes (PLAN §6.2 F9): 1.5 viewports. */
export const POINT_MOUNT_AHEAD_VIEWPORTS = 1.5;
/** The idle-callback deadline (PLAN §6.2 F9): 500 ms. */
export const POINT_MOUNT_IDLE_TIMEOUT_MS = 500;

type IdleHandle = number;
const requestIdle: (cb: () => void, timeout: number) => IdleHandle =
    typeof requestIdleCallback === "function"
        ? (cb, timeout) => requestIdleCallback(cb, { timeout })
        : (cb) => window.setTimeout(cb, 0) as unknown as IdleHandle;
const cancelIdle: (h: IdleHandle) => void =
    typeof cancelIdleCallback === "function"
        ? (h) => cancelIdleCallback(h)
        : (h) => window.clearTimeout(h);

/**
 * F9 (U/B7 · PLAN §6.2) · Mount plain component points ahead of the viewport, in idle time.
 *
 * One IntersectionObserver watches every component beat with a `rootMargin` of
 * `aheadViewports` viewport heights above and below. A beat that enters that band is queued, and
 * the queue mounts in one `requestIdleCallback` (deadline `idleTimeoutMs`), so the work lands
 * before the beat scrolls in and outside scroll frames. A mounted point stays mounted.
 *
 * Eager points (the cover) mount at setup. A cold `#fragment` naming a component beat mounts that
 * beat and the beat before it at setup, so the restore lands on content that is already there.
 */
export function useComponentPointLoading(
    points: readonly ComponentPointLoad[],
    beatEls: readonly Ref<HTMLElement | null>[],
    {
        fragment = null,
        aheadViewports = POINT_MOUNT_AHEAD_VIEWPORTS,
        idleTimeoutMs = POINT_MOUNT_IDLE_TIMEOUT_MS,
    }: ComponentPointLoadingOptions = {},
): Ref<ReadonlySet<string>> {
    const initial = new Set(points.filter((p) => p.component && p.eager).map((p) => p.id));
    const target = fragment == null ? -1 : points.findIndex((p) => p.id === fragment);
    if (target >= 0) {
        for (const p of points.slice(Math.max(0, target - 1), target + 1)) {
            if (p.component) initial.add(p.id);
        }
    }
    const loaded = ref<ReadonlySet<string>>(initial);

    if (typeof IntersectionObserver === "undefined") return loaded;

    const queued = new Set<string>();
    let idle: IdleHandle | null = null;
    const flush = (): void => {
        idle = null;
        if (!queued.size) return;
        const next = new Set(loaded.value);
        for (const id of queued) next.add(id);
        queued.clear();
        loaded.value = next;
        for (const id of next) {
            const el = elById.get(id);
            if (el) observer.unobserve(el);
        }
    };
    const elById = new Map<string, HTMLElement>();
    const margin = `${Math.round(aheadViewports * 100)}%`;
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const id = (entry.target as HTMLElement).id;
                if (id && !loaded.value.has(id)) queued.add(id);
            }
            if (queued.size && idle == null) idle = requestIdle(flush, idleTimeoutMs);
        },
        // The document is the root, so the margin extends this document's own viewport (an
        // implicit root would be the outermost viewport, which ignores the margin in a frame).
        { root: document, rootMargin: `${margin} 0px ${margin} 0px` },
    );

    points.forEach((point, i) => {
        if (!point.component) return;
        const el = beatEls[i];
        if (!el) return;
        watch(
            el,
            (node, prev) => {
                if (prev) {
                    observer.unobserve(prev);
                    elById.delete(point.id);
                }
                if (!node || loaded.value.has(point.id)) return;
                elById.set(point.id, node);
                observer.observe(node);
            },
            { immediate: true, flush: "post" },
        );
    });

    onScopeDispose(() => {
        observer.disconnect();
        if (idle != null) cancelIdle(idle);
    });
    return loaded;
}
