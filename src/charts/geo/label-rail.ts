// charts/geo/label-rail.ts — U/B8 A10 · THE LABEL RAIL (the leader-thread overlay for small regions).
// The X10 gate seats a value word at a centroid only where the region can hold it; a small region
// that fails it carries a texture. The rail names the top-N regions OFF the map instead: each label
// hangs from a rail above (or beside) the field on a leader thread to its centroid. It is an opt-in
// layer over the gate, never a replacement — the per-region word/texture decision is untouched.
//
// Two pure legs the SFC reads: `settleRail` spaces the labels so none touch, and `layoutLabelRail`
// picks N by the rendered width and sizes text, strokes and pad per SCREEN pixel — every px constant
// is divided by `k`, the screen px per viewBox unit, so the rail reads the same at 390 and at 1440.
//
// THE THREADS DO NOT CROSS. A straight thread from a settled label to its centroid can: two labels
// pushed right of their anchors, the left one tied to a deep centroid and the right one to a shallow
// one, cross inside the field. So each thread is routed in two legs through a KNEE on the field's
// edge, level with its anchor: a slant inside the rail band (label → knee), then a drop square to the
// rail (knee → centroid). The labels and the knees are both in anchor order on two parallel lines, so
// no two slants cross; the drops are parallel at distinct anchors, so no two drops cross; and a slant
// stays outside the field while a drop stays inside it, so they meet only at a thread's own knee.
// Two regions whose centroids share the exact rail coordinate share one drop line.

/** One label on a 1-D rail: its anchor (the centroid's coordinate along the rail) and its extent. */
export interface RailItem {
    at: number;
    size: number;
}

/**
 * THE SETTLE PASS — place ordered labels on a 1-D rail so no two touch, each as close to its anchor
 * as the others allow. Pool-adjacent-violators: each label starts as its own run seated on its anchor;
 * while a run overlaps the run before it the two merge, and a merged run is seated where its mean
 * offset from the anchors is zero (a crowded cluster spreads about its own centre, not one way), then
 * clamped into `[lo, hi]`. The input ORDER is kept: the caller orders by anchor, and
 * `layoutLabelRail` routes each thread through a knee so ordered labels give threads that never cross. Throws a RangeError when the labels cannot fit the span at all; the caller drops labels
 * first (`layoutLabelRail`), so an overlap is never the answer.
 */
export function settleRail(
    items: readonly RailItem[],
    [lo, hi]: readonly [number, number],
    gap = 0,
): number[] {
    const n = items.length;
    if (n === 0) return [];
    const need = (i: number) => (items[i - 1].size + items[i].size) / 2 + gap;
    const total = items.reduce((sum, it) => sum + it.size, 0) + gap * (n - 1);
    if (total > hi - lo + 1e-9) {
        throw new RangeError(`label rail: ${n} labels need ${total}, the span holds ${hi - lo}`);
    }

    // A run of touching labels: [start, end] and its first label's centre.
    interface Run {
        start: number;
        end: number;
        base: number;
    }
    const off: number[] = [0];
    for (let i = 1; i < n; i++) off[i] = off[i - 1] + need(i);
    const seat = (start: number, end: number): number => {
        let sum = 0;
        for (let j = start; j <= end; j++) sum += items[j].at - (off[j] - off[start]);
        const min = lo + items[start].size / 2;
        const max = hi - (off[end] - off[start]) - items[end].size / 2;
        return Math.min(max, Math.max(min, sum / (end - start + 1)));
    };
    const right = (r: Run) => r.base + off[r.end] - off[r.start] + items[r.end].size / 2;
    const left = (r: Run) => r.base - items[r.start].size / 2;

    const runs: Run[] = [];
    for (let i = 0; i < n; i++) {
        runs.push({ start: i, end: i, base: seat(i, i) });
        while (runs.length > 1) {
            const cur = runs[runs.length - 1];
            const prev = runs[runs.length - 2];
            if (right(prev) + gap <= left(cur) + 1e-9) break;
            runs.splice(-2, 2, { start: prev.start, end: cur.end, base: seat(prev.start, cur.end) });
        }
    }
    const xs = new Array<number>(n);
    for (const r of runs) for (let j = r.start; j <= r.end; j++) xs[j] = r.base + off[j] - off[r.start];
    return xs;
}

/** The count-by-width steps: under `below` px the rail holds `count` labels; wider holds `RAIL_COUNT_MAX`. */
export const RAIL_COUNT_STEPS: readonly { below: number; count: number }[] = [
    { below: 1, count: 0 },
    { below: 560, count: 3 },
    { below: 900, count: 4 },
];
export const RAIL_COUNT_MAX = 6;

/** How many regions the rail names at a rendered width — fewer as the map narrows (0 unmeasured). */
export function railLabelCount(widthPx: number): number {
    for (const s of RAIL_COUNT_STEPS) if (widthPx < s.below) return s.count;
    return RAIL_COUNT_MAX;
}

/** The rail's screen-px constants (each divided by `k` into viewBox units). The face is the mono
    `.geo-label-rail` face; a mono advance is ≈0.6em. */
const RAIL_FONT_PX = 11;
const RAIL_ADVANCE_PX = RAIL_FONT_PX * 0.6;
/** The label's side bearing plus the breathing room between neighbours. */
const RAIL_LABEL_PAD_PX = 10;
const RAIL_GAP_PX = 4;
/** The band reserved above the field for a top rail. */
const RAIL_TOP_PX = 30;
/** The lead between the field's right edge and a side rail's labels. */
const RAIL_SIDE_LEAD_PX = 14;
const RAIL_LINE_PX = RAIL_FONT_PX + 5;
const RAIL_THREAD_PX = 1;
const RAIL_HALO_PX = 3;
const RAIL_DOT_PX = 2.5;

