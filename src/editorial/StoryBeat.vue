<script setup lang="ts">
// platform/editorial/StoryBeat.vue — ② the PROSE interlude (the narrator between figures). F3a /
// design-interstitial-system §3.2 · f6-hero-interstitials §2.B-②.
//
// A max-w-2xl Newsreader paragraph — the narrator's voice BETWEEN two figures, stating the
// VERDICT the flanking plates jointly earn (USF "Forty-six states draw back less than a dollar
// for every dollar in" between the map and the scatter; SCI "The ceiling kept climbing. Peak
// demand climbed faster."). It is the editorial verdict, not a decoration — every StoryBeat
// carries a claim the two flanking plates have already evidenced.
//
// THE RUNG — ③ legend (prose, recessive): a StoryBeat binds --attn-legend (0.64). The narrator
// recedes UNDER the data it narrates (the inversion law — a verdict points at the figures, it
// never out-shouts them). It reuses the existing Newsreader prose recipe — NO new type.
//
// THE ONE MARK — the picked word: ONE word wears `<HandMark clock="scroll">`
// (the hand reaches WORDS — DESIGN §7, lawful). NO other mark. The underline stays the law-red
// (the component default `--ncsu-red`), never a data hue (the four-voice law). The slot carries
// the LEAD prose; `pick` is the word the hand picks out (rendered after the lead); `tail` is the
// prose that closes the sentence after the picked word — so the verdict reads as one continuous
// Newsreader paragraph with one hand-drawn pick-out, exactly as the three bodies hand-wire today
// (`<HandMark>Who pays in</HandMark>, who draws out`), now ONE component.
//
// THE REVEAL CLOCK — SCROLL: the prose reveals on the `<Beat>` scroll register (the assembler's
// host); the picked-word underline rides `<HandMark clock="scroll">` — the native `view()`
// bidirectional draw (draws on entry, un-draws on scroll-up, the proven Clock B). PRM: the
// underline sets-not-drawn (the library collapses the wipe under reduce); the prose is simply
// present. a11y: a `<p>` in the reading order; the picked word is a `<span>` the underline
// decorates (the SVG mark is `aria-hidden` inside HandMark — the word text reads plainly,
// no pronunciation change).
import HandMark from "../charts/glyph/HandMark.vue";

withDefaults(
    defineProps<{
        /** The ONE picked word that wears `<HandMark clock="scroll">` (the hand-mark). */
        pick?: string;
        /** The prose that closes the sentence after the picked word (one continuous paragraph). */
        tail?: string;
        /** The hand-mark grain determinism (per the divider seed law — pixel-identical reloads). */
        seed?: number;
    }>(),
    { pick: undefined, tail: undefined, seed: 5 },
);
</script>

<template>
    <!-- The narrator's verdict — a Newsreader paragraph at the legend rung. It binds
         --attn-legend (the prose recedes under the data it narrates). The picked word wears the
         ONE <HandMark> (clock="scroll" — the bidirectional view() draw). -->
    <p
        class="story-beat text-prose"
        data-attn="legend"
        data-testid="story-beat"
    >
        <slot /><template v-if="pick"
            ><HandMark clock="scroll" :seed="seed">{{ pick }}</HandMark
            ><template v-if="tail">{{ tail }}</template></template
        >
    </p>
</template>

<style scoped>
/* THE PROSE INTERLUDE — a max-w-2xl Newsreader paragraph, the narrator's voice. The rung
   recession rides the host (the SUFFUSION contract — never a per-surface alpha guess). It is the
   river's editorial verdict, set in the page's reading register, never a plate. */
.story-beat {
    max-inline-size: var(--measure, 42rem);
    margin-inline: auto;
    /* the rung ③ legend recession — the prose recedes under the data it narrates. */
    opacity: var(--attn-legend);
}
</style>
