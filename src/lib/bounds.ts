// src/lib/bounds.ts — the LIVE-FEED band-slider domain fold (N.WE1 E1.b · the byte-parallel dedup).
//
// A band slider's [min, max] is derived from the LIVE visible feed, NEVER baked (the v9 stale-
// literal lesson) — the identical Infinity-fold appeared byte-parallel in TWO stores: ecf/store.ts
// `boundsOf` and sci/store/filter.ts `admBounds`. Both walked the scoped rows, skipped the
// null/non-finite, tracked the running min/max, and returned `[floor(lo), ceil(hi)]` — or `[0, 0]`
// when the feed carries no value (the slider then reads inert). This is the ONE fold both call now.

/**
 * The live [min, max] domain over a projection of `rows` — `[Math.floor(min), Math.ceil(max)]`,
 * or `[0, 0]` when no row yields a finite value (the inert-slider floor). Null / non-finite
 * projections are skipped. Pure + generic over the row shape; the callers supply the `valueOf`
 * (ecf: `fundingTotal` / `ecfPerAdm(…)`; sci: `adm`).
 */
export function liveBounds<Row>(
    rows: readonly Row[],
    valueOf: (r: Row) => number | null | undefined,
): [number, number] {
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of rows) {
        const v = valueOf(r);
        if (v == null || !Number.isFinite(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
    }
    return Number.isFinite(lo) && Number.isFinite(hi)
        ? [Math.floor(lo), Math.ceil(hi)]
        : [0, 0];
}
