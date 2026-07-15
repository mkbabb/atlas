<script setup lang="ts">
// platform/provenance/ProvenanceAppendix.vue — THE PER-ROUTE PROVENANCE REFERENCE SECTION (O-A9b ·
// Q-43 arm b). The inline `ProvenanceBar`/`Chip` render provenance DEFTLY at the plate foot; this
// renders it FULLY, once, as a route's appendix — enumerating each item's exact provenance (source ·
// measure · method · vintage · aggregation). The two surfaces read ONE `ResolvedProvenance` and never
// diverge; the inline bar cross-links here via the SHARED `appendixAnchorId` [CH-A H2; ANSWERS Q43].
//
// TYPOGRAPHY: the appendix inherits the ROUTE's own type — it declares structure (a `<section>` of
// per-item `<article>` rows, each a `<dl>` of rungs), NOT a font. A paper route styles it in its
// register; the atlas plate routes inherit the platform tokens. The vft Q-31 in-paper appendix is the
// sibling precedent (one provenance, rendered deftly inline AND fully in the appendix).
import {
    appendixAnchorId,
    appendixOrdinal,
    figureOrdinalFor,
    plateAnchorId,
    type AppendixEntry,
    type AppendixSource,
} from "./appendix";
import SourceLink from "./SourceLink.vue";
import {
    sourceLine,
    measureLine,
    methodParts,
    scopeParts,
    filterLine,
} from "./provenance-lines";

const { entries, heading = "Provenance", sources = [], figureNos } = defineProps<{
    /** the route's provenance roster — each item's title + resolved provenance, the route's own order. */
    entries: readonly AppendixEntry[];
    /** the section heading, in the route's words (default "Provenance"). */
    heading?: string;
    /** Verified sources addressable by each entry's `sourceIds`. */
    sources?: readonly AppendixSource[];
    /** Optional route-authored figure ordinals for appendix-to-figure return links. */
    figureNos?: Readonly<Record<string, number>>;
}>();

function sourcesFor(entry: AppendixEntry): AppendixSource[] {
    const sourceById = new Map(sources.map((source) => [source.id, source]));
    return (entry.sourceIds ?? [])
        .map((sourceId) => sourceById.get(sourceId))
        .filter((source): source is AppendixSource => source != null);
}
</script>

<template>
    <section
        v-if="entries.length"
        class="provenance-appendix"
        data-testid="provenance-appendix"
        aria-label="Provenance reference"
    >
        <h2 class="provenance-appendix__heading">{{ heading }}</h2>
        <article
            v-for="(entry, index) in entries"
            :id="appendixAnchorId(entry.vizId)"
            :key="entry.vizId"
            class="provenance-appendix__row"
            :data-viz-id="entry.vizId"
            data-testid="provenance-appendix-row"
        >
            <div class="provenance-appendix__row-head">
                <h3 class="provenance-appendix__title">
                    <span class="provenance-appendix__ordinal">{{ appendixOrdinal(index) }}</span>
                    {{ entry.title }}
                </h3>
                <a
                    v-if="figureNos"
                    class="provenance-appendix__return"
                    :href="`#${plateAnchorId(entry.vizId)}`"
                >
                    ↑ Figure {{ figureOrdinalFor(figureNos, entry.vizId) }}
                </a>
            </div>
            <dl class="provenance-appendix__rungs">
                <div class="provenance-appendix__rung">
                    <dt>Source</dt>
                    <dd>{{ sourceLine(entry.provenance) }}</dd>
                </div>
                <div v-if="measureLine(entry.provenance)" class="provenance-appendix__rung">
                    <dt>Measure</dt>
                    <dd>{{ measureLine(entry.provenance) }}</dd>
                </div>
                <div v-if="methodParts(entry.provenance).length" class="provenance-appendix__rung">
                    <dt>Method</dt>
                    <dd>{{ methodParts(entry.provenance).join(" · ") }}</dd>
                </div>
                <div v-if="scopeParts(entry.provenance).length" class="provenance-appendix__rung">
                    <dt>Scope</dt>
                    <dd>{{ scopeParts(entry.provenance).join(" · ") }}</dd>
                </div>
                <div v-if="filterLine(entry.provenance)" class="provenance-appendix__rung">
                    <dt>Filter</dt>
                    <dd>{{ filterLine(entry.provenance) }}</dd>
                </div>
                <div
                    v-for="source in sourcesFor(entry)"
                    :key="source.id"
                    class="provenance-appendix__rung"
                >
                    <dt>Link</dt>
                    <dd><SourceLink :source="source" /></dd>
                </div>
            </dl>
        </article>
    </section>
