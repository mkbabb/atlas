// platform/data/entityGeometry.ts — the GLYPH RESOLVER (I4.a). A thin loader BESIDE
// `geometry.ts` that resolves the entity SILHOUETTE every state-, county-, and
// district-grain mark draws through the unified `<Glyph>` facility (DESIGN §3.4). It is
// to the I-GLYPH committed registries what `loadStateGeometry()`/`loadNcGeometry()` are
// to the us-atlas topology: a memoized READ-only view, never a re-bake.
//
// The geometry is DELIVERED by the I-GLYPH wave — the fidelity-first pipeline
// (shapefile → NC conic → topology-preserving toposimplify → aspect-preserving fit →
// committed multi-LOD tiers) emits `glyphs/{us-state,nc-county,nc-district}.{coarse,med,
// fine}.json`, each a `GEOID → entry` map whose entry carries the normalized path `d`,
// the collision-free `abbr`, the human `name`, the `[0,100]`-box `viewBox`, and the TRUE
// `aspect`. THIS module imports that output read-only — ZERO new shapefile, ZERO new dep
// enters here; the `topojson-*` bake tools are the bake's devDeps, off this runtime graph.
//
// J-GLYPH (Decision 1, "NO proxy hacking") RETIRES the county-proxy floor: the CHARTER grain
// (`glyphs/nc-charter.*.json`, the `charter.mjs` buffered-point catchment) resolves a REAL
// heuristic polygon for all 203 charter LEAs via `charterGlyph`, and the THREE LEA-null
// federal/reservation districts (Camp Lejeune `3700013`, Fort Bragg `3700014`, Eastern Cherokee
// `3737099`) ship REAL silhouettes via the direct-GEOID branch — their stale `fallback:"county-proxy"`
// tag is CLEARED (a tag-CLEAR, NOT a re-bake — the silhouettes were always real).
//
// `districtGlyph` returns the TRUE LEA silhouette through the I-DATA-PIPELINE crosswalk
// hierarchy: (1) the `byLea` O(1) LEA→GEOID fast-path / the `leaToGeoid()` spine, (2) a GEOID
// passed directly (the THREE LEA-null districts). The old step-3 county-proxy floor is GONE — no
// grain falls to the dashed county outline; a charter LEA routes through `charterGlyph`, a non-NC /
// junk key returns `null` (the caller paints no-data).
// ── THE LOD-SPLIT IMPORT STRATEGY (J-PERF arm a — "load the geometry only where/when it is drawn") ──
//
// THE EAGER FLOOR. The COARSE + MED tiers of the routinely-drawn grains (us-state, nc-county,
// nc-district) are STATIC imports — they are the cheap first-paint geometry the strip/dot (`sm`→coarse)
// and scatter/legend (`md`/`lg`→med) render-paths resolve SYNCHRONOUSLY in `computed`s with ZERO
// async wait, so the resting figures paint their silhouettes on first frame exactly as before. This is
// the irreducible eager set every geo-bearing route legitimately pays.
//
// THE LAZY TAIL. The HEAVY, not-eagerly-universal tiers move to memoized dynamic `import()` so Rollup
// emits them as on-demand async chunks OFF every route's first-nav static closure (the J-PERF
// per-route budget):
//   • the FINE tier of every grain (us-state.fine 113 KB · nc-county.fine 33 KB · nc-district.fine
//     356 KB raw) — `fine` is the `hero` rung ONLY (the SelectionPreview hero card, drawn on SELECT,
//     never on first paint), so it loads on demand;
//   • the WHOLE charter grain (nc-charter.{coarse,med,fine} ~612 KB raw) — charters are drawn ONLY on
//     a charter-bearing surface; NO live route draws a charter today (the resolver exists for the
//     J-GLYPH facility), so the charter geometry must NEVER sit in a route's eager closure.
// Because `entityGeometry` is pulled by the chrome's `SelectionPreview` on EVERY route, fusing all 12
// registries here statically made every route pay ~343 KB-gz of geometry it never draws (the measured
// per-route-budget breach). The split keeps the eager floor synchronous and defers the rest.
import usStateCoarseJson from "./glyphs/us-state.coarse.json?raw";
import usStateMedJson from "./glyphs/us-state.med.json?raw";
import { countyGlyphRegistry } from "./countyGlyphRegistry.js";
import ncCountyMedJson from "./glyphs/nc-county.med.json?raw";
import ncDistrictCoarseJson from "./glyphs/nc-district.coarse.json?raw";
import ncDistrictMedJson from "./glyphs/nc-district.med.json?raw";
import { shallowRef } from "vue";
// The LEA name-joins are TOPOLOGY-FREE (read from `./leaJoin`, NOT `./geometry`) — so the glyph
// resolver (which the chrome's SelectionPreview pulls on EVERY route) does NOT statically link the
// map topology (the `geo-*.js` chunk), the J-PERF geo-leak bound. Only the `leaToGeoid` true-LEA
// spine is imported now — the county-proxy floor's `leaToCountyFips` is RETIRED (J-GLYPH Decision 1,
// "NO proxy hacking"; the charter grain resolves a real heuristic polygon, no grain floors to county).
import { leaToGeoid } from "./leaJoin.js";

