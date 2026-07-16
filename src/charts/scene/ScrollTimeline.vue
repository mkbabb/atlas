<script setup lang="ts">
// platform/charts/ScrollTimeline.vue — the VISIBLE per-viz scrubber rail (H.W11.a). A slim
// "deck position" indicator that shows WHERE in this viz's story the reader is, and that is
// ITSELF a `ManualTimeline.seek` operator — drag it, or focus + arrow-key it, to scrub the
// viz forward and back. It is the per-viz peer of the H9 dock deck: the dock answers "where
// in the ROUTE", this rail answers "where in THIS viz's story", in ONE visual language (the
// same slide-dot filmstrip + tritone ring + the lone `--cp-accent` active mark).
//
// ── LINKED TO THE ENGINE, NOT A SECOND CLOCK ─────────────────────────────────────────────
// The rail binds a `useScrollTimeline` instance (passed in): it READS `progress` + `facets`
// + `activeIndex` to PAINT, and CALLS `seek(p)` / `release()` to scrub. While the user grabs
// the rail the engine reports the seeked position (the manual-override fence); on release the
// master position hands back to scroll. So the rail is a second WRITER of the master position
// only while held — the touch + keyboard fence the spec names, the SAME engine throughout.
//
// ── THE THREE FENCES (designed) ──────────────────────────────────────────────────────────
//   • keyboard — the rail is a WCAG slider (`role="slider"`, `tabindex=0`, `aria-valuenow`):
//     ←/→ step between facet stops, Home/End jump to the ends, PageUp/Down nudge by a facet.
//   • touch — pointer-capture drag scrubs continuously; the facet stops are the snap targets.
//   • reduced-motion — when the engine is `terminal`, the rail renders its FULL filmstrip at
//     the end position (every dot lit-through), still operable but with no scrub animation
//     (the dots don't slide; the active mark is set, not sprung) — information parity.
import { computed, watch } from "vue";
import type { UseScrollTimeline } from "../../motion/useScrollTimeline.js";

const props = withDefaults(
    defineProps<{
        /** The engine this rail paints + operates — one `useScrollTimeline` per viz. */
        timeline: UseScrollTimeline;
        /** The accessible name announced for the slider (e.g. "USF decade story position"). */
        label?: string;
        /** The per-stop tritone hue cycler (the H9 deck idiom) — the route's ≥3-colour index
            so the rail reads as a coloured filmstrip, never a monochrome bar. Defaults to the
            route tritone custom-property cycle (the same fallback Dock.vue uses). */
        rivetHue?: (index: number) => string;
        /** The consumer's DISTINCT identifying handle (J-SCROLL §8 — the rail self-testid fix).
            The component's own stable `data-testid='scroll-timeline-rail'` and a per-instance
            consumer handle stopped sharing one attribute slot: the consumer passes its handle
            HERE, rendered onto a separate `data-rail-id`, so the component's self-id is never
            clobbered by a fallthrough-attr merge. (Until consumers re-point onto `:rail-id`, the
            consumer's `data-testid` fallthrough still resolves onto its own `data-testid` slot —
            the two handles no longer collide because the self-id now rides `data-rail-id`.) */
        railId?: string;
    }>(),
    {
        label: "Story position",
        rivetHue: undefined,
        railId: undefined,
    },
);

/** The route tritone fallback (mirrors Dock.vue's `ROUTE_TRITONE`) — so a rail with no
    explicit `rivetHue` still reads as a ≥3-colour index off the route accents (SM-2). */
const ROUTE_TRITONE = [
    "var(--route-accent)",
    "var(--route-accent-warm, var(--route-accent))",
    "var(--route-accent-cool, var(--route-accent))",
];
function hueOf(index: number): string {
    if (props.rivetHue) return props.rivetHue(index);
    return ROUTE_TRITONE[index % ROUTE_TRITONE.length];
}

