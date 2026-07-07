// scripts/glyph-pipeline/charter.mjs — the CHARTER heuristic-polygon STAGE (J-GLYPH arm b, the
// headline NO-proxy arm). A charter has NO administrative district boundary, so the I-GLYPH
// `districtGlyph` floored it onto the rejected `county-proxy` (the dashed county outline). This
// stage RETIRES that crutch: it derives a REAL heuristic polygon for EVERY charter from the
// charter's own served-school point — a BUFFERED-POINT CATCHMENT clipped to the host county.
//
// THE HEURISTIC (J-FEEDBACK-5 Decision 1, PROVEN against the live data, NOT assumed). The live
// charter rows (`../data/SCI Report/2025/SCI Report.csv`, `Flag="CHARTER"`) are 203 distinct
// charter LEAs: 161 with a lat/lon point (each = EXACTLY ONE distinct school point), 42 with NONE.
// A single point makes the convex hull (needs ≥3 pts) and the Voronoi cell (a lone generator tiles
// the plane) DEGENERATE — so the sound minimal heuristic is a buffered-point catchment clipped to
// the host county:
//
//   • the SEED is a lon/lat point that PROVABLY sits inside an NC county:
//       - geocoded charter  → its served-school lat/lon (the 161);
//       - point-less charter → a county-of-record seed chain (the 42), each a REAL geographic
//         attribute *of the charter*, never a proxy of another entity's polygon:
//           (i)   a CITY-PEER centroid — the mean point of the geocoded charters in the SAME City
//                 (the charter's own City, from its SCI/SVF address, geocoded by its peers on disk);
//           (ii)  a CITY→COUNTY-of-record centroid — the charter's administrative City mapped to its
//                 NC county (a small embedded NC city→county table for the few cities whose only
//                 charter is point-less), the baked county's centroid the seed;
//           (iii) the NC STATE centroid — the terminal seed when the charter carries no City at all.
//   • the DISC is a geographically-circular buffer around the seed (cos-lat x-correction), its
//     radius enrollment-scaled off the `School Student Multiplier` signal (floored + capped so a
//     tiny or huge charter still clips sanely to its county) — NOT a magic radius;
//   • the CLIP is Sutherland–Hodgman with the DISC (always convex) as the clipper and the host
//     county's outer ring as the subject ⇒ the result is EXACTLY county∩disc: it CONTAINS the seed
//     (the seed is inside both) and is a STRICT subset of / coincident with the county (it is a
//     sub-region of the county ring). Both gate relations hold BY CONSTRUCTION.
//
// EVERY one of the 203 charters bakes a real area-bearing polygon — NONE falls to UNSET or to the
// county-proxy floor. The entry records the heuristic provenance (`heuristic:"buffered-county-clip"`)
// + the seed source (`seed:"school-point"|"city-peer"|"county-of-record"|"state-centroid"`), so the
// honesty register reflects the derivation (a DERIVED presence-area, never a true administrative
// silhouette, never the rejected dashed county apology).
//
// This stage reuses the SHIPPED pipeline kernels UNCHANGED (the NC conic from `ingest`, the
// aspect-preserving `fit`, the `smoothGeometry` corner-cut, the planar `geom` primitives) — it
// adds a source arm + the heuristic, it does NOT re-author the topology/simplify/fit/fidelity
// kernels. Build-time ONLY (off the `src/**` runtime graph).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoConicConformal } from "d3-geo";
import { feature } from "topojson-client";

import { fitAspect } from "./fit.mjs";
import { smoothGeometry } from "./smooth.mjs";
import { bounds, aspectOf, geometryArea, pointInGeometry as pipGeom } from "./geom.mjs";

// ── NC Lambert conformal conic constants (EPSG:32119) — the EXACT values `ingest.mjs` +
// `geometry.ts` declare, so a charter catchment co-registers with the county/district field.
const NC_PARALLELS = [34 + 20 / 60, 36 + 10 / 60];
const NC_MERIDIAN = 79;
const NC_VIEWPORT = [975, 373];
const NC_FIPS_PREFIX = "37";

