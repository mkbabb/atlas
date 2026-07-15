<script setup lang="ts">
// platform/charts/HandMark.vue — THE generalized procedural hand-mark (K-HANDMARK). ONE component
// over the full matrix `pen | pencil | crayon | marker | highlighter` × `underline | circle |
// highlight | strikethrough | box | bracket | path`. Morphology lives in `useMarkMorphology`, the
// clock + dark-lift in `useHandMarkClock`, and the brush, seeded grain `<filter>`, and draw-on are
// glass-ui-rendered. This is Atlas's sole semantic hand-mark component; consumers select geometry
// directly through `shape` instead of wrapper aliases.
//
// THE BLOB FIX (K-FRAMEWORK §3 · the load-bearing correction). The /demand verdict highlighter
// rendered a full-viewBox amber BLOB — hull bbox 40.4 VB-units (the old `weight:40` override read as
// a viewBox DIAMETER over the 40-tall `viewBox`, smeared full-bleed by the `.hm__svg height:100%`
// line box). THE A-5 HULL DID LAND (glass-ui `BRUSHES.highlighter.ribbon === "hull"`): the hull is a
// `fill`, UNSHIELDED by `vector-effect:non-scaling-stroke` (a no-op on a fill), so its weight is a
// viewBox UNIT. The fix is a CONSTANT viewBox hull weight (`HIGHLIGHT_WEIGHT_VB ≈ 22`) — a chisel
// strip ≈ 0.55 of the line box (under the `k-handmark-hull` `≤ 0.7` blob guard). NO glass-ui change
// is needed for the fix. NOT the `weight:40` diameter and NOT a width-derived strip (NON-LINEAR in
// word width — the engine lays ONE `.hm__svg` over the whole clause box, so a strip mis-sizes a
// wrapping verdict). The aspect strip-pin stays an UNDERLINE-only concern (the hull is a wide slab
// EXEMPT from aspect-tracking — `isAspectTracked` would FALSE-FAIL it).
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
    HandMark as GlassHandMark,
    BRUSHES,
    type BrushName,
    type HandShape,
} from "@mkbabb/glass-ui/handmark";
import {
    useHandMarkClock,
    RED_INK,
    type DarkLiftPair,
    type MarkClock,
} from "@/motion/useHandMarkClock";
import {
    useMarkMorphology,
    type MarkVariant,
} from "@/motion/useMarkMorphology";
import { HIGHLIGHT_WEIGHT_VB } from "@/charts/marks/mark-tokens";

const props = withDefaults(
    defineProps<{
        /** The instrument (the matrix column). `pen` is the RESTING register (grain=0 ⇒ no filter,
         *  the clean Catmull-Rom line); `marker`/`crayon` are the louder opt-ins; `pencil` the paler
         *  whisper; `highlighter` the wide hull slab (the verdict-clause band). */
        variant?: MarkVariant;
        /** The mark shape (the matrix row). `underline` (default) under the WORD; `highlight` is the
         *  behind+multiply hull band; `circle` the overshoot ring; `path` the caller-supplied lasso;
         *  `strikethrough`/`box`/`bracket` the minted cross-terms (used only where a call-site asks). */
        shape?: HandShape;
        /** The arbitrary SVG `d` for `shape="path"` (the caller-supplied enclosure polyline). */
        path?: string;
        /** The ink colour. Pen-family defaults to the editorial red; the highlighter to the amber
         *  wash. An explicit colour wins (passed straight to the brush fill). */
        color?: string;
        /** Which clock drives the draw. `load` (the masthead one-shot via `play()`), `scroll` (the
         *  bidirectional view-timeline scrub), `static` (present, undrawn). */
        clock?: MarkClock;
        /** The masthead draw duration (ms) for the load clock. */
        drawMs?: number;
        /** Grain + wobble determinism per word — same `(variant, seed)` ⇒ pixel-identical reloads. */
        seed?: number;
        /** THE HERO BOIL (I-MARK.d) — opt the mark into the ONE budgeted `draw-then-boil` living line
         *  (meaningful only on the `load` clock). Emits `data-boil`, the boil-budget mount-intent. */
        boil?: boolean;
        /** THE DRAW SEAM (§4.5) — the K-B `drawIn` unit-`t` [0..1]. When bound, an imperative
         *  keyframe-free `--mark-draw` clip wipes the WHOLE `.hm__svg` (uniform over hull AND stroke,
         *  works at `animation="none"`). Default `undefined` (the mark rests fully painted). */
        progress?: number;
    }>(),
    {
        variant: "pen",
        shape: "underline",
        path: undefined,
        color: undefined,
        clock: "load",
        drawMs: 700,
        seed: 1,
        boil: false,
        progress: undefined,
    },
);

