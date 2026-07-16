<script setup lang="ts">
// AuroraVeilStage.vue — THE AURORA-VEIL MEMBRANE (§I-VEIL §2 · NET-NEW · the thin presentational
// frame, NOT a state home). Wraps glass-ui `<Surface tier="floating">` and stages its slot body
// ON a bounded, data-keyed glow membrane lit from BENEATH in the selection's OWN verdict hue. Driven
// by the ONE `useAuroraVeil` engine; both stage surfaces (this card · the I6 drawer) read the SAME
// `veilHue`, so the two read as ONE light-table and cannot drift.
//
// THE FIVE §AB CONTAINMENT CLAMPS (LAW — the re-channel can never regrow into the bug it re-channels):
//   #1 `contain: paint` on the stage host — the glow CANNOT paint outside the box, full stop.
//   #2 the glow is a `radial-gradient` MASKED with the ChartFrame edge-fade grammar — it fades INTO
//      the frame, never bleeds past the rounded edge (the very doctrine that KILLED the §AB bug).
//   #3 `--veil-strength` HARD-CLAMPED to the §1.4 ceiling (0.14 light / 0.12 dark) — owned by the
//      engine, read off the ONE theme source.
//   #4 the glass-NEVER-a-plate XOR — the veil vars live ONLY on the two stage surfaces + the
//      composable; ZERO glow on any ChartFrame / data plate (a grep stays 0 there).
//   #5 the STRUCTURAL neutral floor — at `--veil-strength: 0` the field `::before` is `opacity: 0`
//      (a literal no-op) AND the 1px accent rim `color-mix` collapses to EXACTLY `--cp-glass-rim`
//      (off === off, byte-identical-neutral).
//
// THE MEDAL-SCARCITY LAW (graft A). `metal` is SINGULAR by contract: only the FOCUSED member's stage
// sets it to a non-`none` value — never N members. ONE gilt at a time. The metal border CONSUMES the
// published glass-ui W-METAL-SHIMMER family (`.metal-{gold,silver,bronze}-border` / `.metal-rainbow-rim`
// driven by `metal-shimmer-sweep` on the now-DEFINED `--duration-metal: 6s` token — the published 4.1.0
// cut ships the token, so the shimmer runs at the slow proportionate sheen with NO consumer fallback.
//
// `.glass-refract` stays OFF the glow (the §I-VEIL DO-NOT-GRAFT — Chromium-only, resize-expensive);
// the membrane never carries it. The reveal/crossfade/select-sweep ride the published `--glass-reveal`
// grammar (BB.W-LIQUID-REVEAL — the spring-snappy clock + the no-overshoot ease the library DEFINES),
// compositor-only (opacity / background / background-position the ONLY animated props), PRM hard-cut to
// static (the structure shows; the motion is gated). NO consumer `--liquid-reveal-*` fallback envelope.
import { computed, toRef } from "vue";
import { Surface } from "@mkbabb/glass-ui/surface";
import { useAuroraVeil, type VeilCentroid } from "./composables/useAuroraVeil.js";

const props = withDefaults(
    defineProps<{
        /** The staged hue (a COMPLETE colour off `useSelection.veilHue`), or null ⇒ the unlit floor. */
        hue: string | null;
        /** The bloom-centroid under the focused glyph (graft A); null ⇒ the static corner. */
        centroid?: VeilCentroid | null;
        /** The medal-SINGULAR metal border (the focused/front member only — the medal-scarcity law). */
        metal?: "none" | "gold" | "silver" | "bronze" | "rainbow";
        /** A one-shot catch-light sweep fires while true (the [data-fresh-select] arrival beat). The
            CONSUMER re-arms it per fresh selection (sets false → next frame true → clears on settle). */
        freshSelect?: boolean;
    }>(),
    {
        centroid: null,
        metal: "none",
        freshSelect: false,
    },
);

// The ONE glow engine — neither this stage nor the drawer re-derives glow.
const veil = useAuroraVeil({
    hueSource: toRef(props, "hue"),
    centroid: toRef(props, "centroid"),
});

// The host class string — the stage class + the metal border (the SHIPPED W-METAL-SHIMMER family).
// `rainbow` → `.metal-rainbow-rim` (the prismatic gilt rim composing the W-GLASS-ACCENT seam);
// gold/silver/bronze → the swept `.metal-{name}-border` rim. `none` → no metal class (the neutral
// rim, the medal-scarcity rest). Combined into ONE string so it binds Surface's `class` prop
// (typed `string`) — Vue merges it onto the root via the library's `cn(...)`.
const hostClass = computed<string>(() => {
    let metal = "";
    if (props.metal === "rainbow") metal = " metal-rainbow-rim";
    else if (props.metal !== "none") metal = ` metal-${props.metal}-border`;
    return `aurora-veil-stage${metal}`;
});
</script>