// ── The registry entry shape (the I-GLYPH bake contract) ────────────────────────────────

/** A raw I-GLYPH registry entry: the baked silhouette + identity for one feature. */
interface RegistryEntry {
    /** The SVG path, fitSize-normalized to the entry's own `[0,100]` box (aspect-true). */
    d: string;
    /** The collision-free token (states 2-char USPS; counties/districts 3-char). */
    abbr: string;
    /** The human label (e.g. "California", "Wake County Schools"). */
    name: string;
    /** The entry's own box (e.g. `"0 0 58.38 100"`) — the `<svg viewBox>` the glyph draws. */
    viewBox: string;
    /** The TRUE aspect (width/height) the label-mode `inside↔beside` threshold reads. */
    aspect: number;
    /** RETIRED (J-GLYPH Decision 1 — "NO proxy hacking"). The county-proxy floor is gone: the THREE
     *  LEA-null districts ship real silhouettes (the direct-GEOID branch) with their stale tag
     *  CLEARED, and the charter grain resolves a real heuristic polygon. No live registry entry
     *  carries this now; the field survives only so an OLD committed `fallback:"county-proxy"` tag is
     *  read past (never surfaced) until the next district re-bake strikes it from the JSON. */
    fallback?: string;
    /** CHARTER provenance (J-GLYPH arm b): the heuristic the catchment was derived by
     *  (`"buffered-county-clip"`). PRESENT only on a charter entry — a DERIVED presence-area, NOT a
     *  true administrative silhouette, NOT the retired county-proxy dashed apology. */
    heuristic?: string;
    /** CHARTER seed source (J-GLYPH arm b): HOW coarsely the catchment was seeded —
     *  `"school-point"` (the geocoded 161), or the point-less seed chain
     *  `"city-peer"` / `"county-of-record"` / `"state-centroid"` (the 42). */
    seed?: string;
    // (The bake also carries `intpt`/`fid`/`lea`/`host` per entry — a map-label anchor, the
    // fidelity stamp, the 3-char LEA, and the charter's host county FIPS. The resolver consumes
    // none of them, so they are NOT modeled here; the `as unknown as Registry` boundary cast
    // tolerates them.)
}

type Registry = Record<string, RegistryEntry>;
const parseRegistry = (json: string): Registry => JSON.parse(json) as Registry;

// ── The public GlyphGeom + the size→LOD contract ────────────────────────────────────────

/** A resolved glyph: the silhouette `<path :d>` + identity, plus the proxy tag. */
export interface GlyphGeom {
    /** The feature key (state FIPS / county FIPS5 / district GEOID) — the byte-identity SoR. */
    id: string;
    /** The SVG path, normalized to its own `viewBox` box. */
    d: string;
    /** The collision-free abbreviation (the chrome-ink label). */
    abbr: string;
    /** The human label. */
    name: string;
    /** The `<svg viewBox>` the path fits. */
    viewBox: string;
    /** The TRUE aspect (width/height) — the label-mode threshold reads it. */
    aspect: number;
    /**
     * RETIRED (J-GLYPH Decision 1 — "NO proxy hacking"). The county-proxy floor is gone: NO grain
     * resolves to it now (the THREE LEA-null districts ship real silhouettes with the stale tag
     * CLEARED; the charter grain resolves a real heuristic polygon). The field is kept on the type
     * for the `Glyph.vue` consumer's existing `data-fallback` branch, but the resolvers never SET
     * it — every resolved `GlyphGeom` leaves it UNSET (a true silhouette or a heuristic catchment).
     */
    fallback?: "county-proxy";
    /**
     * CHARTER provenance (J-GLYPH arm b): the heuristic the catchment was derived by
     * (`"buffered-county-clip"`). PRESENT only on a charter glyph — the reader sees the charter's
     * polygon is a DERIVED presence-area (anchored at its served-school point, clipped to its host
     * county), distinct from a true administrative silhouette, but NEVER the rejected county-proxy.
     * UNSET on a true silhouette (state, territory, county, district).
     */
    heuristic?: string;
    /**
     * CHARTER seed source (J-GLYPH arm b): HOW the catchment was seeded — `"school-point"` (the
     * geocoded charters) or the point-less seed chain (`"city-peer"` / `"county-of-record"` /
     * `"state-centroid"`). The honesty register surfaces a coarser seed (a point-less charter reads
     * less precise than a geocoded one). UNSET on a non-charter glyph.
     */
    seed?: string;
}