const rootEl = ref<HTMLElement | null>(null);

// THE MORPHOLOGY — the font-proportional weight solver + the aspect strip-pin + the amplitude
// stand-in + the imperative `--mark-draw` writer, the ONE source the collapse de-duplicates.
const {
    bandWeight,
    wobbleRoughness,
    segments,
    stripPx,
    isHull,
    aspectTracked,
    markStage,
} = useMarkMorphology({
    rootEl,
    variant: () => props.variant,
    shape: () => props.shape,
    progress: () => props.progress,
});

// THE RIBBON POLICY — EXPLICIT, by-name (the `k-handmark-hull` clause-1). THE A-5 HULL DID LAND
// (glass-ui `BRUSHES.highlighter.ribbon === "hull"`): the highlighter is the ONE hull `fill` rung,
// every pen-family rung a clean `stroke`. The stale wrapper prose claiming the hull was undelivered
// is DELETED, never copied forward.
function ribbonFor(variant: MarkVariant): "hull" | "stroke" {
    return variant === "highlighter" ? "hull" : "stroke";
}

// THE NAMED PRESET — `circle` is the thin red-pencil `ring` regardless of variant (a circle is a
// circle, not a fat marker band); else the variant's own preset.
const sourceBrush = computed<BrushName>(() => {
    if (props.shape === "circle") return "ring";
    switch (props.variant) {
        case "highlighter":
            return "highlighter";
        case "marker":
            return "marker";
        case "crayon":
            return "crayon";
        case "pencil":
            return "pencil";
        case "pen":
        default:
            return "pen";
    }
});
// The clean pen/ring rest at grain=0 (no filter); the louder opt-ins lift a grain floor so the band
// reads as inked, hand-laid ink rather than a flat vector bar.
const isPenLike = computed(
    () => sourceBrush.value === "pen" || sourceBrush.value === "ring",
);

// THE INK BRUSH — every field a spread over the resolved preset; the renderer is untouched.
//   • the HULL rung: the CONSTANT-VB weight over the published `highlighter` preset, `ribbon:"hull"`
//     by-name — the chisel strip (the blob fix), keeping the multiply translucency (the highlighter's
//     DEFINING property — you see the ink through the wash, so it is NOT the suffusion rung).
//   • the STROKE rungs: the font-proportional `bandWeight`, the round cap, the neutralised opacity
//     (the suffusion contract owns the recession), the grain floor for the louder opt-ins.
const inkBrush = computed(() => {
    if (isHull.value) {
        return {
            ...BRUSHES.highlighter,
            ribbon: ribbonFor(props.variant),
            weight: HIGHLIGHT_WEIGHT_VB,
        };
    }
    const preset = BRUSHES[sourceBrush.value];
    return {
        ...preset,
        ribbon: ribbonFor(props.variant),
        weight: bandWeight.value,
        cap: "round" as const,
        opacity: 1,
        grain: isPenLike.value ? preset.grain : Math.max(preset.grain, 0.24),
    };
});

// THE CLOCK + DARK-LIFT (useHandMarkClock) — the editorial red for the pen family, the amber wash for
// the highlighter (the `washColor` pair lifted into a `DarkLiftPair`). The load/scroll/static clock
// map + the theme-reactive lift are the ONE facility both J-era wrappers consumed.
const WASH_INK: DarkLiftPair = {
    light: "var(--mark-highlight, #ffcf5d)",
    dark: "var(--mark-highlight-bright, #f4c14a)",
};
const pair: DarkLiftPair = props.variant === "highlighter" ? WASH_INK : RED_INK;
// THE HERO BOIL is active only on the `load` clock (the load-arrival escalation; `scroll`/`static`
// rest drawn, the frame-guard intact). This is the boil MOUNT INTENT — it keys `data-boil` (the
// per-route budget gate counts intent, not scroll position) and is stable for the mark's lifetime.
const boilActive = computed(() => props.boil && props.clock === "load");

