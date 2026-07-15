<script setup lang="ts">
// platform/charts/ScrollLetteringHeading.vue — the AUDACIOUS QUESTION-TITLE, made motion
// (H.W11.c · the per-viz apply of the H11.b `useScrollLettering`). A scroll-scrubbed heading that
// inks its glyphs CHARACTER BY CHARACTER as its beat enters — and rewinds on scroll-up — under the
// motion budget (the sliding active band, `concurrencyCap`). It is the shared consumer the four
// dashboard bodies mount on their INTERROGATIVE question-titles (the proportion cardinal: only the
// question-titles earn the stagger; declarative labels + any h2 already wearing a <HandMark>
// get NONE — one pen per word).
//
// ── ONE CLOCK, MANY FACES (the H-INV-3 seam) ─────────────────────────────────────────────────
// `progress` is a READER the caller supplies — the section's `useScrollTimeline` lettering-facet
// position, OR (the common case) the raw `useScrollScene(el).reveal` the body already wires for the
// beat reveal. This component NEVER reads scroll itself: no second scalar, no `getBoundingClientRect`,
// no listener. The reveal is a pure function of that one scalar, so it is bi-directional BY
// CONSTRUCTION (the same reverse-for-free the native `view()` reveal gets, now per-glyph).
//
// ── THE A11Y CONTRACT (the H11.b consumer law) ───────────────────────────────────────────────
// The heading's ACCESSIBLE NAME stays WHOLE: the wrapper is `role="img"` carrying
// `aria-label="<text>"`, and the per-glyph spans are `aria-hidden`, so a screen reader reads the
// title as ONE phrase, never glyph-by-glyph. The reveal is DECORATION over a name always present
// (the scrub never changes the accessible name). Under reduced motion every glyph binds its
// terminal (fully lit, no transform) — information parity, the H11 first fence (handled inside
// `useScrollLettering`).
//
// ── ONE COPY IN textContent (the O-A2 de-doubling fix) ───────────────────────────────────────
// The accessible name rides the wrapper `aria-label` — NOT a parallel `.sr-only` text node. The
// animated glyph run is the SOLE copy of the phrase anywhere in this component's DOM, so a
// copy-scrape / DOM tree-walker / `textContent` read yields the phrase EXACTLY ONCE (the visible
// glyph run), while the accessible name (the `aria-label`) is single and whole. The retired
// `.sr-only` node duplicated the phrase into `textContent` — feed-clean, but the owner's
// "titles duplicated" mechanized [data-truth §7 / L39; a11y.md §2 SR-safe]. `aria-label` is valid
// now the wrapper carries a role (a no-role `<span>` may not carry it — ARIA 1.2 `aria-prohibited-attr`).
import { computed } from "vue";
import {
    useScrollLettering,
    splitGraphemes,
    type UseScrollLetteringOptions,
} from "@/motion/useScrollLettering";

const props = withDefaults(
    defineProps<{
        /** The question-title copy (the audacious interrogative — e.g. "Per person, or per
            square mile?"). Static copy: the glyph list is split ONCE at setup. */
        text: string;
        /** The [0,1] scroll scalar the reveal scrubs along — the body passes its beat's
            `useScrollScene(el).reveal` (or a `useScrollTimeline` lettering-facet `t`). */
        progress: () => number;
        /** The sliding active-band width (the motion budget) — glyphs mid-reveal at any scroll
            position. Default 6 (a ~word-wide band; the H11.b composed cadence). */
        concurrencyCap?: number;
        /** The arrival LIFT in em (each glyph rises this far as it inks). Default the composable's. */
        liftEm?: number;
        /** The arrival BLUR in px (the glyph resolves INTO focus). Default the composable's. */
        blurPx?: number;
    }>(),
    {
        concurrencyCap: 6,
        liftEm: undefined,
        blurPx: undefined,
    },
);

// The grapheme cells — split ONCE (the title copy is fixed; an emoji / combining mark is ONE cell).
const glyphs = splitGraphemes(props.text);

/** The glyph cells grouped into WORD RUNS (the N-batch3 typographic cure): each glyph renders
    `inline-block` (its lift/blur transform needs a box), but a run of sibling inline-blocks hands
    the line-breaker a break opportunity between EVERY pair — a wrapping title broke MID-WORD
    ("resi / dent", live at 1440). Each non-space run now renders inside ONE atomic `inline-block`
    word span (the split-text convention), so wrap opportunities live ONLY at the space glyphs
    (which stay plain inline, `white-space: pre`). Flat indices preserved — `glyphStyles[i]`
    binds unchanged. */
const words = (() => {
    const out: { space: boolean; cells: { g: string; i: number }[] }[] = [];
    let run: { space: boolean; cells: { g: string; i: number }[] } | null = null;
    glyphs.forEach((g, i) => {
        const space = g.trim().length === 0;
        if (!run || run.space !== space) {
            run = { space, cells: [] };
            out.push(run);
        }
        run.cells.push({ g, i });
    });
    return out;
})();