// The live charter source (the SCI workbook export) + the committed county topology (the
// point-in-county host + the county-of-record centroids). Both build-time reads.
//
// THE tools→atlas SUPPLY HANDOFF (icon-facility §3.1-3 · O-A14). The charter catchments + the school
// points are SEEDED from the SCI workbook export produced tools-side (`atlas_data`, the python
// backbone). Post-extraction the bake lives in the `@mkbabb/atlas` library while the SCI feed lives in
// the `connectivity-atlas` monorepo — so this ONE path names the cross-repo boundary (mirrored by the
// `atlas_data.paths.SCI_FEED_CSV` constant on the tools side, so the two repos share ONE named path,
// not a scattered string literal). Env-overridable (`SCI_FEED_CSV`), sibling-monorepo default.
const PIPELINE_DIR = dirname(fileURLToPath(import.meta.url)); // .../atlas/scripts/glyph-pipeline
const SCI_FEED_CSV = process.env.SCI_FEED_CSV
    ? resolve(process.env.SCI_FEED_CSV)
    : resolve(PIPELINE_DIR, "../../../sci-report/data/SCI Report/2025/SCI Report.csv");
const COUNTY_TOPO = "src/data/nc-counties.json";

// The enrollment-scaled catchment radius (in DEGREES of latitude ≈ the lon/lat seed plane). A
// charter serves a campus-scale catchment, not a county — the radius reads the charter's reach off
// its `School Student Multiplier` enrollment signal, floored (a tiny charter still bakes an area-
// bearing disc) and capped (a huge charter still clips sanely inside its county). The default is the
// floor when the enrollment signal is absent. ~0.04° ≈ 4.4 km; the scale is gentle (sqrt of the
// enrollment ratio) so the catchment reads "campus presence", never "the whole county".
const RADIUS_FLOOR_DEG = 0.04;
const RADIUS_CAP_DEG = 0.13;
const ENROLLMENT_REF = 600; // a mid-size charter enrollment; the radius scales sqrt around this.

// The few point-less charter Cities whose ONLY charter LEA is itself point-less (no geocoded peer
// on disk) — a small embedded NC city→county-FIPS table (the county-of-record from the charter's
// own administrative City, a real geographic attribute of the charter). Re-verified against the
// live 2025 point-less rows: CROSSNORE (Avery), NEW BERN (Craven), LUMBERTON (Robeson),
// REIDSVILLE (Rockingham), PISGAH FOREST (Transylvania).
const CITY_TO_COUNTY_FIPS = {
    CROSSNORE: "37011", // Avery
    "NEW BERN": "37049", // Craven
    LUMBERTON: "37155", // Robeson
    REIDSVILLE: "37157", // Rockingham
    "PISGAH FOREST": "37175", // Transylvania
};

// ── tiny robust CSV parser (quoted fields, embedded commas/newlines) ───────────────────────────
// Exported so the sibling O-A14 `bake-school-points.mjs` reuses the SAME robust parse over the SAME
// SCI feed (one CSV reader, not two divergent ones).
export function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else q = false;
            } else cur += c;
        } else if (c === '"') q = true;
        else if (c === ",") {
            row.push(cur);
            cur = "";
        } else if (c === "\n") {
            row.push(cur);
            rows.push(row);
            row = [];
            cur = "";
        } else if (c !== "\r") cur += c;
    }
    if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
    }
    return rows;
}

// ── planar / spherical helpers (lon/lat space — the seed plane) ────────────────────────────────

/** Even-odd ray-cast: is [x,y] inside one ring (no closure assumption)? */
function pointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, n = ring.length, j = n - 1; i < n; j = i++) {
        const xi = ring[i][0];
        const yi = ring[i][1];
        const xj = ring[j][0];
        const yj = ring[j][1];
        if (yi > y !== yj > y) {
            const xc = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (x < xc) inside = !inside;
        }
    }
    return inside;
}

/** Inside a Polygon/MultiPolygon (outer ring minus holes), even-odd. */
function pointInGeometry(x, y, geom) {
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
        if (!pointInRing(x, y, poly[0])) continue;
        let hole = false;
        for (let h = 1; h < poly.length; h++)
            if (pointInRing(x, y, poly[h])) {
                hole = true;
                break;
            }
        if (!hole) return true;
    }
    return false;
}

/** The signed shoelace area of a ring (planar; sign = orientation). */
function signedArea(ring) {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
        a += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
    return a / 2;
}

/** The unsigned area of a ring. */
function ringArea(ring) {
    return Math.abs(signedArea(ring));
}

/** The largest outer ring of a Polygon/MultiPolygon (the county's main body — islands dropped for
    the catchment host; the seed lives in the main body by point-in-county construction). */