/** The figure-primacy size rung — drives both the painted scale AND the LOD tier. */
export type GlyphSize = "sm" | "md" | "lg" | "hero";

/** The committed detail tiers — the three fidelity tiers plus the O-A14 `icon` floor (the COARSEST,
 *  ~8–14 verts, for a 16–24px dropdown/inline mark; icon-facility §2.4). `icon` is an additive-LAZY
 *  tier (never in the eager floor) reachable ONLY via the px path (`resolveEntityIcon`'s `pxToLod`
 *  band) — the named `GlyphSize` rungs still map to coarse/med/med/fine (`SIZE_LOD`, unchanged). */
type Lod = "icon" | "coarse" | "med" | "fine";

/**
 * The size→LOD map: a strip/dot-cloud `sm` reads the cheap `coarse` geometry, the scatter
 * `md` / legend `lg` the balanced `med`, and only the `hero` card silhouette pulls the
 * full `fine` tier. So the LOD follows the rung — a ROOT detail policy, not a per-call magic.
 */
const SIZE_LOD: Readonly<Record<GlyphSize, Lod>> = {
    sm: "coarse",
    md: "med",
    lg: "med",
    hero: "fine",
};

/**
 * Resolve a size rung OR a DIRECT tier to a `Lod`. A named `GlyphSize` (`sm`/`md`/`lg`/`hero`) maps
 * through `SIZE_LOD`; a `Lod` token (`icon`/`coarse`/`med`/`fine` — the px-band `resolveEntityIcon`
 * selects via `pxToLod`) passes THROUGH. The two token sets are DISJOINT, so the discriminator is
 * unambiguous — and the `icon` tier stays reachable ONLY through the px path (a named `sm` strip is
 * still the eager `coarse`, never the lazy icon; icon-facility §2.4).
 */
function lodOf(size: GlyphSize | Lod): Lod {
    return size === "icon" || size === "coarse" || size === "med" || size === "fine"
        ? size
        : SIZE_LOD[size];
}

/** A grain label keyed into the registry tables. */
type Grain = "state" | "county" | "district" | "charter";

// ── THE EAGER TIERS (the synchronous first-paint floor) ──────────────────────────────────
// The coarse + med tiers of the routinely-drawn grains, static-imported so the `sm`/`md`/`lg`
// render-paths resolve with NO async wait. `fine` is absent here (it loads lazily, below), and the
// charter grain is wholly absent (it loads lazily too). Pin to `Registry` at the boundary (the same
// coercion `geometry.ts` applies to its topology imports), so callers see one type.
const EAGER_TIERS: Readonly<Record<Grain, Partial<Record<Lod, Registry>>>> = {
    state: {
        coarse: parseRegistry(usStateCoarseJson),
        med: parseRegistry(usStateMedJson),
    },
    county: {
        coarse: countyGlyphRegistry as unknown as Registry,
        med: parseRegistry(ncCountyMedJson),
    },
    district: {
        coarse: parseRegistry(ncDistrictCoarseJson),
        med: parseRegistry(ncDistrictMedJson),
    },
    charter: {}, // the whole charter grain is lazy (drawn on no live route).
};

// ── THE LAZY TIERS (the on-demand tail — memoized dynamic import()) ──────────────────────
//
// The HEAVY tiers (every grain's `fine`, plus the whole charter grain) are loaded by a memoized
// `import()` so Rollup splits them into on-demand chunks OFF every route's eager closure. The
// `LAZY_LOADERS` table is the ONE place the dynamic-import edge is declared per grain×LOD; absence of
// an entry means the tier is eager (resolved from `EAGER_TIERS`). The `import()` specifiers are STATIC
// string literals so Rollup can see + split each registry into its own async chunk.
type Loader = () => Promise<{ default: unknown }>;
const loadRegistry = (load: Promise<{ default: string }>): Promise<{ default: unknown }> =>
    load.then(({ default: json }) => ({ default: parseRegistry(json) }));
