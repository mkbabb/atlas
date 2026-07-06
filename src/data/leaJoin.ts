// platform/data/leaJoin.ts — the TOPOLOGY-FREE LEA name-join layer (the cheap half of the
// former monolithic `geometry.ts`).
//
// THE SPLIT (J-PERF arm d · the geo leak). `geometry.ts` statically imports the us-atlas states
// topology (the async `geo-*.js` chunk) + the inlined NC-counties arcs — the heavy map weight.
// The LEA→county/district NAME joins (`leaToCountyFips`, `leaToGeoid`, `geoidAbbr`) are CHEAP and
// pure-DATA — but they lived in the SAME module, so ANY static importer of a join dragged the WHOLE
// topology in. The two chrome consumers that touched a join (`useViewParams.resolveFocusToGrain`'s
// county hop + `entityGeometry.districtGlyph`'s county-proxy floor) ride the platform chrome /
// shared `charts-host` chunk EVERY route pulls — so /demand (zero geo marks) + the gallery
// parse-blocked the map topology they never draw.
//
// THE FIX. The name joins move HERE, topology-free. The ONE topology-derived datum a join needs is
// the county-name→FIPS table `leaToCountyFips` matches against — and that is just 100 county NAMES,
// NOT the polygon arcs. We read those names from the COMMITTED county-glyph registry
// (`glyphs/nc-county.coarse.json`, FIPS→{name, …}), which `entityGeometry.ts` ALREADY ships and
// which is byte-identical to the topology's county names (the bake derives both from the same TIGER
// source). So the join is decoupled from the polygon geometry with ZERO data duplication: the
// glyph registry IS the single committed name source, and `geometry.ts` (the topology) is reached
// ONLY by components that actually mount a map (the lazy `geo-*.js` chunk now rides only the four
// geo-bearing routes' bodies).

import countyGlyphs from "./glyphs/nc-county.coarse.json" with { type: "json" };
import leaToGeoidCrosswalk from "./glyphs/lea-to-geoid.json" with { type: "json" };

// ── The county name→FIPS table (read from the committed glyph registry, NOT the topology) ──
// The county-glyph registry is FIPS-keyed `{ name, d, abbr, … }`; we invert the name→FIPS half it
// already carries. Lower-cased, matching the `bareLeaName` normalization below. Built once (a 100-
// entry map), memoized — the registry is a static import so this is synchronous + topology-free.
const COUNTY_REGISTRY = countyGlyphs as Record<string, { name?: string }>;
let _fipsByName: Map<string, string> | null = null;
function fipsByCountyName(): Map<string, string> {
    if (_fipsByName) return _fipsByName;
    _fipsByName = new Map(
        Object.entries(COUNTY_REGISTRY).map(([fips, e]) => [
            (e.name ?? "").toLowerCase(),
            fips,
        ]),
    );
    return _fipsByName;
}

// A handful of NC LEAs are city/municipal units that DON'T carry their host county's
// name (the directive's "city LEAs → their county"). The rest collapse by lifting the
// county name out of the LEA string, so this table stays small — only the genuine
// mismatches. (Asheville sits in Buncombe, Hickory in Catawba, and so on.)
const CITY_LEA_TO_COUNTY: Readonly<Record<string, string>> = {
    asheville: "buncombe",
    "asheboro city": "randolph",
    "kannapolis city": "cabarrus",
    "thomasville city": "davidson",
    "lexington city": "davidson",
    "mooresville graded": "iredell",
    "mount airy city": "surry",
    "elkin city": "surry",
    "newton conover": "catawba",
    hickory: "catawba",
    "clinton city": "sampson",
    "whiteville city": "columbus",
    "weldon city": "halifax",
    "roanoke rapids": "halifax",
};

