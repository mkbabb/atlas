// charts/marks/unit-layouts.ts — the UNIT CHART's layouts (U/B8 A3): one mark per record, every
// arrangement held as data. A layout is six typed arrays indexed by mark (center x/y, size w/h, the
// rank the morph reaches it in, its group) plus a bucketed hit index, so the engine (`unit-engine.ts`)
// morphs between any two layouts of the same count without knowing how either was built. A consumer
// may author its own with `createUnitLayout`; the three here are the common flows: a reading-order
// grid, a boustrophedon (the snake a shuttle or a plough walks), and grouped blocks (a unit bar
// chart: one block per group, filled up from a shared baseline).
//
// Every coordinate is CSS px in the canvas frame; the engine scales by the capped DPR at draw time.

import { formatCount } from "../lib/format.js";

/** A bucket grid over the frame: the marks whose centers fall in each cell, CSR-packed. */
export interface UnitHitIndex {
    cell: number;
    cols: number;
    rows: number;
    /** `items[start[k] .. start[k+1]]` are the marks in cell `k`. */
    start: Uint32Array;
    items: Uint32Array;
}

/** One arrangement of `count` marks. */
export interface UnitLayout {
    readonly count: number;
    readonly width: number;
    readonly height: number;
    /** Mark centers and sizes, indexed by mark. */
    readonly x: Float32Array;
    readonly y: Float32Array;
    readonly w: Float32Array;
    readonly h: Float32Array;
    /** The order a morph into this layout reaches each mark (0 first): the stagger key. */
    readonly rank: Uint32Array;
    /** The group each mark belongs to here: the hover dim and the summary read it. */
    readonly group: Uint32Array;
    readonly hit: UnitHitIndex;
}