const facets = computed(() => props.timeline.facets.value);
const progress = computed(() => props.timeline.progress.value);
const activeIndex = computed(() => props.timeline.activeIndex.value);
const seeking = computed(() => props.timeline.seeking.value);

/** The active facet's human label — the rail's text readout ("Year 2024" / "Crossover"). */
const activeLabel = computed(() => {
    const i = activeIndex.value;
    const f = facets.value[i];
    return f ? f.label : "";
});

/** The "Stop N of M" word for the live region (never colour-alone — the WCAG readout). */
const stepWord = computed(() => {
    const total = facets.value.length;
    if (total === 0) return "";
    return `Stop ${Math.max(1, activeIndex.value + 1)} of ${total}`;
});

// ── THE OPERATOR (drag + keyboard seek) ──────────────────────────────────────────────────
let railEl: HTMLElement | null = null;

/** Map a pointer x within the rail to a 0..1 position + seek there. */
function seekFromClientX(clientX: number): void {
    if (!railEl) return;
    const r = railEl.getBoundingClientRect();
    if (r.width <= 0) return;
    const p = (clientX - r.left) / r.width;
    props.timeline.seek(p < 0 ? 0 : p > 1 ? 1 : p);
}

function onPointerDown(e: PointerEvent): void {
    railEl = e.currentTarget as HTMLElement;
    railEl.setPointerCapture(e.pointerId);
    seekFromClientX(e.clientX);
}
function onPointerMove(e: PointerEvent): void {
    if (!seeking.value) return;
    seekFromClientX(e.clientX);
}
function onPointerUp(e: PointerEvent): void {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    props.timeline.release();
}

/** The facet centre nearest the current position — the keyboard step origin. */
function nearestStopIndex(): number {
    const p = progress.value;
    let best = 0;
    let bestDist = Infinity;
    facets.value.forEach((f, i) => {
        const d = Math.abs(f.at - p);
        if (d < bestDist) {
            bestDist = d;
            best = i;
        }
    });
    return best;
}

/** Seek to a facet stop by index (clamped). The keyboard year-brush HOLDS the manual override
    (the rail reports the brushed position) — a STICKY brush, released on blur or the reader's
    next real scroll (onBlur + the seeking-armed scroll release below). A one-tick release would
    let the scroll-driven `--scroll-tl` sampler instantly override the brush back to the live
    scroll position (the keyboard would appear inert). */
function seekToStop(index: number): void {
    const list = facets.value;
    if (list.length === 0) return;
    const i = index < 0 ? 0 : index >= list.length ? list.length - 1 : index;
    props.timeline.seek(list[i].at);
}

/** The keyboard brush releases when focus leaves the rail (the reader tabs away). */
function onBlur(): void {
    if (seeking.value) props.timeline.release();
}

// While a keyboard brush is HELD, the reader's NEXT real scroll hands the master position back
// to the page (the page wins). Armed ONLY while seeking — no persistent hot-path listener (the
// engine's zero-listener native read is untouched; this is the operator's resume seam).
watch(seeking, (held) => {
    if (!held) return;
    const resume = (): void => props.timeline.release();
    window.addEventListener("wheel", resume, { once: true, passive: true });
    window.addEventListener("touchmove", resume, { once: true, passive: true });
});

function onKeydown(e: KeyboardEvent): void {
    const total = facets.value.length;
    if (total === 0) return;
    const cur = nearestStopIndex();
    switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
        case "PageUp":
            e.preventDefault();
            seekToStop(cur + 1);
            break;
        case "ArrowLeft":
        case "ArrowDown":
        case "PageDown":
            e.preventDefault();
            seekToStop(cur - 1);
            break;
        case "Home":
            // Home/End jump to the POSITION ends (0/1), not the first/last facet stop — so a
            // single-facet rail still brushes start↔end (the arrows step between facet stops).
            e.preventDefault();
            props.timeline.seek(0);
            break;
        case "End":
            e.preventDefault();
            props.timeline.seek(1);
            break;
        case "Escape":
            if (seeking.value) {
                e.preventDefault();
                props.timeline.release();
            }
            break;
    }
}
</script>

