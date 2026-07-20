<script setup lang="ts">
// platform/provenance/ProvenanceBar.vue — THE PER-VIZ PROVENANCE RENDER (the `VizPlate #provenance`
// slot filler; provenance-surface §3.1). The primary O-A9 deliverable: the oldest unserved declared
// seam (grep=0 slot fillers at HEAD) finally paints. A route fills the slot VizPlate ALREADY exposes:
//
//   <template #provenance="{ provenance, contractId }">
//     <ProvenanceBar :facet="provenance" :viz-id="contractId" :sources="provSources" />
//   </template>
//
// W-23 / W-38 — THE WHISPER, AND THE RECORD BEHIND IT. The Q-53 posture ("always-on … never behind
// a disclosure") is REVERSED, and the reversal is a partition by epistemic role, not a compromise:
//
//   the HANDLE  is always on — one quiet line naming the source and offering the way in. Hiding it
//               is what made readers ask where the data viewer was.
//   the RECORD  — source · measure · method · scope · filter — is HIDDEN BY DEFAULT. It is a
//               reference, and a reference that shouts on every figure of every route is not read
//               more carefully; it is read past. At any scroll state MANY of these sit in the DOM
//               and at most one stands open.
//
// W-56 — THE HANDLE NAMES ITS OWN DOOR. This bar's handle opens the RECORD, so it says `source &
// method`. The dial-11 words (`browse & export ↗`) ride the control that opens the browsable table
// — `VizAppendixDock`'s `browse` handle at a plate that declares a `DataScope`. A control that
// promises a table and yields a five-rung list is the info-scent defect W-56 was raised over; the
// words go where they can be kept.
//
// W-63 — an ILLUSTRATIVE figure renders ATTRIBUTION-ONLY: the credit line and its appendix row, no
// handle and no record (there is no measurement to trail).
//
// `hosted` is the one exception, and it is a composition fact rather than an escape: at the plate
// foot the appendix dock ALREADY supplies the disclosure, so a bar rendered inside it opens with
// its host and never grows a second handle in front of the first.
//
// The rungs the record reads aloud (the law's "what · from where · how filtered"):
//   SOURCE   dataset · sections            (always)
//   MEASURE  encoding x-vs-y (forthright)  (when declared)
//   METHOD   analysis · yearRange · vintage (always; vintage self-gates for an illustrative viz)
//   SCOPE    the live aggregation level     (present when O-A9b's resolver populates it — [ANSWERS Q43])
//   FILTER   the humanized algebra + count  (PRESENT-WHEN-ACTIVE — no dead "0 filters" rung)
//
// Each rung is a `<dt>/<dd>` pair in a `<dl>` — screen-reader legible AND its text is exportable.
import { computed, ref, useId } from "vue";
import { useProvenance, type ProvenanceSources } from "./useProvenance.js";
import type { ProvenanceFacet } from "./provenance-contract.js";
import { appendixAnchorId } from "./appendix.js";
import {
    sourceLine as sourceLineOf,
    measureLine as measureLineOf,
    methodParts as methodPartsOf,
    scopeParts as scopePartsOf,
} from "./provenance-lines.js";

const {
    facet,
    vizId,
    sources = {},
    appendix = false,
    hosted = false,
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
    /** [W-23] set by a host that IS the disclosure (the plate-foot appendix dock): the record opens
        with the host and this bar grows no handle of its own. Default off — a bar placed straight
        into the story owns its own whisper, which is where the hidden-by-default posture lives. */
    hosted?: boolean;
}>();

const resolved = useProvenance(vizId, () => facet, sources);

// [W-23] the record's detent. Shut unless a host already opened it — the reader asks for the
// record, on the one figure they are asking about.
const open = ref(false);
const recordId = `provenance-record-${useId().replaceAll(":", "")}`;
const recordShown = computed<boolean>(() => hosted || open.value);

