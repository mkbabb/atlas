<script setup lang="ts">
// editorial/EssayTitle.vue — THE TITLE REGISTER (A-15 · spec-contract §a.1). The ONE host switch
// that resolves a `TitleFacet` onto the extant title primitives — the 3-arm dispatch the 8 bespoke
// per-route title carriers (ecf/sci/usf/usf-integrity/speedtest `MastheadTitle`/`LetteringTitle`/
// `Title.vue`) collapse INTO. A route DECLARES `{ text, treatment, marginalia }`; this register
// renders it, so the carriers retire as their story.ts sites remap (node-2, the touches).
//
// THE THREE ARMS (spec §a.1):
//   · plain      → bare text (brackets literal-stripped) — the settled masthead string.
//   · typewriter → <TypewriterTitle> (the ONCE type-in; its own role="img" + whole aria-label).
//   · lettering  → the [bracket]-presence DISPATCH:
//       – [bracket] present → <HandMark> picked-word underline (the clause stays plain text, the
//         aria name whole; only the picked run wears the ink).
//       – no bracket        → <EssayTitleCascade> whole-glyph cascade (role="img" + whole label).
//
// POSITION-DERIVED, NOT DECLARED (no `clock`/`seed`/`boil` field — the spec's title-law): the host
// hands `lead` (the first masthead beat) + a grain `seed`. The lead beat inks on the `load`
// one-shot clock and earns the route's ONE hero boil; interior beats scrub the `scroll` clock
// (bidirectional, free); the seed is a wobble constant, not data.
//
// marginalia (dial 10, owner-ruled — the typed prop-bag stands, un-folded to `ornament`): the
// inline post-title device (the earned dagger) renders after the title on ANY arm; its glyph is the
// component's own default, the bag carries the per-title `label` + `reveal`.
import { computed, onMounted, ref } from "vue";
import TypewriterTitle from "./TypewriterTitle.vue";
import EssayTitleCascade from "./EssayTitleCascade.vue";
import HandMark from "../charts/glyph/HandMark.vue";
import type { TitleFacet } from "../contract/index.js";

const props = withDefaults(
    defineProps<{
        /** The resolved title facet (the 3-arm register). */
        facet: TitleFacet;
        /** The LEAD masthead beat — inks on the `load` one-shot clock + earns the route's one hero
            boil. Interior beats (false) scrub the bidirectional `scroll` clock. */
        lead?: boolean;
        /** The HandMark grain seed — a host constant (position-rotated); wobble determinism, not
            data. */
        seed?: number;
    }>(),
    { lead: false, seed: 3 },
);

/** The picked-word split — a lone `[bracket]` span the `lettering` arm draws under. `null` when the
    title carries no bracket (the whole-glyph cascade path). */
const picked = computed(() => {
    const m = props.facet.text.match(/\[([^\]]+)\]/);
    if (!m || m.index === undefined) return null;
    return {
        pre: props.facet.text.slice(0, m.index),
        marked: m[1],
        post: props.facet.text.slice(m.index + m[0].length),
    };
});

/** The whole accessible title with the bracket markers literal-stripped (the aria name + every arm
    but the picked-word run). */
const strippedText = computed(() => props.facet.text.replace(/[[\]]/g, ""));

const treatment = computed(() => props.facet.treatment ?? "plain");
const marginalia = computed(() => props.facet.marginalia);

/** The load one-shot for the lead hero, the bidirectional scroll scrub for interiors (HandMark's
    own view()-timeline clock drives scroll — no JS scalar). */
const clock = computed<"load" | "scroll">(() => (props.lead ? "load" : "scroll"));
/** The route's ONE hero boil — the lead beat's living line (HandMark gates boil to the load clock,
    so an interior scroll mark never boils). */
const boil = computed(() => props.lead);

// The load clock resolves `appear:"manual"` (useHandMarkClock) — glass-ui never auto-fires it, so
// the register fires the one-shot on mount exactly as the retired masthead carriers did.
const ink = ref<{ play: () => Promise<void> } | null>(null);
onMounted(() => {
    if (clock.value === "load") void ink.value?.play();
});
</script>

<template>
    <span class="essay-title">
        <TypewriterTitle v-if="treatment === 'typewriter'" :text="strippedText" />

        <!-- lettering · picked word — the clause is plain text (aria name whole); only the [bracket]
             run wears the hand mark. -->
        <template v-else-if="treatment === 'lettering' && picked"
            >{{ picked?.pre }}<HandMark
                ref="ink"
                :clock="clock"
                :seed="seed"
                :boil="boil"
                >{{ picked?.marked }}</HandMark
            >{{ picked?.post }}</template
        >

        <!-- lettering · whole-glyph cascade — the scoped-subscriber arm. -->
        <EssayTitleCascade
            v-else-if="treatment === 'lettering'"
            :text="strippedText"
        />

        <!-- plain — bare text (brackets literal-stripped). -->
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
