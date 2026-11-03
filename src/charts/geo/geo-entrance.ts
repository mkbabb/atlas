// charts/geo/geo-entrance.ts — THE MAP ENTRANCE FROM AN ORIGIN (U/B8 A1). Two pure derivations over
// the projected centroids: `originRank` turns an origin key into the choropleth's `rank` input (the
// origin first, then every feature by distance from it), and `entranceThreads` lays the slack
// quadratic threads the `threads` entrance draws from the origin to each valued feature. The SFC's
// `useGeoEntrance` plays them; these hold no DOM and no clock.

/** A feature's centroid, in the choropleth's viewBox space (the `Shape` `cx`/`cy`). */
export interface EntrancePoint {
    key: string;
    cx: number;
    cy: number;
}

/** The entrance a map opts into: the shapes `ripple` out from `origin` in distance order, or
    `threads` run from `origin` to every feature with a value, each feature landing as its thread
    reaches it. Reduced motion paints the map final. */
export interface GeoEntrance {
    /** The feature key every entrance starts from (a FIPS, an LEA number). */
    origin: string;
    kind: "ripple" | "threads";
}

/** One entrance thread: the feature it lands on and its path from the origin. */
export interface EntranceThread {
    key: string;
    d: string;
}

/** The thread's bow, as a fraction of its run, set off to one side of the straight line. */
const THREAD_SLACK = 0.16;

/** The keys in distance order from `origin`: the origin first, ties kept in input order. Null when
    the origin is not a feature. */
function orderFrom(origin: string, points: readonly EntrancePoint[]): string[] | null {
    const o = points.find((p) => p.key === origin);
    if (!o) return null;
    return points
        .map((p, i) => ({ key: p.key, i, d: p.key === origin ? -1 : Math.hypot(p.cx - o.cx, p.cy - o.cy) }))
        .sort((a, b) => a.d - b.d || a.i - b.i)
        .map((p) => p.key);
}

/**
 * The choropleth `rank` input ordered by distance from `origin`: the origin ranks 0, then each
 * feature by its centroid's distance, ties in input order. A key that is not a feature ranks
 * undefined. A missing origin (null, or no such feature) returns `fallback`, the caller's existing
 * rank, unchanged.
 */
export function originRank(
    origin: string | null | undefined,
    points: readonly EntrancePoint[],
    fallback?: (key: string) => number | undefined,
): ((key: string) => number | undefined) | undefined {
    const order = origin == null ? null : orderFrom(origin, points);
    if (!order) return fallback;
    const rank = new Map(order.map((key, i) => [key, i]));
    return (key) => rank.get(key);
}

/** The slack threads from `origin` to every valued feature but the origin, nearest first. Each is a
    quadratic whose control point sits off the midpoint, so the thread bows like loose yarn. */
export function entranceThreads(
    origin: string,
    shapes: readonly (EntrancePoint & { hasValue: boolean })[],
): EntranceThread[] {
    const o = shapes.find((s) => s.key === origin);
    const order = o && orderFrom(origin, shapes);
    if (!o || !order) return [];
    const byKey = new Map(shapes.map((s) => [s.key, s]));
    return order.flatMap((key) => {
        const s = byKey.get(key)!;
        if (key === origin || !s.hasValue) return [];
        const dx = s.cx - o.cx;
        const dy = s.cy - o.cy;
        const mx = (s.cx + o.cx) / 2 - dy * THREAD_SLACK;
        const my = (s.cy + o.cy) / 2 - dx * THREAD_SLACK;
        return [{ key, d: `M${o.cx},${o.cy}Q${mx},${my} ${s.cx},${s.cy}` }];
    });
}
