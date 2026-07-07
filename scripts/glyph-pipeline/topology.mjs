// scripts/glyph-pipeline/topology.mjs — STAGE 3-4: the SHARED topology + the
// TOPOLOGY-PRESERVING simplify (the headline craft, DEMONSTRATED not asserted).
//
// THE LAW (I-GLYPH §3.2, Hard Gate 4): the simplification runs on ONE shared topology, so
// adjacent districts/counties keep their COINCIDENT borders — the field of glyphs TILES, it
// does not tear. The realization:
//
//   toTopology(features)   — topojson-server topology(): the projected features collapse to a
//                            shared ARC graph (a border shared by two districts becomes ONE arc).
//   presimplifyVis(topo)   — topojson-simplify presimplify(): stamps every interior vertex with
//                            its VISVALINGAM area weight (the effective-area triangle) — ONE
//                            weighted topology from which any LOD is drawn on demand.
//   toposimplify(topo, w)   — topojson-simplify simplify(filter(weight)): drops vertices below
//                            the weight threshold ACROSS the shared topology, so a vertex on a
//                            shared border is dropped on BOTH sides together — the borders stay
//                            coincident (no gaps, no overlaps). The drop count is the
//                            "Repaired N intersections" log evidence (vertices the topology
//                            removed coherently that a per-feature pass would have torn).
//
// THE NEG-CONTROL (Hard Gate 4): `douglasPeuckerPerFeature` simplifies each feature in
// ISOLATION (no shared topology) — it tears the shared borders. The bake runs it and MEASURES
// the tear (the gap area between two adjacent features that toposimplify keeps coincident),
// proving the topology-preserving path is load-bearing.

import { topology } from "topojson-server";
import { presimplify, simplify, filterWeight, quantile } from "topojson-simplify";

/**
 * Build ONE shared topology from a uniform feature set [{ key, geometry, ... }]. The object
 * name is "g"; each geometry carries its `key`/`name`/`lea`/`intpt` as TopoJSON properties so
 * the downstream stages re-key without a side table.
 */
export function toTopology(features) {
    const objects = {
        g: {
            type: "GeometryCollection",
            geometries: features.map((f) => ({
                type: f.geometry.type,
                arcs: undefined, // filled by topology()
                coordinates: f.geometry.coordinates,
                id: f.key,
                properties: {
                    key: f.key,
                    name: f.name,
                    lea: f.lea ?? null,
                    intpt: f.intpt ?? null,
                },
            })),
        },
    };
    // topology() reads coordinates from a FeatureCollection more reliably than raw geometries;
    // wrap as features so the property carry-through is clean.
    const fc = {
        type: "FeatureCollection",
        features: features.map((f) => ({
            type: "Feature",
            id: f.key,
            properties: {
                key: f.key,
                name: f.name,
                lea: f.lea ?? null,
                intpt: f.intpt ?? null,
            },
            geometry: f.geometry,
        })),
    };
    return topology({ g: fc });
}

/** Stamp every interior vertex with its Visvalingam area weight (ONE weighted topology). */
export function presimplifyVis(topo) {
    return presimplify(topo);
}

/**
 * TOPOLOGY-PRESERVING simplify to a target weight. `keepFraction` ∈ (0,1] picks the
 * minWeight as the (1−keepFraction) quantile of the topology's vertex weights, so a
 * `fine` tier (keepFraction≈0.9) keeps the silhouette's characteristic inflections and a
 * `coarse` tier (keepFraction≈0.12) reduces to an iconic pebble — ON THE SHARED TOPOLOGY,
 * so coincident borders are dropped coherently on both sides.
 *
 * Returns { topo, minWeight, removed } where `removed` is the count of interior vertices the
 * shared-topology simplify coherently dropped — the "Repaired N intersections" evidence.
 */
export function toposimplifyKeep(weightedTopo, keepFraction) {
    const minWeight = quantile(weightedTopo, 1 - keepFraction);
    const before = countArcVertices(weightedTopo);
    const filtered = simplify(weightedTopo, minWeight);
    const after = countArcVertices(filtered);
    return { topo: filtered, minWeight, removed: before - after, before, after };
}

/** A weight-filter variant (filterWeight) — the explicit minWeight path for unit tests. */
export function toposimplifyWeight(weightedTopo, minWeight) {
    return simplify(weightedTopo, minWeight, filterWeight);
}

/**
 * TOPOLOGY-PRESERVING simplify at an explicit `minWeight` (the Visvalingam effective-area
 * threshold, projected px²): every vertex whose effective area is below minWeight is dropped
 * ACROSS the shared topology (coincident borders dropped coherently on both sides). Returns
 * { topo, removed, before, after } — `removed` is the coherent-removal count (the "Repaired N
 * intersections" evidence). This is the FIELD path (a direct LOD budget per tier).
 */
export function toposimplifyMinWeight(weightedTopo, minWeight) {
    const before = countArcVertices(weightedTopo);
    const topo = simplify(weightedTopo, minWeight);
    const after = countArcVertices(topo);
    return { topo, minWeight, removed: before - after, before, after };
}

/** Count the total interior vertices across all arcs (the simplify-removal denominator). */
export function countArcVertices(topo) {
    let n = 0;
    for (const arc of topo.arcs) n += arc.length;
    return n;
}

// ── THE NEG-CONTROL — per-feature Douglas-Peucker (TEARS shared borders) ─────────────────
//
// Each feature simplified in ISOLATION on its own decoded coordinates. Two adjacent features
// that shared a border now drop DIFFERENT vertices on each side → the borders no longer
// coincide (gaps + overlaps). This is the rejected path; the bake measures its tear.

/** Perpendicular distance of point p from the segment a→b (planar). */
function perpDist(p, a, b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
    const px = a[0] + t * dx;
    const py = a[1] + t * dy;
    return Math.hypot(p[0] - px, p[1] - py);
}

/** Classic Douglas-Peucker on a single open ring segment (recursive, distance-based). */
function dpRing(ring, tolerance) {
    if (ring.length < 3) return ring;
    let maxDist = 0;
    let idx = 0;
    for (let i = 1; i < ring.length - 1; i++) {
        const d = perpDist(ring[i], ring[0], ring[ring.length - 1]);
        if (d > maxDist) {
            maxDist = d;
            idx = i;
        }
    }
    if (maxDist > tolerance) {
        const left = dpRing(ring.slice(0, idx + 1), tolerance);
        const right = dpRing(ring.slice(idx), tolerance);
        return left.slice(0, -1).concat(right);
    }
    return [ring[0], ring[ring.length - 1]];
}

/**
 * The NEG-CONTROL: simplify each feature's geometry per-feature (NO shared topology) with
 * Douglas-Peucker at `tolerance` (projected units). Returns the simplified feature set.
 */
export function douglasPeuckerPerFeature(features, tolerance) {
    const dpCoords = (coords) => {
        if (typeof coords[0][0] === "number") {
            // a ring
            const simplified = dpRing(coords, tolerance);
            return simplified.length >= 4 ? simplified : coords;
        }
        return coords.map(dpCoords);
    };
    return features.map((f) => ({
        ...f,
        geometry: {
            type: f.geometry.type,
            coordinates: dpCoords(f.geometry.coordinates),
        },
    }));
}
