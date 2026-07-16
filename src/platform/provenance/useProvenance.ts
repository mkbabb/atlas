// platform/provenance/useProvenance.ts — THE RESOLVER: static facet ⊕ live vintage ⊕ live algebra
// → `ResolvedProvenance` (provenance-surface §2.1, §2.5; the O-A9 render family).
//
// A rendered provenance block is the fusion of THREE sources, only the first hand-authored:
//   ResolvedProvenance
//    = STATIC facet   (the viz-declared `ProvenanceFacet`: what data · from where · the transform)
//    ⊕ LIVE vintage   (freshness.ts + FeedMeta.generatedAt + the route `ProvenanceKind` — NEVER hand-typed)
//    ⊕ LIVE algebra   (`humanizePredicate` off the coordinator's resolved predicate for THIS viz)
//
// The load-bearing law (provenance-surface §2.3): the vintage is NEVER a string a contract types. It
// is read off the active feed's `generatedAt` (or `extractAsOf`/`frozenAsOf` for a frozen program),
// so a facet cannot drift from the feed. `illustrative:true` opts OUT (a logistic model wears no false
// "data as of …" stamp — the honesty fence).
//
// THE PURE-CORE PATTERN (mirrors `createVizContext`): `resolveVintage` + `resolveProvenance` are pure,
// TOTAL, framework-store-free (fixture-testable off plain getters); `useProvenance` is the thin Vue
// shell that wires the shared stores (`useFreshness`) + the route-supplied algebra source into them.
// O-A9b's aggregation-aware resolver POPULATES `aggregationLevel` through this SAME seam [CH-A H1/H4].

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import type { Predicate } from "../../filter/engine/predicate.js";
import { isIdentity } from "../../filter/engine/predicate.js";
import { useFreshness } from "../chrome/freshness.js";
import type { ProvenanceKind } from "../../contract/types.js";
import {
    humanizePredicate,
    IDENTITY_DIM_LABELS,
    type DimLabels,
} from "./predicate-prose.js";
import type {
    AggregationLevel,
    ProvenanceFacet,
    ResolvedProvenance,
    VintageLine,
} from "./provenance-contract.js";

/** The cadence word off the route `ProvenanceKind` (the vintage leg's second field). `seeded` is a
    frozen static extract; `seeded-on-cycle` the annual pipeline; `continually-updated` the live feed. */
export function cadenceOf(kind: ProvenanceKind): VintageLine["cadence"] {
    switch (kind) {
        case "seeded":
            return "static extract";
        case "seeded-on-cycle":
            return "annual";
        case "continually-updated":
            return "live";
    }
}

/** The reactive/resolved inputs the vintage leg reads — the active feed's freshness label, the route
    cadence enum, and whether the source is a FROZEN program extract. Every field is already-resolved
    (a getter's value), so the fn is pure. */
export interface VintageInputs {
    /** the freshness "data as of …" label (`useFreshness().label`); `""` before the feed lands. */
    asOfLabel: string;
    /** the route cadence enum (drives the cadence word). */
    kind: ProvenanceKind;
    /** whether the source is a frozen program extract (ECF `extractAsOf`/`frozenAsOf`). */
    frozen: boolean;
}

/** PURE — resolve the vintage leg. `illustrative` ⇒ `null` (no false stamp); an empty label (feed not
    yet landed) ⇒ `null` (the bar's METHOD rung shows analysis·span only until the stamp resolves). */
export function resolveVintage(
    facet: ProvenanceFacet,
    v: VintageInputs,
): VintageLine | null {
    if (facet.illustrative) return null;
    if (!v.asOfLabel) return null;
    return { asOf: v.asOfLabel, cadence: cadenceOf(v.kind), frozen: v.frozen };
}

/** The LIVE-algebra + aggregation inputs the resolver fuses (already-resolved values). The filter leg
    is the coordinator's resolved predicate for THIS client (leave-one-out for the Bar/Chip, global for
    the AlgebraReadout — differ ONLY by the client the caller passed to `selection.resolved`). */
export interface AlgebraInputs<Row = unknown> {
    /** the resolved predicate DATA for this client (`selection.resolved(vizId)()`); `null` at rest. */
    predicate: Predicate<Row> | null;
    /** the route dim/value dictionary (identity when a route has authored none). */
    labels: DimLabels;
    /** the filtered member count for this viz ("342 of 1,150"); `null` when uncounted. */
    filteredCount: number | null;
    /** the route-declared grain noun ("districts" / "schools" / "hex cells" / "states"). */
    grainNoun: string;
    /** [ANSWERS Q43] the CURRENT aggregation level (O-A9b populates); `null` when un-aggregated. */
    aggregationLevel: AggregationLevel | null;
}

