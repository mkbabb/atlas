// platform/provenance/provenance-lines.ts — THE READER-LINE DERIVATIONS (O-A9b). The inline
// `ProvenanceBar` and the per-route `ProvenanceAppendix` render the SAME five rungs off a
// `ResolvedProvenance`; deriving each line in ONE pure place is the single-derivation law that keeps
// the two surfaces "reading ONE provenance and never diverging" [ANSWERS Q43; provenance-surface §2.4].
//
// PURE — no store, no DOM. Each fn maps a resolved shape to the rung's reader string(s); the render
// owns only the join separator + the present-when-active gates.

import type { ResolvedProvenance } from "./provenance-contract";

/** SOURCE — dataset · sections (the always-present static head). */
export function sourceLine(p: ResolvedProvenance): string {
    return p.sections.length ? `${p.dataset} · ${p.sections.join(" · ")}` : p.dataset;
}

/** MEASURE — the forthright x-vs-y encoding ("net retention vs year"); `null` when undeclared. */
export function measureLine(p: ResolvedProvenance): string | null {
    const e = p.encoding;
    return e ? `${e.y} vs ${e.x}` : null;
}

/** METHOD — analysis · yearRange · vintage (the transform + span + the derived "data as of …"). */
export function methodParts(p: ResolvedProvenance): string[] {
    const parts: string[] = [];
    if (p.analysis) parts.push(p.analysis);
    if (p.yearRange) parts.push(p.yearRange);
    if (p.vintage) parts.push(p.vintage.asOf);
    return parts;
}

/** SCOPE — the live aggregation level ([ANSWERS Q43]) as its non-null grains + reduce-op, joined by
    the render. `[]` when the viz is un-aggregated (no SCOPE rung). Re-derives as the level re-resolves. */
export function scopeParts(p: ResolvedProvenance): string[] {
    const a = p.aggregationLevel;
    if (!a) return [];
    return [a.yearGrain, a.spatialGrain, a.entityGrain, a.reduceOp].filter(
        (g): g is string => g != null,
    );
}

/** FILTER — the humanized algebra + count, as ONE reader line; `null` when no filter is active (no
    dead "0 filters" rung). The count segment is appended only when counted. */
export function filterLine(p: ResolvedProvenance): string | null {
    if (!p.filterActive) return null;
    const phrases = p.filterPhrases.join(" · ");
    if (p.filteredCount == null) return phrases;
    const count = `${p.filteredCount.toLocaleString("en-US")} ${p.grainNoun} shown`;
    return phrases ? `${phrases} · ${count}` : count;
}
