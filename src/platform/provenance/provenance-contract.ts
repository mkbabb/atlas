// platform/provenance/provenance-contract.ts — THE PROVENANCE CONTRACT (the declared shape's home).
//
// The oldest unserved declared seam (L7 / CD-10): `provenance` is declared by 6+ vizzes and the
// `VizPlate #provenance` slot exists, yet grep=0 fill it. O-B7 gives the family a first-class home
// and MOVES the declared-provenance shape out of `charts/contract/viz-contract.ts` to HERE — the
// structural birth. This wave births ONLY the CONTRACT (the types); the RENDER primitive
// (`ProvenanceBar.vue` / `ProvenanceChip.vue` / `useProvenance.ts` / `humanizePredicate()`) is the
// NAMED WG-A successor (O-A9 / O-A10), carried on the exec RED-LEDGER `provenance-render` row — the
// INV-F4 half-ship is NOT recreated [src-rearchitecture §A.4; provenance-surface §2/§3; CD-10].
//
// THE THREE-LAYER MODEL (provenance-surface §2.1) the resolved shape fuses — birthed here, RESOLVED
// by WG-A, POPULATED by O-A9b:
//   ResolvedProvenance = STATIC facet (declared here) ⊕ LIVE vintage (freshness.ts + ProvenanceKind,
//   NEVER hand-typed) ⊕ LIVE filter algebra (humanizePredicate off the coordinator's leave-one-out
//   predicate) ⊕ the CURRENT aggregation level ([ANSWERS Q43] — the shape MUST model multi-year/
//   multi-state vs single-year/single-state so the render re-resolves LIVE as the selection narrows).

import type { ReduceOp } from "./aggregate-contract.js";

// ── THE STATIC FACET — the DECLARED provenance a viz authors (lifted from viz-contract) ─────────

/** THE per-viz `provenance` facet: the structured data-provenance lockup + the x-vs-y encoding
    declaration (the forthright-data-analysis principle, J-FEEDBACK-5 §6/§7-C42). The viz DECLARES
    its source truth (`dataset`·`sections`·`attributes`·`analysis`·`yearRange`) + the plain "what is
    measured against what" (`encoding`). LIFTED from `viz-contract.ts` at O-B7 (the shape's home is
    now `provenance/`); the two ADDITIVE fields (`illustrative`/`vintageSource`) are OPTIONAL, so the
    6+ shipped declarers compile byte-unchanged — the deft-modify law [provenance-surface §2.2]. */
export interface ProvenanceFacet {
    /** The source DATASET name (e.g. `"USAC Open Data — FRN Status"`). */
    dataset: string;
    /** The dataset SECTIONS / tables the viz draws from. */
    sections?: string[];
    /** The ATTRIBUTES (columns) the viz reads. */
    attributes?: string[];
    /** The ANALYSIS applied (the transform from source rows to the rendered measure). */
    analysis?: string;
    /** The data YEAR-RANGE the viz spans (e.g. `"2016–2025"`) — the SPAN plotted, NOT the fetch date
        (the vintage is DERIVED off the feed, never declared — provenance-surface §2.1). */
    yearRange?: string;
    /** The x-vs-y encoding declaration — the plain "what is measured against what" (e.g.
        `{ x: "year", y: "net retention" }`). The forthright-data-analysis principle. */
    encoding?: { x: string; y: string };
    /** ADDITIVE [provenance-surface §2.2] — OPT-OUT of the live vintage stamp: an illustrative /
        model viz whose data has no fetch date (vft germination = "Illustrative model, not measured
        data"). Default `false` ⇒ the render reads the active feed's `generatedAt`. The honesty
        fence — a logistic model must NOT wear a false "data as of …" chip. */
    illustrative?: boolean;
    /** ADDITIVE [provenance-surface §2.2] — OVERRIDE the feed the vintage reads (a secondary-source
        plate's `VizContract.sourceId`). Default = the primary feed. Reuses the EXISTING `sourceId`
        seam — no new plumbing. */
    vintageSource?: string;
}

// ── THE RESOLVED SHAPE — what the render reads (birthed here, RESOLVED by WG-A) ──────────────────