function largestOuterRing(geom) {
    if (geom.type === "Polygon") return geom.coordinates[0];
    let best = null;
    let bestA = -Infinity;
    for (const poly of geom.coordinates) {
        const a = ringArea(poly[0]);
        if (a > bestA) {
            bestA = a;
            best = poly[0];
        }
    }
    return best;
}

/** The area-weighted centroid (lon/lat) of a geometry's largest outer ring. */
function ringCentroid(ring) {
    let cx = 0;
    let cy = 0;
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
        cx += (ring[j][0] + ring[i][0]) * cross;
        cy += (ring[j][1] + ring[i][1]) * cross;
        a += cross;
    }
    if (Math.abs(a) < 1e-12) {
        // degenerate — fall back to the vertex mean.
        let mx = 0;
        let my = 0;
        for (const p of ring) {
            mx += p[0];
            my += p[1];
        }
        return [mx / ring.length, my / ring.length];
    }
    a *= 0.5;
    return [cx / (6 * a), cy / (6 * a)];
}

/** A geographically-circular disc (lon/lat) around [lon,lat]: `seg` vertices, the x extent
    cos-lat-corrected so the disc reads circular on the ground (NOT an ellipse stretched by the
    meridian convergence). Emitted CCW (the SH clipper's expected orientation). */
function disc(lon, lat, rDeg, seg) {
    const asp = Math.cos((lat * Math.PI) / 180) || 1;
    const ring = [];
    for (let i = 0; i < seg; i++) {
        const a = (2 * Math.PI * i) / seg;
        ring.push([lon + (rDeg * Math.cos(a)) / asp, lat + rDeg * Math.sin(a)]);
    }
    return ring;
}

/**
 * Sutherland–Hodgman: clip `subject` (an arbitrary, possibly non-convex polygon ring) by `clip` (a
 * CONVEX clipper ring). Returns the clipped ring (the subject ∩ clip region). Because the CLIPPER is
 * the convex disc and the SUBJECT is the county's outer ring, the result is EXACTLY county∩disc — a
 * sub-region of the county that contains every point inside both. The clip ring is normalized to CCW
 * so the half-plane "inside = left of the directed edge" test is consistent.
 */
function clipByConvex(subject, clip) {
    let cl = clip.slice();
    if (signedArea(cl) < 0) cl.reverse(); // CCW (left-of-edge = interior)
    const N = cl.length;
    let out = subject.slice();
    for (let e = 0; e < N; e++) {
        const A = cl[e];
        const B = cl[(e + 1) % N];
        const inside = (p) =>
            (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]) >= 0;
        const intersect = (P, Q) => {
            const d1 = (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]);
            const d2 = (B[0] - A[0]) * (Q[1] - A[1]) - (B[1] - A[1]) * (Q[0] - A[0]);
            const t = d1 / (d1 - d2);
            return [P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])];
        };
        const input = out;
        out = [];
        for (let i = 0; i < input.length; i++) {
            const cur = input[i];
            const prv = input[(i + input.length - 1) % input.length];
            const ci = inside(cur);
            const pi = inside(prv);
            if (ci) {
                if (!pi) out.push(intersect(prv, cur));
                out.push(cur);
            } else if (pi) out.push(intersect(prv, cur));
        }
        if (out.length === 0) break;
    }
    return out;
}

/** Map nested lon/lat coords through a projection ([lon,lat]→[x,y]), dropping null points. */
function projectCoords(coords, projection) {
    if (typeof coords[0] === "number") {
        const p = projection(coords);
        return p ? [p[0], p[1]] : null;
    }
    return coords.map((c) => projectCoords(c, projection)).filter((c) => c !== null);
}

// ── the charter source assay ───────────────────────────────────────────────────────────────────

/**
 * Read the live charter rows into a per-LEA record: the (single) school point if any, the Cities
 * the LEA's rows carry, the enrollment signal, and the human name. A geocoded charter = exactly ONE
 * distinct school point (verified on disk); the City aggregates over the LEA's rows (the address
 * belongs to the LEA, not a single month's row).
 */
