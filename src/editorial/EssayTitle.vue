<script setup lang="ts">
// editorial/EssayTitle.vue — THE TITLE REGISTER (A-15 · spec-contract §a.1). The one host switch
// that resolves a `TitleFacet` onto the title primitives. A route declares `{ text, treatment,
// marginalia }`; this register renders it.
//
// THE TWO ARMS. Every arm paints its whole text at full opacity at rest (U/B7 · PLAN §4.2: no
// typewriter titles, no scroll-scrubbed reveals, hand marks hold no text below full opacity).
//   · plain     → bare text (brackets literal-stripped).
//   · lettering → a `[bracket]` run wears <HandMark>; the clause stays plain text and the aria name
//                 whole. Without a bracket the title is plain text.
//
// The mark clock is position-derived: the lead masthead beat draws its mark once on `load`;
// interior beats rest drawn (`static`). The seed is a wobble constant, not data.
//
// marginalia (dial 10, owner-ruled — the typed prop-bag stands, un-folded to `ornament`): the
// inline post-title device (the earned dagger) renders after the title on either arm; its glyph is
// the component's own default, the bag carries the per-title `label` + `reveal`.
import { computed } from "vue";
import HandMark from "../charts/glyph/HandMark.vue";
import type { TitleFacet } from "../contract/index.js";

const props = withDefaults(
    defineProps<{
        /** The resolved title facet (the 2-arm register). */
        facet: TitleFacet;
        /** The LEAD masthead beat — its mark draws once on the `load` clock. Interior beats
            (false) rest drawn. */
        lead?: boolean;
        /** The hand's seed — a host constant (position-rotated); wobble determinism, not data. */
        seed?: number;
    }>(),
    { lead: false, seed: 3 },
);

/** The picked-word split — a lone `[bracket]` span the `lettering` arm draws under. `null` when the
    title carries no bracket (plain text). */
const picked = computed(() => {
    const m = props.facet.text.match(/\[([^\]]+)\]/);
    if (!m || m.index === undefined) return null;
    return {
        pre: props.facet.text.slice(0, m.index),
        marked: m[1],
        post: props.facet.text.slice(m.index + m[0].length),
    };
});

/** The whole title with the bracket markers literal-stripped (the plain arm and the aria name). */
const strippedText = computed(() => props.facet.text.replace(/[[\]]/g, ""));

const treatment = computed(() => props.facet.treatment ?? "plain");
const marginalia = computed(() => props.facet.marginalia);

/** The load one-shot for the lead hero; interior marks rest drawn. */
const clock = computed<"load" | "static">(() => (props.lead ? "load" : "static"));
</script>

<template>
    <span class="essay-title">
        <!-- lettering · picked word — the clause is plain text (aria name whole); only the [bracket]
             run wears the hand mark. -->
        <template v-if="treatment === 'lettering' && picked"
            >{{ picked?.pre }}<HandMark :clock="clock" :seed="seed">{{
                picked?.marked
            }}</HandMark
            >{{ picked?.post }}</template
        >

        <!-- plain, or lettering without a bracket — bare text (brackets literal-stripped). -->
        <template v-else>{{ strippedText }}</template>

        <!-- marginalia (dial 10) — the inline post-title device; its glyph is the component's own
             default, the bag carries the per-title label + reveal. -->
        <component
            :is="marginalia.component"
            v-if="marginalia"
            :label="marginalia.label"
            :reveal="marginalia.reveal"
        />
    </span>
</template>

<style scoped>
.essay-title {
    display: inline;
}
</style>
