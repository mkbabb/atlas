// scripts/glyph-pipeline/geom.mjs — the pure planar-geometry primitives the FIDELITY gate
// and the aspect-preserving fit build on. Everything here operates in the PROJECTED plane
// (EPSG:32119 metres, then the [0,100] fit box) — no spherical math, because the source
// has already been reprojected by `ingest`. These are the small, unit-testable kernels:
//
//   ringArea(ring)            — the signed shoelace area of one linear ring
//   polygonArea(poly)         — a polygon's area (outer ring − holes), unsigned
//   geometryArea(geom)        — the unsigned area of a Polygon/MultiPolygon
//   bounds(coords)            — the [minX, minY, maxX, maxY] bbox of nested coordinates
//   pointInGeometry(p, geom)  — even-odd ray-cast (correct for non-convex coasts + holes)
//   symmetricDifference(a, b) — |A△B| via a deterministic RASTER sampler over the union bbox
//   aspectOf(geom)            — the projected bbox aspect (w/h)
//
// The symmetric-difference is the SPINE of the user's "exactly resembles" mandate: it
// measures, in projected area, how much the simplified+smoothed glyph DIVERGES from its
// source feature. We sample a fixed N×N grid over the union bbox and count cells in A-only,
// B-only, and both via even-odd point-in-polygon — O(grid × edges), CORRECT for arbitrary
// non-convex coastlines + holes (a fan-triangulation would over-count concave regions and is
// O(n²) on a dense coast), and DETERMINISTIC (the grid + bbox are fixed), so the gate number
// is stable and the bake is fast even on the raw 375K-vertex district source.

/** The signed shoelace area of a single linear ring (positive = CCW in y-up planar space). */
export function ringArea(ring) {
    let a = 0;
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    }
    return a / 2;
}

/** A GeoJSON Polygon's unsigned area: |outer| minus the holes. */
export function polygonArea(poly) {
    if (!poly.length) return 0;
    let area = Math.abs(ringArea(poly[0]));
    for (let i = 1; i < poly.length; i++) area -= Math.abs(ringArea(poly[i]));
    return area;
}

/** The unsigned area of a Polygon or MultiPolygon geometry. */
export function geometryArea(geom) {
    if (geom.type === "Polygon") return polygonArea(geom.coordinates);
    if (geom.type === "MultiPolygon")
        return geom.coordinates.reduce((s, p) => s + polygonArea(p), 0);
    return 0;
}

/** The [minX, minY, maxX, maxY] bbox of arbitrarily-nested coordinate arrays. */
export function bounds(coords, box = [Infinity, Infinity, -Infinity, -Infinity]) {
    if (typeof coords[0] === "number") {
        const [x, y] = coords;
        if (x < box[0]) box[0] = x;
        if (y < box[1]) box[1] = y;
        if (x > box[2]) box[2] = x;
        if (y > box[3]) box[3] = y;
        return box;
    }
    for (const c of coords) bounds(c, box);
    return box;
}

/** Even-odd ray-cast: is point [x,y] inside one ring (no closure assumption)? */
function pointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        if (yi > y !== yj > y) {
            const xCross = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (x < xCross) inside = !inside;
        }
    }
    return inside;
}

/** Inside a Polygon (outer ring, minus holes) via even-odd. */
function pointInPolygon(x, y, poly) {
    if (!poly.length || !pointInRing(x, y, poly[0])) return false;
    for (let h = 1; h < poly.length; h++) if (pointInRing(x, y, poly[h])) return false;
    return true;
}

/** Inside a Polygon or MultiPolygon geometry (correct for non-convex coasts + holes). */
export function pointInGeometry(x, y, geom) {
    if (geom.type === "Polygon") return pointInPolygon(x, y, geom.coordinates);
    if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) if (pointInPolygon(x, y, poly)) return true;
        return false;
    }
    return false;
}

/** The default raster resolution (N×N samples over the union bbox) for the symmetric-diff. */
export const RASTER_N = 256;