export function readCharters(_repoRoot) {
    // `SCI_FEED_CSV` is already an ABSOLUTE path (the named tools→atlas supply), so it is read
    // directly — NOT joined onto `repoRoot` (the feed lives cross-repo in the monorepo).
    const rows = parseCSV(readFileSync(SCI_FEED_CSV, "utf8"));
    const h = rows[0];
    const ix = (name) => h.indexOf(name);
    const iLea = ix("LEA Number");
    const iFlag = ix("Flag");
    const iLat = ix("Latitude");
    const iLon = ix("Longitude");
    const iCity = ix("City");
    const iName = ix("Entity Name");
    const iMult = ix("School Student Multiplier");

    const byLea = new Map();
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if ((row[iFlag] || "").trim().toUpperCase() !== "CHARTER") continue;
        const lea = (row[iLea] || "").trim();
        if (!lea) continue;
        const lat = parseFloat(row[iLat]);
        const lon = parseFloat(row[iLon]);
        const city = (row[iCity] || "").trim().toUpperCase();
        const mult = parseFloat(row[iMult]);
        const e =
            byLea.get(lea) ||
            { lea, point: null, cities: new Set(), name: "", enrollment: null };
        if (Number.isFinite(lat) && Number.isFinite(lon) && !e.point)
            e.point = [lon, lat];
        if (city) e.cities.add(city);
        if (!e.name && (row[iName] || "").trim()) e.name = (row[iName] || "").trim();
        if (e.enrollment == null && Number.isFinite(mult) && mult > 0)
            e.enrollment = mult;
        byLea.set(lea, e);
    }
    return [...byLea.values()].sort((a, b) => a.lea.localeCompare(b.lea));
}

// ── the seed resolution (the county-of-record chain for the point-less) ─────────────────────────

/**
 * Resolve a charter's SEED point (lon/lat) + its source tag, the chain J-FEEDBACK-5 §2 names:
 *   geocoded        → the school point;
 *   point-less      → (i) the city-peer centroid (a geocoded charter in the SAME City),
 *                     (ii) the city→county-of-record centroid (the embedded NC city table),
 *                     (iii) the NC state centroid (the terminal seed).
 * `cityPeers` maps City → [lon,lat][] (the geocoded charters' points by City); `countyCentroid`
 * maps FIPS5 → [lon,lat]; `stateCentroid` is the NC outline centroid.
 */
function resolveSeed(charter, ctx) {
    if (charter.point) return { seed: charter.point, source: "school-point" };
    for (const city of charter.cities) {
        const peers = ctx.cityPeers.get(city);
        if (peers && peers.length) {
            let mx = 0;
            let my = 0;
            for (const p of peers) {
                mx += p[0];
                my += p[1];
            }
            return { seed: [mx / peers.length, my / peers.length], source: "city-peer" };
        }
    }
    for (const city of charter.cities) {
        const fips = CITY_TO_COUNTY_FIPS[city];
        if (fips && ctx.countyCentroid.has(fips))
            return { seed: ctx.countyCentroid.get(fips), source: "county-of-record" };
    }
    return { seed: ctx.stateCentroid, source: "state-centroid" };
}

/** The enrollment-scaled catchment radius (degrees): sqrt-scaled around `ENROLLMENT_REF`, floored +
    capped. The floor guarantees an area-bearing disc; the cap keeps the catchment campus-scale. */
function radiusFor(enrollment) {
    if (!enrollment || enrollment <= 0) return RADIUS_FLOOR_DEG;
    const scaled = RADIUS_FLOOR_DEG * Math.sqrt(enrollment / ENROLLMENT_REF);
    return Math.min(RADIUS_CAP_DEG, Math.max(RADIUS_FLOOR_DEG, scaled));
}

// ── the host-county containment + the catchment build ──────────────────────────────────────────

/** Find the NC county whose polygon contains the seed (point-in-county over the committed
    county set). Returns `{ fips, geom, outer }` or `null` (a seed outside every NC county — the
    seed chain guarantees an NC-interior seed, so `null` only on a malformed source). */
function hostCounty(seed, counties) {
    for (const c of counties) {
        if (pointInGeometry(seed[0], seed[1], c.geom))
            return { fips: c.fips, geom: c.geom, outer: c.outer };
    }
    return null;
}

/**
 * Clamp a catchment vertex INTO the host county: if `p` lies outside the county, walk it along the
 * seed→p ray back toward the seed (a bisection on the seed→p segment) until it lands inside — the
 * catchment stays STAR-SHAPED from the seed, so the snapped ring is a valid simple polygon that
 * CONTAINS the seed and is a SUBSET of the county. The seed is interior by construction (the host is
 * the county the seed sits in), so the inner bisection bound is always inside. This is the
 * subset-SAFETY pass for the rare fractal-coast county where the convex-disc SH clip "bridges" a
 * deep concavity (Carteret / Currituck barrier islands).
 */
