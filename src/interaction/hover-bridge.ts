export interface HoverBridgeRect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

export interface HoverBridgeOptions {
    anchor: () => HoverBridgeRect | null;
    card: () => HoverBridgeRect | null;
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
    const finish = () => {
        if (!held) return;
        held = false;
        options.onRelease?.();
    };
    return {
        engage() {
            if (timer) clearTimeout(timer);
            timer = null;
            held = true;
        },
        get held() { return held; },
        holdsPoint(x: number, y: number): boolean {
            const anchor = options.anchor();
            const card = options.card();
            return held && Boolean(anchor && card && pointInConvexHull([x, y], convexHull([...paddedPoints(anchor), ...paddedPoints(card)])));
        },
        release() {
            if (timer) clearTimeout(timer);
            timer = setTimeout(finish, graceMs);
        },
        destroy() {
            if (timer) clearTimeout(timer);
            timer = null;
            finish(); // teardown has zero grace
        },
    };
}