// The O-A14 `icon` tier is registered here for EVERY Class-A grain — it is additive-LAZY (a dynamic
// `import()` off every route's eager closure), so the icon facility does NOT grow the eager floor
// (icon-facility §3.3). An icon-scale dropdown/inline mark loads its tier on interaction, re-resolving
// reactively via `glyphRegistryVersion` exactly as the `fine`/charter tiers already do.
const LAZY_LOADERS: Readonly<Partial<Record<Grain, Partial<Record<Lod, Loader>>>>> = {
    state: {
        icon: () => loadRegistry(import("./glyphs/us-state.icon.json?raw")),
        fine: () => loadRegistry(import("./glyphs/us-state.fine.json?raw")),
    },
    county: {
        icon: () => loadRegistry(import("./glyphs/nc-county.icon.json?raw")),
        fine: () => loadRegistry(import("./glyphs/nc-county.fine.json?raw")),
    },
    district: {
        icon: () => loadRegistry(import("./glyphs/nc-district.icon.json?raw")),
        fine: () => loadRegistry(import("./glyphs/nc-district.fine.json?raw")),
    },
    charter: {
        icon: () => loadRegistry(import("./glyphs/nc-charter.icon.json?raw")),
        coarse: () => loadRegistry(import("./glyphs/nc-charter.coarse.json?raw")),
        med: () => loadRegistry(import("./glyphs/nc-charter.med.json?raw")),
        fine: () => loadRegistry(import("./glyphs/nc-charter.fine.json?raw")),
    },
};

// The SYNC cache of LAZY tiers that have already resolved (the eager tiers are never cached here —
// they read straight off `EAGER_TIERS`). Keyed `grain:lod`. A populated entry lets the sync resolvers
// return a lazy tier's geometry on a re-render with NO further await — the memo `loadGlyphRegistry`
// fills.
const lazyCache = new Map<string, Registry>();
// The in-flight loads, deduplicated so a burst of resolver calls for the same tier shares ONE import.
const lazyInFlight = new Map<string, Promise<Registry>>();

/**
 * THE REACTIVE LOAD VERSION — bumped each time a lazy registry resolves into `lazyCache`. The Vue
 * glyph consumers (SelectionPreview's `members` computed, BreakEvenScatter/NetRetentionMap's
 * `geomByFips`) read this inside their `computed`/render so a tier that was not yet loaded on the
 * first resolve (returning the null placeholder → the void-ring) RE-RESOLVES reactively the instant
 * the registry arrives — the same async/loading seam the components already ride for feed data. A
 * `shallowRef` (a plain counter) is the cheapest reactive nudge; no deep tracking is needed.
 */
export const glyphRegistryVersion = shallowRef(0);

/** Read an ALREADY-RESOLVED tier synchronously: the eager floor, or a lazy tier the cache holds.
    Returns null for a not-yet-loaded lazy tier (the caller kicks the load + paints the placeholder). */
function syncTier(grain: Grain, lod: Lod): Registry | null {
    const eager = EAGER_TIERS[grain][lod];
    if (eager) return eager;
    return lazyCache.get(`${grain}:${lod}`) ?? null;
}

/**
 * Load (or read from the memo) a registry tier — the clean lazy-registry seam. The eager tiers
 * resolve instantly; a lazy tier dynamic-imports ONCE (deduplicated via `lazyInFlight`), populates the
 * sync `lazyCache`, and bumps `glyphRegistryVersion` so reactive consumers re-resolve. A consumer that
 * needs a guaranteed-resolved tier (a test census, a producer that wants the silhouette before paint)
 * AWAITS this; the in-render resolvers do NOT await — they call it for its side effect (warm the memo)
 * and read `syncTier`, returning the placeholder until the memo fills.
 */