/** A region the rail may name, in PRIORITY order (the first keeps its label longest). */
export interface RailRegion {
    key: string;
    name: string;
    value?: string;
    /** The centroid, viewBox units (the frame the region's path is drawn in). */
    cx: number;
    cy: number;
}

export type RailSide = "top" | "right";

export interface RailOptions {
    /** The field's viewBox width and height (the map alone, before the rail's pad). */
    viewWidth: number;
    viewHeight?: number;
    /** The field's rendered width, screen px. */
    widthPx: number;
    side?: RailSide;
    /** Overrides the count-by-width rule. */
    count?: (widthPx: number) => number;
}

export interface RailLabel {
    key: string;
    name: string;
    value: string;
    x: number;
    y: number;
    anchor: "middle" | "start";
    /** The label's extent along the rail (viewBox units). */
    size: number;
    from: { x: number; y: number };
    /** The bend on the field's edge, level with the anchor: the thread runs from → knee → to. */
    knee: { x: number; y: number };
    to: { x: number; y: number };
}

export interface RailLayout {
    labels: RailLabel[];
    /** Screen px per viewBox unit. */
    k: number;
    /** The viewBox units the rail adds: above the field (top) or right of it (right). */
    pad: number;
    fontSize: number;
    /** The label halo (paint-order stroke). */
    strokeWidth: number;
    threadWidth: number;
    dotR: number;
}

const textOf = (r: RailRegion) => (r.value ? `${r.name} ${r.value}` : r.name);
const textPx = (r: RailRegion) => textOf(r).length * RAIL_ADVANCE_PX + RAIL_LABEL_PAD_PX;

/**
 * THE RAIL LAYOUT — pick the top N for the width, drop the lowest-priority labels the rail cannot
 * hold, order the rest along the rail by their centroids, settle them, route each thread through its
 * knee (so no two cross), and size every mark per screen pixel. Pure: `(regions, measure) → layout`, frozen per width.
 */
export function layoutLabelRail(regions: readonly RailRegion[], opts: RailOptions): RailLayout {
    const side = opts.side ?? "top";
    const { viewWidth, widthPx } = opts;
    const n = Math.min(regions.length, (opts.count ?? railLabelCount)(widthPx));
    let picks = regions.slice(0, n);

    // A side rail takes its width from its longest label; the map shrinks to the rest, so k follows.
    const sidePx = (rs: readonly RailRegion[]) =>
        rs.length ? RAIL_SIDE_LEAD_PX + Math.max(...rs.map(textPx)) : 0;
    const kOf = (rs: readonly RailRegion[]) =>
        side === "right" ? (widthPx - sidePx(rs)) / viewWidth : widthPx / viewWidth;

    const empty = (k: number): RailLayout => ({
        labels: [],
        k,
        pad: 0,
        fontSize: RAIL_FONT_PX / k,
        strokeWidth: RAIL_HALO_PX / k,
        threadWidth: RAIL_THREAD_PX / k,
        dotR: RAIL_DOT_PX / k,
    });
    if (!(widthPx > 0) || !(viewWidth > 0)) return empty(1);

    const span = (): [number, number] => {
        if (side === "top") return [0, viewWidth];
        if (opts.viewHeight == null) throw new RangeError("label rail: a side rail needs viewHeight");
        return [0, opts.viewHeight];
    };
    const sizeOf = (r: RailRegion, k: number) => (side === "top" ? textPx(r) : RAIL_LINE_PX) / k;
    const fits = (rs: readonly RailRegion[], k: number) => {
        const [lo, hi] = span();
        return rs.reduce((s, r) => s + sizeOf(r, k), 0) + (RAIL_GAP_PX / k) * (rs.length - 1) <= hi - lo;
    };
    while (picks.length && (!(kOf(picks) > 0) || !fits(picks, kOf(picks)))) picks = picks.slice(0, -1);
    const k = picks.length ? kOf(picks) : widthPx / viewWidth;
    if (!picks.length) return empty(k);

    const along = (r: RailRegion) => (side === "top" ? r.cx : r.cy);
    const ordered = [...picks].sort((a, b) => along(a) - along(b) || (a.key < b.key ? -1 : 1));
    const pos = settleRail(
        ordered.map((r) => ({ at: along(r), size: sizeOf(r, k) })),
        span(),
        RAIL_GAP_PX / k,
    );

    const labels = ordered.map<RailLabel>((r, i) => {
        const size = sizeOf(r, k);
        if (side === "top") {
            const y = -(RAIL_TOP_PX - RAIL_FONT_PX - 6) / k;
            return {
                key: r.key,
                name: r.name,
                value: r.value ?? "",
                x: pos[i],
                y,
                anchor: "middle",
                size,
                from: { x: pos[i], y: y + 4 / k },
                knee: { x: r.cx, y: Math.min(0, r.cy) },
                to: { x: r.cx, y: r.cy },
            };
        }
        const x = viewWidth + RAIL_SIDE_LEAD_PX / k;
        return {
            key: r.key,
            name: r.name,
            value: r.value ?? "",
            x,
            y: pos[i],
            anchor: "start",
            size,
            from: { x: x - 4 / k, y: pos[i] },
            knee: { x: Math.max(viewWidth, r.cx), y: r.cy },
            to: { x: r.cx, y: r.cy },
        };
    });

    return {
        ...empty(k),
        labels,
        pad: (side === "top" ? RAIL_TOP_PX : sidePx(picks)) / k,
    };
}
