<script setup lang="ts">
// MembraneTitleLozenge — FACET 3 of the closed membrane (spec-chrome §a · §c.1 row 3, the A-39 fold).
//
// THE WAYFINDING LOZENGE. At REST-COLLAPSED (past the crown, `!atTop`) the reading chrome is the
// crest disc + progress rim; the in-content `<h2>` has lifted away, so the reader loses "what section
// am I in?". The lozenge is the answer: a small floating glass pill grafted onto the disc's right
// edge, carrying the ACTIVE beat's `navLabel` as a wayfinding kicker — the horizontal growth the
// collapsed disc earns (§a.2, "net-new horizontal growth grafted onto the disc"). It is not a second
// instrument: at the node-count grain the membrane stays one, and this facet paints ONLY the disc's
// missing voice.
//
// ── THE SEAM-15 SUBORDINATION (spec-chrome §a.3 · RD-4G α-3 · spec-motion §h N5) ──────────────────
// The label reads `useActiveBeat.activeBeatLabel` — the store the dock's ONE upper-third
// IntersectionObserver writes (`useDockStepper.ts:131`, the single-writer). There is NO second
// derivation here: the lozenge mirrors the one dock-IO scalar, so during a live `pin` transit its
// breadcrumb stays PARKED at the pinned beat exactly as the dock IO does (which, subordinated to
// `round(storyT)` at its own writer, cannot flip mid-transit). The "consumer-side seat the seam-15
// ruling requires" is precisely this: consume the single store, add no rival clock (§a.3 clause 2).
//
// ── THE VERSAL LEFT-CAP (§a.4) — CONSUMED, not re-owned ──────────────────────────────────────────
// The left cap is `aria-hidden` decoration in the route's own identity ink (`--route-accent`), a
// wayfinding tick — B declares no versal field/motif. The lozenge's accessible name is the navLabel
// text alone. (D's illuminated `Chapter.versal` glyph is the flank watermark's; the depth breadcrumb
// is CSS middle-truncation until A's manifest `points?` recursion lands, §a.5 — stated, not smuggled.)
//
// ── THE CHOREOGRAPHY (§a.3, bi-directional) ──────────────────────────────────────────────────────
// The pill MATERIALISES from the disc when `!atTop` (clip grow + fade) and RE-COLLAPSES to the bare
// disc at the crown (`atTop`), as the in-content title re-reveals — the mirror composition, not 87
// transforms. On an `activeBeatId` change the label CROSS-FADES (keyed out-in). PRM hard-cuts both
// (curve ceded to Family C). Phone is fenced: the phone register's readout is the O-03 bottom bar's
// centre (dial-13, un-shipped) — the lozenge is desktop wayfinding only, never a second phone chrome.
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useActiveBeat } from "../../stores/useActiveBeat.js";
import type { MembraneFacet } from "./membrane-facet.js";

const props = defineProps<{
    /** True at/near the crown (`useScrollChrome.atTop`) — the lozenge rests as the bare disc there
        (the in-content title carries wayfinding). Materialises the instant the reader leaves the top. */
    atTop: boolean;
    /** The phone register — the lozenge is desktop-only (the phone readout is the O-03 bar, dial-13). */
    isPhone: boolean;
}>();

// FACET 3's closed-union member — a typo is a compile error at `membrane-facet.ts`'s total switch.
const TITLE_FACET: MembraneFacet = "title-lozenge";

// The single dock-IO scalar (single-writer; no rival clock — the seam-15 seat).
const { activeBeatId, activeBeatLabel } = storeToRefs(useActiveBeat());

/** The lozenge paints only past the crown, on a desktop register, with a real labelled beat. At the
    crown / on phone / before the first labelled beat it is the bare disc (nothing). */
const visible = computed<boolean>(
    () => !props.isPhone && !props.atTop && activeBeatLabel.value !== "",
);
</script>

<template>
    <Transition name="lozenge">
        <div
            v-if="visible"
            class="membrane-lozenge glass-material"
            :data-membrane-facet="TITLE_FACET"
            data-title-lozenge
            data-testid="membrane-title-lozenge"
            :data-active-beat="activeBeatId"
        >
            <!-- THE VERSAL LEFT-CAP — the route's identity tick (§a.4), aria-hidden decoration. -->
            <span class="membrane-lozenge__versal" aria-hidden="true" />
            <!-- THE NAVLABEL — the accessible wayfinding word; cross-fades on the beat change. -->
            <Transition name="lozenge-label" mode="out-in">
                <span :key="activeBeatId" class="membrane-lozenge__label">{{
                    activeBeatLabel
                }}</span>
            </Transition>
        </div>
    </Transition>