<template>
    <Surface
        tier="floating"
        :class="hostClass"
        :data-lit="veil.isLit.value ? 'true' : undefined"
        :data-fresh-select="freshSelect ? '' : undefined"
        :style="veil.veilStyle.value"
    >
        <!-- THE RING, NOT THE SLAB (J-FILTER C31 · arm d · the gold-FILL→RING). The `.aurora-veil__glow`
             radial membrane is DELETED here (Phase-A, atlas-local): it painted a saturated content-box
             slab the 2026-06-22 review named "FAR too explicit — it should be a RING" (J-FEEDBACK-4 §3).
             Dropping the radial IS the correct "ring not fill" move — the verdict hue now reads through
             the 1px accent RIM alone (the `.aurora-veil-stage` border below), the cheapest, calmest
             expression of the hue. The stage's ONLY consumers are the selection cards (SelectionPreview ·
             the FilterView facility), so the radial had no non-selection home to preserve. -->
        <!-- graft C — the one-shot catch-light SWEEP on select (fires once via [data-fresh-select],
             then rests — NEVER a marquee / breathing-radial, the §AB bug). -->
        <div class="aurora-veil__sweep" aria-hidden="true" />

        <!-- the optional header crest (the drag handle / eyebrow seats here in the card consumer). -->
        <slot name="crest" />
        <!-- the staged body — the hero glyph + the readout (the card consumer's lockup). -->
        <slot />
    </Surface>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════════════════════
   THE AURORA-VEIL STAGE — the bounded, data-keyed glow membrane (the five §AB clamps as CSS LAW).
   ════════════════════════════════════════════════════════════════════════════════════════════ */
.aurora-veil-stage {
    position: relative;
    isolation: isolate;
    contain: paint; /* §AB clamp #1 — the glow's blast radius is structurally walled to the box. */
    border-radius: var(--cp-radius, 1.25rem);
    /* graft C — the 1px accent RIM (the cheapest expression of the hue; carries the verdict when the
       field is budget-clamped). §AB clamp #5: the color-mix collapses to EXACTLY --cp-glass-rim at
       strength 0 (off === off — no "is it actually off?" ambiguity). */
    border: 1px solid
        color-mix(
            in oklab,
            var(--cp-glass-rim),
            var(--veil-accent, transparent) calc(var(--veil-strength, 0) * 100%)
        );
    /* the rim eases on the PUBLISHED reveal clock — the spring-snappy settle duration + the
       no-overshoot ease the `.glass-reveal` recipe reads (BB.W-LIQUID-REVEAL), NOT a consumer
       `--liquid-reveal-*` fallback. */
    transition: border-color var(--spring-snappy-duration) var(--ease-out);
}

/* THE RING, NOT THE SLAB (J-FILTER C31 · arm d). The `.aurora-veil__glow` radial-membrane rule is
   DELETED — it painted the saturated content-box gold slab the review rejected (J-FEEDBACK-4 §3). The
   verdict hue now reads through the 1px accent RIM alone (the `.aurora-veil-stage` border above), so
   the card is a clean RING. The `[data-lit]` glow toggle is gone with it; `[data-lit]` survives only
   as the engine's lit STATE flag (read by the rim's `--veil-strength`), not a slab switch. */

/* graft C — the one-shot catch-light SWEEP on select. A travelling band fired ONCE per fresh
   selection via [data-fresh-select], then rests. background-position is the ONLY animated prop. */
.aurora-veil__sweep {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    border-radius: inherit;
    background: linear-gradient(
        105deg,
        transparent 40%,
        color-mix(in oklab, var(--veil-accent, transparent), white 30%) 50%,
        transparent 60%
    );
    background-size: 220% 100%;
    background-position: 130% 0;
    /* masked to the frame like the glow — the catch-light never escapes the rounded edge either. */
    -webkit-mask-image: radial-gradient(
        var(--veil-mask-extent, 130%) var(--veil-mask-extent, 130%) at 50% 50%,
        #000 55%,
        transparent 100%
    );
    mask-image: radial-gradient(
        var(--veil-mask-extent, 130%) var(--veil-mask-extent, 130%) at 50% 50%,
        #000 55%,
        transparent 100%
    );
    opacity: 0;
}
.aurora-veil-stage[data-fresh-select] .aurora-veil__sweep {
    opacity: 1;
    /* the one-shot catch-light eases on the PUBLISHED reveal ease (`--ease-out` — the no-overshoot
       curve the `.glass-reveal` recipe rides), NOT a consumer `--liquid-reveal-*` fallback. */
    animation: veil-sweep var(--duration-sheen, 2.4s) var(--ease-out) 1;
}
@keyframes veil-sweep {
    from {
        background-position: 130% 0;
    }
    to {
        background-position: -30% 0;
    }
}

/* PRM — the membrane STILL renders (it is structure, not motion); only the crossfade + the one-shot
   sweep are hard-cut to nothing. The static rim + the static field carry the verdict at parity. */
@media (prefers-reduced-motion: reduce) {
    .aurora-veil-stage {
        transition: none;
    }
    .aurora-veil__sweep {
        animation: none;
        opacity: 0;
    }
}
</style>
