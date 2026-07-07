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
import { appendixAnchorId, type AppendixEntry } from "./appendix";
import {
    sourceLine,
    measureLine,
    methodParts,
    scopeParts,
    filterLine,
} from "./provenance-lines";

const { entries, heading = "Provenance" } = defineProps<{
    /** the route's provenance roster — each item's title + resolved provenance, the route's own order. */
    entries: readonly AppendixEntry[];
    /** the section heading, in the route's words (default "Provenance"). */
    heading?: string;
}>();
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
            v-for="entry in entries"
            :id="appendixAnchorId(entry.vizId)"
            :key="entry.vizId"
            class="provenance-appendix__row"
            :data-viz-id="entry.vizId"
            data-testid="provenance-appendix-row"
        >
            <h3 class="provenance-appendix__title">{{ entry.title }}</h3>
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
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted-foreground, inherit);
}
.provenance-appendix__row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-block-start: 0.75rem;
    border-block-start: 1px solid color-mix(in oklab, currentColor, transparent 88%);
    scroll-margin-block-start: 5rem;
}
.provenance-appendix__title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.3;
}
.provenance-appendix__rungs {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.15rem 0.75rem;
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--muted-foreground, inherit);
}
.provenance-appendix__rung {
    display: contents;
}
.provenance-appendix__rungs dt {
    font-family: var(--font-mono, inherit);
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    white-space: nowrap;
    opacity: 0.85;
}
.provenance-appendix__rungs dd {
    margin: 0;
    text-wrap: pretty;
}
</style>
