<script setup lang="ts">
// editorial/TypewriterTitle.vue — THE TYPEWRITER TITLE (O-A26 · DIR-5 ARM D). A ONCE-classified
// title treatment for the 3 routes that carry NEITHER `ScrollLetteringHeading` NOR any reveal
// variety today (demand/usf-integrity/vft-germination — RESEARCH §1.3/§4-ARM-D's "0-for-3"). It
// wraps glass-ui's `<TypewriterText>` (installed 4.2.0, no fence) and renders as a `ChapterTitle`
// factory — the SAME `() => VNodeChild` shape `HandUnderline`/`ScrollLetteringHeading` already
// return (`DashboardEssay.vue`'s `isTitleFactory`/`TitleSlot`, zero host changes: a 3rd factory in
// an already-polymorphic slot).
//
// ── THE RECONCILIATION CALL (COMPOSE, never REPLACE) ─────────────────────────────────────────
// usf/sci/ecf/speedtest keep their bidirectional, scrub-reversible `ScrollLetteringHeading`
// UNTOUCHED — swapping to this ONCE treatment there would be a REGRESSION (ONCE < SCRUB on every
// AG6 axis: reversibility, compositor purity, position-derived). This component is a pure ADDITION
// for the 3 previously-unwired routes; it is NEVER mounted on the 4 lettering routes.
//
// ── AG13 CLASSIFICATION: ONCE, never SCRUB ────────────────────────────────────────────────────
// `useTypewriter` is `sleep()`-chained (main-thread timer-driven) — it cannot bind `--beat-tl` and
// does not reverse on scroll-up. It fires ONCE via a plain `@vueuse/core` `useIntersectionObserver`
// on this component's own host, threshold-matched to the CSS reveal's own `entry 5%` arrival
// window (`scroll-driven.css`'s `--reveal-in` default) so the glyph type-in begins roughly WHEN
// the header becomes visible. This is architecturally INDEPENDENT of the beat's SCRUB reveal: the
// ancestor `[data-reveal-beat]` fade+lift plays on `--beat-tl` exactly as it does today, untouched
// — two effects, cleanly layered, neither aware of the other's mechanism. This component is NEVER
// stamped `data-reveal-beat`'s SCRUB semantics.
//
// `<TypewriterText>` auto-starts its type-in `onMounted` (glass-ui's own `scheduleStart()`), so the
// ONCE-fire is a LAZY-MOUNT gate (the `useEChart.ts` `lazyMount` precedent) — the component mounts
// (and therefore starts typing) only once its host first intersects; the observer then `stop()`s,
// so scrolling away and back never re-mounts it (no re-type).
//
// ── a11y (the H11.b consumer law `ScrollLetteringHeading` sets — same discipline, new primitive) ──
// The ACCESSIBLE NAME stays WHOLE regardless of visual state: the wrapper is `role="img"` carrying
// `aria-label="<text>"` (both the pre-intersection plain string AND the post-intersection glyph
// run are `aria-hidden`), so a screen reader reads the title as ONE phrase, never mid-type.
//
// ── PRM ────────────────────────────────────────────────────────────────────────────────────────
// `respect-reduced-motion="true"` passthrough — glass-ui's own `useTypewriter` renders the FULL
// text immediately under PRM (no type-in), matching every other title factory's PRM behavior
// (information parity, no separate check needed here).
import { ref } from "vue";
import { useIntersectionObserver } from "@vueuse/core";
import { TypewriterText } from "@mkbabb/glass-ui/typewriter";

const props = defineProps<{
    /** The title copy (typed in glyph-by-glyph on first reveal; static — read once). */
    text: string;
}>();

const host = ref<HTMLElement | null>(null);
/** ONE-SHOT gate: flips true on the host's first intersection, mounting `<TypewriterText>` (whose
    own `onMounted` starts the type). Never flips back — the observer `stop()`s on the same tick,
    so a scroll-away/scroll-back never re-arms (the ONCE law, contrast with the beat's own
    bidirectional SCRUB reveal). */
const armed = ref(false);

const { stop } = useIntersectionObserver(
    host,
    (entries) => {
        if (armed.value) return;
        if (entries.some((e) => e.isIntersecting)) {
            armed.value = true;
            stop();
        }
    },
    // A shallow negative bottom margin approximates the CSS reveal's own `entry 5%` arrival
    // threshold (scroll-driven.css `--reveal-in` default) without a second scroll listener.
    { threshold: 0, rootMargin: "0px 0px -5% 0px" },
);
</script>

<template>
    <span ref="host" class="typewriter-title" data-testid="typewriter-title" role="img" :aria-label="text">
        <TypewriterText
            v-if="armed"
            :text="props.text"
            :respect-reduced-motion="true"
            aria-hidden="true"
        />
        <span v-else aria-hidden="true">{{ props.text }}</span>
    </span>
</template>

<style scoped>
.typewriter-title {
    display: inline;
}
</style>