/** Strip the boilerplate an LEA name wraps its county in, leaving the bare locus. */
export function bareLeaName(leaName: string): string {
    return leaName
        .toLowerCase()
        .replace(/\bcounty\b/g, "")
        .replace(/\b(public\s+)?schools?\b/g, "")
        .replace(/\bcity\b/g, "")
        .replace(/\bschool\s+(district|system)\b/g, "")
        .replace(/[^a-z\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Map an LEA (a number or a name) onto its NC county FIPS so an LEA-keyed feed colours
 * county polygons. Most NC LEAs are county-named — "Wake County Schools" → Wake →
 * 37183 — so the bare locus joins the county-name table directly; the city/municipal
 * units that break the pattern route through `CITY_LEA_TO_COUNTY`. A numeric LEA with
 * no name carries no county signal, so it returns null (the caller paints no-data).
 *
 * TOPOLOGY-FREE: the county-name table comes from the committed glyph registry, NOT the
 * map topology — so a chrome consumer (the focus county-hop, the glyph county-proxy floor)
 * does NOT drag `geo-*.js` onto every route's first paint (J-PERF arm d, the geo leak).
 */
export function leaToCountyFips(lea: string | number): string | null {
    const byName = fipsByCountyName();
    const raw = String(lea).trim();
    if (raw === "") return null;

    const bare = bareLeaName(raw);
    if (bare === "") return null;

    // Direct county-name hit (the ≈1:1 common case).
    const direct = byName.get(bare);
    if (direct) return direct;

    // A city/municipal LEA → its host county.
    const host = CITY_LEA_TO_COUNTY[bare];
    if (host) return byName.get(host) ?? null;

    // A leading county token (e.g. "wake county early college") — take the first word
    // that names a county, so a longer programme name still finds its district.
    const first = bare.split(" ")[0];
    return byName.get(first) ?? null;
}

// ── The GEOID↔LEA crosswalk (the geo-glyph DATA SoR — I-DATA-PIPELINE scope 10) ─────────
//
// `leaToCountyFips` paints a county polygon; `leaToGeoid` resolves the TRUE Census school
// district. Both read ONE data layer through two resolvers: the same `bareLeaName`
// normalization, the same `string | number` LEA input. The crosswalk JSON
// (`glyphs/lea-to-geoid.json`, baked by `scripts/bake-crosswalk.mjs` from the NC school
// districts shapefile) maps an LEA Number → its `"37"`+UNSDLEA GEOID for the 115 county/city
// districts, and floors the THREE federal/reservation districts (Camp Lejeune 3700013, Fort
// Bragg 3700014, Eastern Cherokee Reservation 3737099) — which carry NO LEA Number in the
// shapefile — to null so the caller falls to the county-proxy, never silently dropping them.

interface NullLeaEntry {
    geoid: string;
    name: string;
    fallback: string;
}

const CROSSWALK = leaToGeoidCrosswalk as {
    geoidPrefix: string;
    /** bareLeaName → the floored federal/reservation district (geoid resolves to null). */
    nullLea: Record<string, NullLeaEntry>;
    /** LEA Number (zero-padded 3-char) → "37"+UNSDLEA GEOID; or `name:<bare>` for roster-keyed. */
    byLea: Record<string, string>;
    /** GEOID → collision-free 3-char abbr (the I-GLYPH registry reconciles against this). */
    abbr: Record<string, string>;
};

/**
 * Map an LEA (a number or a name) onto its TRUE Census school-district GEOID (`"37"`+UNSDLEA)
 * so the I-GLYPH bake draws the district silhouette. The fast path is the O(1) LEA-Number
 * hit; a name input is normalized through the SAME `bareLeaName` `leaToCountyFips` uses, then
 * checked against the federal/reservation FLOOR (Camp Lejeune / Fort Bragg / Eastern Cherokee
 * Reservation) — those THREE return null EXPLICITLY (the caller falls to `leaToCountyFips`,
 * the county-proxy), never silently dropped. An unmapped LEA returns null (the caller paints
 * no-data / the floor).
 */
export function leaToGeoid(lea: string | number): string | null {
    const raw = String(lea).trim();
    if (raw === "") return null;

    // Fast path — a numeric LEA keyed by its zero-padded 3-char grain ("10" → "010").
    const padded = /^\d+$/.test(raw) ? raw.padStart(3, "0") : raw;
    const direct = CROSSWALK.byLea[padded];
    if (direct) return direct;

    // Otherwise normalize a name through the shared `bareLeaName`.
    const bare = bareLeaName(raw);
    if (bare === "") return null;

    // The THREE federal/reservation districts FLOOR to null (→ county-proxy), not dropped.
    if (CROSSWALK.nullLea[bare]) return null;

    // A roster-keyed district (the TIGER source path that lacks the LEA attribute).
    return CROSSWALK.byLea[`name:${bare}`] ?? null;
}

/** The collision-free 3-char abbr for a GEOID (the I-GLYPH `nc-district.*.json` reconciles). */
export function geoidAbbr(geoid: string): string | null {
    return CROSSWALK.abbr[geoid] ?? null;
}
