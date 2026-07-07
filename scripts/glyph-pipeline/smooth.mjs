// scripts/glyph-pipeline/smooth.mjs — STAGE 5: the SHRINK-RESISTANT smoothers.
//
// THE LAW (I-GLYPH §3.3, the user mandate): the simplified ring is JAGGED; smoothing turns it
// into a clean ICON glyph WITHOUT deflating the coast. The two smoothers:
//
//   chaikin(ring, iters)        — corner-cutting (¼/¾ midpoint subdivision → rounded polyline
//                                 ≈ quadratic B-spline). The DEFAULT — a friendly iconic pebble.
//                                 It rounds corners (a slight area change) but never collapses.
//   taubin(ring, λ, μ, iters)   — a +λ Laplacian pass then a −μ pass per iteration. The −μ pass
//                                 RE-INFLATES what the +λ pass shrank, so the net is SHRINK-
//                                 RESISTANT (vs plain Laplacian which monotonically deflates a
//                                 thin coastal district). λ>0, μ<0 with |μ|>λ (the Taubin pair).
//
// Both operate on a CLOSED ring (first==last); they preserve closure. Plain Laplacian is the
// NEG-CONTROL the fidelity gate uses to prove Taubin resists shrink (an over-smoothed
// deflation must TRIP the symmetric-difference ε).

/** Strip the closing duplicate point if present, returning [openRing, wasClosed]. */
function open(ring) {
    const n = ring.length;
    const closed =
        n > 1 && ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1];
    return [closed ? ring.slice(0, -1) : ring.slice(), closed];
}

/** Re-close a ring (push the first point as the last). */
function close(open) {
    if (!open.length) return open;
    return open.concat([open[0]]);
}

/** Chaikin corner-cutting on a closed ring; `iters` passes (each quadruples then halves verts). */
export function chaikin(ring, iters = 2) {
    let [pts] = open(ring);
    if (pts.length < 3) return ring;
    for (let it = 0; it < iters; it++) {
        const next = [];
        const n = pts.length;
        for (let i = 0; i < n; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % n];
            next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
            next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
        }
        pts = next;
    }
    return close(pts);
}

/** One Laplacian pass on a closed ring: each vertex moves `w` toward its neighbours' mean. */
function laplacianPass(pts, w) {
    const n = pts.length;
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n];
        const next = pts[(i + 1) % n];
        const mx = (prev[0] + next[0]) / 2;
        const my = (prev[1] + next[1]) / 2;
        out[i] = [
            pts[i][0] + w * (mx - pts[i][0]),
            pts[i][1] + w * (my - pts[i][1]),
        ];
    }
    return out;
}

/**
 * Taubin λ/μ smoothing on a closed ring: per iteration a +λ shrink pass then a −μ inflate
 * pass. With λ≈0.5, μ≈−0.53 the net is volume-PRESERVING (the −μ pass undoes the +λ
 * deflation), so a thin district is softened without erosion. Vertex COUNT is preserved
 * (unlike Chaikin) — the silhouette keeps its topology, just relaxes its jaggedness.
 */
export function taubin(ring, lambda = 0.5, mu = -0.53, iters = 4) {
    let [pts, wasClosed] = open(ring);
    if (pts.length < 4) return ring;
    for (let it = 0; it < iters; it++) {
        pts = laplacianPass(pts, lambda);
        pts = laplacianPass(pts, mu);
    }
    return wasClosed ? close(pts) : pts;
}

/** Plain Laplacian (the NEG-CONTROL — monotonic shrink): `iters` of a single +λ pass. */
export function laplacian(ring, lambda = 0.5, iters = 4) {
    let [pts, wasClosed] = open(ring);
    if (pts.length < 4) return ring;
    for (let it = 0; it < iters; it++) pts = laplacianPass(pts, lambda);
    return wasClosed ? close(pts) : pts;
}

/** The signed shoelace area of a closed ring (local copy — keeps this module dependency-free). */
function ringSignedArea(ring) {
    let a = 0;
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    }
    return a / 2;
}

/**
 * Restore a smoothed ring's area to the original by scaling it uniformly about its centroid by
 * √(origArea/newArea). This is the SHRINK-RESISTANT companion to Chaikin: corner-cutting
 * deflates a small/convex polygon (a tiny state like DC loses ~10% area), so we re-inflate to
 * the source area WITHOUT re-introducing the jaggedness (a uniform scale preserves the rounded
 * shape + the aspect). Area-PRESERVING by construction — the smoothing no longer eats the coast.
 */
function restoreArea(smoothed, origRing) {
    const origA = Math.abs(ringSignedArea(origRing));
    const newA = Math.abs(ringSignedArea(smoothed));
    if (newA <= 0 || origA <= 0) return smoothed;
    const s = Math.sqrt(origA / newA);
    if (Math.abs(s - 1) < 1e-9) return smoothed;
    let cx = 0;
    let cy = 0;
    const n =
        smoothed.length > 1 &&
        smoothed[0][0] === smoothed[smoothed.length - 1][0] &&
        smoothed[0][1] === smoothed[smoothed.length - 1][1]
            ? smoothed.length - 1
            : smoothed.length;
    for (let i = 0; i < n; i++) {
        cx += smoothed[i][0];
        cy += smoothed[i][1];
    }
    cx /= n;
    cy /= n;
    return smoothed.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);
}

/**
 * Dispatch a named smoother over every ring of a Polygon/MultiPolygon geometry. `restore`
 * (default true for chaikin) makes the smooth AREA-PRESERVING (the shrink-resistant guarantee):
 * each ring is re-inflated to its pre-smooth area about its centroid, so a tiny convex state
 * (DC) or a thin coastal district keeps its mass. Taubin is already volume-resistant by design;
 * `none`/`laplacian` pass through (laplacian is the deliberate NEG-CONTROL deflation).
 */
export function smoothGeometry(
    geom,
    { kind = "chaikin", iters = 2, lambda = 0.5, mu = -0.53, restore } = {},
) {
    const doRestore = restore ?? kind === "chaikin";
    const fn = (r) => {
        const s =
            kind === "taubin"
                ? taubin(r, lambda, mu, iters)
                : kind === "laplacian"
                  ? laplacian(r, lambda, iters)
                  : kind === "none"
                    ? r
                    : chaikin(r, iters);
        return doRestore && kind !== "none" ? restoreArea(s, r) : s;
    };
    const smoothPoly = (poly) => poly.map(fn);
    if (geom.type === "Polygon") {
        return { type: "Polygon", coordinates: smoothPoly(geom.coordinates) };
    }
    if (geom.type === "MultiPolygon") {
        return {
            type: "MultiPolygon",
            coordinates: geom.coordinates.map(smoothPoly),
        };
    }
    return geom;
}