</template>

<style scoped>
/* THE FLOATING GLASS PILL — the same Control-Plane material register as the dock (--cp-glass-*), so
   the lozenge reads as ONE membrane with the disc it grows from. Fixed to the viewport top-left,
   anchored PAST the dock's right edge with a constant 0.75rem seam: `--cp-dock-collapsed-w` (minted
   with the gutter death) resolves the collapsed disc's true width, falling back to the full rail so
   the anchor never overlaps the rail in EITHER posture. The pill's block extent matches the collapsed
   disc so its centre-line aligns with the crest medal. */
.membrane-lozenge {
    position: fixed;
    inset-block-start: calc(var(--cp-inset, 1.25rem) + 0.5rem);
    inset-inline-start: calc(
        var(--cp-inset, 1.25rem) +
            var(--cp-dock-collapsed-w, var(--cp-dock-w, 4.5rem)) + 0.75rem
    );
    z-index: var(--z-sticky, 30);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    block-size: 2.75rem;
    max-inline-size: min(22rem, calc(100vw - 8rem));
    padding-inline: 0.875rem 1rem;
    border-radius: var(--radius-pill, 999px);
    /* the floating-tier glass — bg / frost / warm-saturate / lit rim, all off the ONE --cp-* register
       the dock reads, so the two surfaces are one material (the C-AESTHETIC cohesion law). */
    background: var(--cp-glass-bg, color-mix(in oklab, var(--card) 78%, transparent));
    backdrop-filter: blur(var(--cp-glass-blur, 18px)) saturate(var(--cp-glass-sat, 1.35));
    -webkit-backdrop-filter: blur(var(--cp-glass-blur, 18px))
        saturate(var(--cp-glass-sat, 1.35));
    border: 1px solid var(--cp-glass-rim, oklch(1 0 0 / 0.55));
    box-shadow: 0 10px 30px -18px color-mix(in oklab, CanvasText 55%, transparent);
    pointer-events: none; /* wayfinding readout, not a control — never intercepts a page pointer */
}

/* THE VERSAL TICK — a short identity rule in the route's own accent; decorative wayfinding cap. */
.membrane-lozenge__versal {
    inline-size: 0.1875rem;
    block-size: 1.125rem;
    flex: none;
    border-radius: var(--radius-pill, 999px);
    background: var(--route-accent, var(--cp-accent, currentColor));
}

/* THE NAVLABEL — the wayfinding kicker register (--type-kicker, ≥13px; A13's ≥12px chrome floor is
   cleared). One line, middle/tail truncation under pressure (§a.5, until the recursion lands). */
.membrane-lozenge__label {
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: var(--type-kicker, 0.875rem);
    font-weight: 550;
    letter-spacing: 0.01em;
    color: var(--foreground);
}

/* ── THE MATERIALISE (§a.3) — the pill grows from the disc: a left-anchored clip reveal + fade. ── */
.lozenge-enter-active,
.lozenge-leave-active {
    transition:
        clip-path var(--duration-normal, 260ms) var(--ease-out, ease),
        opacity var(--duration-normal, 260ms) var(--ease-out, ease),
        transform var(--duration-normal, 260ms) var(--ease-out, ease);
}
.lozenge-enter-from,
.lozenge-leave-to {
    opacity: 0;
    clip-path: inset(0 100% 0 0 round var(--radius-pill, 999px));
    transform: translateX(-0.375rem);
}
.lozenge-enter-to,
.lozenge-leave-from {
    opacity: 1;
    clip-path: inset(0 0 0 0 round var(--radius-pill, 999px));
    transform: none;
}

/* ── THE LABEL CROSS-FADE (§a.3 clause 2) — a quiet out-in swap on the beat change. ── */
.lozenge-label-enter-active,
.lozenge-label-leave-active {
    transition: opacity var(--duration-fast, 160ms) var(--ease-standard, ease);
}
.lozenge-label-enter-from,
.lozenge-label-leave-to {
    opacity: 0;
}

/* PRM — both morphs hard-cut to opacity-only (the curve ceded to Family C; information parity). */
@media (prefers-reduced-motion: reduce) {
    .lozenge-enter-active,
    .lozenge-leave-active,
    .lozenge-label-enter-active,
    .lozenge-label-leave-active {
        transition: opacity var(--duration-fast, 120ms) linear;
    }
    .lozenge-enter-from,
    .lozenge-leave-to {
        clip-path: none;
        transform: none;
    }
}
</style>