/** One group's block in a grouped layout: its frame box, for labels and a table twin. */
export interface UnitBlock {
    group: number;
    count: number;
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface GroupedUnitLayout extends UnitLayout {
    readonly blocks: readonly UnitBlock[];
}

export interface UnitLayoutData {
    width: number;
    height: number;
    x: ArrayLike<number>;
    y: ArrayLike<number>;
    w: ArrayLike<number>;
    h: ArrayLike<number>;
    /** Defaults to mark order. */
    rank?: ArrayLike<number>;
    /** Defaults to one group, 0. */
    group?: ArrayLike<number>;
}

/** A layout from authored arrays: copied into typed arrays, checked, indexed for hit testing. */
export function createUnitLayout(data: UnitLayoutData): UnitLayout {
    const count = data.x.length;
    for (const key of ["y", "w", "h", "rank", "group"] as const) {
        const a = data[key];
        if (a && a.length !== count) throw new Error(`unit layout: ${key} has length ${a.length}, x has ${count}`);
    }
    const layout = {
        count,
        width: data.width,
        height: data.height,
        x: Float32Array.from(data.x),
        y: Float32Array.from(data.y),
        w: Float32Array.from(data.w),
        h: Float32Array.from(data.h),
        rank: data.rank ? Uint32Array.from(data.rank) : identity(count),
        group: data.group ? Uint32Array.from(data.group) : new Uint32Array(count),
    };
    return { ...layout, hit: buildHitIndex(layout) };
}

function identity(n: number) {
    const a = new Uint32Array(n);
    for (let i = 0; i < n; i++) a[i] = i;
    return a;
}

function buildHitIndex(l: Omit<UnitLayout, "hit">): UnitHitIndex {
    let size = 1;
    for (let i = 0; i < l.count; i++) size = Math.max(size, l.w[i], l.h[i]);
    // A cell as wide as the largest mark: any mark within one cell of a point sits in its 3 x 3.
    const cell = size;
    const cols = Math.max(1, Math.ceil(l.width / cell) + 1);
    const rows = Math.max(1, Math.ceil(l.height / cell) + 1);
    const cellOf = new Int32Array(l.count);
    const start = new Uint32Array(cols * rows + 1);
    for (let i = 0; i < l.count; i++) {
        const c = Math.floor(l.x[i] / cell);
        const r = Math.floor(l.y[i] / cell);
        const k = c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
        cellOf[i] = k;
        if (k >= 0) start[k + 1]++;
    }
    for (let k = 0; k < cols * rows; k++) start[k + 1] += start[k];
    const fill = start.slice(0, cols * rows);
    const items = new Uint32Array(start[cols * rows]);
    for (let i = 0; i < l.count; i++) if (cellOf[i] >= 0) items[fill[cellOf[i]]++] = i;
    return { cell, cols, rows, start, items };
}

/**
 * The nearest-mark rule both hit tests share: a mark closer than the best so far wins, and on a tie
 * the lower index wins, so the answer never depends on the order the marks are visited in.
 */
function nearer(d: number, i: number, bestD: number, best: number) {
    return d < bestD || (d === bestD && best >= 0 && i < best);
}

/** The mark under a point, or the nearest within one cell (the target outgrows a small mark); -1 when none. */
export function hitTest(l: UnitLayout, px: number, py: number): number {
    const { cell, cols, rows, start, items } = l.hit;
    const c0 = Math.floor(px / cell);
    const r0 = Math.floor(py / cell);
    let best = -1;
    let bestD = cell * cell;
    for (let r = r0 - 1; r <= r0 + 1; r++) {
        if (r < 0 || r >= rows) continue;
        for (let c = c0 - 1; c <= c0 + 1; c++) {
            if (c < 0 || c >= cols) continue;
            const k = r * cols + c;
            for (let j = start[k]; j < start[k + 1]; j++) {
                const i = items[j];
                const dx = l.x[i] - px;
                const dy = l.y[i] - py;
                const d = dx * dx + dy * dy;
                if (nearer(d, i, bestD, best)) {
                    bestD = d;
                    best = i;
                }
            }
        }
    }
    return best;
}

/**
 * `hitTest`'s rule over free positions (marks in flight, where no index holds): the nearest center
 * within `cell` of the point, by a scan of every mark. Allocation-free.
 */
export function hitNearest(
    x: ArrayLike<number>,
    y: ArrayLike<number>,
    count: number,
    cell: number,
    px: number,
    py: number,
): number {
    let best = -1;
    let bestD = cell * cell;
    for (let i = 0; i < count; i++) {
        const dx = x[i] - px;
        const dy = y[i] - py;
        const d = dx * dx + dy * dy;
        if (nearer(d, i, bestD, best)) {
            bestD = d;
            best = i;
        }
    }
    return best;
}

export interface UnitFlowOptions {
    /** Frame width, CSS px. */
    width: number;
    /** Frame height. Given without `cell`, the pitch is the largest that holds every mark. */
    height?: number;
    /**
     * The pitch, one cell per mark. Defaults to the fitted pitch: with a height, the largest that
     * holds every mark; without one, 8 or less, so a column fits the width. Every pitch is at least
     * `MIN_UNIT_PITCH`: a frame no such pitch fills (a zero or degenerate frame among them) throws a
     * RangeError, in every builder.
     */
    cell?: number;
    /** The gap between marks, as a fraction of the pitch. Default 0.15. */
    gap?: number;
    /** Slot `k` holds mark `order[k]`. Defaults to mark order. */
    order?: ArrayLike<number>;
    /** Each mark's group, carried onto the layout. */
    group?: ArrayLike<number>;
}

/** The pitch a layout falls back to without a frame height: a mark readable at a glance. */
const DEFAULT_PITCH = 8;
/** The smallest pitch a fit may reach: one device pixel at the capped DPR of 2. */
export const MIN_UNIT_PITCH = 0.5;

/**
 * The pitch a flow uses: `o.cell` as given, else the largest pitch up to `hi` (the frame's short
 * side when it has a height, else `DEFAULT_PITCH`) that passes `fits`, found by bisection (`fits` is
 * monotone in practice). Every pitch is at least `MIN_UNIT_PITCH`, so a frame that holds the marks
 * at no pitch from the floor up is impossible and says so with a RangeError, whatever the reason: a
 * frame too small for the marks, a block gap that eats the width, or a degenerate frame (a width or
 * height that is zero, negative, not finite, or under the floor). The marks are never laid out past
 * the frame in silence, and never at a pitch that divides by zero. A chart measuring a frame it has
 * not laid out yet (a first mount before layout, a hidden tab) holds its draw; it does not build.
 */
function resolvePitch(o: UnitFlowOptions, fits: (p: number) => boolean, what: string): number {
    const refuse = (why: string) =>
        new RangeError(`unit layout: ${what} cannot fill a ${o.width} x ${o.height ?? "auto"} px frame: ${why}`);
    const usable = (v: number) => Number.isFinite(v) && v >= MIN_UNIT_PITCH;
    if (!usable(o.width) || (o.height !== undefined && !usable(o.height))) {
        throw refuse(`each side must reach the minimum pitch of ${MIN_UNIT_PITCH} px`);
    }
    if (o.cell !== undefined) {
        if (!usable(o.cell)) throw refuse(`a ${o.cell} px cell is under the minimum pitch of ${MIN_UNIT_PITCH} px`);
        return o.cell;
    }
    let hi = o.height !== undefined ? Math.min(o.width, o.height) : Math.min(o.width, DEFAULT_PITCH);
    if (fits(hi)) return hi;
    let lo = MIN_UNIT_PITCH;
    if (!fits(lo)) throw refuse(`no pitch from the minimum pitch of ${MIN_UNIT_PITCH} px up holds the marks`);
    for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
    }
    return lo;
}