function clampIntoCounty(p, seed, hostGeom) {
    if (pointInGeometry(p[0], p[1], hostGeom)) return p;
    // bisect seed (inside) → p (outside) for the boundary, then step a hair inside.
    let lo = 0; // seed end (inside)
    let hi = 1; // p end (outside)
    for (let it = 0; it < 24; it++) {
        const mid = (lo + hi) / 2;
        const x = seed[0] + (p[0] - seed[0]) * mid;
        const y = seed[1] + (p[1] - seed[1]) * mid;
        if (pointInGeometry(x, y, hostGeom)) lo = mid;
        else hi = mid;
    }
    return [
        seed[0] + (p[0] - seed[0]) * lo,
        seed[1] + (p[1] - seed[1]) * lo,
    ];
}

/**
 * Build a charter's heuristic catchment (lon/lat): the enrollment-scaled disc around the seed,
 * clipped to the host county's outer ring. Returns `{ ring, host, radiusDeg }`. Falls back to the
 * raw disc if the clip degenerates (an empty SH result — never happens for an interior seed, but
 * the disc-only floor keeps the bake total: every charter bakes an area-bearing polygon).
 *
 * Two-stage clip: (1) the convex-disc Sutherland–Hodgman against the county's outer ring (the clean
 * county∩disc for the common convex/mildly-concave county); (2) a STAR-SHAPED safety clamp — any
 * surviving vertex still outside the county (the rare fractal-coast bridge artifact) is walked back
 * along its seed→vertex ray onto the boundary, so the committed catchment NEVER bleeds past the
 * county. Both stages keep the seed interior, so the catchment contains the school point.
 */
function buildCatchment(seed, enrollment, counties) {
    const radiusDeg = radiusFor(enrollment);
    const host = hostCounty(seed, counties);
    // A high-segment lon/lat disc (the clip subdivides it further; 96 gives a smooth circle).
    const d = disc(seed[0], seed[1], radiusDeg, 96);
    if (!host) return { ring: d, host: null, radiusDeg };
    const clipped = clipByConvex(host.outer, d);
    // The clip never empties for an interior seed (the seed ∈ county ∩ disc), but guard anyway.
    const base = clipped.length >= 3 ? clipped : d;
    // The star-shaped safety clamp (the fractal-coast non-convex-bridge guard).
    const ring = base.map((p) => clampIntoCounty(p, seed, host.geom));
    return { ring, host, radiusDeg };
}

// ── the NC conic (the SAME projection counties/districts ride) ─────────────────────────────────

function buildNcConic(countyTopo) {
    const states = feature(countyTopo, countyTopo.objects.states);
    const ncOutline = states.features.find((f) => String(f.id ?? "") === NC_FIPS_PREFIX);
    if (!ncOutline) throw new Error("nc-counties.json missing NC outline (id 37)");
    return geoConicConformal()
        .parallels(NC_PARALLELS)
        .rotate([NC_MERIDIAN, 0])
        .fitSize(NC_VIEWPORT, ncOutline);
}

/**
 * The charter ingest: read the live charter rows, resolve each charter's seed + host county, build
 * the buffered-point catchment clipped to the county, and PROJECT every catchment (and its seed)
 * through the NC conic into the SAME plane the counties/districts sit in. Returns a uniform feature
 * set `[{ key, name, geometry (projected), intpt (projected seed), heuristic, seed }]` the bake
 * runs through the SHIPPED `fit`/`smooth` ladder — exactly like any other grain.
 *
 * EVERY one of the 203 charters resolves a real area-bearing polygon: the 161 geocoded from the
 * school-point catchment, the 42 point-less from the city-peer / county-of-record / state-centroid
 * seed chain. NONE is UNSET; NONE is a county-proxy.
 */
