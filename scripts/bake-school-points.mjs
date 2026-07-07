// scripts/bake-school-points.mjs — the O-A14 SCHOOL-POINT SUPPLY bake (icon-facility §1 C1 · §3.1-2).
//
// The C1 school glyph is a POINT-IN-DISTRICT composite: the school's district silhouette drawn as a
// faint context outline with a filled tier-dot seated at the school's INTERIOR coordinate. This bake
// emits `src/data/glyphs/school-points.json` — `schoolCode → { point:[x,y], district:GEOID, seed }` —
// where `point` is ALREADY in the district glyph's normalized [0,100] viewBox space, so the runtime
// C1 glyph seats its dot with NO runtime re-projection (the `resolveEntityIcon.schoolPoint` supply).
//
// THE PROJECTION CHAIN (the same the district glyph bakes through, so the dot co-registers with the
// silhouette): the school's lon/lat → the SHARED NC Lambert conic (EPSG:32119, the plane every NC
// grain shares) → the district's aspect-preserving `fitAspect` affine (bbox → [0,100] box). An
// un-geocoded school (or one whose LEA maps to no NC district) falls to its district's `intpt`
// centroid — the `"district-centroid"` seed, the SAME seed-chain honesty the charter grain records.
//
// SOURCE: the tools→atlas SCI feed (the SAME named `SCI_FEED_CSV` handoff `charter.mjs` reads +
// `atlas_data.paths.SCI_FEED_CSV` names) + the committed `lea-to-geoid.json` crosswalk. Build-time
// only (topojson/d3-geo devDeps, off the `src/**` runtime graph). Idempotent (sorted keys → byte-stable).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoConicConformal } from "d3-geo";
import { feature } from "topojson-client";

import { ingest, NC_VIEWPORT } from "./glyph-pipeline/ingest.mjs";
import { fitAspect } from "./glyph-pipeline/fit.mjs";
import { bounds, aspectOf, pointInGeometry } from "./glyph-pipeline/geom.mjs";
import { parseCSV } from "./glyph-pipeline/charter.mjs";
import crosswalk from "../src/data/glyphs/lea-to-geoid.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url)); // .../atlas/scripts
const REPO_ROOT = resolve(__dirname, "..");
const OUT = resolve(REPO_ROOT, "src/data/glyphs/school-points.json");

// NC's official Lambert conformal conic (EPSG:32119) — the EXACT constants `ingest.mjs`/`geometry.ts`
// declare, so a school point co-registers with the district/county field it is projected into.
const NC_PARALLELS = [34 + 20 / 60, 36 + 10 / 60];
const NC_MERIDIAN = 79;
const NC_FIPS_PREFIX = "37";

// The tools→atlas SCI-feed handoff (icon-facility §3.1-3) — env-overridable, sibling-monorepo default,
// mirrored by `atlas_data.paths.SCI_FEED_CSV`. The school lon/lat + LEA + School Code are SEEDED here.
const SCI_FEED_CSV = process.env.SCI_FEED_CSV
    ? resolve(process.env.SCI_FEED_CSV)
    : resolve(__dirname, "../../sci-report/data/SCI Report/2025/SCI Report.csv");

/** Build the SHARED NC conic (fit to the NC outline from the committed county crop — the SAME plane
    every NC grain, incl. the district silhouettes these points seat into, is projected through). */
function buildNcConic() {
    const topo = JSON.parse(
        readFileSync(resolve(REPO_ROOT, "src/data/nc-counties.json"), "utf8"),
    );
    const states = feature(topo, topo.objects.states);
    const ncOutline = states.features.find(
        (f) => String(f.id ?? "") === NC_FIPS_PREFIX,
    );
    if (!ncOutline) throw new Error("nc-counties.json missing NC outline (id 37)");
    return geoConicConformal()
        .parallels(NC_PARALLELS)
        .rotate([NC_MERIDIAN, 0])
        .fitSize(NC_VIEWPORT, ncOutline);
}

/** Round to 2 decimals (the glyph-path precision) — compact + byte-stable. */
const q2 = (n) => Math.round(n * 100) / 100;

/** Parse the viewBox "0 0 W H" → { w, h } (the district glyph box the dot must sit within). */
function viewBoxWH(viewBox) {
    const p = viewBox.trim().split(/\s+/).map(Number);
    return { w: p[2], h: p[3] };
}

