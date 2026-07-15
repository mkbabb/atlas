<script setup lang="ts">
// DockSummary — the dock's COLLAPSED SILHOUETTE (O-D1 · the `#collapsed` slot · L34 §4.1.44).
//
// glass-ui's GlassDock renders the `#collapsed` slot into `.dock-layer--summary` — the pane the
// height-spring measures for its COLLAPSED endpoint (`--dock-collapsed-px`). Before this slot
// existed the atlas fed glass an EMPTY summary, so the spring measured a degenerate endpoint and
// the collapse stranded a reserved-expanded ghost column (dock-chrome §2.2, the ghost-pill root).
// This slot gives collapse a REAL target: a dome-hugging DISC. glass's own
// `.glass-dock.collapsed .dock-layer--summary` rule floors this pane to a perfect circle at
// `--dock-collapsed-summary-min-size` (the orchestrator pins 4rem = 64px), centring the content on
// both axes — so this leaf composes the crest + freshness pip + published scroll rim INSIDE that
// circle.
//
// THE LOOK (L34 §4.1.44 — "the product's compass rose"): a 64×64 dome-hugging disc — the TIL crest
// 40px centred (a 12px breathing ring to the disc edge) + the freshness dot 7px at 1–2 o'clock. The
// Glass-owned `ScrollProgressRim` traces the disc edge from the dock's one document scalar.
//
// The collapsed dock's INTERACTION is carried by the persistent crest band (the phone crest-BUTTON /
// the desktop home crest) and glass's own collapsed-pane click-to-expand. The rim keeps its native
// progressbar semantics; the crest image and freshness pip remain decorative.
import { StatusDot } from "@mkbabb/glass-ui/status-dot";
import { ScrollProgressRim } from "@mkbabb/glass-ui/scroll-progress-rim";

defineProps<{
    /** Whole-document progress, 0..1. */
    progress: number;
    /** The active dashboard's identity spectrum. */
    stops: readonly string[];
}>();

// The TIL crest asset — the SAME public SVG the crest band binds (BrandMark), bound as a runtime
// string (not a static `src="…"` attr) so `transformAssetUrls` never mints an asset-import module
// the @atlas/core lib build would drop (the BrandMark J-PERF note, mirrored).
const CREST_SRC = "/til-logo.svg";
</script>

<template>
    <!-- The collapsed silhouette — decorative; glass floors the enclosing `.dock-layer--summary`
         pane to the 64px circle and centres this content. -->
    <span class="usf-dock__summary">
        <ScrollProgressRim :value="progress" :stops="stops" />
        <img
            class="usf-dock__summary-crest"
            :src="CREST_SRC"
            alt=""
            aria-hidden="true"
            width="40"
            height="40"
            decoding="async"
        />
        <!-- the freshness pip — 7px at 1–2 o'clock. The consumed glass StatusDot (the same primitive
             the foot's selection chip rides); its live data-wire (freshness/vintage) lands with the
             O-D2 barometer consume. -->
        <StatusDot
            variant="custom"
            size="sm"
            class="usf-dock__summary-fresh"
            color="var(--route-accent, var(--cp-accent, var(--foreground)))"
        />
    </span>
</template>

<style scoped>
/* The silhouette content box — fills glass's floored `.dock-layer--summary` circle. `position:
   relative` anchors the freshness pip to the disc's 1–2 o'clock; `display:grid; place-items:center`
   seats the 40px crest dead-centre inside the 64px disc (the 12px breathing ring is the disc-radius
   minus the crest-radius: 32 − 20 = 12px, held by the crest's own 40px box centred in the 64px pane). */
.usf-dock__summary {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 100%;
    block-size: 100%;
    border-radius: inherit;
}
.usf-dock__summary-crest {
    inline-size: 2.5rem; /* 40px — the crest glyph */
    block-size: 2.5rem;
    object-fit: contain;
}
/* the freshness pip at 1–2 o'clock — 7px, riding the disc's upper-right. The pip sits just inside
   the 64px disc edge (≈30° up-right of centre). The consumed StatusDot owns the circle; we pin its
   size + place. */
.usf-dock__summary-fresh {
    position: absolute;
    inset-block-start: 0.5rem;
    inset-inline-end: 0.5rem;
}
.usf-dock__summary-fresh :deep(.status-dot__dot) {
    inline-size: 0.4375rem; /* 7px */
    block-size: 0.4375rem;
}
</style>
