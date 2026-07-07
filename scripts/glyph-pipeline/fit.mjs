// scripts/glyph-pipeline/fit.mjs — STAGE 6-7: the ASPECT-PRESERVING fit + the SVG path emit.
//
// THE LAW (I-GLYPH §3, Hard Gate 2 — the critic's square-warp catch): the feature fills its
// box at its TRUE proportions. A naive `fitSize([100,100])` STRETCHES a tall district to a
// square — the silhouette lies about its shape. Instead we scale by the LONGER axis (ONE
// uniform scale for x and y), center in the [0,100] box, and record the feature's true
// `aspect` (w/h) + the tight `viewBox`. The glyph keeps the polygon's proportions; the
// renderer reads the viewBox to lay it out without re-warping.
//
// The path `d` is emitted at a quantized precision (default 2 decimals) so the registry is
// byte-stable across re-runs (idempotent) and compact. Multi-part geometries (a state with
// islands, a coastal district) emit one subpath per ring, all in the SAME fitted frame, so
// the parts keep their TRUE relative placement (AK's Aleutians sit where they belong).

import { bounds } from "./geom.mjs";

/** Round to `p` decimals, dropping a trailing ".00" so integers stay integral (byte-stable). */
function q(n, p) {
    const r = Number(n.toFixed(p));
    return Object.is(r, -0) ? 0 : r;
}

/**
 * Aspect-preserving fit of a geometry into a [0,box] square. Returns:
 *   { fitted } — the geometry with coordinates mapped into the box (uniform scale, centered),
 *   { d }      — the SVG path string,
 *   { aspect } — the TRUE projected w/h ratio,
 *   { viewBox }— the tight viewBox "0 0 W H" the renderer lays the glyph out in,
 *   { scale, tx, ty } — the affine (for the fidelity gate to UN-fit and compare in source space).
 *
 * The fit is UNIFORM (same scale x and y) — NO square-warp.
 *
 * THE REGISTRATION LAW (the 2026-06-17 fidelity FIX): the smoothed outline is seated by the
 * SOURCE feature's projected bbox (`sourceBounds`), NOT by its own bbox. The viewBox is the
 * source bbox (aspect-preserving); the smoothed coords map into THAT frame. So when simplify
 * drops a bbox-extreme vertex, the glyph fills slightly less of the box at a LOCAL gap — it
 * does NOT re-center, so the committed glyph stays REGISTERED to its source (no global offset).
 * When `sourceBounds` is omitted (the unit-test / standalone path) the geometry seats by its own
 * bbox (the legacy self-centering behaviour, exercised by the pure fit tests).
 */
export function fitAspect(geom, box = 100, precision = 2, sourceAspect = null, sourceBounds = null) {
    // The frame bbox: the SOURCE feature's projected bbox when supplied (the registration frame),
    // else the smoothed geometry's own bbox (the legacy self-seating path).
    const [minX, minY, maxX, maxY] = sourceBounds ?? bounds(geom.coordinates);
    const w = maxX - minX;
    const h = maxY - minY;

    // The recorded aspect is the SOURCE feature's TRUE projected aspect when supplied (so the
    // glyph keeps the polygon's true proportions REGARDLESS of which bbox-extreme vertices the
    // LOD simplification dropped — the mandate is "proportions true", not "the simplified
    // bbox"); else the frame bbox's own aspect (the unit-test / standalone path).
    const aspect = sourceAspect ?? (h > 0 ? w / h : 1);

    // The glyph's own viewBox carries that TRUE aspect: the longer axis is `box`, the shorter
    // is `box / aspectRatio` so the proportions hold (no stretch to a square frame).
    const vbW = aspect >= 1 ? box : box * aspect;
    const vbH = aspect >= 1 ? box / aspect : box;

    // ONE uniform scale (the longer FRAME axis maps to `box`), then seat the smoothed outline in
    // the SOURCE frame. Uniform x/y scale ⇒ NO square-warp. Because the affine is keyed to the
    // SOURCE bbox (not the smoothed shape's), a dropped extreme vertex leaves a small LOCAL gap
    // inside the box — the silhouette stays registered, never re-centered (the fix's core).
    const scale = Math.max(w, h) > 0 ? box / Math.max(w, h) : 1;
    const tx = (vbW - w * scale) / 2 - minX * scale;
    const ty = (vbH - h * scale) / 2 - minY * scale;

    // d3-geo screen space is y-DOWN already (the choropleth draws it un-flipped); we keep the
    // SAME orientation so the glyph matches the map (no vertical mirror).
    const apply = (pt) => [pt[0] * scale + tx, pt[1] * scale + ty];

    const fittedCoords = mapCoords(geom.coordinates, apply);
    const fitted = { type: geom.type, coordinates: fittedCoords };

    const d = toPath(fitted, precision);
    return {
        fitted,
        d,
        aspect: q(aspect, 4),
        viewBox: `0 0 ${q(vbW, precision)} ${q(vbH, precision)}`,
        scale,
        tx,
        ty,
    };
}

