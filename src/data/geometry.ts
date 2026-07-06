// platform/data/geometry.ts — the committed geographic constants every state-grain
// dashboard binds its choropleth to (G6 §5.5). The us-atlas `states-albers-10m`
// topology is PRE-projected to a 975×610 viewport (geoAlbersUsa already applied), so
// a consumer draws it with the identity projection — no spherical math. The fill
// join is on zero-padded 2-char FIPS, matching the topology's `f.id` ("06") and the
// loader's `keyField` coercion for state-grain feeds (loadFeed `normalize`).
//
// NC geometry (the SCI map + the ECF district choropleth) is its OWN projection: the
// RAW lon/lat counties topology projected through NC's official Lambert conic
// (`geoConicConformal`, EPSG:32119). One conic drives both the county polygons and the
// school points, so NC renders UPRIGHT and a dot lands on its county by construction
// (M-1, C6). The national states map keeps the Albers-baked file — the national Albers
// is correct at national zoom.
//
// C8.2 / CUT 2 (the bundle stratification): the counties source is the COMMITTED,
// OFFLINE-CROPPED `./nc-counties.json` (~26 KB — the 100 NC counties FIPS 37* + the NC
// outline id "37", arc-subset re-packed by `scripts/crop-nc-topology.mjs`), NOT the full
// `us-atlas/counties-10m.json` (842 KB, 9,869 arcs). The crop is a byte-for-byte
// projection equivalent (the quantization `transform` is preserved), so every NC
// projection below is unchanged — only the eager bundle weight is. us-atlas's national
// counties file leaves the runtime graph entirely; the states-albers file rides the
// async `geo` chunk (the `vite.config.ts` manualChunks split), off the gallery preload.
import statesTopology from "us-atlas/states-albers-10m.json" with { type: "json" };
import countiesTopology from "./nc-counties.json" with { type: "json" };
import { feature } from "topojson-client";
import { geoAlbersUsa, geoConicConformal } from "d3-geo";
import type { GeoProjection } from "d3-geo";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";

/** A choropleth-ready state feature: its FIPS key and the GeoJSON polygon. */
export interface StateFeature {
    /** Zero-padded 2-char FIPS — the canonical join key (us-atlas `f.id`). */
    fips: string;
    feature: Feature<Geometry, { name?: string }>;
    name: string;
}

/** The geometry a state-grain dashboard binds to: the raw topology + a fips lookup. */
export interface StateGeometry {
    topology: Topology;
    features: StateFeature[];
    /** fips → its GeoJSON feature, for an O(1) fill join. */
    byFips: Map<string, StateFeature>;
    /**
     * Project a raw [lon, lat] into the national Albers viewport (975×610) — the SAME
     * Albers the states file was baked at, so a national point dot lands on its state.
     * The single source for the national point projection (GeoPointLayer `"us"` mode
     * consumes this rather than re-declaring the `geoAlbersUsa().scale(1300)` literal).
     * Returns null for a point outside the Albers-USA clip (a bad geocode).
     */
    project: (lonLat: [number, number]) => [number, number] | null;
}

let cached: StateGeometry | null = null;

/** The national Albers the us-atlas *-albers files were pre-projected with (scale 1300, 975×610). */
const NATIONAL_ALBERS: GeoProjection = geoAlbersUsa()
    .scale(1300)
    .translate([975 / 2, 610 / 2]);

function build(): StateGeometry {
    const states = statesTopology.objects.states as GeometryCollection;
    const collection = feature(statesTopology, states) as unknown as {
        features: Feature<Geometry, { name?: string }>[];
    };
    const features: StateFeature[] = collection.features.map((f) => ({
        // us-atlas ids are zero-padded FIPS strings; re-pad defensively against any
        // numeric coercion upstream (the same guard the live Choropleth applies).
        fips: String(f.id ?? "").padStart(2, "0"),
        feature: f,
        name: f.properties?.name ?? "",
    }));
    const byFips = new Map(features.map((sf) => [sf.fips, sf]));
    const project = (lonLat: [number, number]): [number, number] | null =>
        NATIONAL_ALBERS(lonLat) ?? null;
    return { topology: statesTopology as Topology, features, byFips, project };
}

