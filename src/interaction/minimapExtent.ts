// interaction/minimapExtent.ts — @mkbabb/atlas · THE BOUNDED-MINIMAP EXTENT HELPER (O-A11).
//
// The drill-down MULTI panel's mini-map has two tiers (selection-drilldown §B.3): a BOUNDED-GEOPLATE
// tier (a homogeneous spatial selection, zoomed to the UNION bounding box of the selected features) and
// a GLYPH-ROW tier (mixed / aspatial — a wrapped row of marks). This module is the ONE new geo helper
// the bounded tier needs: a pure reduce over the selected features' `viewBox`es → the union `viewBox`
// string a compact `GeoPlate` (or a composited `<svg>`) fits the selection to. Everything else the
// bounded tier draws is the existing GeoPlate / silhouette pipeline — this only computes the extent.
//
// THE FENCE (pure · testable): no store, no DOM, no projection — it PARSES the `x y w h` viewBox strings
// the caller supplies (co-projected features share one coordinate space) and unions their boxes. The
// tier CHOOSER (`allSameGrain && allSpatial && allResolveGeom`) is the caller's; this answers only "what
// viewBox frames these boxes". A single box passes through; an empty / unparseable set → `null` (the
// caller falls to the glyph-row tier).

/** A parsed `x y w h` box — the SVG viewBox tuple, min corner + extent. */
export interface ExtentBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Parse an SVG `viewBox` string (`"minX minY width height"`, whitespace/comma separated) to an
 * `ExtentBox`, or `null` when it is absent / malformed / carries a non-finite or non-positive extent
 * (a zero-area box cannot frame anything). The migration guard for a feature whose geometry has not
 * resolved — the caller drops it from the union rather than poisoning the extent with a NaN.
 */
export function parseViewBox(viewBox: string | null | undefined): ExtentBox | null {
    if (!viewBox) return null;
    const parts = viewBox
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
    const [x, y, w, h] = parts;
    if (w <= 0 || h <= 0) return null;
    return { x, y, w, h };
}

/**
 * Union a list of `ExtentBox`es into the tightest box that contains them all (min corner over the
 * mins, max corner over the maxes). Returns `null` for an empty list (nothing to frame).
 */
export function unionExtent(boxes: readonly ExtentBox[]): ExtentBox | null {
    if (boxes.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const b of boxes) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Serialize an `ExtentBox` back to an SVG `viewBox` string (the `parseViewBox` inverse), optionally
 * PADDED by a fraction of the box's larger dimension (a hair of margin so the selected silhouettes do
 * not kiss the frame edge). `pad` defaults to `0.04` (4%). The round-trip is stable at `pad=0`.
 */
export function extentToViewBox(box: ExtentBox, pad = 0.04): string {
    const m = Math.max(box.w, box.h) * pad;
    const x = box.x - m;
    const y = box.y - m;
    const w = box.w + m * 2;
    const h = box.h + m * 2;
    return `${x} ${y} ${w} ${h}`;
}

/**
 * THE BOUNDED-MINIMAP EXTENT (O-A11 · §B.3 tier 1). Reduce the selected features' co-projected
 * `viewBox`es to the ONE `viewBox` string that frames the whole selection — the compact map's zoom.
 * Malformed / unresolved boxes drop out (the union takes only the parseable), so a mid-load feature
 * never poisons the extent. Returns `null` when NOTHING parses (the caller falls to the glyph-row
 * tier). `pad` threads through to `extentToViewBox`.
 */
export function boundedMinimapViewBox(
    viewBoxes: readonly (string | null | undefined)[],
    pad = 0.04,
): string | null {
    const boxes: ExtentBox[] = [];
    for (const vb of viewBoxes) {
        const parsed = parseViewBox(vb);
        if (parsed) boxes.push(parsed);
    }
    const union = unionExtent(boxes);
    return union ? extentToViewBox(union, pad) : null;
}
