<script setup lang="ts">
// MembraneProvenanceDetent.vue — FACET 6, THE PROVENANCE DETENT (spec-chrome §c.1 facet 6 · the
// A-39 fold · STRAND A). The active viz's PROVENANCE + its CSV/image EXPORT, re-homed into the
// membrane. It renders NO viz content itself: it is the TELEPORT TARGET — ONE container the active
// plate's own `PlateProvenance` (dashboards) + header export control (`VizPlate`) relocate their
// live nodes into (`useMembraneProvenance`). The plate keeps OWNING its provenance/export; atlas
// never imports dashboards. `detent:"shut"` — the teleported `ProvenanceBar` grows its OWN
// source-&-method handle (rendered un-`hosted` when projected), so the record opens on ask.
//
// The target is ALWAYS mounted (v-show, never v-if) so a source teleport always locates it; it only
// PAINTS when a dial viz is live (else display:none — no phantom detent), gating on the SAME
// `dialVizId` the facet-5 zone tracks (pinned wins, else the centre-grain singleton). The
// `provenance-detent` union member below pins the facet stamp to a real member (a typo is a compile
// error); it self-gates like facet-5, so nothing centred ⇒ no node.
import {
    useMembraneProvenanceHost,
    useDialVizId,
} from "../../provenance/useMembraneProvenance.js";
import { facetBand, type MembraneFacet } from "./membrane-facet.js";

const FACET: MembraneFacet = "provenance-detent";

const { targetId } = useMembraneProvenanceHost();

// β-LOW-3 — the SAME dial-viz truth the facet-5 zone reads (the pinned viz wins, else the
// centre-grain singleton). The detent paints iff a viz is live.
const dialVizId = useDialVizId();
</script>

<template>
    <div
        class="membrane-provenance"
        :data-membrane-facet="FACET"
        :data-membrane-band="facetBand(FACET)"
        data-membrane-provenance-detent
    >
        <!-- FACET 6 TARGET — always in the DOM so a SOURCE teleport always lands; painted (v-show)
             only when a dial viz is live. The active plate's provenance + export teleport HERE. -->
        <div
            v-show="dialVizId"
            :id="targetId"
            class="membrane-provenance__slot"
            :data-active-viz="dialVizId"
            data-membrane-provenance-target
        />
    </div>
</template>

<style scoped>
.membrane-provenance {
    inline-size: 100%;
}
.membrane-provenance__slot {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    inline-size: 100%;
    padding-block: 0.4rem;
    font-size: var(--type-caption);
}
</style>
