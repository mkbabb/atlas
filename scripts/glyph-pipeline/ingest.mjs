// scripts/glyph-pipeline/ingest.mjs — STAGE 1: the source → GeoJSON FeatureCollection
// in the grain's NATIVE projected plane (the C1 byte-identity contract).
//
// THE LAW (I-GLYPH §1 + the C1 byte-identity gate): each grain is derived from the SAME
// source GeoChoropleth draws, projected through the SAME projection — so a state's AK, a
// county's Wake, and a district's silhouette on the glyph and on the map are ONE source:
//
//   state    — us-atlas/states-albers-10m.json (already a dep), drawn by the choropleth
//              through geoIdentity().reflectY(false) (the file is PRE-projected to 975×610
//              screen space). The glyph reads the SAME pre-projected coordinates: identity.
//   county   — the committed ./nc-counties.json crop (FIPS 37*), drawn through NC's Lambert
//              conformal conic (EPSG:32119), .fitSize'd to the [975,373] plate. The glyph
//              reprojects the SAME raw lon/lat county features through the SAME conic.
//   district — NC_School_Districts_2021.shp (local) OR tl_2023_us_unsd.zip (web:tiger), via
//              ogr2ogr -t_srs EPSG:32119 (the PRIMARY ingest — ogr2ogr is on PATH; mapshaper
//              is ABSENT). The same NC conic the counties use, so a district tiles its county.
//
// ogr2ogr emits NAD83(4269) lon/lat → EPSG:32119 (NC Lambert, metres). d3-geo's
// geoConicConformal with NC's parallels/meridian is the SAME conic family; we reproject the
// state/county lon/lat through d3-geo rather than ogr2ogr so the three grains share ONE
// projection code path and the county glyph is byte-identical to the choropleth's county path.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    geoConicConformal,
    geoConicEqualArea,
    geoCentroid,
    geoIdentity,
} from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);

// NC's official Lambert conformal conic constants (NAD83 / NC, EPSG:32119) — the EXACT
// values geometry.ts:108–110 declares, so the county/district glyph co-registers with the map.
const NC_PARALLELS = [34 + 20 / 60, 36 + 10 / 60];
const NC_MERIDIAN = 79;
export const NC_VIEWPORT = [975, 373];
const NC_FIPS_PREFIX = "37";

// ── The TERRITORY arm (J-GLYPH arm a · subsumes I-GLYPH.a) ───────────────────────────────
// The us-atlas Albers source (`states-albers-10m.json`) the choropleth draws carries ONLY the
// 51 (50 states + DC) — `geoAlbersUsa` INSETS AK/HI but DROPS the 5 territories AS/GU/MP/PR/VI
// (it returns `null` for them, re-verified). The Census state-and-equivalent layer, however,
// DOES carry FIPS 60/66/69/72/78 — and us-atlas's OWN raw lon/lat `states-10m.json` (already a
// committed dep) holds all 56 features. So the territory source is obtainable OFFLINE: read the
// 5 territory features from `states-10m.json` (lon/lat), project each through its OWN local
// equal-area conic to a faithful silhouette, and `fitExtent` it into a small INSET box in the
// SAME 975×610 Albers screen plane the 51 states occupy (the us-atlas AK/HI inset convention).
// The 5 insets sit in the open bottom strip between HI (ends ≈x332) and FL (starts ≈x660), so a
// territory glyph CO-REGISTERS with the 51-state field — ONE plane, the C1 byte-identity
// extended to the territory grain. The 5 features then fold into `ingestState()`'s output and
// ride the SHIPPED topology→simplify→smooth→fit→fidelity ladder UNCHANGED (51→56 keys).
const TERRITORY_FIPS = ["60", "66", "69", "72", "78"];
// Per-territory inset box [x0, y0, x1, y1] in the 975×610 Albers plane — the bottom strip gap.
// Sized to each territory's silhouette span (PR widest, the islands smaller); placed so the
// archipelagos read as distinct iconic insets the way AK/HI do. Equal-area + fitExtent keeps
// each silhouette TRUE within its box (no square-warp — the fit ladder records the real aspect).
const TERRITORY_INSETS = {
    60: [352, 470, 398, 518], // American Samoa
    66: [352, 524, 396, 574], // Guam
    69: [414, 480, 458, 560], // Northern Mariana Islands (tall — the populated S. cluster)
    78: [414, 524, 458, 574], // U.S. Virgin Islands
    72: [474, 522, 560, 572], // Puerto Rico (widest — the strongest silhouette)
};

