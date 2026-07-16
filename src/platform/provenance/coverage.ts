// platform/provenance/coverage.ts — THE ALL-ITEMS PROVENANCE-COVERAGE CENSUS (O-A9b · the MECHANISM;
// R-020/CD-10 · R-099/CD-33 the anti-theater assert). Every mounted data mark / figure / story item
// on a route MUST resolve a provenance record; a route with an un-sourced item is INCOMPLETE.
//
// THE DOCTRINE (G-O1): this is the MECHANISM, not the populated result. This module mints the census
// FUNCTION + names the gaps by ID; the per-route CONTENT — every item ACTUALLY sourced, on EVERY route
// — is the WG-D route covers' bar (O-D4/O-D7/O-D28/O-D15/O-D18/O-D20/O-D21 + vft O-D26; tools-side supply
// WG-G), RED-LEDGERED (`all-items-provenance-coverage`) until they land. BAN sentinel-counting: the
// census reads the ACTUAL item roster and NAMES the offenders — never a "N routes declare provenance"
// tally that proves nothing about any mark [CH-A H2; CH-D H1; provenance-surface §2].

import type { ProvenanceFacet } from "./provenance-contract.js";

/** One MOUNTED item the coverage census examines — a data mark / figure / story item identified by its
    stable id, and the provenance FACET it declares (`null` when the item declares none — the un-sourced
    case the census flags). The route supplies its OWN roster (its real mounted items, in its own order). */
export interface CoverageItem {
    /** the mounted item's stable id (viz id / figure id / story-item id). */
    id: string;
    /** the provenance facet the item declares; `null` when it declares none. */
    facet: ProvenanceFacet | null;
}

/** THE COVERAGE VERDICT — the census over a route's mounted items. `complete` iff EVERY item resolves
    a provenance record; `unsourced` NAMES the offending ids (a route with any is INCOMPLETE). The
    verdict is the honest measurement the gate reads — the count is derived, never the assertion. */
export interface CoverageReport {
    /** the total mounted items examined. */
    total: number;
    /** the items that resolved a provenance record. */
    sourced: number;
    /** the ids of items with NO provenance record (empty ⇒ complete). */
    unsourced: string[];
    /** whether EVERY item is sourced (`unsourced.length === 0`). */
    complete: boolean;
}

/** Whether a facet is a REAL provenance record — a non-empty `dataset` is the floor. An item declaring
    `{ dataset: "" }` is as un-sourced as one declaring nothing: the census does NOT accept a blank
    stamp (the honesty fence — a hollow facet cannot pass coverage). */
export function isSourced(facet: ProvenanceFacet | null): boolean {
    return facet != null && facet.dataset.trim().length > 0;
}

/**
 * PURE — the ALL-ITEMS PROVENANCE census (the MECHANISM). Walk the route's mounted item roster;
 * every item must resolve a provenance record, and the verdict NAMES any that do not. A route is
 * INCOMPLETE the moment one item is un-sourced. This is the accountability gate the WG-D route covers
 * are graded against — it proves nothing is silently un-sourced by NAMING the gaps, never by counting
 * declarers. TOTAL: an empty roster is vacuously complete (`total 0`, `complete true`).
 */
export function auditProvenanceCoverage(items: readonly CoverageItem[]): CoverageReport {
    const unsourced = items.filter((it) => !isSourced(it.facet)).map((it) => it.id);
    return {
        total: items.length,
        sourced: items.length - unsourced.length,
        unsourced,
        complete: unsourced.length === 0,
    };
}