const letteringOptions = computed<UseScrollLetteringOptions>(() => ({
    concurrencyCap: props.concurrencyCap,
    ...(props.liftEm != null ? { liftEm: props.liftEm } : {}),
    ...(props.blurPx != null ? { blurPx: props.blurPx } : {}),
}));

const { styles } = useScrollLettering(glyphs, props.progress, letteringOptions.value);

// THE BAND-BOUND will-change (J-SCROLL §5 · j0-lettering-will-change-bounded). The composable
// already distinguishes a MID-REVEAL glyph (`0 < r < 1` → a style carrying `transform`/`filter`,
// useScrollLettering.ts:221-225) from a SETTLED one (`r >= 1` → `{ opacity: "1" }`, :216) and a
// PRM/whitespace glyph (empty `{}`). So the layer-promotion hint is a PURE FUNCTION of that emitted
// style — promote ONLY while a glyph sits in the active sliding band (the `concurrencyCap`-bounded
// set), `auto` at rest. We append `willChange` per-glyph rather than carrying an unconditional CSS
// rule, so a settled line pays ZERO standing GPU layers (the line-length-independent layer count the
// gate asserts). The signal is the mid-reveal `transform` key: a settled `{ opacity: "1" }` / empty
// `{}` style has none, so it reads `auto`.
const glyphStyles = computed<Record<string, string>[]>(() =>
    styles.value.map((s) =>
        "transform" in s
            ? { ...s, willChange: "opacity, transform, filter" }
            : { ...s, willChange: "auto" },
    ),
);
</script>

<template>
    <!-- `role="img"` + `aria-label` carries the WHOLE accessible name (read as ONE phrase); the
         per-glyph spans below are aria-hidden decoration. The name lives on the role-bearing
         wrapper, NOT a parallel `.sr-only` text node, so the animated glyph run is the SOLE copy
         of the phrase in `textContent` — a copy-scrape / tree-walker reads it EXACTLY ONCE
         (the O-A2 de-doubling fix; the retired `.sr-only` node made a naive scrape read twice).
         `aria-label` on a no-role <span> is `aria-prohibited-attr` (ARIA 1.2) — the role makes it
         valid + axe-clean. `text-section-fluid` is inherited from the host h2 the body applies the
         class to — this component renders the inline glyph run inside it. -->
    <span
        class="scroll-lettering"
        data-testid="scroll-lettering"
        role="img"
        :aria-label="text"
    >
        <!-- Word runs are ATOMIC (`inline-block` — a line may not break inside one); the space
             glyphs between them stay plain inline, so the title wraps at word boundaries only. -->
        <template v-for="(w, wi) in words" :key="`word-${wi}`">
            <span v-if="!w.space" class="scroll-lettering__word" aria-hidden="true">
                <span
                    v-for="c in w.cells"
                    :key="`glyph-${c.i}`"
                    class="scroll-lettering__glyph"
                    :style="glyphStyles[c.i]"
                    >{{ c.g }}</span
                >
            </span>
            <template v-else>
                <span
                    v-for="c in w.cells"
                    :key="`glyph-${c.i}`"
                    class="scroll-lettering__glyph scroll-lettering__glyph--space"
                    :style="glyphStyles[c.i]"
                    aria-hidden="true"
                    >{{ c.g }}</span
                >
            </template>
        </template>
    </span>
</template>

<style scoped>
/* The glyph run is inline so it flows inside the heading's own line-box (the h2 owns the type
   rung; this only animates the ink). `will-change` is deliberately ABSENT from the CSS — and now
   TRUE to that word (J-SCROLL §5): the hint is BAND-BOUND, emitted INLINE per-glyph from the
   composable's `styles[i]` (`willChange` in the `glyphStyles` map above). A glyph is promoted ONLY
   while it sits in the active sliding band (`0 < r < 1`, the `concurrencyCap`-bounded set); at rest
   (settled / PRM / whitespace) it reads `will-change: auto`, so the standing layer count is bounded
   by the budget, never the line length. */
.scroll-lettering {
    display: inline;
}
/* A WORD RUN is atomic for line breaking (`inline-block` boxes cannot break internally), so the
   heading wraps ONLY at the inline space glyphs between runs — never mid-word. */
.scroll-lettering__word {
    display: inline-block;
}
/* Each glyph is an inline-block so its `translate3d` lift + `blur` filter apply without
   disturbing the surrounding text-flow (an inline span ignores transform). The reveal style
   (opacity / transform / filter / will-change) is bound per-glyph from `glyphStyles`; at rest
   (terminal / PRM) the style is `{ opacity: "1", willChange: "auto" }` or `{ willChange: "auto" }`,
   so a settled glyph carries no residual GPU layer. */
.scroll-lettering__glyph {
    display: inline-block;
}
/* A whitespace glyph carries no ink and no band slot — keep it a plain space (no inline-block, so
   it never collapses a wrap opportunity). It is always present (the accessible phrase is whole).
   Its inline `willChange` is always `auto` (an empty-style glyph carries no `transform`). */
.scroll-lettering__glyph--space {
    display: inline;
    white-space: pre;
}
</style>
