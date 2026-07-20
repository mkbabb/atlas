<script setup lang="ts">
// platform/editorial/Beat.vue — THE shell every manifest entry renders into (F3a /
// design-interstitial-system §3.0). A beat is not a component the author writes by hand; it
// is what the page-assembly MANIFEST renders. But the SHELL every beat shares — the
// `<section class="beat" data-reveal-beat>` host + the reveal register + the optional
// margin `<FigureInitial>` + the testid — is ONE wrapper, so the three hand-copied
// DashboardBody scaffolds (usf/sci/ecf) stop re-spelling the same `<section>` shell per beat
// per body. This is the load-bearing de-copy of design-interstitial-system §1.1.3+§1.1.4:
// everything else in the vocabulary composes THROUGH it.
//
// REGISTER LAW: <Beat> is the PAPER ground — it declares NO --attn-* of its own (its CHILD
// does; the plate owns its data rung, the interstitial its pull/legend/chrome rung). It is
// never glass, never a plate; it is the un-gridded section the data-essay flows down.
//
// REVEAL CLOCK (the F6.3 seam): the section is the `[data-reveal-beat]` host. The native
// `view()` engine (scroll-driven.css) OWNS the fade+lift on the compositor — <Beat> emits NO
// inline `beatStyle` (the assembler computes that ONLY in the `@supports` fallback path; here
// the markup is the host, the CSS is the writer — the single-writer law, T6). The `reveal`
// prop maps to the scroll-driven.css attribute TIERS so a beat opts into the corrected
// (faster, F6.3) reveal window without per-component timing:
//   default → the base `entry 10% / cover 38%` window.
//   dense   → `[data-dense]` (a data-heavy plate reveals SOONER — entry 5% / cover 30%).
//   chrome  → `[data-chrome]` (a chrome/about beat reveals gentlest — entry 12% / cover 40%).
//   tail    → `[data-reveal-tail]` (the colophon tail-beat — the reachability fix; completes
//             exactly when the beat is fully present, never resting dim).
//
// PRM: inherited from the engine — under reduced motion the `from` keyframe never binds
// (scroll-driven.css outer `@media (prefers-reduced-motion: no-preference)`); the section
// stands at its terminal state. Information parity total (INV-F6).
//
// a11y: a `<section>` with the anchor id (the dock `kind:"beat"` scroll target). The optional
// `<FigureInitial>` is `role="img"` (the library wrapper); the `#header` slot carries the
// eyebrow + `<h2>` + dek triplet the plate header owns (interstitials omit it).
import { computed, provide } from "vue";
import FigureInitial from "../platform/chrome/masthead/FigureInitial.vue";
import { BEAT_TITLE_KEY } from "../charts/legend/beat-title.js";
import type { ColorKind } from "../charts/scale/colorKind.js";

const props = withDefaults(
    defineProps<{
        /** The reveal register → the scroll-driven.css attribute tier (the F6.3 seam). */
        reveal?: "default" | "dense" | "chrome" | "tail";
        /** The lead beat opts OUT of the lift (a translate on it displaces the masthead top —
            the B4 fix the bodies hard-code today as `beatStyle(scene, false)`). The reveal
            engine reads `data-reveal-once="load"` for the lead's load-anchored draw. */
        lift?: boolean;
        /** The chapter figure-number — mounts <FigureInitial> in the margin when present. */
        figure?: number;
        /** colorKind / hinge passthrough to the cap (the dashboard's live-legend kind). */
        colorKind?: ColorKind;
        hinge?: number;
        /** The accessible chapter label announced for the FigureInitial. */
        figureLabel?: string;
        /** The anchor id (the dock scroll target) + the testid suffix. */
        id?: string;
        testid?: string;
        /** TRUE iff this beat renders the chapter title itself (its <h2>) — provided DOWN so the
            figure suppresses its masthead title RUNG (the K-F title-dedup seam). Sentinels = FALSE. */
        titleOwned?: boolean;
        /** TRUE iff this beat's body mounts a `position:sticky` descendant (a <StickyScene> pin).
            The O-A3 arm A-ii harden: root `content-visibility` applies layout+size containment to
            the WHOLE beat, and a sticky pin under a contained ancestor re-bases to the contained box
            and stops sticking (VIRT F-7 · virtualization §2.3-1). So a sticky beat opts OUT of the
            root render-skip — its box PERSISTS (never windowed; the reveal + `--beat-tl`/`--scroll-tl`
            timelines are unaffected) and it renders eagerly, keeping the pin's ancestor chain
            containment-free. Its whole body IS the pin (the two-column scene grid), so there is no
            separable non-pin body to move CV onto — arm A-ii's "root-only CV on the inner body"
            degenerates here to root-CV-exemption. A tall N-viewport scene is on-screen for its whole
            transit anyway, so the skip would save ~nothing. Sentinels (every other beat) = FALSE. */
        sticky?: boolean;
    }>(),
    {
        reveal: "default",
        lift: true,
        figure: undefined,
        colorKind: "diverging",
        hinge: 0.5,
        figureLabel: undefined,
        id: undefined,
        testid: undefined,
        titleOwned: false,
        sticky: false,
    },
);