// O-A4-R — THE IDLE-ZERO VISIBILITY PARK (the RED-LEDGER B.11 recurrence · AG1 · the O-A4 bar).
// The `draw-then-boil` living line is a PERPETUAL pencil-boil singleton-rAF subscriber: glass-ui
// enrols `useLineBoil` with a frame count > 1 for as long as the mark boils, and the shared
// `schedulerTick` reschedules `requestAnimationFrame` while any subscriber is active — so a hero mark
// scrolled OFF-SCREEN keeps a core warm forever (the ~98 fps idle heartbeat the A18 verifier measured
// on the data routes). "Idle" IS "nothing visibly animating": an off-screen mark must PARK. The gate
// resolves the boil clock to `draw-then-boil` ONLY while the mark intersects the viewport; off-screen
// it parks to `draw-on` (present, fully drawn, un-boiled), which collapses glass-ui's boil frame count
// to 1 → `useLineBoil` withdraws its subscriber → pencil-boil's set EMPTIES → the singleton rAF chain
// HALTS to zero. Re-entering the viewport re-arms it (park = unregister, resume = re-register). The
// observer mirrors `useCountUp`'s one-shot re-entry IO (deferred observe, disconnect on unmount); an IO
// carries NO rAF, so the gate itself costs zero idle burn.
//
// `boilVisible` DEFAULTS true so a boil mark MOUNTS with `draw-then-boil` — glass-ui binds the LIVE
// `useLineBoil` subscription at setup (its ternary is evaluated once), and the reactive frame-count
// getter then enrols/withdraws on this flag. The masthead hero mounts on-screen, so the default is
// also its true state; the IO only ever parks it later.
//
// ROOT ASK (owner packet): the loop-never-halts-on-inactive-set defect is INTERNAL to the READ-ONLY
// `@mkbabb/pencil-boil` 0.4.1 singleton — its `schedulerTick` reschedules UNCONDITIONALLY and never
// self-halts when the set holds no active subscriber (fixed at 0.6.0, which calls `maybeStopScheduler`
// in the tick tail). This atlas park is the lawful consumer-side cure: it makes the set EMPTY so the
// loop dies even on 0.4.1. The full fix is the consumer bumping pencil-boil ≥ 0.6.0.
const boilVisible = ref(true);
if (boilActive.value && typeof IntersectionObserver !== "undefined") {
    let io: IntersectionObserver | null = null;
    // Defer the observe one microtask so the `rootEl` ref has resolved its node (the useCountUp seam).
    void Promise.resolve().then(() => {
        const el = rootEl.value;
        if (!el) return;
        io = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) boilVisible.value = entry.isIntersecting;
            },
            { threshold: 0 },
        );
        io.observe(el);
    });
    onBeforeUnmount(() => io?.disconnect());
}
/** The LIVE boil edge — the mount intent AND the mark on-screen. Feeds the clock; when it drops the
    boil parks to `draw-on` and pencil-boil's subscriber set empties (the singleton rAF halts). */
const boilLive = computed(() => boilActive.value && boilVisible.value);
const { appear, animation, resolveInkColor } = useHandMarkClock(
    () => props.clock,
    pair,
    () => boilLive.value,
);
const inkColor = resolveInkColor(() => props.color);

const markShape = computed<HandShape>(() => props.shape);

// The scroll-scrub entry-range end — the highlighter clause settles a touch later than the underline
// (the only per-shape scrub delta the two wrappers carried).
const scrubEnd = computed(() => (isHull.value ? "entry 30%" : "entry 26%"));

// The library HandMark instance — `play()` is exposed for the load `Sequence` chain.
const mark = ref<{ play: () => void } | null>(null);

/** CLOCK A — draw/swipe the mark ONCE (the load arrival). A no-op for scroll/static. Returns a
 *  Promise so `await`-shaped call sites keep their signature. */
async function play(): Promise<void> {
    if (props.clock !== "load") return;
    mark.value?.play();
}
/** Snap to terminal — the PRM / interrupt path (the library snaps under PRM itself). */
function snap(): void {
    mark.value?.play();
}
defineExpose({ play, snap });