</template>

<style scoped>
/* STRUCTURE ONLY — the appendix inherits the route's typography (font/size/colour flow from the host).
   It rules the rungs into a legible reference grid; a paper route restyles freely, the plate routes
   inherit the platform tokens. Theme-aware via tokens, never a hex. */
.provenance-appendix {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
.provenance-appendix__heading {
    margin: 0;
    font-family: var(--font-mono, inherit);
    font-size: var(--type-body);
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: light-dark(
        color-mix(in oklab, var(--foreground), transparent 32%),
        color-mix(in oklab, var(--foreground), transparent 5%)
    );
}
.provenance-appendix__row-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
}
.provenance-appendix__row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-block-start: 0.75rem;
    border-block-start: 1px solid color-mix(in oklab, currentColor, transparent 88%);
    scroll-margin-block-start: 5rem;
}
/* O-A24 (DIR-5 ARM B): the ONE rung that must not shrink — glass-ui's raw --type-body
   (16px) clears the pre-change 0.95rem (15.2px), holding the step-up law. */
.provenance-appendix__title {
    margin: 0;
    font-size: var(--type-body);
    font-weight: 600;
    line-height: 1.3;
}
.provenance-appendix__ordinal {
    margin-inline-end: 0.35rem;
    font-family: var(--font-mono, inherit);
    font-size: var(--type-micro);
    letter-spacing: 0.08em;
    color: color-mix(in oklab, var(--foreground), transparent 28%);
}
.provenance-appendix__return {
    flex: none;
    font-family: var(--font-mono, inherit);
    font-size: var(--type-micro);
    color: light-dark(
        color-mix(in oklab, var(--route-accent), var(--foreground) 50%),
        color-mix(in oklab, var(--route-accent), var(--foreground) 22%)
    );
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: color-mix(in oklab, currentColor, transparent 55%);
}
.provenance-appendix__rungs {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.15rem 0.75rem;
    margin: 0;
    line-height: 1.5;
    color: var(--muted-foreground, inherit);
}
.provenance-appendix__rung {
    display: contents;
}
/* O-A24 (DIR-5 ARM B): the appendix's own second hand-tuned scale (0.62/0.72/0.78/0.95rem)
   is RETIRED onto the SAME two tokens `ProvenanceBar` uses — one derivation, not two — and
   the same label/value ink split (dt receded, dd promoted toward foreground). */
/* O-A26 (DIR-5 ARM D, THE A24-R RIDER — B.14) · rebased onto `--foreground` (never
   `--muted-foreground`, the B.14 root cause) — BYTE-IDENTICAL formula to `ProvenanceBar`'s
   (the one derivation, both components — see that file's comment for the full rationale). */
.provenance-appendix__rungs dt {
    font-family: var(--font-mono, inherit);
    font-size: var(--type-micro);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    white-space: nowrap;
    color: light-dark(
        color-mix(in oklab, var(--foreground), transparent 32%),
        color-mix(in oklab, var(--foreground), transparent 5%)
    );
}
.provenance-appendix__rungs dd {
    margin: 0;
    max-inline-size: 62ch;
    font-size: var(--type-small);
    color: color-mix(in oklab, var(--foreground), transparent 8%);
    text-wrap: pretty;
}
</style>