/**
 * Collect every edge of a Polygon/MultiPolygon as [x0,y0,x1,y1], skipping horizontal edges (they
 * contribute no scanline crossing). The flat array is the SCANLINE kernel's input — one allocation,
 * tight inner loop. Even-odd parity over ALL edges (outer rings + holes) is correct for the
 * point-in-polygon rule pointInGeometry uses, so the scanline result matches the per-cell metric.
 */
function collectEdges(geom) {
    const edges = [];
    const ringEdges = (ring) => {
        for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
            const y0 = ring[j][1];
            const y1 = ring[i][1];
            if (y0 === y1) continue; // horizontal — no crossing
            edges.push(ring[j][0], y0, ring[i][0], y1);
        }
    };
    const polyEdges = (poly) => poly.forEach(ringEdges);
    if (geom.type === "Polygon") polyEdges(geom.coordinates);
    else if (geom.type === "MultiPolygon") geom.coordinates.forEach(polyEdges);
    return edges;
}

/** The sorted x-crossings of the horizontal line y=Y against the flat edge array (even-odd). */
function rowCrossings(edges, Y, out) {
    out.length = 0;
    for (let e = 0; e < edges.length; e += 4) {
        const y0 = edges[e + 1];
        const y1 = edges[e + 3];
        // half-open [min,max): a vertex exactly on Y counts once (matches pointInRing's `>`).
        if (y0 > Y !== y1 > Y) {
            const x0 = edges[e];
            const x1 = edges[e + 2];
            out.push(x0 + ((x1 - x0) * (Y - y0)) / (y1 - y0));
        }
    }
    out.sort((a, b) => a - b);
    return out;
}

/**
 * The symmetric-difference ratio |A △ B| / |source|, on an N×N grid over the union bbox — the
 * even-odd "is each cell-center inside A / B" metric, but computed by SCANLINE (per row, the
 * sorted x-crossings give the inside spans for A and B in O(edges + crossings·log)), NOT per-cell
 * PIP. This is mathematically identical to the old O(N²·edges) per-cell sampler (same grid, same
 * even-odd rule) but ~N× faster, so an N≥512 raster is affordable even on the dense district
 * source. Deterministic (fixed grid + bbox), CORRECT for arbitrary non-convex coasts + holes.
 */
export function symmetricDifference(glyphGeom, sourceGeom, n = RASTER_N) {
    const ba = bounds(glyphGeom.coordinates);
    const bb = bounds(sourceGeom.coordinates);
    const minX = Math.min(ba[0], bb[0]);
    const minY = Math.min(ba[1], bb[1]);
    const maxX = Math.max(ba[2], bb[2]);
    const maxY = Math.max(ba[3], bb[3]);
    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return { glyphArea: 0, sourceArea: 0, symDiff: 0, ratio: 0 };
    const dx = w / n;
    const dy = h / n;
    const cellArea = dx * dy;

    const edgesA = collectEdges(glyphGeom);
    const edgesB = collectEdges(sourceGeom);
    const cxA = [];
    const cxB = [];

    let aOnly = 0;
    let bOnly = 0;
    let both = 0;
    let bCount = 0;
    for (let iy = 0; iy < n; iy++) {
        const y = minY + (iy + 0.5) * dy;
        rowCrossings(edgesA, y, cxA);
        rowCrossings(edgesB, y, cxB);
        // Walk the grid columns once per row, tracking even-odd inside-state from the sorted
        // crossings for A and B in lockstep (each cell-center's parity is the # of crossings to
        // its left, mod 2 — advanced via the pointer as x increases).
        let ia = 0;
        let ib = 0;
        for (let ix = 0; ix < n; ix++) {
            const x = minX + (ix + 0.5) * dx;
            while (ia < cxA.length && cxA[ia] < x) ia++;
            while (ib < cxB.length && cxB[ib] < x) ib++;
            const inA = (ia & 1) === 1;
            const inB = (ib & 1) === 1;
            if (inA && inB) both++;
            else if (inA) aOnly++;
            else if (inB) bOnly++;
            if (inB) bCount++;
        }
    }
    const symDiff = (aOnly + bOnly) * cellArea;
    const sourceArea = bCount * cellArea;
    return {
        glyphArea: (aOnly + both) * cellArea,
        sourceArea,
        symDiff,
        ratio: sourceArea > 0 ? symDiff / sourceArea : Infinity,
    };
}