function main() {
    const conic = buildNcConic();

    // (1) The per-district source-fit affine (bbox → [0,100]) + the projected centroid fallback. The
    // fit is keyed to the district's SOURCE bbox, so the affine (scale/tx/ty) is IDENTICAL across LOD
    // tiers — a school point in this [0,100] space seats correctly whatever tier the C1 glyph draws.
    const districts = ingest("district", { repoRoot: REPO_ROOT, source: "local" });
    const districtFit = new Map(); // GEOID → { apply, fitted, viewBox, centroid }
    for (const d of districts) {
        const srcBounds = bounds(d.geometry.coordinates);
        const srcAspect = aspectOf(d.geometry);
        const fit = fitAspect(d.geometry, 100, 2, srcAspect, srcBounds);
        const apply = ([sx, sy]) => [sx * fit.scale + fit.tx, sy * fit.scale + fit.ty];
        // The district-centroid fallback: the projected `intpt` label anchor mapped into the box (or
        // the box centre when the district carries no intpt).
        let centroid;
        if (d.intpt) {
            const s = conic(d.intpt);
            centroid = s ? apply(s) : [viewBoxWH(fit.viewBox).w / 2, viewBoxWH(fit.viewBox).h / 2];
        } else {
            centroid = [viewBoxWH(fit.viewBox).w / 2, viewBoxWH(fit.viewBox).h / 2];
        }
        districtFit.set(d.key, {
            apply,
            fitted: fit.fitted,
            viewBox: fit.viewBox,
            centroid: [q2(centroid[0]), q2(centroid[1])],
        });
    }

    // (2) The LEA → GEOID resolver (the committed crosswalk `byLea`, LEA zero-padded to 3; the three
    // LEA-null DoDEA/reservation districts arrive as their GEOID directly).
    const byLea = crosswalk.byLea ?? {};
    const leaToGeoid = (lea) => {
        const k = String(lea).trim();
        if (!k) return null;
        return byLea[k] ?? byLea[k.padStart(3, "0")] ?? (districtFit.has(k) ? k : null);
    };

    // (3) Read the distinct schools (School Code → LEA + lon/lat), dedup keeping the first row that
    // carries a geocode (a School Code recurs across months; one point per school).
    const rows = parseCSV(readFileSync(SCI_FEED_CSV, "utf8"));
    const h = rows[0];
    const ix = (name) => h.indexOf(name);
    const iCode = ix("School Code");
    const iLea = ix("LEA Number");
    const iLat = ix("Latitude");
    const iLon = ix("Longitude");
    const iName = ix("School Name");

    const schools = new Map(); // schoolCode → { lea, point:[lon,lat]|null, name }
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const code = (row[iCode] || "").trim();
        if (!code) continue;
        const lea = (row[iLea] || "").trim();
        const lat = parseFloat(row[iLat]);
        const lon = parseFloat(row[iLon]);
        const e = schools.get(code) || { lea, point: null, name: "" };
        if (!e.lea && lea) e.lea = lea;
        if (!e.point && Number.isFinite(lat) && Number.isFinite(lon)) e.point = [lon, lat];
        if (!e.name && (row[iName] || "").trim()) e.name = (row[iName] || "").trim();
        schools.set(code, e);
    }

    // (4) Seat each school in its district's [0,100] box. Geocoded + inside-box → the real school
    // point (`"school-point"`); un-geocoded, un-districted, or out-of-box → the district centroid
    // (`"district-centroid"`). A school whose LEA maps to no NC district is SKIPPED (the C1 resolver
    // floors it to `unknown` — it has no district context to draw).
    const out = {};
    const stat = { geocoded: 0, centroid: 0, skipped: 0 };
    for (const [code, s] of schools) {
        const geoid = leaToGeoid(s.lea);
        const df = geoid ? districtFit.get(geoid) : null;
        if (!df) {
            stat.skipped++;
            continue;
        }
        const { w, h: vh } = viewBoxWH(df.viewBox);
        let point;
        let seed;
        if (s.point) {
            const screen = conic(s.point);
            const p = screen ? df.apply(screen) : null;
            // Accept a point that lands within the district box (a small margin tolerates a border
            // school the simplified silhouette rounds off); else fall to the centroid.
            if (p && p[0] >= -2 && p[0] <= w + 2 && p[1] >= -2 && p[1] <= vh + 2) {
                point = [q2(Math.min(w, Math.max(0, p[0]))), q2(Math.min(vh, Math.max(0, p[1])))];
                seed = "school-point";
                stat.geocoded++;
            } else {
                point = df.centroid;
                seed = "district-centroid";
                stat.centroid++;
            }
        } else {
            point = df.centroid;
            seed = "district-centroid";
            stat.centroid++;
        }
        out[code] = { point, district: geoid, seed };
    }

    // Sorted keys → byte-stable idempotent emit.
    const sorted = {};
    for (const k of Object.keys(out).sort()) sorted[k] = out[k];
    writeFileSync(OUT, JSON.stringify(sorted) + "\n");

    console.log("── school-point supply bake (O-A14 · C1 point-in-district) ─────");
    console.log(`  ${Object.keys(sorted).length} schools seated → ${OUT}`);
    console.log(
        `  ${stat.geocoded} school-point (geocoded, in-district) · ${stat.centroid} district-centroid ` +
            `fallback · ${stat.skipped} skipped (LEA → no NC district)`,
    );
    console.log("  school-point bake complete (idempotent · byte-stable · build-time only).");
}

main();
