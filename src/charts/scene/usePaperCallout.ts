// platform/charts/usePaperCallout.ts — THE PURE COX 4-TIER CALLOUT PLACEMENT SOLVER
// (K-PAPER-CALLOUT · §4.A · paper/K-PAPER-CONVERGENCE.md P4).
//
// Annotation placement is the classic cartographic point-feature label problem (Cox/Imhof
// four-position search): try the preferred slots in priority order, take the first that does not
// collide. `solveCallout` is a thin PURE module — no Vue refs at the math core, no side-effects, the
// same (anchor, chipBox, plateBox, occupancy) ALWAYS yields the same placement — that lands a
// callout chip in FOUR tiers of escalating compromise:
//
//   ① adjacent       — the chip seats up-right of the datum (the reading-eye default), NO leader,
//                       when the adjacent box is `inside()` the plate AND clears the occupancy.
//   ② edge-aware flip — the chip FLIPS to a mirrored quadrant (down-left first) when the adjacent box
//                       would CLIP the plate edge (or hit a mark) but a flipped box fits clear.
//   ③ short uncrossed leader — no adjacent/flipped box clears; the chip seats in the nearest CLEAR
//                       region and a SHORT leader draws to the datum, chosen NOT to cross occupancy.
//   ④ axis-gutter     — no in-plate region clears; the chip pins to the reserved top gutter with a
//                       gutter leader (the last resort — never a clipped/overlapping chip).
//
// The leader's `d` (tiers ③④) is the arbitrary SVG path the SHIPPED `@mkbabb/glass-ui/handmark`
// `InkMark shape="path"` rides (the `PaperCallout.vue` seat re-maps it into the brush viewBox). The
// solver works in ONE pixel frame: the anchor, the plate box, the occupancy, and the candidate chip
// boxes all share the host's local pixel space (on the in-bounds host the anchor IS the
// `VizTextOverlay` slot origin, so the frame is anchor-relative — anchor = {0,0}).
//
// The module imports NOTHING (PURE, jsdom-testable); `PaperCallout.vue` is its sole runtime consumer
// and the in-bounds host (`BreakEvenScatter.vue`) feeds it the standing settle-pass occupancy.

/** The projected datum anchor — the pixel the leader points AT (the `VizTextOverlay.pixels[id]`
    shape; on the in-bounds host the anchor is the overlay slot origin, hence {left:0,top:0}). */
export interface CalloutAnchor {
    left: number;
    top: number;
}

/** One occupied pixel box — a standing mark in the plate's settle-pass occupancy (the
    `BreakEvenScatter.glyphPlacements` reanchor), OR the plate's own no-clip frame. Same frame as the
    anchor. */