export function ingestCharter({ repoRoot }) {
    const charters = readCharters(repoRoot);
    const countyTopo = JSON.parse(readFileSync(join(repoRoot, COUNTY_TOPO), "utf8"));
    const countiesFc = feature(countyTopo, countyTopo.objects.counties);

    // The county set (lon/lat) for point-in-county containment + the county-of-record centroids.
    const counties = countiesFc.features
        .filter((f) => String(f.id ?? "").startsWith(NC_FIPS_PREFIX))
        .map((f) => ({
            fips: String(f.id),
            geom: f.geometry,
            outer: largestOuterRing(f.geometry),
        }));
    const countyCentroid = new Map(
        counties.map((c) => [c.fips, ringCentroid(c.outer)]),
    );

    // The NC outline centroid (the terminal state-centroid seed).
    const states = feature(countyTopo, countyTopo.objects.states);
    const ncOutline = states.features.find((f) => String(f.id ?? "") === NC_FIPS_PREFIX);
    const stateCentroid = ringCentroid(largestOuterRing(ncOutline.geometry));

    // The city-peer table: City → the geocoded charters' points (the point-less seed chain step i).
    const cityPeers = new Map();
    for (const c of charters) {
        if (!c.point) continue;
        for (const city of c.cities) {
            const arr = cityPeers.get(city) || [];
            arr.push(c.point);
            cityPeers.set(city, arr);
        }
    }

    const ctx = { cityPeers, countyCentroid, stateCentroid };
    const conic = buildNcConic(countyTopo);

    return charters.map((c) => {
        const { seed, source } = resolveSeed(c, ctx);
        const { ring, host } = buildCatchment(seed, c.enrollment, counties);
        // Project the catchment ring + the seed into the NC conic plane (the field the
        // counties/districts already sit in — a charter co-registers with the district field).
        const projectedRing = projectCoords([ring], conic); // wrap → Polygon coords
        const projectedSeed = conic(seed);
        return {
            key: c.lea,
            name: c.name || `Charter ${c.lea}`,
            geometry: { type: "Polygon", coordinates: projectedRing },
            // intpt: the projected school/seed point — the map-label anchor AND the point the
            // fidelity gate tests the catchment CONTAINS (the charter's served-school location).
            intpt: projectedSeed ? [projectedSeed[0], projectedSeed[1]] : null,
            heuristic: "buffered-county-clip",
            seed: source,
            hostCountyFips: host ? host.fips : null,
        };
    });
}

// ── the LOD tiers + the registry emit ──────────────────────────────────────────────────────────
//
// A charter catchment is ALREADY a clean disc-derived polygon (a buffered point, county-clipped) —
// NOT a 5,000-vertex coast. So the multi-LOD ladder is a light corner-cut, NOT the heavy
// Visvalingam topology-simplify the state/county/district grains need: the three tiers differ by
// the disc segment budget the catchment is decimated to + the Chaikin pass, matching the
// coarse/med/fine LOD contract `entityGeometry.ts` reads (sm→coarse, md/lg→med, hero→fine). Each
// tier is fit through the SHIPPED aspect-preserving `fitAspect` into the SAME [0,100] box every
// grain emits, so a charter glyph lays out exactly like a state/county/district silhouette.
const CHARTER_TIERS = {
    coarse: { segments: 24, smooth: { kind: "chaikin", iters: 1 } },
    med: { segments: 40, smooth: { kind: "chaikin", iters: 1 } },
    fine: { segments: 72, smooth: { kind: "chaikin", iters: 1 } },
    // icon — the O-A14 coarsest tier (icon-facility §2.4). A charter catchment is already a clean
    // disc-clip, so its icon rung is simply the lightest segment budget (~14 vs coarse's 24) + a
    // Chaikin:2 pass — a friendly presence pebble at 16–24px. Additive-lazy + independent (a stride
    // decimation per tier), so it does NOT perturb the committed coarse/med/fine charter bytes.
    icon: { segments: 14, smooth: { kind: "chaikin", iters: 2 } },
};

/** Uniformly decimate a ring to at most `maxVerts` vertices (stride sample, endpoints kept,
    re-closed). The catchment is convex-ish + dense, so a stride sample is faithful per LOD. */
function decimateRing(ring, maxVerts) {
    if (ring.length <= maxVerts) return ring;
    const stride = Math.ceil(ring.length / maxVerts);
    const out = [];
    for (let i = 0; i < ring.length; i++) if (i % stride === 0) out.push(ring[i]);
    const f = out[0];
    const l = out[out.length - 1];
    if (l[0] !== f[0] || l[1] !== f[1]) out.push([f[0], f[1]]);
    return out;
}

