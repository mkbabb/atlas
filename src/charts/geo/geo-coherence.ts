// src/platform/charts/geo-coherence.ts — THE (TOPOLOGY,PROJECTION,VIEWPORT) COHERENCE PREDICATE.
//
// The pure `isCoherent` predicate the GeoChoropleth DEV-coherence backstop reuses, severed DOWN out
// of `k0-geo-coherence.gate` (L2-GATES §4.A, SEVER-FIRST): production (`GeoChoropleth.vue`'s
// `import.meta.env.DEV` branch) must not reach UP into a test gate. The gate KEEPS the AUDIT
// (`runGeoCoherenceGate`, `GEO_CONSUMERS`, the roster guard, the CLEAN/NEG fixtures) and re-imports
// `isCoherent` + `GeoCoherenceSample` DOWN from here — one predicate, read by both the live chart
// backstop AND the gate (no drift).

/** The viewport the projection paints into (the `[0..WIDTH, 0..HEIGHT]` box). */
export interface Viewport {
    width: number;
    height: number;
}

/** The projected UNION bounds of the WHOLE feature collection (NOT features[0]) for one consumer. */
export interface GeoCoherenceSample {
    consumer: string;
    viewport: Viewport;
    /** the projected union centroid `[x, y]` (must land inside the viewport). */
    unionCentroid: [number, number];
    /** the projected union bbox `[minX, minY, maxX, maxY]`. */
    unionBBox: [number, number, number, number];
}

/** The sane viewport-span band: the projected union must fill a fraction in `[MIN, MAX]` of the
    SMALLER viewport dimension. The band is DELIBERATELY wide (the hex slivers fill a small UNION too,
    but their COLLECTION union spans the state) — it catches a 10× scale blow-out or a pinhole
    collapse, not a tasteful inset. */
export const COHERENCE_SPAN_MIN = 0.2;
export const COHERENCE_SPAN_MAX = 1.5;

/** Is one consumer's projected union coherent with its viewport? */
export function isCoherent(s: GeoCoherenceSample): boolean {
    const [cx, cy] = s.unionCentroid;
    const inside = cx >= 0 && cx <= s.viewport.width && cy >= 0 && cy <= s.viewport.height;
    const [minX, minY, maxX, maxY] = s.unionBBox;
    const spanX = (maxX - minX) / s.viewport.width;
    const spanY = (maxY - minY) / s.viewport.height;
    const spanOk =
        spanX >= COHERENCE_SPAN_MIN &&
        spanX <= COHERENCE_SPAN_MAX &&
        spanY >= COHERENCE_SPAN_MIN &&
        spanY <= COHERENCE_SPAN_MAX;
    return inside && spanOk;
}