export async function loadGlyphRegistry(grain: Grain, lod: Lod): Promise<Registry> {
    const eager = EAGER_TIERS[grain][lod];
    if (eager) return eager;
    const key = `${grain}:${lod}`;
    const cached = lazyCache.get(key);
    if (cached) return cached;
    const pending = lazyInFlight.get(key);
    if (pending) return pending;
    const loader = LAZY_LOADERS[grain]?.[lod];
    if (!loader) {
        // No eager tier AND no lazy loader for this grain×LOD — an empty registry (the resolver
        // returns null → the void-ring), never a throw.
        const empty: Registry = {};
        lazyCache.set(key, empty);
        return empty;
    }
    const load = loader().then((mod) => {
        const registry = mod.default as unknown as Registry;
        lazyCache.set(key, registry);
        lazyInFlight.delete(key);
        glyphRegistryVersion.value++; // reactive nudge — consumers re-resolve.
        return registry;
    });
    lazyInFlight.set(key, load);
    return load;
}

// ── The memo (the `loadStateGeometry()` idiom) ──────────────────────────────────────────
//
// Each grain×LOD registry is a static import already resident in the module graph, so the
// registry lookup is O(1). The memo that earns its keep — the analogue of `geometry.ts`
// caching its `feature()` walk — is the `RegistryEntry → GlyphGeom` projection: a
// re-render of the SAME mark reuses the prior `GlyphGeom` object (stable identity for the
// downstream `:key`) rather than re-allocating. Keyed by `grain:lod:id`.

const geomCache = new Map<string, GlyphGeom>();

/** Lift a registry entry into the public `GlyphGeom` (memoized per `grain:lod:id`),
 *  threading the resolved `id` + (for a charter) the heuristic provenance. */
function toGeom(grain: string, lod: Lod, id: string, entry: RegistryEntry): GlyphGeom {
    const cacheKey = `${grain}:${lod}:${id}`;
    const hit = geomCache.get(cacheKey);
    if (hit) return hit;
    const geom: GlyphGeom = {
        id,
        d: entry.d,
        abbr: entry.abbr,
        name: entry.name,
        viewBox: entry.viewBox,
        aspect: entry.aspect,
    };
    // The STALE county-proxy tag-carry is CLEARED (J-GLYPH Decision 1 — "NO proxy hacking"). The
    // THREE LEA-null DoDEA/reservation districts (Camp Lejeune `3700013`, Fort Bragg `3700014`,
    // Eastern Cherokee `3737099`) ALREADY ship distinct REAL silhouettes via the direct-GEOID
    // branch below — they merely carried a stale `fallback:"county-proxy"` TAG. This resolver no
    // longer surfaces that tag (the silhouettes are unchanged — a tag-CLEAR, not a re-bake), so the
    // three return `fallback` UNSET, like every other true silhouette.
    //
    // The CHARTER provenance IS threaded: a charter glyph carries its `heuristic` + `seed` source so
    // the honesty register reads "derived presence-area" (a real polygon, NOT the dashed apology).
    if (entry.heuristic) geom.heuristic = entry.heuristic;
    if (entry.seed) geom.seed = entry.seed;
    geomCache.set(cacheKey, geom);
    return geom;
}

// ── The grain resolvers ─────────────────────────────────────────────────────────────────

/**
 * The state silhouette for a 2-char FIPS (`"06"` → California's `d` + `"CA"`). Returns
 * `null` for an out-of-registry key (a territory absent from some feed frame — the caller
 * paints no-data). The default `size` is the scatter-grain `md`.
 */
export function stateGlyph(fips: string, size: GlyphSize | Lod = "md"): GlyphGeom | null {
    const lod = lodOf(size);
    const key = String(fips).padStart(2, "0");
    const registry = syncTier("state", lod);
    if (!registry) {
        void loadGlyphRegistry("state", lod); // warm the memo; re-resolves on `glyphRegistryVersion`.
        return null;
    }
    const entry = registry[key];
    return entry ? toGeom("state", lod, key, entry) : null;
}

/**
 * The county silhouette for a 5-char NC FIPS (`"37183"` → Wake County). Returns `null`
 * for an out-of-registry key. The county grain is never a proxy — it IS the true cell.
 */
export function countyGlyph(fips5: string, size: GlyphSize | Lod = "md"): GlyphGeom | null {
    const lod = lodOf(size);
    const key = String(fips5);
    const registry = syncTier("county", lod);
    if (!registry) {
        void loadGlyphRegistry("county", lod); // warm the memo; re-resolves on `glyphRegistryVersion`.
        return null;
    }
    const entry = registry[key];
    return entry ? toGeom("county", lod, key, entry) : null;
}

