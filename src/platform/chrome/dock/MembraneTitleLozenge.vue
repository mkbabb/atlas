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
// transforms. PRM hard-cuts it
// (curve ceded to Family C). Phone is fenced: the phone register's readout is the O-03 bottom bar's
// centre (dial-13, un-shipped) — the lozenge is desktop wayfinding only, never a second phone chrome.
//
// ── U/B7 §2.1 D-7, D-11/D-12, §2.2 (O-12) ─────────────────────────────────────────────────────────
// The lozenge is the section pager at ≥ 768 px: ‹ [Section n of N · title] › (DockSectionSelect).
// It shows only past the crown, with a real active section (no empty pill: D-11/D-12), and only while
// no heading crosses the band the lozenge occupies (D-7: it never sits on a heading). The shell reserves the same band (`--shell-head-reserve`) as the headings' scroll margin,
// so a section jump lands the heading below it. Below 768 px there is no lozenge: the bottom bar's
// Sections cell carries the name.
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { UseDockStepper } from "./composables/useDockStepper.js";
import type { MembraneFacet } from "./membrane-facet.js";
// The section Select (glass Select and its list) is its own chunk: it renders only on a dashboard
// route, so the entry does not carry it (U/B7c C1, O-7).
const DockSectionSelect = defineAsyncComponent(() => import("./components/DockSectionSelect.vue"));

const props = defineProps<{
    /** True at/near the crown (`useScrollChrome.atTop`): the in-content title carries wayfinding. */
    atTop: boolean;
    /** The phone register: no lozenge (the bar's Sections cell carries the name). */
    isPhone: boolean;
    /** The dock's stepper: the active section and the section jump. */
    stepper: UseDockStepper;
}>();

// FACET 3's closed-union member — a typo is a compile error at `membrane-facet.ts`'s total switch.
const TITLE_FACET: MembraneFacet = "title-lozenge";

/** The band the lozenge occupies, from the viewport top (the shell's `--shell-head-reserve`). */
function bandPx(): number {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--shell-head-reserve");
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const v = Number.parseFloat(raw);
    if (!Number.isFinite(v)) return 5 * rem;
    return raw.trim().endsWith("rem") ? v * rem : v;
}

/** The pager's own foot sits this far above the band's foot (the 52 px pager centred on the 44 px
    circle at the inset), so a heading a section jump lands at the band's foot is clear of it. */
const PAGER_CLEARANCE_PX = 8;

/** True while any heading on the page crosses the pager's band. The pager then leaves at once (no
    leave fade), so it is never drawn over a heading. The test runs in the scroll handler, so the
    pager has left before the frame that would paint it over the heading; an IntersectionObserver
    reports a frame late, and a fresh observer reports nothing until its first callback. */
const headingInBand = ref(false);
// Live collections: a heading a lazy section or figure mounts later is in them without a re-read.
const levels = ["h1", "h2", "h3"].map((tag) => document.getElementsByTagName(tag));
let bandFoot = 0;
function measure(): void {
    if (props.isPhone) {
        headingInBand.value = false;
        return;
    }
    // Every heading in the page's main: the hero's title and the appendix headings pass under the
    // band too, not only the sections'.
    headingInBand.value = levels.some((list) => {
        for (const h of list) {
            const b = h.getBoundingClientRect();
            if (b.bottom > 0 && b.top < bandFoot && h.closest("main")) return true;
        }
        return false;
    });
}
function readBand(): void {
    bandFoot = bandPx() - PAGER_CLEARANCE_PX;
    measure();
}
// A section change can move the page without a scroll event of its own (a route's body resolving).
watch(
    () => [props.stepper.activeBeatId.value, props.isPhone] as const,
    () => readBand(),
    { immediate: true, flush: "post" },
);
onMounted(() => {
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", readBand, { passive: true });
});
onBeforeUnmount(() => {
    window.removeEventListener("scroll", measure);
    window.removeEventListener("resize", readBand);
});

function leaveNow(_el: Element, done: () => void): void {
    done();
}