// O-A4-R · THE RE-ARM (RED-LEDGER B.11's re-entry bar — the EX-43 verifier PACK, verified against
// the INSTALLED glass-ui 4.2.0 `dist/handmark.js`). The visibility PARK above is not, by itself,
// reversible: glass-ui's `HandMark` clears `boilArmed` in its OWN `watch(() => animation, …)` on
// EVERY `draw-on ↔ draw-then-boil` flip — INCLUDING the flip BACK to `draw-then-boil` on re-entry
// — and `clock="load"` resolves `appear:"manual"` (useHandMarkClock's map), for which glass-ui's
// `onMounted` creates NO re-play `IntersectionObserver` and never auto-calls its draw `play()`
// (that replay path exists only for `appear:"visible"`/`"mount"`). `MastheadTitle`'s one
// `onMounted` `ink.play()` therefore arms the boil exactly once; nothing else ever re-invokes it —
// the living line was permanently static after the first park.
//
// The lawful re-arm lever within the pinned 4.2.0 API is `HandMark`'s OWN exposed `play()`:
// re-firing the SAME call the masthead makes at mount re-runs its draw transition, whose
// `@transitionend` calls glass-ui's `onDrawEnd` → `armBoil()` (`boilArmed = true` + `boil.start()`)
// — so re-entry drives the identical arm path the first mount did. No forked boil, no setTimeout,
// no glass-ui edit (READ-ONLY family). Fires ONLY on the false→true edge (re-entry): the initial
// `true` stays silent (the masthead's own onMounted `play()` already owns that first arm) and the
// true→false edge (park) needs no action here — the animation flip alone already withdraws the
// pencil-boil subscriber (the park mechanism above).
watch(boilLive, (isLive, wasLive) => {
    if (isLive && !wasLive) void play();
});
</script>

<template>
    <!-- The slotted word/clause wears the library HandMark, driven to the proportioned hand mark. The
         atlas wrapper class carries the dark-lift + suffusion + strip + draw-seam hooks below; the
         brush, the seeded grain filter, and the draw-on are ALL library-rendered. `data-mark-*`
         attrs are the probe/gate hooks (`data-boil` is the boil-budget mount-intent; `data-mark-stage`
         is the draw-seam hook; `data-mark-aspect` keys the aspect strip-pin). -->
    <span
        ref="rootEl"
        class="hand-mark"
        :data-mark-clock="clock"
        :data-mark-variant="variant"
        :data-mark-shape="shape"
        :data-mark-aspect="aspectTracked ? '' : undefined"
        :data-mark-stage="markStage"
        :data-boil="boilActive ? '' : undefined"
        :style="{ '--hu-strip': stripPx + 'px', '--mark-scrub-end': scrubEnd }"
    >
        <GlassHandMark
            ref="mark"
            class="hand-mark__ink"
            :shape="markShape"
            :brush="inkBrush"
            :roughness="wobbleRoughness"
            :segments="segments"
            :path="path"
            :color="inkColor"
            :seed="seed"
            :animation="animation"
            :appear="appear"
            :draw-ms="drawMs"
        >
            <slot />
        </GlassHandMark>
    </span>
</template>

<style scoped>
/* The wrapping span — the pen-family word-mark stays nowrap so the ink spans exactly its width; the
   dark-lift is resolved in `inkColor` and handed to the library brush (the thin-consumer contract). */
.hand-mark {
    position: relative;
    white-space: nowrap;
}
/* THE HIGHLIGHTER clause may WRAP (a verdict is several words) — the library lays one band per line
   box, exactly a highlighter swept across a wrapping clause. `position:relative` anchors the
   library's behind band (z-index:-1, multiply); `isolation:isolate` is the library's OWN `.hm` rule
   (consumed, never re-derived — the blend-context trap). */
.hand-mark[data-mark-variant="highlighter"] {
    white-space: normal;
}

/* THE SUFFUSION RUNG ④ (DESIGN §13 / HIER-SUFFUSION) — the stroke editorial marks declare their
   recession from `--attn-chrome` on the `.hm__svg` (the MARK element alone — the word renders
   OUTSIDE the SVG), NEVER the brush's intrinsic alpha (neutralised to 1). The highlighter is EXEMPT:
   its translucency is the highlighter's DEFINING property (you see the ink THROUGH the wash), not a
   recession rung. */