// CNMI (FIPS 69) is an 8-island chain spanning ~4.7° of latitude (14.1°N→18.8°N) — the northern
// half is a string of TINY uninhabited volcanic specks that the shared-topology toposimplify
// (a global area-weight threshold tuned for continental states) cannot resolve, blowing the
// fidelity gate (a faithful full-chain silhouette is mostly empty sea). The honest ICONIC
// representation — the standard cartographic convention for CNMI on a compact map — is the
// principal POPULATED southern cluster (Saipan / Tinian / Rota, all ≤16.5°N). We keep only those
// rings: a dense, recognizable silhouette that rides the simplify ladder at ~0.2% symDiff (vs
// ~45% for the full chain). NOT a magic drop — the populated-island convention, recorded here.
const MP_PRINCIPAL_LAT_MAX = 16.5;

const LOCAL_SHP =
    "/Users/mkbabb/Documents/My Tableau Repository/Datasources/NC_School_Districts_2021/NC_School_Districts_2021.shp";
// The Census TIGER Unified School Districts layer is published PER STATE (NOT a national
// `tl_2023_us_unsd.zip` — that file does not exist). NC is FIPS 37, so `tl_2023_37_unsd.zip`
// IS the NC district set (118 features) directly — no STATEFP filter needed. The 2023 vintage
// is pinned for CI reproducibility; the `.shp` inside the zip carries GEOID/UNSDLEA/NAME/INTPT.
const TIGER_URL =
    "https://www2.census.gov/geo/tiger/TIGER2023/UNSD/tl_2023_37_unsd.zip";
const TIGER_SHP = "tl_2023_37_unsd.shp";

/** Map nested coordinate arrays through a projection fn ([lon,lat] → [x,y]), filtering null pts. */
function projectCoords(coords, projection) {
    if (typeof coords[0] === "number") {
        const p = projection(coords);
        return p ? [p[0], p[1]] : null;
    }
    return coords
        .map((c) => projectCoords(c, projection))
        .filter((c) => c !== null);
}

/**
 * Project a GeoJSON feature through a d3-geo projection, returning a NEW feature with a
 * projected geometry. We walk the coordinates directly (each projection is callable
 * [lon,lat]→[x,y]) — d3-geo's `geoProject` lives in d3-geo-projection (not a dep), and a
 * direct walk is exact, deterministic, and keeps the vertex IDENTITY the choropleth's
 * path generator produces (the C1 byte-identity contract — no clip/cut/resample).
 */
function project(obj, projection) {
    const geom = obj.geometry ?? obj;
    return {
        type: "Feature",
        geometry: {
            type: geom.type,
            coordinates: projectCoords(geom.coordinates, projection),
        },
    };
}

/**
 * The NC conic, fit to the SAME plate the choropleth fits to (so the county glyph and the
 * map county are byte-identical). Built once from the NC outline feature.
 */
function ncConic(outlineFeature) {
    return geoConicConformal()
        .parallels(NC_PARALLELS)
        .rotate([NC_MERIDIAN, 0])
        .fitSize(NC_VIEWPORT, outlineFeature);
}

/** STATE grain — the pre-projected us-atlas Albers file, read through the identity projection.
 * FOLDS the 5 TERRITORY insets (AS/GU/MP/PR/VI) the Albers source OMITS, so the registry grows
 * 51→56 keys and `stateGlyph("72")` returns Puerto Rico's REAL silhouette (J-GLYPH arm a). */
function ingestState() {
    const topo = JSON.parse(
        readFileSync(require.resolve("us-atlas/states-albers-10m.json"), "utf8"),
    );
    const fc = feature(topo, topo.objects.states);
    // The file is already screen-space (y-down); identity reproject so coordinates are the
    // SAME numbers the choropleth's geoIdentity().reflectY(false) path generator consumes.
    const id = geoIdentity().reflectY(false);
    const states = fc.features.map((f) => {
        const projected = project(f, id);
        return {
            key: String(f.id ?? "").padStart(2, "0"),
            name: f.properties?.name ?? "",
            geometry: projected.geometry,
            // intpt: the projected centroid placeholder (states carry no INTPT in us-atlas).
            intpt: null,
        };
    });
    return [...states, ...ingestTerritories()];
}

