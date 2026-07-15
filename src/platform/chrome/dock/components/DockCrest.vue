<script setup lang="ts">
// DockCrest — the dock's PERSISTENT CREST band (K-H-ARCH · the TEMPLATE-axis split, band 1).
// Extracted VERBATIM from Dock.vue's `#persistent` slot: the TIL crest is the HOME affordance
// to `/` AND the deck's title-card, rendered OUTSIDE the collapsed↔expanded crossfade (the
// library anchors #persistent above the deck). A self-contained leaf — the orchestrator mounts
// it in the `<template #persistent>` slot. It holds the gold budget (D7.b): the gilt dome
// geometry + the ONE gold focus-ring (the four-voice law — gold is the transient state, so
// BrandMark's inherited red focus outline is nulled on the gilt crest).
//
// M.W1 D2 · N.WG1 Arm B — THE PHONE CREST-BUTTON. At the phone register the crest is the
// SECTION-MENU trigger (the I-MOBILE law: collapse-into-the-TIL-logo → tap → the ruled sheet):
// the orchestrator passes `as-button`, the SAME gilt mark renders as a `<button>` wearing
// `aria-expanded`/`aria-controls`, and `toggle` drives the EXISTING `useDockCollapse` machine.
// The desktop crest stays the home LINK (home rides the sheet's labeled first ROW on the phone).
// `focusCrest` is exposed so the sheet's Esc/scrim close can return focus without scrolling.
import { ref } from "vue";
import BrandMark from "@/platform/chrome/masthead/BrandMark.vue";

const props = withDefaults(
    defineProps<{
        /** The phone register (D2): render the crest as the section-menu toggle BUTTON. */
        asButton?: boolean;
        /** The sheet's open state — mirrored onto `aria-expanded` (button register only). */
        expanded?: boolean;
    }>(),
    { asButton: false, expanded: false },
);

const emit = defineEmits<{
    /** The crest-button was pressed — the orchestrator flips the collapse machine (D2). */
    toggle: [];
}>();

const markRef = ref<InstanceType<typeof BrandMark> | null>(null);

/** Return focus to the crest control after the sheet closes — `{preventScroll}` so the close
    never yanks the page (the D2 focus-return law). Routed through BrandMark's exposed `focus()`
    (its SFC root is a fragment, so a raw `$el` read would land on a comment node). */
function focusCrest(): void {
    markRef.value?.focus({ preventScroll: true });
}
defineExpose({ focusCrest });
</script>

<template>
    <!-- ⓪ THE PERSISTENT CREST (#persistent slot, H9 §B.1) — the TIL crest anchors the deck in
         BOTH states. Desktop: the HOME affordance to `/` AND the deck's title-card; it holds the
         gold budget (D7.b). Phone (D2): the SAME mark as the section-menu BUTTON
         (aria-expanded/aria-controls) firing the collapse machine — reachable without expanding
         in both registers (touch/keyboard always-on). -->
    <BrandMark
        ref="markRef"
        variant="crest"
        :as="props.asButton ? 'button' : 'link'"
        to="/"
        :label="props.asButton ? 'Page sections' : undefined"
        :aria-expanded="props.asButton ? String(props.expanded) : undefined"
        :aria-controls="props.asButton ? 'dock-sheet' : undefined"
        data-testid="dock-brand"
        class="usf-dock__crest glass-material glass-gilt focus-ring focus-ring-gold"
        @focusin="props.asButton && $event.stopPropagation()"
        @click="props.asButton && emit('toggle')"
    />
</template>

<style scoped>
/* ── THE GILT CREST (D7.b · M3+M12) — the dome geometry + the ONE gold focus ────────
   The `glass-floating glass-gilt` classes (glass-ui 3.10) paint the frosted dome + the
   tooled gold edge + the gold-tinted hover specular; here we seat the raster INSIDE the
   dome with a hair of breathing room (the gilt edge needs a ring of glass to tool) and
   resolve the ONE focus conflict: BrandMark's own `:focus-visible` paints a RED outline
   (the structural-identity ring); on the gilt crest the FOCUS voice is GOLD (the medal,
   transient state), so we null that inherited red outline and let `focus-ring-gold`'s
   box-shadow ring carry the focus alone. The resting RED anomaly node is untouched —
   red stays the identity (a noun), gold is the focus distinction (an adjective). */
.usf-dock__crest {
    /* a hair of inset so the 1px gold rim tools a ring of glass around the raster,
       not flush to its edge (a tooled edge needs a margin to read as tooled). */
    padding: 0.1875rem;
    /* the floating tier's blur/bg already lift the dome; keep the pill radius so the
       gilt rim follows the crest's own round (the `.glass-gilt` box-shadow inherits it). */
    border-radius: var(--radius-pill);
}
/* The raster scales to fill the inset dome — object-fit:contain keeps its proportion. */
.usf-dock__crest :deep(.brand-mark__crest) {
    inline-size: auto;
    block-size: auto;
    max-inline-size: 100%;
    max-block-size: 100%;
}
/* Null BrandMark's inherited red focus outline ON THE GILT CREST ONLY — the gold
   focus-ring box-shadow is the crest's focus mark (the four-voice law: gold is the
   transient state). Other BrandMark consumers (future colophon) keep their red outline. */
.usf-dock__crest:focus-visible {
    outline: none;
}
</style>