/** W-63 — ATTRIBUTION-ONLY. An ILLUSTRATIVE figure has no rows, no vintage and no viewer by
    construction, so the five-rung apparatus has nothing to say that the credit line does not: SOURCE
    restates the dataset name, METHOD restates the caption, and the vintage self-gates to nothing. It
    is a citation wearing the costume of an audit trail. Such a figure states its attribution and
    links its appendix row — and stops there. */
const attributionOnly = computed<boolean>(() => facet.illustrative === true);

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
    <div
        class="provenance-bar"
        :data-viz-id="vizId"
        :data-detent="recordShown ? 'open' : 'shut'"
        data-testid="provenance-bar"
    >
        <!-- W-63 — THE ATTRIBUTION LINE. One credit, and the appendix row that carries the rest.
             No handle, because there is no record worth a door. -->
        <p v-if="attributionOnly" class="provenance-bar__whisper" data-testid="provenance-bar-attribution">
            <span class="provenance-bar__source">{{ resolved.dataset }}</span>
            <a
                v-if="appendix"
                class="provenance-bar__appendix-link"
                :href="appendixHref"
                data-testid="provenance-bar-appendix-link"
            >
                see appendix <span aria-hidden="true">↴</span>
            </a>
        </p>

        <!-- THE HANDLE (W-23 role 2) — always on, whisper weight: the source names itself and the
             way in is stated in words. `hosted` bars skip it; their host is the handle. -->
        <p v-else-if="!hosted" class="provenance-bar__whisper">
            <span class="provenance-bar__source">{{ resolved.dataset }}</span>
            <button
                type="button"
                class="provenance-bar__handle"
                :aria-expanded="open"
                :aria-controls="recordId"
                data-testid="provenance-bar-handle"
                @click="open = !open"
            >
                source &amp; method <span aria-hidden="true">⌄</span>
            </button>
        </p>

        <dl
            v-if="!attributionOnly"
            :id="recordId"
            class="provenance-bar__record"
            :hidden="!recordShown"
            data-testid="provenance-bar-record"
        >
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
    </div>
</template>

<style scoped>
/* THE QUIET COLOPHON REGISTER — recessive ink, a hairline top rule, mono small-caps labels. Not a
   loud panel; the plate's last rung. Theme-aware via the platform tokens (never a hex). */
.provenance-bar {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding-block-start: 0.6rem;
    border-block-start: 1px solid color-mix(in oklab, var(--foreground), transparent 90%);
    line-height: 1.45;
    color: inherit;
}
/* W-23 · THE WHISPER — one line, the least salient register on the plate, carrying the ONLY link in
   the foot. The source names itself first (the honesty floor: the reader learns whose data this is
   without opening anything); the handle follows, and it is the sole thing here shaped like a
   control, so the eye lands on the door rather than beside it. */
.provenance-bar__whisper {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.15rem 0.5rem;
    margin: 0;
    font-size: var(--type-micro);
}
.provenance-bar__source {
    min-inline-size: 0;
    color: color-mix(in oklab, var(--foreground), transparent 32%);
    text-wrap: pretty;
}
.provenance-bar__handle {
    flex: none;
    padding: 0;
    font-family: var(--font-mono);
    font-size: inherit;
    letter-spacing: 0.06em;
    color: light-dark(
        color-mix(in oklab, var(--route-accent), var(--foreground) 50%),
        color-mix(in oklab, var(--route-accent), var(--foreground) 22%)
    );
    background: none;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: color-mix(in oklab, currentColor, transparent 55%);
    cursor: pointer;
}
.provenance-bar__handle:hover {
    color: var(--foreground);
    text-decoration-color: currentColor;
}
/* THE RECORD — the five rungs, hidden until asked for. `[hidden]` does the hiding; the grid is
   declared here so it lays out correctly the moment it is shown. */
.provenance-bar__record {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.15rem 0.75rem;
    margin: 0;
}
.provenance-bar__record[hidden] {
    display: none;
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
