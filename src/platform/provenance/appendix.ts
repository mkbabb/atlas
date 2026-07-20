// platform/provenance/appendix.ts — THE APPENDIX ANCHOR CONTRACT (O-A9b · Q-43 arm b). The per-route
// provenance APPENDIX (`ProvenanceAppendix.vue`) enumerates each item's exact provenance in the route's
// own typography; the inline `ProvenanceBar` cross-links to its appendix row. The two surfaces read ONE
// provenance and NEVER diverge — so the anchor id both derive is ONE source (single-derivation, the vft
// Q-31 in-paper appendix is the sibling precedent) [CH-A H2; ANSWERS Q43].

import type { ResolvedProvenance } from "./provenance-contract.js";

/** THE APPENDIX ANCHOR id — the ONE derivation the inline bar's cross-link (`#…`) and the appendix
    row's `id` both read, so a link ALWAYS resolves to its row and no row is unreachable. A viz id →
    its stable fragment id. */
export function appendixAnchorId(vizId: string): string {
    return `provenance-appendix-${vizId}`;
}

/** Stable figure-side target for the appendix's return link. */
export function plateAnchorId(vizId: string): string {
    return `figure-${vizId}`;
}

/** The appendix disclosure has exactly three public detents. */
export type AppendixDetent = "shut" | "peek" | "full";
export type AppendixDockIntent = "peek" | "expand" | "close" | "toggle";

/** Pure transition law shared by pointer, keyboard, scroll and route integrations. */
export function resolveAppendixDetent(
    current: AppendixDetent,
    intent: AppendixDockIntent,
): AppendixDetent {
    switch (intent) {
        case "peek":
            return current === "shut" ? "peek" : current;
        case "expand":
            return "full";
        case "close":
            return "shut";
        case "toggle":
            return current === "full" ? "shut" : "full";
    }
}

/** One APPENDIX ENTRY — a route item's human TITLE + the RESOLVED provenance the appendix enumerates
    (source · measure · method · vintage · aggregation). The route authors the roster (its own items,
    in its own order); `ProvenanceAppendix` renders each row anchored at `appendixAnchorId(vizId)` so
    the inline `ProvenanceBar` cross-link resolves. */
export interface AppendixEntry {
    /** the item's viz id — the anchor key AND the inline bar's cross-link target. */
    vizId: string;
    /** the item's human title, in the route's own words (the appendix row heading). */
    title: string;
    /** the resolved provenance the row enumerates (the SAME value the inline bar reads). */
    provenance: ResolvedProvenance;
    /** Source ids linked from this appendix record. */
    sourceIds?: readonly string[];
}

/** Declared-roster order is the appendix order, independent of mount or observation timing. */
export function appendixOrdinal(index: number): string {
    if (!Number.isInteger(index) || index < 0) {
        throw new RangeError("Appendix index must be a non-negative integer.");
    }
    return `A.${index + 1}`;
}

/** Resolve a figure number from the route-authored stable-id roster. */
export function figureOrdinalFor(
    figureNos: Readonly<Record<string, number>>,
    vizId: string,
): number {
    const figureNo = figureNos[vizId];
    if (!Number.isInteger(figureNo) || figureNo < 1) {
        throw new Error(`No figure ordinal is declared for "${vizId}".`);
    }
    return figureNo;
}
