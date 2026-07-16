<script setup lang="ts">
// ReadoutFacts.vue — the SHARED fact-row grammar (I5 §6 · DRY, OQ-4). The `<dl>` fact grid + the
// per-program/per-tier breakdown bars EXTRACTED from `HoverCard.vue` so BOTH the hover card and the
// I5 `SelectionPreview` card render ONE fact language — duplicating the ~30-line grammar would
// re-detonate the drift the platform unifies elsewhere (the I-PATH §2 reusable-facility discipline).
//
// THIS IS A REFACTOR, NOT A REDESIGN. The markup, the classes, and the `:deep(.figure-slug-card)`
// skin are reproduced BYTE-IDENTICAL to HoverCard's inline `<dl>`/breakdown blocks, so HoverCard's
// rendered output is unchanged when it swaps the inline markup for `<ReadoutFacts>`. The card-level
// chrome (the eyebrow / subhead / title / pin pip) STAYS in HoverCard — only the fact grammar moves.
import FigureSlug from "../frame/FigureSlug.vue";
// `Fact` is canonically declared in HoverCard.vue; `ReadoutBar` in the readout store. Both are
// type-only imports, so the HoverCard ⇄ ReadoutFacts cycle is elided at compile time (no runtime edge).
import type { Fact } from "../../interaction/HoverCard.vue";
import type { ReadoutBar } from "../../platform/stores/useHoverReadout.js";

withDefaults(
    defineProps<{
        /** The fact rows — the universal fact-row grid. */
        facts: Fact[];
        /** `compact` = facts only; `full` also reveals the breakdown bars (the HoverCard density). */
        density?: "compact" | "full";
        /** The breakdown bars (revealed at `full` density) — optional, structured. */
        breakdown?: ReadoutBar[];
        /** The breakdown band's header label (defaults to "By program", HoverCard's prior fallback). */
        breakdownLabel?: string;
    }>(),
    {
        density: "compact",
        breakdown: undefined,
        breakdownLabel: undefined,
    },
);
</script>

<template>
    <!-- THE FACT GRID (extracted from HoverCard) — the universal labelled-row grid. A `divider` row
         rules a hairline spanning both columns before the credentials block. C48: `readout-facts`
         carries the −1-golden-step token; `gap-y-0.5` tightens the inter-fact rhythm (the spacing arm).
         O-DIR-3 (the owner's readout-collapse directive): the LABEL column is `minmax(0,1fr)` — the
         shrinkable, WRAPPING track — and the VALUE column is `auto` — sized to its own content, never
         squeezed. The prior `[auto_1fr]` order did the reverse (the label hogged max-content width,
         the value's 1fr track got crushed toward zero), so a long label + a narrow host (the 280px
         single-select drilldown) wrapped the value one glyph per line. Values never wrap intra-token;
         labels wrap. -->
    <dl class="readout-facts mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5">
        <template v-for="f in facts" :key="f.label">
            <!-- The tier divider (d-hover-ecf Move 1) — a hairline spanning both columns
                 before the first credentials row, so the spine reads first. -->
            <hr
                v-if="f.divider"
                class="readout-facts__divider col-span-2"
                aria-hidden="true"
            />
            <dt class="text-caption min-w-0">{{ f.label }}</dt>
            <!-- THE FACT VALUE — the value cell is content-sized and NEVER wraps intra-token
                 (O-DIR-3): the `auto` column takes exactly the value's own measure, so a long
                 sibling label can never crush it. The full string rides `title=` always (the
                 G-NO-MARQUEE-MOTION reveal: fixed measure + native tooltip, zero motion). -->
            <dd
                class="readout-facts__value flex items-center justify-end gap-1.5"
                :title="f.value"
            >
                <span
                    v-if="f.accent"
                    class="inline-block size-2 shrink-0 rounded-full"
                    :style="{ background: f.accent }"
                />
                <FigureSlug size="card" as="span" class="text-right">{{
                    f.value
                }}</FigureSlug>
            </dd>
        </template>
    </dl>

    <!-- The breakdown bars (per-program / per-tier) — revealed only at full density. -->
    <div
        v-if="density === 'full' && breakdown && breakdown.length"
        class="mt-3 border-t border-border/40 pt-2"
    >
        <p class="eyebrow mb-1">{{ breakdownLabel ?? "By program" }}</p>
        <div
            v-for="bar in breakdown"
            :key="bar.label"
            class="mb-0.5 flex items-center gap-2"
        >
            <span class="figure w-20 shrink-0 text-xs text-muted-foreground">{{
                bar.label
            }}</span>
            <span class="h-2 flex-1 rounded-full bg-muted/40">
                <span
                    class="block h-full rounded-full"
                    :style="{
                        width: `${Math.max(2, bar.share * 100)}%`,
                        background: bar.color,
                    }"
                />
            </span>
            <span class="figure w-12 shrink-0 text-right text-xs">{{
                bar.value
            }}</span>
        </div>
    </div>