export interface OccupancyBox {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** The plate's own pixel box — the no-clip frame the chip must stay `inside()`. */
export type PlateBox = OccupancyBox;

/** The chip's SELF-MEASURED dimensions (its OWN rendered box; the solver decides left/top). Fed
    from the `PaperCallout` `ResizeObserver` BEFORE any `inside()`/no-clip verdict (never an estimate). */
export interface ChipBox {
    width: number;
    height: number;
}

/** The solver verdict — the chip seat + (tiers ③④) the leader's SVG `d` for `InkMark shape="path"`. */
export interface CalloutPlacement {
    /** the Cox tier that placed the chip (① adjacent → ④ axis-gutter). */
    tier: 1 | 2 | 3 | 4;
    /** the chip's top-left seat, in the solver's pixel frame. */
    chip: { left: number; top: number };
    /** the leader's arbitrary SVG `d` (`M x1 y1 L x2 y2`, chip-edge → anchor) for tiers ③④; absent
        for the adjacent/flipped tiers ①② (the chip sits beside the datum, no leader). */
    leaderPath?: string;
}

/** A full pixel box (a candidate chip seat or a mark) — the `inside`/overlap unit. */
type Box = OccupancyBox;
type Point = { x: number; y: number };

/** The clear gap (px) between the datum anchor and an ADJACENT chip box (tiers ①②). */
const ADJACENT_GAP = 8;
/** The leader reach (px) — the chip-center clearance from the anchor for the tier-③ leader search. */
const LEADER_REACH = 56;

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE GEOMETRY PRIMITIVES (PURE — the no-clip verdict + the collision tests).
// ─────────────────────────────────────────────────────────────────────────────

/** THE NO-CLIP VERDICT — the chip box is FULLY within the plate (edge-inclusive: a box flush to the
    plate edge is inside). The edge-aware-flip trigger reads this against the SELF-MEASURED chip box. */
export function inside(box: Box, plate: PlateBox): boolean {
    return (
        box.left >= plate.left &&
        box.top >= plate.top &&
        box.left + box.width <= plate.left + plate.width &&
        box.top + box.height <= plate.top + plate.height
    );
}

/** AABB overlap (strict — two boxes merely sharing an edge do NOT overlap). */
export function boxesOverlap(a: Box, b: Box): boolean {
    return (
        a.left < b.left + b.width &&
        a.left + a.width > b.left &&
        a.top < b.top + b.height &&
        a.top + a.height > b.top
    );
}

/** True iff the chip box clears EVERY occupancy mark (no overlap with any standing box). */
function clearsOccupancy(box: Box, occupancy: readonly OccupancyBox[]): boolean {
    return occupancy.every((o) => !boxesOverlap(box, o));
}

/** THE LEADER-vs-MARK TEST (Liang–Barsky segment∩AABB clip) — does the segment p1→p2 pass through
    `box`? Used to pick a tier-③ leader that does NOT cross another mark (the uncrossed clause). */
export function segmentCrossesBox(p1: Point, p2: Point, box: Box): boolean {
    const xmin = box.left;
    const xmax = box.left + box.width;
    const ymin = box.top;
    const ymax = box.top + box.height;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const p = [-dx, dx, -dy, dy];
    const q = [p1.x - xmin, xmax - p1.x, p1.y - ymin, ymax - p1.y];
    let t0 = 0;
    let t1 = 1;
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) return false; // parallel to this edge AND outside the slab
        } else {
            const r = q[i] / p[i];
            if (p[i] < 0) {
                if (r > t1) return false;
                if (r > t0) t0 = r;
            } else {
                if (r < t0) return false;
                if (r < t1) t1 = r;
            }
        }
    }
    return t0 <= t1; // a non-empty clipped interval ⇒ the segment passes through the box
}

/** True iff the leader segment crosses ANY occupancy mark. */
function leaderCrossesAny(from: Point, to: Point, occupancy: readonly OccupancyBox[]): boolean {
    return occupancy.some((o) => segmentCrossesBox(from, to, o));
}

/** The point on `box`'s border on the ray from the box center toward `target` (the leader's
    chip-side endpoint, so the leader starts at the chip edge, not its center). */
function borderPointToward(box: Box, target: Point): Point {
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const dx = target.x - cx;
    const dy = target.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const sx = dx !== 0 ? box.width / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
    const sy = dy !== 0 ? box.height / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
    const s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
}

/** Serialize a chip-edge → anchor leader to the `M x1 y1 L x2 y2` `d` the `InkMark shape="path"`
    consumes (rounded to 0.1px — the brush viewBox re-maps it, so the precision is cosmetic). */
