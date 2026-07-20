<script setup lang="ts">
// editorial/EssayTitleCascade.vue — the `lettering` NO-BRACKET arm of the A-15 title register: the
// audacious question-title that inks glyph-by-glyph as its beat enters. The ONE shared cascade the
// per-route carriers (ecf/sci/speedtest `LetteringTitle.vue`) collapse INTO — it owns the thin
// page-clock subscriber (P193 · G-N13, `settle:"title"` — completes at cover 0.32, settled STRICTLY
// before the count's 0.50 centre) and feeds <ScrollLetteringHeading> its `:progress` scalar. Split
// out of the register so the `useElementBounding` subscriber stays scoped to the CASCADE titles
// alone (never every masthead) — the bounded-observer discipline the retired carriers held.
import { ref } from "vue";
import { useSectionReveal } from "../motion/useSectionReveal.js";
import ScrollLetteringHeading from "../charts/scene/ScrollLetteringHeading.vue";

const props = defineProps<{
    /** The whole question-title copy (brackets already stripped by the register). */
    text: string;
}>();

const el = ref<HTMLElement | null>(null);
const reveal = useSectionReveal(el, { settle: "title" });
</script>

<template>
    <!-- `data-scroll-tl` is RETAINED (the scroll-driven.css enumerated-host contract + the
         lettering-scrub assertion); INERT on the thin-subscriber path (it reads section geometry,
         not `--scroll-tl`), but the host stays the declared lettering-scrub host. -->
    <span ref="el" class="essay-title-cascade" data-scroll-tl>
        <ScrollLetteringHeading :text="props.text" :progress="() => reveal.t.value" />
    </span>
</template>

<style scoped>
.essay-title-cascade {
    display: inline;
}
</style>
