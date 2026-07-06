// charts/glyph/iconPrimitives.ts — @mkbabb/atlas · THE ABSTRACT-GRAIN PRIMITIVE MATH (O-A12).
//
// The three grains with no true administrative silhouette (hex-cell · school · consultant) do NOT
// get a generic Lucide pictogram or a bare pin — each gets a DESIGNED glyph whose FORM encodes what
// the entity IS (icon-facility §1). This module is the PURE MATH those designed glyphs render from:
// the hexagon vertex ring (Class B), the hub node + radiating-stub geometry (Class C consultant),
// the school-dot fallback anchor (Class C school), and the px→LOD band that routes an icon-scale
// mark to the coarsest tier. ZERO Vue, ZERO DOM — the render (`EntityIcon.vue`) consumes these; the
// math is unit-tested in isolation (the node-env spec floor). "hex + hub are pure math (ZERO bake
// bytes)" — the wave's §3.1 mandate: a hexagon and a hub are geometry, never a baked asset.

/** The icon-tier viewBox every abstract primitive draws in — a square `[0,100]` box, the same
    normalized frame the Class-A silhouettes fit (so an abstract mark seats interchangeably beside a
    real silhouette at the same box size). */
export const ICON_VIEWBOX = "0 0 100 100" as const;

/** The primitive box centre + the drawing radius the abstract marks share (a small margin off the
    100-box edge so a presence stroke is never clipped). */
const BOX_CENTER = 50;
const DRAW_RADIUS = 46;

// ── The px → LOD band (icon-facility §2.4) ──────────────────────────────────────────────────────
//
// The named `GlyphSize` rungs (`sm`/`md`/`lg`/`hero`) map to the committed detail tiers through
// `entityGeometry`'s `SIZE_LOD` (unchanged). The ICON scale — a 16–24px dropdown/inline mark — needs
// a NEW coarsest tier below `coarse`: a 16px NC district at `coarse` fidelity is jagged mush; at the
// `icon` tier it is a clean recognizable pebble. `pxToLod` is the band function that ROUTES an
// arbitrary px box to its tier; the `icon` tier itself is BAKED by O-A14 (this wave authors only the
// router). Until that bake lands, an `icon` band FLOORS to `coarse` at resolution (the coarsest
// tier that exists today — see `glyphSizeForPx` in `resolveEntityIcon`), a graceful degrade, never a
// void-ring. The bands are the icon-facility §2.4 contract, verbatim.

/** A committed detail tier — the three baked tiers plus the O-A14 `icon` floor the band routes to. */
export type IconLod = "icon" | "coarse" | "med" | "fine";

/**
 * Route a px mark size to its detail tier (icon-facility §2.4): `≤18 → icon`, `≤32 → coarse`,
 * `≤64 → med`, else `fine`. The `icon` band is the 16–24px dropdown/inline floor (O-A14 bakes the
 * tier; this router names it). A non-finite / non-positive px floors to `icon` (the smallest, safest
 * band — a degenerate size never over-fetches the heavy `fine` geometry).
 */
export function pxToLod(px: number): IconLod {
    if (!Number.isFinite(px) || px <= 0) return "icon";
    if (px <= 18) return "icon";
    if (px <= 32) return "coarse";
    if (px <= 64) return "med";
    return "fine";
}

// ── Class B · the hexagon primitive (icon-facility §1 Class B) ───────────────────────────────────
//
// A speedtest cell IS an H3 hexagon — a hexagon is not a proxy, it is the true shape. The primitive
// is a regular FLAT-TOP hexagon `<polygon>` (matching the map's H3 orientation), tier-FILLABLE in
// the data channel exactly as a county polygon, with a hairline presence stroke — the SAME
// `data-raised/dimmed/selected` registers a Class-A glyph carries. A flat-top hexagon has its six
// vertices at 0°/60°/…/300° (two horizontal edges, top + bottom; pointy left/right corners).

/**
 * The six vertices of a regular flat-top hexagon as an SVG `points` string (`"x,y x,y …"`),
 * centred at `(cx, cy)` with circumradius `r`. Flat-top = vertex angles at `60·i` degrees
 * (`i = 0…5`), so the top and bottom edges are horizontal — the H3 map orientation. A `pointy`
 * variant (`flatTop=false`, vertices at `-90 + 60·i`) is available for a pointy-top projection.
 */