/**
 * PURE — fuse the static facet ⊕ the live vintage ⊕ the live algebra into `ResolvedProvenance`. TOTAL:
 * the undeclared static fields collapse to `[]`/`null`; the filter leg self-gates on the identity
 * predicate (`filterActive:false`, `filterPhrases:[]`) so the render shows no dead "0 filters" rung.
 */
export function resolveProvenance<Row = unknown>(
    facet: ProvenanceFacet,
    vintage: VintageLine | null,
    algebra: AlgebraInputs<Row>,
): ResolvedProvenance {
    const active = !isIdentity(algebra.predicate);
    const filterPhrases = active
        ? humanizePredicate(algebra.predicate, algebra.labels)
        : [];
    return {
        // — static leg —
        dataset: facet.dataset,
        sections: facet.sections ?? [],
        attributes: facet.attributes ?? [],
        analysis: facet.analysis ?? null,
        yearRange: facet.yearRange ?? null,
        encoding: facet.encoding ?? null,
        // — vintage leg —
        vintage,
        // — live-filter leg —
        filterActive: active,
        filterPhrases,
        filteredCount: active ? algebra.filteredCount : null,
        grainNoun: algebra.grainNoun,
        // — aggregation leg ([ANSWERS Q43]; O-A9b populates via `algebra.aggregationLevel`) —
        aggregationLevel: algebra.aggregationLevel,
    };
}

/** The route-supplied reactive seams `useProvenance` reads beyond the shared freshness store. The
    predicate/labels/count/grain legs vary by ROUTE (the coordinator is per-route, `createCoordinator`,
    exposing no shared singleton) so the route threads them in; every seam DEFAULTS to inert, so a
    plate on a filterless route resolves an honest static-only block with no wiring. */
export interface ProvenanceSources<Row = unknown> {
    /** the route cadence enum (default `seeded-on-cycle` — the annual atlas products). */
    kind?: MaybeRefOrGetter<ProvenanceKind>;
    /** whether the source is a frozen program extract (default `false`). */
    frozen?: MaybeRefOrGetter<boolean>;
    /** the coordinator's resolved predicate for this client — leave-one-out `resolved(vizId)` for the
        Bar/Chip, global `resolved()` for the AlgebraReadout (default `null` ⇒ identity, no filter rung). */
    predicate?: MaybeRefOrGetter<Predicate<Row> | null>;
    /** the route dim/value dictionary (default identity — every token passes through). */
    labels?: MaybeRefOrGetter<DimLabels>;
    /** the filtered member count for this viz (default `null`). */
    filteredCount?: MaybeRefOrGetter<number | null>;
    /** the route-declared grain noun (default `"items"`). */
    grainNoun?: MaybeRefOrGetter<string>;
    /** [ANSWERS Q43] the current aggregation level (O-A9b supplies; default `null`). */
    aggregationLevel?: MaybeRefOrGetter<AggregationLevel | null>;
}

/**
 * `useProvenance(vizId, facet, sources?)` — the render's ONE reactive read. Fuses the STATIC facet ⊕
 * the LIVE vintage (via `useFreshness`) ⊕ the LIVE algebra (route-supplied predicate → `humanizePredicate`)
 * into a `ComputedRef<ResolvedProvenance>`, reactive on the feed, the route cadence, and the filter
 * algebra. Must be called in a component setup (it touches the freshness store).
 *
 * READ-ONLY — it subscribes to the freshness store + the route seams and writes NOTHING (every
 * single-writer gate holds; the resolver is a pure fold over reactive reads).
 */
export function useProvenance<Row = unknown>(
    vizId: string,
    facet: MaybeRefOrGetter<ProvenanceFacet>,
    sources: ProvenanceSources<Row> = {},
): ComputedRef<ResolvedProvenance> {
    // `vizId` is the reactive KEY the render re-binds on (the coordinator threads it into `resolved`);
    // it is carried by the caller's `sources.predicate` getter, so no read is needed here beyond docs.
    void vizId;
    const freshness = useFreshness();
    return computed<ResolvedProvenance>(() => {
        const f = toValue(facet);
        const vintage = resolveVintage(f, {
            asOfLabel: freshness.label.value,
            kind: toValue(sources.kind) ?? "seeded-on-cycle",
            frozen: toValue(sources.frozen) ?? false,
        });
        return resolveProvenance<Row>(f, vintage, {
            predicate: (toValue(sources.predicate) as Predicate<Row> | null) ?? null,
            labels: toValue(sources.labels) ?? IDENTITY_DIM_LABELS,
            filteredCount: toValue(sources.filteredCount) ?? null,
            grainNoun: toValue(sources.grainNoun) ?? "items",
            aggregationLevel: toValue(sources.aggregationLevel) ?? null,
        });
    });
}
