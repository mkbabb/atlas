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
import { appendixAnchorId } from "./appendix";
import {
    sourceLine as sourceLineOf,
    measureLine as measureLineOf,
    methodParts as methodPartsOf,
    scopeParts as scopePartsOf,
} from "./provenance-lines";

const {
    facet,
    vizId,
    sources = {},
    appendix = false,
} = defineProps<{
    /** the declared per-viz provenance facet (VizPlate's `#provenance` slot prop). */
    facet: ProvenanceFacet;
    /** the plate's viz id (the slot's `contract-id`) — the coordinator's leave-one-out key. */
    vizId: string;
    /** the route-supplied algebra seams (predicate / labels / count / grain / aggregation); inert by
        default so a filterless route renders an honest static-only block. */
    sources?: ProvenanceSources;
    /** [O-A9b] when the route renders a `ProvenanceAppendix`, set `true` to CROSS-LINK this bar to its
        appendix row (`#appendixAnchorId(vizId)`) — the two surfaces read ONE provenance. Default off
        (a route with no appendix shows no dangling link). */
    appendix?: boolean;
}>();

const resolved = useProvenance(vizId, () => facet, sources);

// SOURCE / MEASURE / METHOD / SCOPE — derived in the SHARED `provenance-lines` module so this inline
// bar and the `ProvenanceAppendix` never diverge (single-derivation; [ANSWERS Q43]).
/** SOURCE — dataset · sections (the always-present static head). */
const sourceLine = computed<string>(() => sourceLineOf(resolved.value));
/** MEASURE — the forthright x-vs-y encoding ("net retention vs year"); null when undeclared. */
const measureLine = computed<string | null>(() => measureLineOf(resolved.value));
/** METHOD — analysis · yearRange · vintage (the transform + span + the derived "data as of …"). */
const methodParts = computed<string[]>(() => methodPartsOf(resolved.value));
/** SCOPE — the live aggregation level (O-A9b's resolver populates; [ANSWERS Q43] — re-renders as the
    filter narrows). The grains join to "FY2016–2026 · all states · 1,150 districts · pooled". */
const scopeParts = computed<string[]>(() => scopePartsOf(resolved.value));
/** [O-A9b] the appendix cross-link target (`#provenance-appendix-<vizId>`) — the SHARED anchor the
    `ProvenanceAppendix` row derives, so a link ALWAYS resolves to its row. */
const appendixHref = computed<string>(() => `#${appendixAnchorId(vizId)}`);
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
        <!-- APPENDIX cross-link (O-A9b) — present only when the route renders a `ProvenanceAppendix`;
             resolves to this viz's appendix row via the SHARED anchor. -->
        <div v-if="appendix" class="provenance-bar__rung" data-testid="provenance-bar-appendix">
            <dt>Full record</dt>
            <dd>
                <a
                    class="provenance-bar__appendix-link"
                    :href="appendixHref"
                    data-testid="provenance-bar-appendix-link"
                >
                    see appendix ↴
                </a>
            </dd>
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
    line-height: 1.45;
    color: inherit;
}
.provenance-bar__rung {
    display: contents;
}
/* O-A24 (DIR-5 ARM B): the type-ladder rebind — `dt` sits on glass-ui's own raw floor
   token, `dd` sits on the atlas-overridden caption rung (O-C1's +1 √φ bump), so the pair
   reads a step bigger AND, paired with the ink split below, a real label < value ladder. */
/* O-A26 (DIR-5 ARM D, THE A24-R RIDER — B.14) · THE ONE INK DERIVATION, TWO RUNGS. Both `dt`
   and `dd` REBASE onto `--foreground` (not `--muted-foreground` — the B.14 root cause: a
   mid-L gray token can NEVER clear 4.5:1 against a near-white/near-black plate at ANY alpha,
   pixel-accurate-measured 1.98–4.09 across all 6 route×theme combos). The label/value
   HIERARCHY survives as an ALPHA split off the SAME base ink (dt receded · dd promoted) —
   `light-dark()` carries the split PER THEME (the `--plate-grid-ink` precedent, color.css:480-491:
   a theme-asymmetric alpha must live IN the color, `opacity: light-dark(...)` is invalid-at-
   computed-value): the dark arm needs a MUCH higher opacity floor than the light arm to clear
   4.5:1 pixel-accurately (alpha-blend contrast is not route-uniform — a route's own dark-theme
   card/plate ground varies enough that the worst-case route sets the floor for all). Verified
   ≥4.5:1 on usf/sci/ecf × light/dark (exec/evidence/O-A26/impl/EVIDENCE.md). */
.provenance-bar dt {
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: light-dark(
        color-mix(in oklab, var(--foreground), transparent 32%),
        color-mix(in oklab, var(--foreground), transparent 5%)
    );
    white-space: nowrap;
}
.provenance-bar dd {
    margin: 0;
    font-size: var(--type-caption);
    color: color-mix(in oklab, var(--foreground), transparent 8%);
    text-wrap: pretty;
}
.provenance-bar__rung--filter dd {
    color: var(--foreground);
}
.provenance-bar__count {
    color: color-mix(in oklab, var(--foreground), transparent 8%);
    white-space: nowrap;
}
.provenance-bar__appendix-link {
    color: light-dark(
        color-mix(in oklab, var(--route-accent), var(--foreground) 50%),
        color-mix(in oklab, var(--route-accent), var(--foreground) 22%)
    );
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: color-mix(in oklab, currentColor, transparent 55%);
}
.provenance-bar__appendix-link:hover {
    color: var(--foreground);
}
</style>
