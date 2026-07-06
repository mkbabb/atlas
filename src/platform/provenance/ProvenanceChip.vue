<script setup lang="ts">
// platform/provenance/ProvenanceChip.vue — THE AT-VIZ PARTIAL (the scrolled-to-viz render;
// provenance-surface §3.3). [ANSWERS Q-54]: BUILD the chip — the law's "the filter algebra renders
// … partially at the scrolled-to viz" is RULED in. It is the COMPACT, leave-one-out projection —
// distinct from the full ProvenanceBar: it renders ONLY the FILTER leg, and ONLY for the ACTIVE viz.
//
//   ⚲ 342 districts · receivers only · year ≥ 2020        ← compact, one line, at the active plate
//
// EXACTLY ONE CHIP IS LIVE at a time: it self-gates on `useActiveBeat.activeVizId === vizId` (the
// centre-argmin singleton), so scrolling between plates RE-BINDS the live chip (no N-chip clutter —
// the hierarchy law, §3.4). Present ONLY under an active filter (absent on the identity predicate).
//
// [ANSWERS Q-55]: LEAVE-ONE-OUT semantics ("as this viz sees it") — the chip reads the coordinator's
// `resolved(vizId)` (the caller threads it via `sources.predicate`); the filter-view AlgebraReadout
// band carries the GLOBAL algebra. Two views, ONE algebra, differ ONLY by the client arg [§3.4].
//
// `aria-hidden` DECORATIVE-ADJACENT: the authoritative copy is the ProvenanceBar's `<dl>` (its rungs
// are the SR-announced source; the chip would double-announce), so the chip is muted to assistive tech.
import { computed } from "vue";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import { useProvenance, type ProvenanceSources } from "./useProvenance";
import type { ProvenanceFacet } from "./provenance-contract";

const {
    facet,
    vizId,
    sources = {},
} = defineProps<{
    /** the declared per-viz provenance facet (for the grain noun + the aggregation leg). */
    facet: ProvenanceFacet;
    /** the plate's viz id — the active-viz key AND the coordinator's leave-one-out client. */
    vizId: string;
    /** the route-supplied algebra seams (the leave-one-out `resolved(vizId)` predicate + labels + count). */
    sources?: ProvenanceSources;
}>();

const beat = useActiveBeat();
const resolved = useProvenance(vizId, () => facet, sources);

/** THE ONE-CHIP GATE — this viz is the centre-argmin active viz (exactly one at a time). */
const isActive = computed<boolean>(() => beat.activeVizId === vizId);
/** Present ONLY when active AND filtered (the leave-one-out slice is non-empty). */
const visible = computed<boolean>(() => isActive.value && resolved.value.filterActive);
</script>

<template>
    <div
        v-if="visible"
        class="provenance-chip"
        :data-viz-id="vizId"
        data-testid="provenance-chip"
        aria-hidden="true"
    >
        <span v-if="resolved.filteredCount != null" class="provenance-chip__count">
            {{ resolved.filteredCount.toLocaleString("en-US") }} {{ resolved.grainNoun }}
        </span>
        <span class="provenance-chip__phrases">{{ resolved.filterPhrases.join(" · ") }}</span>
    </div>
</template>

<style scoped>
/* ONE recessive line, top-right of the active plate (§3.3) — muted ink, mono, a terse reminder of how
   the fleet is currently sliced WITHOUT the full source lockup (that lives in the foot, one scroll
   away). Theme-aware via platform tokens. */
.provenance-chip {
    display: inline-flex;
    align-items: baseline;
    gap: 0.4rem;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    letter-spacing: 0.02em;
    color: var(--muted-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.provenance-chip__count {
    font-weight: 600;
    color: color-mix(in oklab, var(--foreground), transparent 15%);
}
.provenance-chip__phrases {
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