</template>

<style scoped>
/* ── THE J-READOUT-TYPE ARM (J-FILTER C48-type · J-FEEDBACK-5 §6/§7-C48 · ATLAS-LOCAL) ───────────
   The readout typography is demoted one golden step + the unit recedes + kerning is set, all
   atlas-local (an atlas font-stack seam, NOT a glass-ui root change). Three relations:

   1 · −1 GOLDEN TYPE-STEP. The readout figure steps DOWN one rung on the φ ladder — read off the
       glass-ui golden type-step TOKEN (`--type-figure-card`), divided by the golden ratio, NEVER a
       magic px. So the readout reads one notch quieter, in-scale with the surrounding chrome, and a
       later token re-tune carries through (the token consume, not a hard px).
   2 · THE KERNING FONT-FEATURE. The atlas-local `font-feature-settings` SETS `kern` (beside the
       inherited `tnum`/`lnum` so the tabular figures stay aligned) — the kerning seam the prior
       readout left unset.
   3 · UNITS NOT BOLD (only the VALUE bold). The figure VALUE carries the bold/figure weight; the
       UNIT sub-rung (`.unit`) is DEMOTED to the regular weight so the number leads and the unit
       annotates — two bold tokens never compete (the unit-weight relation the gate reads). */
.readout-facts {
    /* the readout figure rung — ONE golden step below the card figure token (a token consume). */
    --readout-figure-step: calc(var(--type-figure-card) / 1.618);
}
/* THE FACT VALUE — the in-card value-clip reconciliation (H.W1.a · §4), SUPERSEDED by O-DIR-3 (the
   owner's readout-collapse directive): a value must NEVER wrap intra-token — H.W1.a's `white-space:
   normal; overflow-wrap: anywhere` let the value's min-content shrink to ~1 glyph, which the `auto`
   label / `1fr` value column order (since reversed, see the template) then crushed to that minimum
   beside a long label. The value cell is content-sized (the template's `auto` column) and `nowrap`;
   the full string still rides `title=`. No marquee — fixed measure + the native tooltip. C48: the
   −1 golden step + the kerning feature + the bold VALUE weight (so the demoted unit reads lighter
   than it). */
.readout-facts__value {
    overflow: visible;
}
.readout-facts__value :deep(.figure-slug-card) {
    overflow: visible;
    text-overflow: clip;
    max-inline-size: 100%;
    white-space: nowrap;
    text-align: right;
    /* C48 · −1 golden type-step (the token consume) + the kerning font-feature + the VALUE weight. */
    font-size: var(--readout-figure-step);
    font-weight: 600;
    font-feature-settings:
        "kern" 1,
        "tnum" 1,
        "lnum" 1;
}
/* C48 · UNITS NOT BOLD — the unit sub-rung (FigureSlug's `.unit`) recedes to the regular weight, so
   it reads LIGHTER than the bold value (the units-not-bold relation; only the value carries weight). */
.readout-facts__value :deep(.figure-slug-card .unit) {
    font-weight: 400;
}

/* The tier divider (d-hover-ecf Move 1) — a hairline ruling the spine from the credentials. */
.readout-facts__divider {
    border: 0;
    border-block-start: 1px solid
        var(--border, color-mix(in oklab, currentColor 18%, transparent));
    margin-block: 0.25rem 0.1rem;
    opacity: 0.5;
}
</style>