// PROVIDE the title-ownership DOWN this beat's subtree (the K-F title-dedup seam). A feature-plate
// Component AND a declarative VizContract both mount inside this <Beat>, so the seam covers BOTH the
// self-mounting-plate path and the declarative-contract path with ONE provide. A chapter's
// title-ownership is STATIC across its life, so the provide is a plain constant, not a Ref (KISS).
provide(BEAT_TITLE_KEY, { owned: props.titleOwned });

/** The lead beat (no lift) carries the page's first structural header, so its reveal is the
    load-anchored one-shot (`data-reveal-once="load"`) — the lead fades IN PLACE, never
    displacing the measured masthead top. Interior beats keep the full scroll-scrubbed rise. */
const revealOnce = computed<string | undefined>(() => (props.lift ? undefined : "load"));
</script>

<template>
    <section
        :id="id"
        class="beat section-anchor"
        :class="{ 'beat--lead': !lift, 'beat--sticky': sticky }"
        data-reveal-beat
        :data-reveal-once="revealOnce"
        :data-dense="reveal === 'dense' ? '' : undefined"
        :data-chrome="reveal === 'chrome' ? '' : undefined"
        :data-reveal-tail="reveal === 'tail' ? '' : undefined"
        :data-testid="testid ? `beat-${testid}` : undefined"
    >
        <!-- The illuminated chapter cap — the platform signature (FD3 §0). It COMPOSES with the
             beat across the chrome↔editorial boundary (it stays in chrome/; the beat mounts it,
             never duplicates it). Inline above the body on the lead (the filter covers the left
             gutter); in the left margin for interior beats (the manuscript grid-break). -->
        <FigureInitial
            v-if="figure != null"
            :figure="figure"
            :hinge="hinge"
            :color-kind="colorKind"
            :label="figureLabel"
            class="beat__initial"
            :class="{ 'beat__initial--inline': !lift }"
        />

        <!-- The header triplet — eyebrow · <h2> · dek. Interstitials omit it (no #header). -->
        <header v-if="$slots.header" class="beat__header space-y-3">
            <slot name="header" />
        </header>

        <!-- The beat body — the plate, or the interstitial element. -->
        <slot name="figure" />
    </section>
</template>

<style scoped>
/* NO `.beat` transition (scroll-reveal-design §5.1): a scroll-scrubbed property has ONE clock
   (the scroll position); the reveal lives on the native `view()` engine (scroll-driven.css),
   the `@supports` fallback's smoothing in its scalar — never a CSS `transition` chasing a
   per-frame target. Each beat is a positioning context so the dropped-cap can sit in the left
   margin, overlapping the plate's upper-left corner (the manuscript grid-break, FD3 §0). This
   is the ONE grid-break recipe the three bodies copy-pasted into their `<style scoped>` today
   (design-interstitial-system §1.1.4) — hoisted here so the body stops re-spelling it. */
.beat {
    position: relative;
}

/* ── J-PERF · THE BELOW-FOLD RENDER SKIP (D2 — the recalc bounds to the viewport) ───────────────
   Every INTERIOR beat (not the lead, which is above the fold) opts into `content-visibility: auto`,
   so the browser SKIPS its layout/style/paint while it sits offscreen and renders it as it nears the
   viewport — the per-frame style recalc + the `:root`-invalidation reflow bound to the on-screen
   beats, not the whole /sci essay (the node-count tax is paid only for what is seen). The paired
   `contain-intrinsic-size` RESERVES a placeholder box so a skipped beat occupies its real height —
   no scrollbar jump, no CLS regression (the reservation is the size guard `content-visibility` needs;
   the value is a generous single-beat estimate, the browser remembers the real size once painted).
   This composes with the native `view()` reveal: a skipped beat un-skips before it enters the
   viewport, so `--beat-tl` resolves and the fade+lift fires on schedule. The LEAD beat is EXEMPT
   (it is the above-fold first paint — skipping it would defeat its `data-reveal-once="load"` draw).

   ── O-A3 · THE STICKY-BEAT EXEMPTION (VIRT F-7 arm A-ii · virtualization §2.3-1, §8) ──────────────
   `content-visibility:auto` applies size+layout containment; a `position:sticky` descendant under a
   contained ancestor re-bases to the contained box and STOPS sticking. So a beat that mounts a sticky
   pin (`.beat--sticky` — a <StickyScene> host) opts OUT of the root render-skip: its box PERSISTS
   (never windowed — the reveal + `--beat-tl`/`--scroll-tl` timelines + anchors are all unaffected)
   and it renders eagerly, keeping the pin's ancestor chain containment-free (measured sticky offset
   Δ ≈ 0 with the exemption; CV on the `.beat` root breaks it — the o0-sticky-under-cv gate). A scene's
   whole body IS the pin (the two-column steps-scroll grid), so there is no separable non-pin body to
   move CV onto — arm A-ii's "root-only CV on the inner body" degenerates to this root-CV-exemption;
   the tall N-viewport scene is on-screen for its entire transit, so the skip would save ~nothing.

   ── O-A3 · THE MEASURED RESERVATION (virtualization Rung 2) ──────────────────────────────────────
   `--beat-cis` is the per-route MEASURED interior-beat height reservation (the speedtest/demand bodies
   already do this on their figure mounts: `auto 1050px`/`auto 1960px`). Each route's DashboardBody sets
   the measured value (mobile) with a `@media (min-width:1024px)` desktop override; the generic 720px is
   the un-tuned fallback. The `auto` keyword means the browser caches the REAL size after first paint, so
   the reservation only governs the pre-paint estimate (kills anchor drift + CLS on the first visit). */
.beat:not(.beat--lead):not(.beat--sticky) {
    content-visibility: auto;
    contain-intrinsic-size: auto var(--beat-cis, 720px);
}
.beat__initial--inline {
    margin-bottom: 0.5rem;
}
/* THE NARROW-WIDTH WATERMARK LAW (dial 1's phone half). Below the flank's minimum inline room there
   is no margin to set the cap in, so the un-inline cap used to fall into the FLOW — a
   `--type-display-mega`-wide block stacked above the eyebrow, which is the OF-22 complaint made
   worse (a second numeral, and one that pushes the reading column down as well). It becomes a true
   BEHIND-TEXT watermark instead: out of flow entirely (it reserves nothing and shifts nothing — CLS
   0 by construction), pinned to the beat's origin, and BENEATH the header's rung so it can never
   occlude a glyph of the reading column. */
@media (max-width: 1023.98px) {
    .beat__initial:not(.beat__initial--inline) {
        position: absolute;
        inset-block-start: -0.15em;
        inset-inline-start: 0;
        z-index: 0;
    }
}
.beat__header {
    /* flow-root so a route's floated illuminated initial (the #beat-initial lettrine) is contained
       within the header and never leaks onto the plate below. A no-op for routes with no header
       float (the three atlas bodies): it only establishes float containment, changes no spacing.
       The rung is the other half of BOTH watermark laws (narrow and wide): wherever a beat carries a
       reading header, that header paints OVER the cap, never under it — so no width, pole or ink
       rung can put a decorative glyph on top of a read word. `2` clears the wide law's `1`. */
    display: flow-root;
    margin-bottom: 0.5rem;
    position: relative;
    z-index: 2;
}
/* THE FLANK SEAT (dial 1's wide half) — the manuscript grid-break, FD3 §0.

   This rule used to break the cap OUTWARD, `transform: translateX(-115%)`, into what it called "the
   reserved LEFT dock gutter … it has 112px of room". THE ROOM IS NOT THERE. The gutter is the
   shell's `padding-inline-start: 112px`, and the floating dock rail occupies x 20…92 of it, so 20px
   is ever clear — while 115% of the `--type-display-mega` cap is 182px at 1440. The cap landed at
   x = −75: the platform's one unforgettable signature rendered OFF-VIEWPORT on the flank of EVERY
   route, and went unnoticed only because it was pinned at the ⑤ ghost rung. Restoring its ink
   (dial 1) did not cause the exile — it made it visible. No width makes 182px fit in 20px, so the
   outward break is DELETED rather than re-tuned.

   The cap seats AT its beat's start edge instead, lapping the plate's upper-left corner — which is
   what the grid-break always described, and what the `data-title="right"` pole (DashboardEssay.vue)
   already concluded independently when the mirrored `translateX(115%)` bled past the RIGHT viewport
   edge. That pole seated its cap at the block edge and shipped; this is the same cure on the side
   that needed it just as badly, so the seat is now the shared law and the pole rule keeps only its
   side. The rung stays ① — over the plate it decorates, under the ② reading header above. */
@media (min-width: 1024px) {
    .beat__initial:not(.beat__initial--inline) {
        position: absolute;
        inset-block-start: -0.35em;
        inset-inline-start: 0;
        z-index: 1;
    }
}
/* The lead beat's cap leads the body inline (the filter covers its margin), sized DOWN from
   the mega rung — a compact chapter initial that doesn't push the lead plate below the fold.
   The compound selector (ancestor `.beat--lead` + the root `.beat__initial--inline`)
   deterministically out-specifies FigureInitial's own `.figure-initial` width. */
.beat--lead .beat__initial--inline {
    width: clamp(3.5rem, 5vw, 4.5rem);
    margin-block-start: 0;
    margin-inline-start: 0;
}
</style>