/** The vintage leg — the "data as of …" stamp RESOLVED off the active feed (freshness.ts + the route
    `ProvenanceKind` cadence), NEVER hand-typed (provenance-surface §2.3). Birthed here; WG-A's
    `useProvenance` fills it. */
export interface VintageLine {
    /** the human "data as of …" stamp (or "FY2025" when no explicit `generatedAt`). */
    asOf: string;
    /** the cadence word off the route `ProvenanceKind`: seeded → static extract, seeded-on-cycle →
        annual, continually-updated → live. */
    cadence: "static extract" | "annual" | "live";
    /** whether the source is a FROZEN program extract (ECF `extractAsOf`/`frozenAsOf`). */
    frozen: boolean;
}

/** [ANSWERS Q43] THE CURRENT AGGREGATION LEVEL the provenance shape models — year-grain × spatial-
    grain × entity-grain × the active reduce-op (from `aggregate-contract.ts`). The render re-resolves
    this LIVE as the filter/selection narrows ("FY2016–2026 · all states · pooled ×" ⇒ "FY2025 · NC ·
    single district"). B7 births the SHAPE; O-A9b's resolver POPULATES it off O-A11's resolved reduce
    [CH-A H4/H5]. Each grain is `null` when the view carries no such axis (an aspatial or single-item
    viz). */
export interface AggregationLevel {
    /** the YEAR grain aggregated over (e.g. `"FY2016–2026"` multi-year, `"FY2025"` single-year);
        `null` when the viz has no temporal grain. */
    yearGrain: string | null;
    /** the SPATIAL grain (e.g. `"all states"` multi-state, `"NC"` single-state); `null` when aspatial. */
    spatialGrain: string | null;
    /** the ENTITY grain (e.g. `"1,150 districts"` fleet, `"single district"` narrowed); `null` when
        the view has no entity roll-up. */
    entityGrain: string | null;
    /** the active reduce-op folding the members at this level (the AGGREGATE LAW token); `null` when
        nothing is reduced (a single item shows no reduce). */
    reduceOp: ReduceOp | null;
}

/** THE RUNTIME PROVENANCE SHAPE the render reads (provenance-surface §2.5) — the STATIC facet ⊕ the
    LIVE vintage ⊕ the LIVE filter algebra ⊕ the CURRENT aggregation level, fused into one reactive
    value. B7 births the SHAPE; WG-A's `useProvenance(vizId)` RETURNS a `ComputedRef<ResolvedProvenance>`
    (the render is DEFERRED — this wave claims NO render). O-A9b POPULATES `aggregationLevel`. */
export interface ResolvedProvenance {
    // — static leg (from the facet) —
    /** the source dataset name. */
    dataset: string;
    /** the dataset sections / tables. */
    sections: string[];
    /** the attributes (columns) read. */
    attributes: string[];
    /** the analysis applied; `null` when undeclared. */
    analysis: string | null;
    /** the data span plotted; `null` when undeclared. */
    yearRange: string | null;
    /** the x-vs-y encoding; `null` when undeclared. */
    encoding: { x: string; y: string } | null;
    // — vintage leg (freshness ⊕ ProvenanceKind) —
    /** the resolved "data as of …" line; `null` for an `illustrative` viz (no false stamp). */
    vintage: VintageLine | null;
    // — live-filter leg (humanizePredicate off the coordinator's leave-one-out predicate) —
    /** whether a non-identity filter is active for this viz. */
    filterActive: boolean;
    /** the humanized filter clauses (`["receivers only", "year ≥ 2020"]`); `[]` when inert. */
    filterPhrases: string[];
    /** the filtered member count for this viz ("342 of 1,150"); `null` when uncounted. */
    filteredCount: number | null;
    /** the route-declared grain noun ("districts" / "schools" / "hex cells" / "states"). */
    grainNoun: string;
    // — aggregation leg ([ANSWERS Q43]; O-A9b populates) —
    /** the CURRENT aggregation level (re-resolved live on view migration); `null` when the viz is
        un-aggregated. */
    aggregationLevel: AggregationLevel | null;
}
