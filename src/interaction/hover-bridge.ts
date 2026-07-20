export interface HoverBridgeRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface HoverBridgeOptions {
    anchor: () => HoverBridgeRect | null;
    card: () => HoverBridgeRect | null;
    /** The LIVE pointer, re-read at the release edge (D-8 · β-gate F6): a pointer still inside the
        anchor∪card hull when the grace expires HOLDS the card. `null` before the first move. */
    pointer: () => Point | null;
    graceMs?: number;
    padPx?: number;
    onRelease?: () => void;
}

type Point = readonly [number, number];

function cross(o: Point, a: Point, b: Point): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}
export function convexHull(points: Point[]): Point[] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const half = (list: Point[]) => {
        const out: Point[] = [];
        for (const point of list) {
            while (out.length >= 2 && cross(out.at(-2)!, out.at(-1)!, point) <= 0) out.pop();
            out.push(point);
        }
        return out;
    };
    return [...half(sorted).slice(0, -1), ...half(sorted.reverse()).slice(0, -1)];
}
export function pointInConvexHull(point: Point, hull: Point[]): boolean {
    if (hull.length < 3) return false;
    let sign = 0;
    for (let i = 0; i < hull.length; i++) {
        const value = cross(hull[i]!, hull[(i + 1) % hull.length]!, point);
        if (value === 0) continue;
        const next = Math.sign(value);
        if (sign && next !== sign) return false;
        sign = next;
    }
    return true;
}

export function createHoverBridge(options: HoverBridgeOptions) {
    const graceMs = options.graceMs ?? 160;
    const pad = options.padPx ?? 6;
    let held = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const paddedPoints = (rect: HoverBridgeRect): Point[] => [
        [rect.left - pad, rect.top - pad], [rect.right + pad, rect.top - pad],
        [rect.right + pad, rect.bottom + pad], [rect.left - pad, rect.bottom + pad],
    ];
    const holdsAt = (point: Point | null): boolean => {
        const anchor = options.anchor();
        const card = options.card();
        return held && Boolean(point && anchor && card && pointInConvexHull(point, convexHull([...paddedPoints(anchor), ...paddedPoints(card)])));
    };
    const finish = () => {
        if (!held) return;
        held = false;
        options.onRelease?.();
    };
    // THE RELEASE EDGE (D-8 · β-gate F6) — the grace EXPIRING is not the release: a pointer still
    // inside the hull re-arms it (the dwell holds), and only LEAVING the hull finishes.
    const expire = () => {
        if (holdsAt(options.pointer())) timer = setTimeout(expire, graceMs);
        else finish();
    };
    return {
        engage() {
            if (timer) clearTimeout(timer);
            timer = null;
            held = true;
        },
        get held() { return held; },
        holdsPoint(x: number, y: number): boolean {
            return holdsAt([x, y]);
        },
        release() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(expire, graceMs);
        },
        destroy() {
            if (timer) clearTimeout(timer);
            timer = null;
            finish(); // teardown has zero grace
        },
    };
}