/** The mean latitude of a polygon ring (a coarse centroid-lat for the MP island filter). */
function ringMeanLat(ring) {
    let s = 0;
    for (const p of ring) s += p[1];
    return ring.length ? s / ring.length : 0;
}

/**
 * CNMI principal-cluster filter — keep only the MultiPolygon rings whose mean latitude is in the
 * populated southern band (≤ `MP_PRINCIPAL_LAT_MAX` = Saipan/Tinian/Rota). The full 8-island
 * chain spans 4.7° of latitude with a string of tiny uninhabited northern specks the simplify
 * ladder cannot resolve; the southern cluster IS the iconic CNMI silhouette. Returns a NEW
 * feature with the filtered geometry (the source feature is left untouched).
 */
function filterMpPrincipal(f) {
    const coords = f.geometry.coordinates;
    const polys = f.geometry.type === "MultiPolygon" ? coords : [coords];
    const kept = polys.filter((poly) => ringMeanLat(poly[0]) <= MP_PRINCIPAL_LAT_MAX);
    return {
        ...f,
        geometry: { type: "MultiPolygon", coordinates: kept.length ? kept : polys },
    };
}

/**
 * TERRITORY arm — the 5 features (AS/GU/MP/PR/VI) the Albers state source DROPS, sourced from
 * us-atlas's OWN raw lon/lat `states-10m.json` (FIPS 60/66/69/72/78 present there) and placed in
 * inset boxes within the SAME 975×610 Albers screen plane the 51 states occupy. Each territory is
 * projected through its OWN local equal-area conic (a faithful silhouette, NOT a stretched
 * placeholder) then `fitExtent`'d into its inset box. The returned features are screen-space
 * coordinate sets IDENTICAL in shape to what `ingestState()` yields, so the SHIPPED ladder bakes
 * them per-feature exactly as a state (the territories are disconnected islands — no shared arcs
 * with the continental field, so the shared-topology simplify treats each independently).
 */
function ingestTerritories() {
    const topo = JSON.parse(
        readFileSync(require.resolve("us-atlas/states-10m.json"), "utf8"),
    );
    const fc = feature(topo, topo.objects.states);
    return TERRITORY_FIPS.map((fips) => {
        let f = fc.features.find((g) => String(g.id ?? "") === fips);
        if (!f) {
            throw new Error(
                `[territory] states-10m.json missing FIPS ${fips} (source malformed?)`,
            );
        }
        // CNMI: keep only the principal populated southern cluster (the iconic-convention
        // silhouette; the sparse uninhabited northern chain over-divides the simplify budget).
        if (fips === "69") f = filterMpPrincipal(f);
        const box = TERRITORY_INSETS[fips];
        // The local equal-area conic centered on the territory's own centroid — a faithful,
        // undistorted silhouette (the same equal-area family the national Albers uses), fit into
        // the inset box. `fitExtent` projects lon/lat → the box's screen coords directly, so the
        // emitted geometry is already in the 975×610 plane (NO separate reproject walk needed —
        // the projection IS the lon/lat→screen map; we read it back through `geoPath`-free walk).
        const [lon, lat] = geoCentroid(f);
        const proj = geoConicEqualArea()
            .parallels([lat - 2, lat + 2])
            .rotate([-lon, 0])
            .center([0, lat])
            .fitExtent(
                [
                    [box[0], box[1]],
                    [box[2], box[3]],
                ],
                f,
            );
        const projected = project(f, proj);
        return {
            key: fips,
            name: f.properties?.name ?? "",
            geometry: projected.geometry,
            intpt: null,
        };
    });
}

/** COUNTY grain — the committed nc-counties.json crop, reprojected through the SAME NC conic. */
function ingestCounty(repoRoot) {
    const topo = JSON.parse(
        readFileSync(join(repoRoot, "src/data/nc-counties.json"), "utf8"),
    );
    const counties = feature(topo, topo.objects.counties);
    const states = feature(topo, topo.objects.states);
    const ncOutline = states.features.find(
        (f) => String(f.id ?? "") === NC_FIPS_PREFIX,
    );
    if (!ncOutline) throw new Error("nc-counties.json missing NC outline (id 37)");
    const conic = ncConic(ncOutline);
    return counties.features
        .filter((f) => String(f.id ?? "").startsWith(NC_FIPS_PREFIX))
        .map((f) => {
            const projected = project(f, conic);
            return {
                key: String(f.id ?? ""),
                name: f.properties?.name ?? "",
                geometry: projected.geometry,
                intpt: null,
            };
        });
}