/**
 * Load (and memoize) the state-grain geometry. The topology is a static import, so
 * this is synchronous; the cache spares the topojson `feature()` walk on re-render.
 */
export function loadStateGeometry(): StateGeometry {
    return (cached ??= build());
}

// ── NORTH CAROLINA ──────────────────────────────────────────────────────────
//
// The SCI school-point map + the ECF district choropleth both render over NC, and both
// bind to ONE projection: NC's official Lambert conformal conic (`geoConicConformal`,
// NAD83 / NC, EPSG:32119), re-parameterized to NC's standard parallels (34°20′/36°10′ N)
// and rotated to NC's 79°W central meridian, `.fitSize`d to the plate. The raw lon/lat
// geometry it needs ships in the SAME us-atlas package — `counties-10m.json` carries the
// 100 NC counties (FIPS 37xxx) plus the state outline (id "37"). NC LEAs map ≈1:1 onto
// these counties, so a county polygon IS the district cell.
//
// One conic drives BOTH the county polygons (`.projection`) and the school points
// (`.project`), so NC renders UPRIGHT (a due-north meridian is screen-vertical) and a
// dot lands on its county by construction — no national-Albers pre-bake, no affine crop.
// (The earlier path drew NC through the national `geoAlbersUsa` then cropped with a pure
// `geoIdentity` affine, which cannot undo the national conic's convergence shear at NC's
// longitude — the −10.25° tilt. M-1, C6.)

const NC_FIPS_PREFIX = "37";

// NC's official Lambert conformal conic constants (NAD83 / NC, EPSG:32119).
const NC_PARALLELS: [number, number] = [34 + 20 / 60, 36 + 10 / 60]; // 34°20′ / 36°10′ N
const NC_MERIDIAN = 79; // 79°00′ W → the projection's vertical axis

// The viewport the conic fits into, derived from the UPRIGHT NC bbox: at W=975 the conic
// fits NC to H=373 (aspect ≈2.614), so NC fills the plate edge-to-edge with no dead margin.
/** The viewport the NC conic fits into — NC's own upright ≈2.614:1 aspect. */
export const NC_VIEWPORT: readonly [number, number] = [975, 373];

/** A county cell: its 5-char FIPS, its GeoJSON polygon, its county name. */
export interface CountyFeature {
    /** 5-char FIPS (e.g. "37183" for Wake) — the choropleth join key. */
    fips: string;
    feature: Feature<Geometry, { name?: string }>;
    name: string;
}

/** The NC geometry an SCI/ECF map binds to: the outline, the 100 counties, the crop. */
export interface NcGeometry {
    /** The full counties topology (passed to GeoChoropleth / GeoPointLayer as `topology`). */
    topology: Topology;
    /** The NC state outline feature (id "37"), for an outer stroke / a single basemap path. */
    ncOutline: Feature<Geometry, { name?: string }>;
    /** The 100 NC county features. */
    ncCounties: CountyFeature[];
    /** fips → county, for an O(1) fill join. */
    byFips: Map<string, CountyFeature>;
    /** county name (lower-cased) → fips, for the LEA-name join. */
    fipsByName: Map<string, string>;
    /**
     * NC's Lambert conic, fit to the plate — a choropleth draws the county paths
     * through this directly (the raw lon/lat geometry projects upright into the frame).
     */
    projection: GeoProjection;
    /**
     * Project a raw [lon, lat] into the NC viewport through the SAME conic the county
     * paths use, so a school dot lands on its county by construction. Returns null for a
     * point outside the conic's clip (a bad geocode). This is the GeoPointLayer school-dot map.
     */
    project: (lonLat: [number, number]) => [number, number] | null;
}