/** Map every coordinate pair through `fn`, preserving nesting. */
function mapCoords(coords, fn) {
    if (typeof coords[0] === "number") return fn(coords);
    return coords.map((c) => mapCoords(c, fn));
}

/**
 * Parse an SVG path `d` (only the M/L/Z grammar `toPath` emits) back into a MultiPolygon
 * geometry. Used by the COMMITTED-path fidelity gate: the committed glyph's `d` (post-quantize)
 * is the artifact the reader sees, so the honest metric measures THAT geometry — not the pre-fit
 * smoothed shape — against the source (both fit to [0,100]). Each "M…Z" run is one ring; the Z
 * re-closes it. Returns a MultiPolygon (every ring its own one-ring polygon — the symmetric-
 * difference samples even-odd PIP, so disjoint parts / coastal islands union correctly).
 */
export function parsePath(d) {
    const rings = [];
    let current = null;
    // tokens: M x y | L x y | Z (whitespace/commas between numbers; toPath uses single spaces).
    const re = /([MLZ])([^MLZ]*)/g;
    let mm;
    while ((mm = re.exec(d)) !== null) {
        const cmd = mm[1];
        const nums = mm[2].trim().split(/[\s,]+/).filter((s) => s.length).map(Number);
        if (cmd === "M") {
            if (current && current.length >= 3) rings.push(current);
            current = [[nums[0], nums[1]]];
        } else if (cmd === "L") {
            for (let i = 0; i + 1 < nums.length; i += 2) current.push([nums[i], nums[i + 1]]);
        } else if (cmd === "Z") {
            if (current && current.length) {
                // re-close the ring (even-odd PIP needs the closing edge).
                const f = current[0];
                const l = current[current.length - 1];
                if (l[0] !== f[0] || l[1] !== f[1]) current.push([f[0], f[1]]);
            }
        }
    }
    if (current && current.length >= 3) rings.push(current);
    return { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };
}

/** A Polygon/MultiPolygon geometry → an SVG path `d` (one subpath per ring, quantized). */
export function toPath(geom, precision = 2) {
    const ringPath = (ring) => {
        if (ring.length < 3) return "";
        let s = `M${q(ring[0][0], precision)} ${q(ring[0][1], precision)}`;
        for (let i = 1; i < ring.length; i++) {
            // Skip the closing duplicate (the Z closes it).
            if (
                i === ring.length - 1 &&
                ring[i][0] === ring[0][0] &&
                ring[i][1] === ring[0][1]
            )
                break;
            s += `L${q(ring[i][0], precision)} ${q(ring[i][1], precision)}`;
        }
        return s + "Z";
    };
    const polyPath = (poly) => poly.map(ringPath).join("");
    if (geom.type === "Polygon") return polyPath(geom.coordinates);
    if (geom.type === "MultiPolygon")
        return geom.coordinates.map(polyPath).join("");
    return "";
}