export function hexPolygonPoints(
    cx: number = BOX_CENTER,
    cy: number = BOX_CENTER,
    r: number = DRAW_RADIUS,
    flatTop: boolean = true,
): string {
    const offsetDeg = flatTop ? 0 : -90;
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
        const a = ((offsetDeg + 60 * i) * Math.PI) / 180;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        pts.push(`${round(x)},${round(y)}`);
    }
    return pts.join(" ");
}

// ── Class C · the consultant hub primitive (icon-facility §1 C2) ─────────────────────────────────
//
// A consultant is an intermediary that brokers applicants to vendors — literally the /usf-integrity
// Ch V radial link diagram (a hub with vendor spokes). The designed glyph is a filled CENTRE NODE +
// short RADIATING STUBS, carrying the de-identified letter pseudonym INSIDE the node. It reads as
// "an intermediary that connects" — the form encodes the grain's meaning — and is the visual sibling
// of the Ch V hub, so the drill-down icon and the link-diagram hub read as ONE entity. NEVER
// `building-2` (an office implies a physical place a broker lacks, and mis-frames a de-identified
// node as a named business — the never-incriminate smell). ZERO bake bytes: a hub is math.

/** A single radiating stub — a line segment from the node rim outward. */
export interface HubSpoke {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

/** The resolved hub geometry — the centre node (a filled disc) + its radiating stubs. */
export interface HubGeometry {
    /** The centre node disc — the filled hub the pseudonym seats inside. */
    node: { cx: number; cy: number; r: number };
    /** The radiating stubs (default 6) — the broker's spokes, evenly spaced from the node rim. */
    spokes: HubSpoke[];
}

/**
 * The hub-and-spoke geometry (icon-facility §1 C2): a centre node of radius `nodeR` with `count`
 * (default 6) evenly-spaced stubs radiating from the node rim out toward the box edge. The first
 * stub points straight UP (`-90°`) so the hub reads symmetric at any count. Pure math — the render
 * fills the node + strokes the stubs + seats the pseudonym.
 */
export function hubGeometry(
    count: number = 6,
    nodeR: number = 15,
    cx: number = BOX_CENTER,
    cy: number = BOX_CENTER,
    reach: number = DRAW_RADIUS,
): HubGeometry {
    const n = Math.max(1, Math.floor(count));
    const inner = nodeR + 4; // a small gap off the node rim so the stub reads as a spoke, not a seam.
    const spokes: HubSpoke[] = [];
    for (let i = 0; i < n; i++) {
        const a = ((-90 + (360 / n) * i) * Math.PI) / 180;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        spokes.push({
            x1: round(cx + inner * cos),
            y1: round(cy + inner * sin),
            x2: round(cx + reach * cos),
            y2: round(cy + reach * sin),
        });
    }
    return { node: { cx, cy, r: nodeR }, spokes };
}

// ── Class C · the school-dot anchor (icon-facility §1 C1) ────────────────────────────────────────
//
// A school is a lat/lon POINT inside a district. The honest mark is the district silhouette drawn as
// a faint context outline with a filled tier-coloured point-dot at the school's interior coordinate.
// The dot seats from `school-points.json` (O-A14 supply) in the district geom's normalized viewBox
// space; when the point is un-geocoded (or the supply has not landed) it FALLS to the district's
// box centre — the same seed-chain honesty the charter grain uses (a `"district-centroid"` seed,
// distinct from a true `"school-point"`). `viewBoxCenter` is that fallback anchor.

/** A point in a glyph's normalized viewBox coordinate space (where the school-dot seats). */
export interface IconPoint {
    x: number;
    y: number;
}

/**
 * The centre of an SVG `viewBox` string (`"minX minY width height"`) — the school-dot's fallback
 * anchor when no geocoded school point resolves (the `"district-centroid"` seed). Returns the
 * `[0,100]`-box centre `{50,50}` for a malformed / empty viewBox (a safe interior anchor, never a
 * throw).
 */
export function viewBoxCenter(viewBox: string | null | undefined): IconPoint {
    if (!viewBox) return { x: BOX_CENTER, y: BOX_CENTER };
    const parts = viewBox.trim().split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
        return { x: BOX_CENTER, y: BOX_CENTER };
    }
    const [minX, minY, w, h] = parts;
    return { x: round(minX + w / 2), y: round(minY + h / 2) };
}

/** Round to 3 decimals — keeps the emitted path/point strings compact + deterministic (spec-stable). */
function round(n: number): number {
    return Math.round(n * 1000) / 1000;
}