<template>
    <!-- The slider rail — a WCAG `role="slider"` over the viz's 0..1 story position. The
         whole bar is the operable surface (pointer drag + arrow keys); the dots are the facet
         stops, the fill is the played span, the thumb is the live position. -->
    <div
        class="scroll-rail"
        :class="{
            'scroll-rail--seeking': seeking,
            'scroll-rail--terminal': timeline.terminal.value,
        }"
        role="slider"
        tabindex="0"
        :aria-label="label"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="Math.round(progress * 100)"
        :aria-valuetext="activeLabel || stepWord"
        :data-rail-id="railId ?? 'scroll-timeline-rail'"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @keydown="onKeydown"
        @blur="onBlur"
    >
        <!-- The live wayfinding WORD (never colour-alone) — the same "Stop N of M" idiom the
             dock deck carries, so a screen reader reads position here too. -->
        <span class="sr-only" aria-live="polite">{{ stepWord }}</span>

        <!-- The TRACK — the played span fills from the foot; the thumb rides the live
             position. The fill width IS the master progress (the rail is the scrub readout). -->
        <div class="scroll-rail__track">
            <div
                class="scroll-rail__fill"
                :style="{ inlineSize: `${progress * 100}%` }"
            />
            <div
                class="scroll-rail__thumb"
                :style="{ insetInlineStart: `${progress * 100}%` }"
            />
        </div>

        <!-- The facet STOPS — one slide-dot per facet at its window centre, wearing its tritone
             ring (the H9 deck idiom). The dot nearest the position is the lone RAISED + filled
             `--cp-accent` mark (the wayfinding singleton); a dot the position has PASSED reads
             as visited (its tritone ring filled-in). -->
        <div class="scroll-rail__stops" aria-hidden="true">
            <span
                v-for="(f, i) in facets"
                :key="`stop-${i}`"
                class="scroll-rail__stop"
                :class="{
                    'scroll-rail__stop--active': i === activeIndex,
                    'scroll-rail__stop--past': progress >= f.at && i !== activeIndex,
                }"
                :style="{ insetInlineStart: `${f.at * 100}%`, '--rivet-hue': hueOf(i) }"
                :data-testid="`scroll-stop-${i + 1}`"
            />
        </div>

        <!-- The active facet's READOUT — the live label ("2024" / "Crossover" / "Forecast"),
             the audacious wayfinding word riding the rail. Hidden when empty. -->
        <span v-if="activeLabel" class="scroll-rail__readout">{{ activeLabel }}</span>
    </div>
</template>

<style scoped>
/* The rail — a slim horizontal instrument, the per-viz peer of the dock deck. It reads as a
   coloured filmstrip (the tritone stops) over a quiet track, the lone red mark the active
   stop. `touch-action: none` so a drag scrubs without the page also panning (the touch fence).
   Focusable: the WCAG slider ring on `:focus-visible`. */
.scroll-rail {
    position: relative;
    display: flex;
    align-items: center;
    inline-size: 100%;
    min-block-size: 1.75rem;
    padding-block: 0.5rem;
    cursor: pointer;
    touch-action: none;
    user-select: none;
}
.scroll-rail:focus-visible {
    outline: 2px solid var(--cp-accent, var(--focus-ring-color, currentColor));
    outline-offset: 4px;
    border-radius: var(--radius-pill);
}

/* The TRACK — a hairline rail the fill rides. The played span fills with the accent (the
   "you have read this far" thread), the unplayed rest the engrave hairline. */
.scroll-rail__track {
    position: relative;
    flex: 1 1 auto;
    block-size: 2px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--engrave, currentColor) 40%, transparent);
}
.scroll-rail__fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    border-radius: var(--radius-pill);
    background: color-mix(
        in srgb,
        var(--cp-accent, var(--foreground)) 70%,
        transparent
    );
}