/**
 * The TRUE LEA silhouette for a district key, resolved through the I-DATA-PIPELINE
 * crosswalk hierarchy — the county-proxy FLOOR RETIRED (J-GLYPH Decision 1, "NO proxy hacking"):
 *
 *   1. the `leaToGeoid()` spine (a numeric LEA hits the `byLea` O(1) fast-path inside it,
 *      a name normalizes through the shared `bareLeaName`) → the district registry's TRUE
 *      silhouette (`fallback` UNSET);
 *   2. a GEOID passed directly (the THREE LEA-null DoDEA/reservation districts arrive as
 *      `3700013`/`3700014`/`3737099`, which a pure-`LEA` join silently drops) → the registry's
 *      GEOID-keyed entry, which is the district's TRUE silhouette (the stale `county-proxy` TAG is
 *      CLEARED in `toGeom` — these three were always real silhouettes, never an actual proxy).
 *
 * The old step-3 county-proxy floor (`leaToCountyFips → countyGlyph`, tagged `"county-proxy"`) is
 * GONE: every NC district resolves a real silhouette through (1)/(2), the charter grain resolves its
 * own heuristic polygon via `charterGlyph`, and no grain falls to the dashed county outline. Returns
 * `null` only for a key that resolves to no district GEOID (a charter LEA — route it through
 * `charterGlyph` — or a non-NC / junk input; the caller paints no-data).
 */
export function districtGlyph(
    leaNumber: string | number,
    size: GlyphSize | Lod = "md",
): GlyphGeom | null {
    const lod = lodOf(size);
    const registry = syncTier("district", lod);
    if (!registry) {
        void loadGlyphRegistry("district", lod); // warm the memo; re-resolves on `glyphRegistryVersion`.
        return null;
    }

    // (1) The crosswalk spine — the `byLea` O(1) fast-path + the `bareLeaName` name join
    // both live inside `leaToGeoid()`. A true-LEA GEOID lands the TRUE silhouette; the
    // registry entry for a mapped district carries NO `fallback` (true-resolved).
    const geoid = leaToGeoid(leaNumber);
    if (geoid) {
        const entry = registry[geoid];
        if (entry) return toGeom("district", lod, geoid, entry);
    }

    // (2) A GEOID passed directly — the THREE LEA-null DoDEA/reservation districts arrive
    // as their `37…` GEOID (their `LEA` field is NULL, so `leaToGeoid` floors them to
    // `null`). The registry is GEOID-keyed and ships these three with their TRUE silhouette;
    // `toGeom` no longer surfaces the stale `county-proxy` tag, so they resolve `fallback` UNSET.
    const directKey = String(leaNumber);
    const direct = registry[directKey];
    if (direct) return toGeom("district", lod, directKey, direct);

    // (county-proxy floor RETIRED — Decision 1). A district key that resolves to neither a true-LEA
    // GEOID nor a direct GEOID is not an NC district; return `null` (the caller paints no-data, or
    // routes a charter LEA through `charterGlyph`). NO grain floors to the dashed county outline.
    return null;
}

/**
 * The CHARTER heuristic polygon for a charter LEA (J-GLYPH arm b — the headline NO-proxy arm). A
 * charter has NO administrative district boundary, so the I-GLYPH resolver FLOORED it onto the
 * rejected `county-proxy`. This arm RETIRES that crutch: every one of the 203 distinct charter LEAs
 * resolves a REAL heuristic polygon — the buffered-point catchment the `charter.mjs` bake derives
 * from the charter's served-school point, clipped to its host county (the 161 geocoded), or the
 * county-of-record / city-peer / state-centroid seed chain (the 42 point-less). The resolved
 * `GlyphGeom` carries the `heuristic` + `seed` provenance (a DERIVED presence-area) and leaves
 * `fallback` UNSET — NOT a county-proxy, NOT UNSET. Keyed directly on the SCI charter LEA (a
 * keyspace DISJOINT from the numeric district LEAs). Returns `null` only for a key absent from the
 * charter registry (a non-charter / junk input — the caller paints no-data).
 */
export function charterGlyph(
    leaNumber: string | number,
    size: GlyphSize | Lod = "md",
): GlyphGeom | null {
    const lod = lodOf(size);
    const key = String(leaNumber).trim().toUpperCase();
    const registry = syncTier("charter", lod);
    if (!registry) {
        void loadGlyphRegistry("charter", lod); // warm the memo; re-resolves on `glyphRegistryVersion`.
        return null;
    }
    const entry = registry[key];
    return entry ? toGeom("charter", lod, key, entry) : null;
}