/**
 * DISTRICT grain — ogr2ogr the NC school-district boundary (.shp local OR TIGER web) to
 * EPSG:32119 GeoJSON, keyed by GEOID. ogr2ogr does the .shp→GeoJSON read + the metric
 * reproject; we then RE-FIT into the SAME [975,373] plate the counties use (so a district
 * silhouette shares the county's screen frame — the field tiles). The fit uses the NC
 * outline derived from the county crop, so all NC grains share ONE plate.
 */
function ingestDistrict(repoRoot, source) {
    const tmp = mkdtempSync(join(tmpdir(), "glyph-ingest-"));
    const geojsonPath = join(tmp, "districts.geojson");
    try {
        let input;
        const args = ["-f", "GeoJSON", geojsonPath];
        if (source === "web:tiger" || source === "tiger") {
            const zip = join(tmp, TIGER_SHP.replace(".shp", ".zip"));
            execFileSync("curl", ["-fsSL", "-o", zip, TIGER_URL], {
                stdio: ["ignore", "ignore", "inherit"],
            });
            // The per-state NC zip IS the 118 NC districts already — no STATEFP filter. TIGER
            // carries no `LEA` attribute (NC's own join), so districts key on GEOID and the
            // runtime resolver recovers LEA via the crosswalk; the abbr is crosswalk-keyed.
            input = `/vsizip/${zip}/${TIGER_SHP}`;
            args.push(
                input,
                "-select",
                "GEOID,UNSDLEA,NAME,INTPTLAT,INTPTLON",
            );
        } else {
            // local:<path> or bare local
            input =
                source && source.startsWith("local:")
                    ? source.slice("local:".length)
                    : LOCAL_SHP;
            args.push(
                input,
                "-select",
                "GEOID,UNSDLEA,NAME,INTPTLAT,INTPTLON,LEA",
            );
        }
        // ogr2ogr emits NAD83 lon/lat GeoJSON (the .prj is EPSG:4269; -t_srs omitted so we
        // reproject through d3-geo's NC conic below, sharing ONE projection with the counties).
        execFileSync("ogr2ogr", args, { stdio: ["ignore", "ignore", "inherit"] });
        const fc = JSON.parse(readFileSync(geojsonPath, "utf8"));

        // Build the SAME NC conic the counties use (fit to the NC outline from the county crop).
        const countyTopo = JSON.parse(
            readFileSync(join(repoRoot, "src/data/nc-counties.json"), "utf8"),
        );
        const states = feature(countyTopo, countyTopo.objects.states);
        const ncOutline = states.features.find(
            (f) => String(f.id ?? "") === NC_FIPS_PREFIX,
        );
        const conic = ncConic(ncOutline);

        return fc.features.map((f) => {
            const p = f.properties ?? {};
            const projected = project(f, conic);
            const lat = parseFloat(p.INTPTLAT);
            const lon = parseFloat(p.INTPTLON);
            return {
                key: p.GEOID,
                name: p.NAME,
                lea: p.LEA ? String(p.LEA).padStart(3, "0") : null,
                geometry: projected.geometry,
                intpt:
                    Number.isFinite(lon) && Number.isFinite(lat) ? [lon, lat] : null,
            };
        });
    } finally {
        rmSync(tmp, { recursive: true, force: true });
    }
}

/**
 * Ingest one grain into a uniform feature set [{ key, name, geometry (projected), intpt, lea? }].
 * Every grain is in its NATIVE projected plane (states screen-space, NC grains the NC conic),
 * the SAME plane GeoChoropleth draws — the C1 byte-identity contract.
 */
export function ingest(grain, { repoRoot, source } = {}) {
    switch (grain) {
        case "state":
            return ingestState();
        case "county":
            return ingestCounty(repoRoot);
        case "district":
            return ingestDistrict(repoRoot, source ?? "local");
        default:
            throw new Error(`unknown grain "${grain}"`);
    }
}