/** Past the crown, on a desktop register, with a real section whose heading has left the band. */
const visible = computed<boolean>(
    () =>
        !props.isPhone &&
        !props.atTop &&
        props.stepper.activeStep.value > 0 &&
        props.stepper.activeLabel.value !== "" &&
        !headingInBand.value,
);
</script>

<template>
    <!-- The leave hook finishes at once: with no leave transition Vue would still hold the node for
         two frames, long enough to paint it over the heading that sent it away. -->
    <Transition name="lozenge" @leave="leaveNow">
        <div
            v-if="visible"
            class="membrane-lozenge"
            :data-membrane-facet="TITLE_FACET"
            data-title-lozenge
            data-testid="membrane-title-lozenge"
            :data-active-beat="stepper.activeBeatId.value"
        >
            <!-- THE VERSAL LEFT-CAP — the route's identity tick (§a.4), aria-hidden decoration. -->
            <span class="membrane-lozenge__versal" aria-hidden="true" />
            <DockSectionSelect :stepper="stepper" variant="pager" />
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
    /* centred on the 44 px circle beside it (the pager is 52 px tall). */
    inset-block-start: calc(var(--cp-inset, 1.25rem) - 0.25rem);
    inset-inline-start: calc(
        var(--cp-inset, 1.25rem) +
            var(--cp-dock-collapsed-w, var(--cp-dock-w, 4.5rem)) + 0.75rem
    );
    /* the dock's own rung: the pager is a control, so it rides above the content stage. */
    z-index: var(--z-dock);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    block-size: 3.25rem;
    max-inline-size: min(26rem, calc(100vw - 8rem));
    padding-inline: 0.75rem 0.25rem;
    /* radius scales with size (O-17): a two-line bar is not a full pill. */
    border-radius: 0.75rem;
    /* the floating-tier glass — bg / frost / warm-saturate / lit rim, all off the ONE --cp-* register
       the dock reads, so the two surfaces are one material (the C-AESTHETIC cohesion law). */
    background: var(--cp-glass-bg, color-mix(in oklab, var(--card) 78%, transparent));
    backdrop-filter: blur(var(--cp-glass-blur, 18px)) saturate(var(--cp-glass-sat, 1.35));
    border: 1px solid var(--cp-glass-rim, oklch(1 0 0 / 0.55));
    box-shadow: 0 10px 30px -18px color-mix(in oklab, CanvasText 55%, transparent);
}

/* THE VERSAL TICK — a short identity rule in the route's own accent; decorative wayfinding cap. */
.membrane-lozenge__versal {
    inline-size: 0.1875rem;
    block-size: 1.125rem;
    flex: none;
    border-radius: var(--radius-pill, 999px);
    background: var(--route-accent, var(--cp-accent, currentColor));
}

/* ── THE MATERIALISE (§a.3) — the pager grows from the disc: a left-anchored clip reveal. Its text is
   painted whole from the first frame (U/B7b · PLAN §4.2: no visible text below full opacity); the
   clip uncovers it. The pager re-enters each time a heading leaves its band, so a fade here held the
   section name translucent through the reader's scroll. It leaves at once: a heading is arriving
   under it, and a leave transition would draw over that heading. */
.lozenge-enter-active {
    transition:
        clip-path var(--duration-normal, 260ms) var(--ease-out, ease),
        transform var(--duration-normal, 260ms) var(--ease-out, ease);
}
.lozenge-enter-from {
    clip-path: inset(0 100% 0 0 round 0.75rem);
    transform: translateX(-0.375rem);
}
.lozenge-enter-to {
    clip-path: inset(0 0 0 0 round 0.75rem);
    transform: none;
}

/* PRM — the reveal hard-cuts (the curve ceded to Family C; information parity). */
@media (prefers-reduced-motion: reduce) {
    .lozenge-enter-active {
        transition: none;
    }
    .lozenge-enter-from {
        clip-path: none;
        transform: none;
    }
}
</style>