let ncCached: NcGeometry | null = null;

function buildNc(): NcGeometry {
    // The committed cropped NC counties JSON imports with a loose inferred shape; pin it
    // to Topology once (the same coercion the state build relies on at its return). The
    // crop keeps the `counties` (FIPS 37*) + `states` (id "37") objects + the source
    // `transform`, so this build is identical to the pre-crop full-US path.
    const topo = countiesTopology as unknown as Topology;
    const counties = topo.objects.counties as GeometryCollection;
    const states = topo.objects.states as GeometryCollection;

    const countyFc = feature(topo, counties) as unknown as {
        features: Feature<Geometry, { name?: string }>[];
    };
    const stateFc = feature(topo, states) as unknown as {
        features: Feature<Geometry, { name?: string }>[];
    };

    const ncCounties: CountyFeature[] = countyFc.features
        .filter((f) => String(f.id ?? "").startsWith(NC_FIPS_PREFIX))
        .map((f) => ({
            fips: String(f.id ?? ""),
            feature: f,
            name: f.properties?.name ?? "",
        }));

    const ncOutline = stateFc.features.find(
        (f) => String(f.id ?? "") === NC_FIPS_PREFIX,
    );
    if (!ncOutline) throw new Error("us-atlas counties topology is missing NC (id 37)");

    const byFips = new Map(ncCounties.map((c) => [c.fips, c]));
    const fipsByName = new Map(ncCounties.map((c) => [c.name.toLowerCase(), c.fips]));

    // ONE projection — NC's Lambert conic, fit to the plate. The county paths draw
    // through it directly; a school [lon, lat] projects through the SAME object, so a
    // dot lands on its county by construction (no national pre-bake, no affine crop).
    const projection: GeoProjection = geoConicConformal()
        .parallels(NC_PARALLELS)
        .rotate([NC_MERIDIAN, 0])
        .fitSize([...NC_VIEWPORT] as [number, number], ncOutline);

    const project = (lonLat: [number, number]): [number, number] | null =>
        projection(lonLat) ?? null;

    return {
        topology: topo,
        ncOutline,
        ncCounties,
        byFips,
        fipsByName,
        projection,
        project,
    };
}

/**
 * Load (and memoize) the NC geometry — the 100 counties, the state outline, and the
 * bbox-cropped projection. Synchronous (the topology is a static import); the cache
 * spares the topojson `feature()` walk + the fitSize solve on re-render.
 */
export function loadNcGeometry(): NcGeometry {
    return (ncCached ??= buildNc());
}

// ── THE LEA NAME-JOIN LAYER MOVED OUT (J-PERF arm d · the geo leak) ──────────────────────
// `leaToCountyFips` / `leaToGeoid` / `geoidAbbr` (the cheap, pure-DATA LEA→county/district NAME
// joins) moved to the TOPOLOGY-FREE `./leaJoin` module. They lived here once, but ANY static
// importer of a join dragged this whole topology-bearing module (the us-atlas states `geo-*.js`
// chunk + the inlined NC-counties arcs) in — so the chrome consumers that touch a join
// (`useViewParams`'s focus county-hop, `entityGeometry`'s county-proxy floor) leaked the map
// topology onto EVERY route's first paint, incl. /demand + the gallery (which draw no map).
// The joins now read their ONE topology-derived datum (the 100 county NAMES) from the committed
// county-glyph registry instead of the polygon topology — zero data duplication. RE-EXPORTED here
// so the legacy `@/platform/data/geometry` import path still resolves for geo components that ALSO
// pull the topology; NEW non-map consumers should import from `@/platform/data/leaJoin` directly so
// they do NOT statically link the topology.
export {
    bareLeaName,
    leaToCountyFips,
    leaToGeoid,
    geoidAbbr,
} from "./leaJoin";