function leaderPathOf(from: Point, to: Point): string {
    const r = (n: number): string => n.toFixed(1);
    return `M ${r(from.x)} ${r(from.y)} L ${r(to.x)} ${r(to.y)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE CANDIDATE GENERATION (the four reading-eye quadrants + the tier-③ ring).
// ─────────────────────────────────────────────────────────────────────────────

/** The four ADJACENT quadrant chip boxes (top-left seats), each touching the anchor with the gap.
    Order: up-right (the reading-eye default, tier ①), then the flip candidates down-left / up-left /
    down-right (tier ②, the mirror tried first). */
function adjacentBoxes(anchor: CalloutAnchor, chip: ChipBox): Box[] {
    const { width: w, height: h } = chip;
    const g = ADJACENT_GAP;
    return [
        { left: anchor.left + g, top: anchor.top - g - h, width: w, height: h }, // ① up-right
        { left: anchor.left - g - w, top: anchor.top + g, width: w, height: h }, // ② down-left (mirror)
        { left: anchor.left - g - w, top: anchor.top - g - h, width: w, height: h }, //   up-left
        { left: anchor.left + g, top: anchor.top + g, width: w, height: h }, //   down-right
    ];
}

/** The unit directions the tier-③ leader search sweeps (axes first, then diagonals — the shortest,
    least-oblique leaders preferred). */
const LEADER_DIRS: readonly Point[] = [
    { x: 0, y: 1 }, // down
    { x: 1, y: 0 }, // right
    { x: 0, y: -1 }, // up
    { x: -1, y: 0 }, // left
    { x: 1, y: 1 }, // down-right
    { x: -1, y: 1 }, // down-left
    { x: 1, y: -1 }, // up-right
    { x: -1, y: -1 }, // up-left
];

/** A tier-③ chip box centered `reach` from the anchor along a (possibly diagonal) direction. */
function ringBox(anchor: CalloutAnchor, chip: ChipBox, dir: Point, reach: number): Box {
    const len = Math.hypot(dir.x, dir.y) || 1;
    const cx = anchor.left + (dir.x / len) * reach;
    const cy = anchor.top + (dir.y / len) * reach;
    return { left: cx - chip.width / 2, top: cy - chip.height / 2, width: chip.width, height: chip.height };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE COX 4-TIER SOLVER (the central deliverable).
// ─────────────────────────────────────────────────────────────────────────────

/** Solve the callout placement: try ① adjacent → ② edge-aware flip → ③ short uncrossed leader →
    ④ axis-gutter, returning the FIRST tier whose chip box is `inside()` the plate and clears the
    occupancy (tiers ③④ add the leader `d`). PURE + deterministic. */
export function solveCallout(
    anchor: CalloutAnchor,
    chipBox: ChipBox,
    plateBox: PlateBox,
    occupancy: readonly OccupancyBox[],
): CalloutPlacement {
    const anchorPt: Point = { x: anchor.left, y: anchor.top };
    const [upRight, ...flips] = adjacentBoxes(anchor, chipBox);

    // ① ADJACENT — the up-right reading-eye default, no leader.
    if (inside(upRight, plateBox) && clearsOccupancy(upRight, occupancy))
        return { tier: 1, chip: { left: upRight.left, top: upRight.top } };

    // ② EDGE-AWARE FLIP — the mirrored quadrants (down-left first), no leader.
    for (const box of flips)
        if (inside(box, plateBox) && clearsOccupancy(box, occupancy))
            return { tier: 2, chip: { left: box.left, top: box.top } };

    // ③ SHORT UNCROSSED LEADER — the nearest clear ring seat whose leader does not cross a mark.
    for (const reach of [LEADER_REACH, LEADER_REACH * 1.8])
        for (const dir of LEADER_DIRS) {
            const box = ringBox(anchor, chipBox, dir, reach);
            if (!inside(box, plateBox) || !clearsOccupancy(box, occupancy)) continue;
            const from = borderPointToward(box, anchorPt);
            if (leaderCrossesAny(from, anchorPt, occupancy)) continue;
            return {
                tier: 3,
                chip: { left: box.left, top: box.top },
                leaderPath: leaderPathOf(from, anchorPt),
            };
        }

    // ④ AXIS-GUTTER — pin to the reserved top gutter, clamped inside, with a gutter leader. The last
    // resort: never a clipped/overlapping chip — the chip is clamped to fit, the leader bridges.
    const left = clamp(
        anchor.left - chipBox.width / 2,
        plateBox.left,
        plateBox.left + plateBox.width - chipBox.width,
    );
    const gutter: Box = { left, top: plateBox.top, width: chipBox.width, height: chipBox.height };
    const from = borderPointToward(gutter, anchorPt);
    return { tier: 4, chip: { left: gutter.left, top: gutter.top }, leaderPath: leaderPathOf(from, anchorPt) };
}

function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}
