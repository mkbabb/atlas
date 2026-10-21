<script setup lang="ts">
// DockCrest — the dock's PERSISTENT CREST band (K-H-ARCH · the TEMPLATE-axis split, band 1).
// Extracted VERBATIM from Dock.vue's `#persistent` slot: the TIL crest is the HOME affordance
// to `/` AND the deck's title-card, rendered OUTSIDE the collapsed↔expanded crossfade (the
// library anchors #persistent above the deck). A self-contained leaf — the orchestrator mounts
// it in the `<template #persistent>` slot. The progress rim NO LONGER lives here: it re-seated UP
// to the orchestrator at the dock-box level so its ring resolves to the DOCK PILL's own border,
// not a crest-boxed square (OF-21.1) — this is a PURE crest again. It holds the gold budget (D7.b):
// the gilt dome
// geometry + the ONE gold focus-ring (the four-voice law — gold is the transient state, so
// BrandMark's inherited red focus outline is re-inked gold on the crest).
//
// U/B7 §2.2: the crest is the home link at every register (the rail's circle, the bar's first
// cell). The phone crest-button and its section sheet are deleted: the bottom bar's Sections cell
// carries the sections.
import type { Component } from "vue";
import BrandMark from "../../masthead/BrandMark.vue";

const props = withDefaults(
    defineProps<{
        crest?: Component;
        morphStage?: "seed" | "full";
    }>(),
    { crest: undefined, morphStage: "full" },
);
</script>

<template>
    <!-- ⓪ THE PERSISTENT CREST (#persistent slot, H9 §B.1): the home link to `/` and the dock's
         title-card at every register; it holds the gold budget (D7.b). -->
    <div class="usf-dock__crest-register">
        <BrandMark
            variant="crest"
            as="link"
            :crest="props.crest"
            :data-morph-stage="props.morphStage"
            to="/"
            data-testid="dock-brand"
            class="usf-dock__crest glass-specular-track"
        />
    </div>
</template>

<style scoped>
/* The crest raster's centering cell — a PURE 2.75rem box now the progress rim re-seated UP to the
   dock box (OF-21.1). The former `position: relative` (the rim's old positioned host, the cause of
   the crest-square ring) is retired with it: nothing here is a positioned ancestor any longer. */
.usf-dock__crest-register {
    display: grid;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    place-items: center;
}

/* ── THE GILT CREST (D7.b · M3+M12) — the dome geometry + the ONE gold focus ────────
   `glass-specular-track` is glass's material-less hover specular (the `::before` glint),
   the successor of the `.glass-material` base class glass 10 deleted. The gilt classes the
   crest once wore (`glass-gilt`, `focus-ring-gold`) were not shipped by glass 7 either, so
   the gold focus is atlas-owned here: BrandMark's own `:focus-visible` paints the RED
   identity outline; on the crest the FOCUS voice is GOLD (the medal, transient state), so
   the outline below re-inks it gold at glass's ring width. The resting RED anomaly node is
   untouched — red stays the identity (a noun), gold is the focus distinction (an adjective). */
.usf-dock__crest {
    /* a hair of inset so the 1px gold rim tools a ring of glass around the raster,
       not flush to its edge (a tooled edge needs a margin to read as tooled). */
    padding: 0.1875rem;
    /* keep the pill radius so the specular glint and the focus ring follow the crest's round. */
    border-radius: var(--radius-pill);
}
/* The raster scales to fill the inset dome — object-fit:contain keeps its proportion. */
.usf-dock__crest :deep(.brand-mark__crest) {
    inline-size: auto;
    block-size: auto;
    max-inline-size: 100%;
    max-block-size: 100%;
}
/* Re-ink BrandMark's focus outline GOLD ON THE CREST ONLY (the four-voice law: gold is the
   transient state). Other BrandMark consumers (future colophon) keep their red outline. */
.usf-dock__crest:focus-visible {
    outline: var(--focus-ring-width) solid var(--gold);
    outline-offset: 2px;
}
</style>