/* The THUMB — the live position mark, a small accent disc that rides the fill's leading edge.
   It SCALES UP while the rail is grabbed (the tactile feedback), springs back on release. */
.scroll-rail__thumb {
    position: absolute;
    inset-block-start: 50%;
    inline-size: 0.625rem;
    block-size: 0.625rem;
    margin-inline-start: -0.3125rem;
    border-radius: var(--radius-pill);
    background: var(--cp-accent, var(--foreground));
    box-shadow: 0 1px 6px
        color-mix(in srgb, var(--cp-accent, var(--foreground)) 35%, transparent);
    translate: 0 -50%;
    scale: 1;
    transition: scale 160ms var(--ease-overshoot, ease-out);
}
.scroll-rail--seeking .scroll-rail__thumb {
    scale: 1.4;
}

/* The facet STOPS layer — the slide-dots at each facet centre. Absolutely placed over the
   track, vertically centred on it. */
.scroll-rail__stops {
    position: absolute;
    inset-inline: 0;
    inset-block-start: 50%;
    block-size: 0;
}
/* A stop dot — the H9 deck idiom: a small ring carrying the beat's tritone hue, never a fill
   at rest (the red active mark stays the lone wayfinding singleton). */
.scroll-rail__stop {
    position: absolute;
    inline-size: 0.5rem;
    block-size: 0.5rem;
    margin-inline-start: -0.25rem;
    border-radius: var(--radius-pill);
    /* THE RIVET wears the SILVER finish (H.W4.b · §SILVER) — a rivet IS a fastener, so it reads as
       STRUCK METAL: --silver-rivet (the brightest of the structural finishes) mixes into the rivet
       ink ON TOP of its --engrave rung, and a specular catch-light rim (--silver-specular) lights
       its top edge so the dot reads as a domed metal stud, not a flat ring. ADDITIVE + NEUTRAL —
       the --rivet-hue/--engrave fallback survives, the steel tint does not fight the route accent. */
    border: 1.5px solid
        color-mix(
            in oklab,
            color-mix(
                in srgb,
                var(--rivet-hue, var(--engrave, currentColor)) 55%,
                transparent
            ),
            var(--silver-rivet) 38%
        );
    background: color-mix(in srgb, var(--card, var(--background)) 72%, transparent);
    box-shadow: inset 0 0.5px 0 var(--silver-specular);
    translate: 0 -50%;
    scale: 1;
    transition:
        scale 200ms var(--ease-overshoot, ease-out),
        background 160ms ease,
        border-color 160ms ease;
}
/* A PASSED stop — the position has crossed it; its tritone ring fills in (a quiet "read"
   state, still never the red singleton). */
.scroll-rail__stop--past {
    background: color-mix(in srgb, var(--rivet-hue, var(--engrave)) 30%, transparent);
}
/* The ACTIVE stop — RAISED + filled `--cp-accent` (the lone red wayfinding mark, exactly the
   dock deck's active-dot law: never two filled stops). */
.scroll-rail__stop--active {
    scale: 1.5;
    border-color: transparent;
    background: var(--cp-accent, var(--foreground));
    box-shadow: 0 2px 8px
        color-mix(in srgb, var(--cp-accent, var(--foreground)) 30%, transparent);
}

/* The READOUT — the active facet's live label, the audacious wayfinding word riding the rail
   foot. Tabular-lining so a year doesn't reflow as it ticks; engraved, compact. */
.scroll-rail__readout {
    margin-inline-start: 0.75rem;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums lining-nums;
    white-space: nowrap;
}

/* PRM — the raised scale + thumb spring become instant state changes (the raised + filled
   reads, no bounce); the terminal rail still operates (keyboard/drag), it just doesn't spring. */
@media (prefers-reduced-motion: reduce) {
    .scroll-rail__thumb,
    .scroll-rail__stop {
        transition:
            background 160ms ease,
            border-color 160ms ease;
    }
}
</style>
