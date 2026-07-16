// data/schoolPoints.ts — @mkbabb/atlas · THE SCHOOL-POINT SUPPLY loader (O-A14, icon-facility §1 C1).
//
// The bake (`scripts/bake-school-points.mjs`) emits `glyphs/school-points.json` — `schoolCode →
// { point, district, seed }` — where `point` is ALREADY in the school's DISTRICT glyph's normalized
// [0,100] viewBox space (projected through the SAME NC conic + district fit the silhouette bakes
// through). THIS module is the runtime read: the injected `schoolPoint` / `districtOf` resolvers the
// C1 school grain (`resolveEntityIcon`) consumes, so the point-in-district dot seats with NO runtime
// re-projection — the "seat its dot without runtime re-projection" mandate (icon-facility §3.1-2).
//
// LAZY (the eager-floor law, icon-facility §3.3): a memoized dynamic `import()` OFF every route's
// eager closure (a school glyph draws only on a school-bearing surface, never on first paint). The
// sync accessors return null until the memo fills (kicking the load), re-resolving reactively via
// `schoolPointsVersion` — the SAME loading seam `entityGeometry`'s lazy glyph tiers ride.

import { shallowRef } from "vue";

/**
 * A school dot's anchor in its district glyph's normalized viewBox space. Structurally the glyph
 * family's `IconPoint` (`{x,y}`), kept LOCAL so the LEAF data plane takes NO import edge back up to
 * `charts/glyph` (the acyclic-core boundary O-B3 landed) — the injected resolver satisfies the
 * `IconPoint` param structurally at the `resolveEntityIcon` call site.
 */
export interface SchoolDotPoint {
    x: number;
    y: number;
}

/** One baked school-point entry — the dot coordinate, the district context GEOID, the seed source. */
export interface SchoolPointEntry {
    /** The dot anchor `[x,y]` in the district glyph's `[0,100]` viewBox space (bake-projected). */
    point: [number, number];
    /** The school's district GEOID — the context silhouette the C1 point-in-district glyph draws. */
    district: string;
    /** HOW the dot was seated — `"school-point"` (geocoded, inside the district) or the
        `"district-centroid"` fallback (un-geocoded / border-outlier); the honesty register. */
    seed: "school-point" | "district-centroid";
}

type SchoolPointsRegistry = Record<string, SchoolPointEntry>;

let cache: SchoolPointsRegistry | null = null;
let inFlight: Promise<SchoolPointsRegistry> | null = null;

/**
 * THE REACTIVE LOAD VERSION — bumped when the lazy supply resolves. A Vue `computed` that calls the
 * sync accessors (`schoolPoint` / `districtOf`) reads this, so a school glyph that resolved the
 * centroid fallback on the first frame (before the supply landed) RE-RESOLVES to its true point the
 * instant the memo fills — the same reactive seam `entityGeometry.glyphRegistryVersion` provides.
 */
export const schoolPointsVersion = shallowRef(0);

/** Load (or read the memo of) the school-point supply — the ONE dynamic-import edge, deduplicated. A
    consumer that needs a guaranteed-resolved supply (a test, a producer) AWAITS this; the in-render
    resolvers do NOT await — they call the sync accessors + read the memo. */
export async function loadSchoolPoints(): Promise<SchoolPointsRegistry> {
    if (cache) return cache;
    if (inFlight) return inFlight;
    inFlight = import("./glyphs/school-points.json?raw").then((mod) => {
        cache = JSON.parse(mod.default) as SchoolPointsRegistry;
        schoolPointsVersion.value++; // reactive nudge — consumers re-resolve.
        return cache;
    });
    return inFlight;
}

/** Read a school entry synchronously — null until the memo fills (the accessor kicks the lazy load).
    Reads `schoolPointsVersion` so a Vue `computed` calling it re-resolves the instant the supply lands. */
function syncEntry(code: string): SchoolPointEntry | null {
    void schoolPointsVersion.value; // the reactive dependency (the lazy-supply nudge)
    if (cache) return cache[code] ?? null;
    void loadSchoolPoints();
    return null;
}

/**
 * The `schoolPoint` resolver `resolveEntityIcon` injects (the C1 dot anchor) — the school's interior
 * coordinate in its district glyph's viewBox space, or null (un-supplied ⇒ the resolver falls to the
 * district box centre, the `"district-centroid"` seed).
 */
export function schoolPoint(code: string): SchoolDotPoint | null {
    const e = syncEntry(code);
    return e ? { x: e.point[0], y: e.point[1] } : null;
}

/**
 * The `districtOf` resolver `resolveEntityIcon` injects — the school's district GEOID (the context
 * silhouette the C1 glyph outlines), or null (un-supplied ⇒ the resolver tries the id as a district /
 * charter key directly).
 */
export function districtOf(code: string): string | null {
    return syncEntry(code)?.district ?? null;
}

/** The seed provenance for a school (the honesty register) — `"school-point"` (geocoded) vs
    `"district-centroid"` (fallback); null when the school is absent from the supply. */
export function schoolPointSeed(code: string): SchoolPointEntry["seed"] | null {
    return syncEntry(code)?.seed ?? null;
}