function flow(n: number, o: UnitFlowOptions, snake: boolean): UnitLayout {
    const gap = o.gap ?? 0.15;
    const colsAt = (p: number) => Math.max(1, Math.floor(o.width / p + 1e-6));
    // One column must fit the width (past it the clamped column runs out of the frame sideways),
    // and with a height every row must fit under it.
    const fits = (p: number) => p <= o.width + 1e-6 && (o.height === undefined || Math.ceil(n / colsAt(p)) * p <= o.height + 1e-6);
    const pitch = resolvePitch(o, fits, `${n} marks`);
    const cols = colsAt(pitch);
    const rows = Math.ceil(n / cols);
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const size = new Float32Array(n).fill(pitch * (1 - gap));
    const rank = new Uint32Array(n);
    for (let k = 0; k < n; k++) {
        const i = o.order ? o.order[k] : k;
        const r = Math.floor(k / cols);
        const c = snake && r % 2 === 1 ? cols - 1 - (k % cols) : k % cols;
        x[i] = (c + 0.5) * pitch;
        y[i] = (r + 0.5) * pitch;
        rank[i] = k;
    }
    return createUnitLayout({ width: o.width, height: o.height ?? rows * pitch, x, y, w: size, h: size, rank, group: o.group });
}

/** Rows in reading order, left to right, top to bottom. */
export function gridLayout(count: number, options: UnitFlowOptions): UnitLayout {
    return flow(count, options, false);
}

/** Rows that turn at each end: left to right, then right to left. Rank follows the path. */
export function boustrophedonLayout(count: number, options: UnitFlowOptions): UnitLayout {
    return flow(count, options, true);
}

export interface UnitBlockOptions extends Omit<UnitFlowOptions, "group"> {
    /** The space between blocks, CSS px. Defaults to one pitch. */
    blockGap?: number;
    /** How many groups to lay out, empty ones included. Defaults to the largest group id + 1. */
    groups?: number;
}