/** A collision-free 3-char charter abbr from the LEA (charter LEAs are short alphanumeric tokens —
    `01B`, `60U` — already ≤3 chars, so the LEA IS the wayfinding label, upper-cased + padded). */
function charterAbbr(lea) {
    return String(lea).toUpperCase().slice(0, 3).padEnd(3, " ").trimEnd();
}

/** Build one committed registry entry for a charter at a tier (the same shape the runtime
    `RegistryEntry` reads, plus the heuristic provenance + seed-source the honesty register surfaces). */
function buildCharterEntry(charter, fit) {
    const entry = {
        d: fit.d,
        name: charter.name,
        viewBox: fit.viewBox,
        aspect: fit.aspect,
        abbr: charterAbbr(charter.key),
        // the heuristic provenance — a DERIVED presence-area, never a true silhouette, never the
        // retired county-proxy; the seed source records HOW coarsely it was derived.
        heuristic: charter.heuristic,
        seed: charter.seed,
    };
    if (charter.intpt) entry.intpt = charter.intpt;
    if (charter.hostCountyFips) entry.host = charter.hostCountyFips;
    return entry;
}

/**
 * Bake the 203 charter catchments into the three LOD registries. Each tier decimates the projected
 * catchment ring to its segment budget, applies a light Chaikin, and fits to [0,100]. The fit seats
 * by the catchment's OWN bbox (a charter has no TIGER source feature — the fidelity is the
 * containment + clip RELATION the gate asserts, not a symmetric-difference vs a source). Idempotent
 * (sorted keys → byte-stable). Returns the per-tier counts.
 */
export function bakeCharters({ repoRoot, outDir, precision = 2 }) {
    const features = ingestCharter({ repoRoot });
    const reports = {};
    for (const [tierName, cfg] of Object.entries(CHARTER_TIERS)) {
        const entries = {};
        for (const f of features) {
            const ring = decimateRing(f.geometry.coordinates[0], cfg.segments);
            const lod = { type: "Polygon", coordinates: [ring] };
            const smoothed = smoothGeometry(lod, cfg.smooth);
            // Seat by the catchment's own bbox (no source frame — the legacy self-centering path),
            // recording the TRUE catchment aspect so the label-mode threshold reads it.
            const srcAspect = aspectOf(smoothed);
            const fit = fitAspect(
                smoothed,
                100,
                precision,
                srcAspect,
                bounds(smoothed.coordinates),
            );
            entries[f.key] = buildCharterEntry(f, fit);
        }
        const sorted = {};
        for (const k of Object.keys(entries).sort()) sorted[k] = entries[k];
        const outPath = resolve(outDir, `nc-charter.${tierName}.json`);
        writeFileSync(outPath, JSON.stringify(sorted) + "\n");
        reports[tierName] = { count: Object.keys(sorted).length, outPath };
    }
    return { features, reports };
}

// ── the bake VALIDATION (the gate's STRUCTURE assertions, run at bake time) ─────────────────────
//
// The j0-glyph-charter-heuristic gate asserts: every catchment CONTAINS its school point, every
// catchment is a SUBSET of its host county, and ALL 203 charter LEAs resolve a real area-bearing
// polygon (none UNSET). We assert these AT BAKE TIME over the projected features (the same plane
// the committed glyph PATHS derive from), failing loud if any relation breaks.
/** The distance from a point to the nearest edge of a ring (projected units). A catchment vertex
    born by the SH clip lands EXACTLY on the host-county edge — so the subset relation is "inside OR
    on the boundary", tested as PIP-true OR within `tol` of the host's outer ring (the ring the clip
    cut against). This catches a genuine bleed (a vertex a real distance OUTSIDE the county) while
    tolerating the float-rounding that puts a clip vertex a sub-pixel hair off the projected edge. */
function distToRing(x, y, ring) {
    let min = Infinity;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const ax = ring[j][0];
        const ay = ring[j][1];
        const bx = ring[i][0];
        const by = ring[i][1];
        const dx = bx - ax;
        const dy = by - ay;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((x - ax) * dx + (y - ay) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + t * dx;
        const py = ay + t * dy;
        const d = Math.hypot(x - px, y - py);
        if (d < min) min = d;
    }
    return min;
}

