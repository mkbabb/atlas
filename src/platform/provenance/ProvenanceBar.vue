<script setup lang="ts">
// platform/provenance/ProvenanceBar.vue — THE PER-VIZ PROVENANCE RENDER (the `VizPlate #provenance`
// slot filler; provenance-surface §3.1). The primary O-A9 deliverable: the oldest unserved declared
// seam (grep=0 slot fillers at HEAD) finally paints. A route fills the slot VizPlate ALREADY exposes:
//
//   <template #provenance="{ provenance, contractId }">
//     <ProvenanceBar :facet="provenance" :viz-id="contractId" :sources="provSources" />
//   </template>
//
// [ANSWERS Q-53]: always-on-but-QUIET. The bar rides the plate FOOT as a recessive COLOPHON-REGISTER
// block — muted ink, a hairline top rule, mono small-caps labels — never a loud panel, never behind a
// disclosure. The same-day provenance law wins the declutter tension: it renders on every plate foot.
//
// The three rungs it reads aloud (the law's "what · from where · how filtered"):
//   SOURCE   dataset · sections            (always)
//   MEASURE  encoding x-vs-y (forthright)  (when declared)
//   METHOD   analysis · yearRange · vintage (always; vintage self-gates for an illustrative viz)
//   SCOPE    the live aggregation level     (present when O-A9b's resolver populates it — [ANSWERS Q43])
//   FILTER   the humanized algebra + count  (PRESENT-WHEN-ACTIVE — no dead "0 filters" rung)
//
// Each rung is a `<dt>/<dd>` pair in a `<dl>` — screen-reader legible AND its text is exportable.
import { computed } from "vue";
import { useProvenance, type ProvenanceSources } from "./useProvenance";
import type { ProvenanceFacet } from "./provenance-contract";

const {
    facet,
    vizId,
    sources = {},
} = defineProps<{
    /** the declared per-viz provenance facet (VizPlate's `#provenance` slot prop). */
    facet: ProvenanceFacet;
    /** the plate's viz id (the slot's `contract-id`) — the coordinator's leave-one-out key. */
    vizId: string;
    /** the route-supplied algebra seams (predicate / labels / count / grain / aggregation); inert by
        default so a filterless route renders an honest static-only block. */
    sources?: ProvenanceSources;
}>();

const resolved = useProvenance(vizId, () => facet, sources);

/** SOURCE — dataset · sections (the always-present static head). */
const sourceLine = computed<string>(() => {
    const p = resolved.value;
    return p.sections.length ? `${p.dataset} · ${p.sections.join(" · ")}` : p.dataset;
});
/** MEASURE — the forthright x-vs-y encoding ("net retention vs year"); null when undeclared. */
const measureLine = computed<string | null>(() => {
    const e = resolved.value.encoding;
    return e ? `${e.y} vs ${e.x}` : null;
});
/** METHOD — analysis · yearRange · vintage (the transform + span + the derived "data as of …"). */
const methodParts = computed<string[]>(() => {
    const p = resolved.value;
    const parts: string[] = [];
    if (p.analysis) parts.push(p.analysis);
    if (p.yearRange) parts.push(p.yearRange);
    if (p.vintage) parts.push(p.vintage.asOf);
    return parts;
});
/** SCOPE — the live aggregation level (O-A9b's resolver populates; [ANSWERS Q43] — re-renders as the
    filter narrows). The grains join to "FY2016–2026 · all states · 1,150 districts · pooled". */
const scopeParts = computed<string[]>(() => {
    const a = resolved.value.aggregationLevel;
    if (!a) return [];
    return [a.yearGrain, a.spatialGrain, a.entityGrain, a.reduceOp].filter(
        (g): g is string => g != null,
    );
});
</script>

<template>
    <dl class="provenance-bar" :data-viz-id="vizId" data-testid="provenance-bar">
        <div class="provenance-bar__rung">
            <dt>Source</dt>
            <dd>{{ sourceLine }}</dd>
        </div>
        <div v-if="measureLine" class="provenance-bar__rung">
            <dt>Measure</dt>
            <dd>{{ measureLine }}</dd>
        </div>
        <div v-if="methodParts.length" class="provenance-bar__rung">
            <dt>Method</dt>
            <dd>{{ methodParts.join(" · ") }}</dd>
        </div>
        <div v-if="scopeParts.length" class="provenance-bar__rung" data-testid="provenance-bar-scope">
            <dt>Scope</dt>
            <dd>{{ scopeParts.join(" · ") }}</dd>
        </div>
        <!-- FILTER — PRESENT-WHEN-ACTIVE (absent on the identity predicate; no dead "0 filters" rung). -->
        <div
            v-if="resolved.filterActive"
            class="provenance-bar__rung provenance-bar__rung--filter"
            data-testid="provenance-bar-filter"
        >
            <dt>Filter</dt>
            <dd>
                {{ resolved.filterPhrases.join(" · ") }}
                <span v-if="resolved.filteredCount != null" class="provenance-bar__count">
                    · {{ resolved.filteredCount.toLocaleString("en-US") }}
                    {{ resolved.grainNoun }} shown
                </span>
            </dd>
        </div>
    </dl>
</template>

<style scoped>
/* THE QUIET COLOPHON REGISTER ([ANSWERS Q-53]) — recessive ink, a hairline top rule, mono small-caps
   labels. Not a loud panel; the plate's last rung. Theme-aware via the platform tokens (never a hex). */
.provenance-bar {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.15rem 0.75rem;
    margin: 0;
    padding-block-start: 0.6rem;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground), transparent 90%);
    font-size: 0.7rem;
    line-height: 1.45;
    color: var(--muted-foreground);
}
.provenance-bar__rung {
    display: contents;
}
.provenance-bar dt {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: color-mix(in oklab, var(--muted-foreground), transparent 25%);
    white-space: nowrap;
}
.provenance-bar dd {
    margin: 0;
    text-wrap: pretty;
}
.provenance-bar__rung--filter dd {
    color: var(--foreground);
}
.provenance-bar__count {
    color: var(--muted-foreground);
    white-space: nowrap;
}
</style>