/** One block per group, side by side, each filled from the shared baseline upward. */
export function groupedBlocksLayout(group: ArrayLike<number>, o: UnitBlockOptions): GroupedUnitLayout {
    const n = group.length;
    const gap = o.gap ?? 0.15;
    let groups = o.groups ?? 0;
    for (let i = 0; i < n; i++) groups = Math.max(groups, group[i] + 1);
    const counts = new Uint32Array(groups);
    for (let i = 0; i < n; i++) counts[group[i]]++;
    let tallest = 0;
    for (const c of counts) tallest = Math.max(tallest, c);

    const blockGapAt = (p: number) => o.blockGap ?? p;
    const blockWAt = (p: number) => (o.width - blockGapAt(p) * (groups - 1)) / Math.max(1, groups);
    const colsAt = (p: number) => Math.max(1, Math.floor(blockWAt(p) / p + 1e-6));
    // A fitted pitch holds one column in the block width, with or without a frame height (past
    // `blockW` the clamped single column would carry the marks out of the frame sideways), and with
    // a height the tallest block under it.
    const fits = (p: number) =>
        blockWAt(p) >= p - 1e-6 && (o.height === undefined || Math.ceil(tallest / colsAt(p)) * p <= o.height + 1e-6);
    const pitch = resolvePitch(o, fits, `${n} marks in ${groups} blocks`);
    const blockW = blockWAt(pitch);
    const cols = colsAt(pitch);
    const height = o.height ?? Math.ceil(tallest / cols) * pitch;

    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const size = new Float32Array(n).fill(pitch * (1 - gap));
    const rank = new Uint32Array(n);
    const slot = new Uint32Array(groups);
    const offset = new Uint32Array(groups);
    for (let g = 1; g < groups; g++) offset[g] = offset[g - 1] + counts[g - 1];
    for (let k = 0; k < n; k++) {
        const i = o.order ? o.order[k] : k;
        const g = group[i];
        const s = slot[g]++;
        const x0 = g * (blockW + blockGapAt(pitch));
        x[i] = x0 + ((s % cols) + 0.5) * pitch;
        y[i] = height - (Math.floor(s / cols) + 0.5) * pitch;
        rank[i] = offset[g] + s;
    }
    const blocks: UnitBlock[] = [];
    for (let g = 0; g < groups; g++) {
        const h = Math.ceil(counts[g] / cols) * pitch;
        blocks.push({ group: g, count: counts[g], x: g * (blockW + blockGapAt(pitch)), y: height - h, w: blockW, h });
    }
    const layout = createUnitLayout({ width: o.width, height, x, y, w: size, h: size, rank, group });
    return { ...layout, blocks };
}

/**
 * The keyboard walk: the mark `key` moves to from `index`, along the layout's rank (the order a
 * morph reaches the marks, so the walk reads the arrangement on screen). Arrow right/down step
 * forward, left/up back, Home and End jump to the ends; -1 (nothing focused) enters at an end.
 * Returns `index` for any other key and at either end.
 */
export function unitStep(l: UnitLayout, index: number, key: string): number {
    if (l.count === 0) return -1;
    const rank = index >= 0 ? l.rank[index] : -1;
    let to: number;
    if (key === "Home") to = 0;
    else if (key === "End") to = l.count - 1;
    else if (key === "ArrowRight" || key === "ArrowDown") to = rank < 0 ? 0 : Math.min(rank + 1, l.count - 1);
    else if (key === "ArrowLeft" || key === "ArrowUp") to = rank < 0 ? l.count - 1 : Math.max(rank - 1, 0);
    else return index;
    for (let i = 0; i < l.count; i++) if (l.rank[i] === to) return i;
    return index;
}

/** The role=img summary: the total, then each group's count, largest first ("5 visits: 3 Tour, …"). */
export function unitSummary(l: UnitLayout, groupNames: readonly string[], noun: string): string {
    const counts = new Map<number, number>();
    for (let i = 0; i < l.count; i++) counts.set(l.group[i], (counts.get(l.group[i]) ?? 0) + 1);
    const parts = [...counts]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .map(([g, c]) => `${formatCount(c)} ${groupNames[g] ?? `group ${g + 1}`}`);
    return `${formatCount(l.count)} ${noun}: ${parts.join(", ")}.`;
}