function validateCharters(features, counties) {
    const countyByFips = new Map(counties.map((c) => [c.fips, c]));
    // The projected plane is the [975,373] NC plate; a sub-pixel tolerance (the clip-vertex
    // boundary-coincidence float floor) is a tiny fraction of that span — far below any real bleed.
    const SUBSET_TOL = 0.5;
    let containFail = 0;
    let subsetFail = 0;
    let emptyFail = 0;
    const seedCounts = {};
    for (const f of features) {
        seedCounts[f.seed] = (seedCounts[f.seed] || 0) + 1;
        const ring = f.geometry.coordinates[0];
        if (!ring || ring.length < 3 || geometryArea(f.geometry) <= 0) {
            emptyFail++;
            continue;
        }
        // (1) the catchment CONTAINS its projected school/seed point.
        if (f.intpt && !pipGeom(f.intpt[0], f.intpt[1], f.geometry)) containFail++;
        // (2) the catchment is a SUBSET of its host county: every catchment vertex sits INSIDE the
        // projected host county OR on its outer-ring boundary (a clip vertex). Built by clipping the
        // county ring with the disc, so this holds by construction; we assert it as the clip
        // relation, boundary-inclusive (a clip vertex on the county edge is a SUBSET point, not a
        // bleed). `host.projOuter` is the largest projected outer ring — the ring the clip cut.
        const host = f.hostCountyFips ? countyByFips.get(f.hostCountyFips) : null;
        if (host) {
            const bleed = ring.some(
                (p) =>
                    !pipGeom(p[0], p[1], host.projGeom) &&
                    distToRing(p[0], p[1], host.projOuter) > SUBSET_TOL,
            );
            if (bleed) subsetFail++;
        }
    }
    return {
        total: features.length,
        containFail,
        subsetFail,
        emptyFail,
        seedCounts,
    };
}

function main() {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(__dirname, "../..");
    const outDir = resolve(repoRoot, "src/data/glyphs");

    console.log("── charter heuristic-polygon bake (J-GLYPH arm b) ─────────────");
    const { features, reports } = bakeCharters({ repoRoot, outDir });

    // Re-derive the projected county set for the subset assertion (the SAME NC conic).
    const countyTopo = JSON.parse(readFileSync(join(repoRoot, COUNTY_TOPO), "utf8"));
    const countiesFc = feature(countyTopo, countyTopo.objects.counties);
    const conic = buildNcConic(countyTopo);
    const counties = countiesFc.features
        .filter((f) => String(f.id ?? "").startsWith(NC_FIPS_PREFIX))
        .map((f) => {
            const projGeom = {
                type: f.geometry.type,
                coordinates: projectCoords(f.geometry.coordinates, conic),
            };
            return {
                fips: String(f.id),
                projGeom,
                // the largest projected outer ring — the ring the lon/lat clip cut against, the
                // boundary the subset relation tolerates a clip vertex landing on.
                projOuter: largestOuterRing(projGeom),
            };
        });

    const v = validateCharters(features, counties);
    const geocoded = v.seedCounts["school-point"] || 0;
    const pointless = v.total - geocoded;
    console.log(
        `  ingested ${v.total} charter LEAs (${geocoded} geocoded · ${pointless} point-less)`,
    );
    console.log(`  seed sources: ${JSON.stringify(v.seedCounts)}`);
    for (const [t, r] of Object.entries(reports))
        console.log(`  [${t}] ${r.count} catchments → ${r.outPath}`);
    console.log(
        `  containment fails ${v.containFail} · subset fails ${v.subsetFail} · empty fails ${v.emptyFail}`,
    );

    if (v.total !== 203)
        throw new Error(`[FAIL-LOUD] expected 203 charter LEAs, got ${v.total}`);
    if (v.emptyFail > 0)
        throw new Error(`[FAIL-LOUD] ${v.emptyFail} charter(s) baked a degenerate/empty polygon`);
    if (v.containFail > 0)
        throw new Error(
            `[FAIL-LOUD] ${v.containFail} charter catchment(s) do NOT contain their school point`,
        );
    if (v.subsetFail > 0)
        throw new Error(
            `[FAIL-LOUD] ${v.subsetFail} charter catchment(s) bleed past their host county`,
        );
    console.log(
        "  ✓ all 203 charters bake a real polygon — each contains its seed + clips to its county.",
    );
    console.log("\n  charter bake complete (idempotent · byte-stable · build-time only).");
}

// Run as a CLI (`node scripts/glyph-pipeline/charter.mjs`); importable as a stage otherwise.
if (import.meta.url === `file://${process.argv[1]}`) main();