.hand-mark:not([data-mark-variant="highlighter"]) :deep(.hm__svg) {
    opacity: var(--attn-chrome);
}

/* THE ASPECT-CORRECT STRIP (the J-HANDMARK-ASPECT fallback-first pin, D15·Δ6c) — the library lays
   `.hm__svg` at `width:104%` of the WORD BOX on a fixed `viewBox="0 0 100 40"` (aspect 2.5) under
   `preserveAspectRatio="none"`; left to its `height:100%` the px-aspect blows out 11–17× and crushes
   the wobble to a flat bar. We pin the strip height to `--hu-strip` (`renderedWidth / VB_ASPECT`) so
   the px-aspect TRACKS the viewBox aspect, bottom-anchored so the band hugs the baseline at every
   scale (the strike-trap floor). Applied ONLY to the aspect-tracked baseline stroke shapes; the hull
   is EXEMPT — it rests on the engine's own `height:100%` line box (the §2.1 blob fix). */
.hand-mark[data-mark-aspect] :deep(.hm__svg) {
    height: var(--hu-strip, 1.4rem);
    top: auto;
    /* THE BASELINE HUG (the N.LIVE-DEFECTS wide-word fix). The strip's bottom edge rests just under
       the word — a small constant + a fraction of the (now font-capped) `--hu-strip`. The retired
       `calc(-0.12em - 3px - 0.07·--hu-strip)` over-dropped: `0.07·--hu-strip` scaled the drop with
       the WIDTH-coupled strip, so a wide masthead word sank its wobble ~30px under the baseline,
       through the next line's dek (the /sci "band-cake" strike). With the strip now font-capped
       (useMarkMorphology STRIP_FONT_CAP), `0.035·--hu-strip` is a gentle font-scaled offset and the
       band lands ~3–5px under the word at every scale — clear of the descenders AND the dek. */
    bottom: calc(-2px - 0.035 * var(--hu-strip, 1.4rem));
}

/* THE SCROLL-SCRUB (clock="scroll") — the figure/river mark draws/un-draws BIDIRECTIONALLY under
   real scroll. We bind the `crayon-wipe` @keyframes (the clip-path inset wipe) to the mark's OWN
   `view()` timeline on the `.hm__svg`. The `@keyframes crayon-wipe` is DEFINED in the atlas-owned,
   index-imported `platform/design/map-draw.css` (the sibling of geo-draw/dot-draw); `@keyframes`
   are document-global, so the literal name resolves here. (It is NOT a glass-ui global — 4.2.0 ships
   a `crayon` brush KIND but no `crayon-wipe` @keyframes.) `clip-path` is the compositor-eligible,
   filter-STABLE wipe — the static seeded grain filter rasters ONCE and is untouched. The fences are
   the standard scroll-mark pair: under PRM (or a non-supporting engine) the wipe never attaches and
   the mark rests at its terminal DRAWN state. `--mark-scrub-end` tunes the per-shape entry window
   (the underline settles at `entry 26%`, the highlighter at `30%`). */
@media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
        .hand-mark[data-mark-clock="scroll"] :deep(.hm__svg) {
            animation: crayon-wipe auto linear both;
            animation-timeline: view(block);
            animation-range: entry 0% var(--mark-scrub-end, entry 26%);
        }
    }
}

/* THE PROGRESS DRAW SEAM (§4.5 · the §1(b) INERT-seam fix) — a `:progress`-bound mark clips the WHOLE
   `.hm__svg` via the imperative `--mark-draw` (written OFF the VDOM by `useMarkMorphology`), uniform
   over the hull fill AND the pen stroke (no dasharray, no draw-class). It is KEYFRAME-FREE — it reads
   the JS-written `--mark-draw`, NOT the `crayon-wipe` @keyframes — so it works at
   `animation="none"` (where the engine's `.hm__path` draw classes are ABSENT) and under PRM (the band
   rests at the terminal `--mark-draw` default `1`, fully painted). It consumes the SAME unit-`t` the
   K-B `drawIn` stage normalizes (the shared `pathLength="1"` draw-leaf). A mark is EITHER
   scroll-scrubbed OR progress-bound, never both. */
.hand-mark[data-mark-stage] :deep(.hm__svg) {
    clip-path: inset(0 calc((1 - var(--mark-draw, 1)) * 100%) 0 0);
}
</style>