/** Raster-sampled intersection area of two geometries (the tear-overlap proxy). */
export function intersectionArea(geomA, geomB, n = 96) {
    const ba = bounds(geomA.coordinates);
    const bb = bounds(geomB.coordinates);
    const minX = Math.max(ba[0], bb[0]);
    const minY = Math.max(ba[1], bb[1]);
    const maxX = Math.min(ba[2], bb[2]);
    const maxY = Math.min(ba[3], bb[3]);
    const w = maxX - minX;
    const h = maxY - minY;
    if (w <= 0 || h <= 0) return 0;
    const dx = w / n;
    const dy = h / n;
    const cellArea = dx * dy;
    let both = 0;
    for (let iy = 0; iy < n; iy++) {
        const y = minY + (iy + 0.5) * dy;
        for (let ix = 0; ix < n; ix++) {
            const x = minX + (ix + 0.5) * dx;
            if (pointInGeometry(x, y, geomA) && pointInGeometry(x, y, geomB)) both++;
        }
    }
    return both * cellArea;
}

/**
 * Uniformly decimate every ring of a Polygon/MultiPolygon to at most `maxVerts` vertices by
 * stride sampling (endpoints always kept, ring closed). This produces a FAITHFUL raster
 * REFERENCE: the symmetric-difference samples a fixed-N grid, so coastline detail finer than
 * one cell (~1/256 of the bbox) is invisible to the metric anyway — decimating the 5,000-vertex
 * source to a bounded budget keeps point-in-polygon O(1) per cell without changing the gate
 * number to the raster's precision. Deterministic (fixed stride), so the bake stays byte-stable.
 */
export function decimateGeometry(geom, maxVerts = 800) {
    const decRing = (ring) => {
        if (ring.length <= maxVerts) return ring;
        // Find the bbox-extreme vertex indices — they MUST survive decimation so the
        // reference's bbox (hence its aspect) is identical to the full source's (the aspect-
        // fidelity arm compares against this; a dropped extreme would inflate the measured Δ).
        let xi0 = 0, xi1 = 0, yi0 = 0, yi1 = 0;
        for (let i = 1; i < ring.length; i++) {
            if (ring[i][0] < ring[xi0][0]) xi0 = i;
            if (ring[i][0] > ring[xi1][0]) xi1 = i;
            if (ring[i][1] < ring[yi0][1]) yi0 = i;
            if (ring[i][1] > ring[yi1][1]) yi1 = i;
        }
        const keep = new Set([0, ring.length - 1, xi0, xi1, yi0, yi1]);
        const stride = Math.ceil(ring.length / maxVerts);
        const out = [];
        for (let i = 0; i < ring.length; i++) {
            if (i % stride === 0 || keep.has(i)) out.push(ring[i]);
        }
        // keep closure
        const last = ring[ring.length - 1];
        if (out[out.length - 1][0] !== last[0] || out[out.length - 1][1] !== last[1])
            out.push(last);
        return out;
    };
    const decPoly = (poly) => poly.map(decRing);
    if (geom.type === "Polygon")
        return { type: "Polygon", coordinates: decPoly(geom.coordinates) };
    if (geom.type === "MultiPolygon")
        return {
            type: "MultiPolygon",
            coordinates: geom.coordinates.map(decPoly),
        };
    return geom;
}

/** The aspect ratio (width / height) of a geometry's projected bbox. */
export function aspectOf(geom) {
    const [minX, minY, maxX, maxY] = bounds(geom.coordinates);
    const w = maxX - minX;
    const h = maxY - minY;
    return h > 0 ? w / h : Infinity;
}
