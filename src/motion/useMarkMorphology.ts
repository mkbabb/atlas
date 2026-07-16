// platform/composables/useMarkMorphology.ts — the ONE mark-morphology source (K-HANDMARK · the
// collapse's font-proportional contract). The library `InkMark` is font-SIZE-blind: it lays a
// fixed-px `weight` and a `roughness × span × 0.015` wobble that knows nothing of the slotted word's
// type scale. Deriving BOTH the band weight AND the wobble excursion FROM the measured font-size is
// the atlas's legitimate contract (the J-HANDMARK font-proportional solver). The two J-era wrappers
// (`HandUnderline` + `HandHighlight`) forked this morphology by hand; the K-HANDMARK collapse
// de-duplicates it HERE — the I-MARK.c facility precedent (`useHandMarkClock` already owns the clock;
// this owns the morphology). `HandMark.vue` is the sole consumer.
//
// IT OWNS FOUR THINGS:
//   ① THE FONT-PROPORTIONAL WEIGHT SOLVER — the per-rung band weight off the measured `fontPx`
//      (the thin pen line vs the juicy marker band). The HULL rung (highlighter) SHORT-CIRCUITS to
//      the CONSTANT `HIGHLIGHT_WEIGHT_VB` — the ONE rung that is NOT font-proportional (the §2.1
//      blob fix: a viewBox UNIT, not a screen-px band).
//   ② THE UNDERLINE ASPECT STRIP-PIN — the `.hm__svg` strip height pinned to
//      `renderedWidth / VB_ASPECT` so the library's `preserveAspectRatio="none"` no longer crushes
//      the wobble to a flat bar. Applied ONLY to the aspect-tracked baseline stroke shapes; the hull
//      is EXEMPT (a wide slab `isAspectTracked` would FALSE-FAIL — the `k-handmark-hull` §3 split).
//      This is the fallback-first consumer pin until the aspect-correct text viewBox lands at the
//      engine (D15·Δ6c, K-I-ROOT-AUTHOR).
//   ③ THE AMPLITUDE STAND-IN — the per-rung `wobbleRoughness` driving a confident waver (≥0.6 of
//      stroke) WITHOUT the engine's `Brush.amplitude` knob. `ENGINE_HAS_AMPLITUDE` is FALSE today;
//      it EVAPORATES the day amplitude publishes (D15·Δ6a, K-I): flip the flag, pass `:amplitude`,
//      the roughness stand-in is dead code the K-REPOINT stand-in grep deletes. Until then it is the
//      proven-runnable floor.
//   ④ THE IMPERATIVE `--mark-draw` WRITER — the draw seam's writer (§4.5). A `watchEffect` writes
//      `--mark-draw` OFF THE VDOM (off the `progress` getter), so a scroll-rate progress scrub never
//      re-renders the component. The host stamps a `data-mark-stage` attribute (the probe/gate hook),
//      NOT a brittle `[style*=--mark-draw]` selector.

import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    watchEffect,
    type ComputedRef,
    type Ref,
} from "vue";
import type { HandShape } from "@mkbabb/glass-ui/handmark";
import { HIGHLIGHT_WEIGHT_VB } from "../charts/marks/mark-tokens.js";

/** The mark instrument family — the columns of the K-HANDMARK matrix (the rows are `HandShape`). */
export type MarkVariant = "pen" | "pencil" | "crayon" | "marker" | "highlighter";

// ① THE FONT-PROPORTIONAL WEIGHT SOLVER (lifted from HandUnderline) — the per-rung fraction/ceiling.
/** The pen-rung fraction + ceiling — the thin hand line (capped well under the marker slab). */
const PEN_WEIGHT_OF_FONT = 0.14;
const PEN_WEIGHT_MAX = 6;
/** The marker/crayon-rung fraction + ceiling — the juicy pick-out band (the explicit opt-in rung). */
const MARKER_WEIGHT_OF_FONT = 0.26;
const MARKER_WEIGHT_MAX = 12;
/** The shared floor so even a sub-headline word still inks a real band (not a vanishing hairline). */
const WEIGHT_MIN = 2;

// ③ THE AMPLITUDE STAND-IN — the per-rung roughness (the thin pen line wobbles a larger multiple of
//    its narrow width; the fat marker band a smaller one so consecutive crests stay continuous).
const PEN_ROUGHNESS = 5;
const MARKER_ROUGHNESS = 3.5;
/** ≈3–4 irregular crests across the span — read as an unruled hand line, Catmull-Rom fitted. */
const WOBBLE_SEGMENTS = 7;

/** THE `Brush.amplitude` STAND-IN FLAG (K-FRAMEWORK §5 · D15·Δ6a). FALSE today: the wobble rides the
 *  per-rung `wobbleRoughness` stand-in (a confident waver ≥0.6 of stroke, NO engine knob). It
 *  EVAPORATES on publish — flip TRUE, pass `:amplitude`, the roughness stand-in is dead code the
 *  K-REPOINT stand-in grep deletes. Exported so the consume-on-publish seam is one flag. */
export const ENGINE_HAS_AMPLITUDE = false;

// ② THE UNDERLINE ASPECT STRIP-PIN — the library's fixed `viewBox="0 0 100 40"` (aspect 2.5).
const VB_ASPECT = 2.5;
const STRIP_MIN_PX = 12; // the floor — a real band even pre-measure / on a hairline-narrow word
const STRIP_MAX_PX = 320; // the absolute ceiling — never an absurd strip for a giant word
/** THE FONT-PROPORTIONAL STRIP CEILING (the N.LIVE-DEFECTS wide-word fix). The aspect strip is
 *  `renderedWidth / VB_ASPECT` — WIDTH-coupled, so a WIDE word (a title word, a long clause) gets a
 *  strip far TALLER than its own type (a 200px "bandwidth" masthead → an 85px strip, ~2× the line).
 *  The library scales the seeded wobble by the box HEIGHT, so that tall strip inflated a gentle
 *  underline into a giant low squiggle that overran the box onto the NEXT line's dek (the /sci
 *  "band-cake" strike; the /usf "Who pays in" crush). An underline's size is a function of its TYPE,
 *  not its WIDTH — so the strip is capped at ~0.7em: the wobble stays a font-scaled hug (excursion
 *  ≈ the stroke weight, un-flattened) that clears the descenders and the next line at every scale. A
 *  NARROW word (`aspectStrip ≤ 0.7em`) sits under the cap untouched — it bites only where width ≫ type. */
const STRIP_FONT_CAP = 0.7;

/** The baseline stroke shapes whose strip is aspect-pinned (the §3 split — the hull is EXEMPT; circle
 *  and path are NOT baseline bands, so they ride the library's own height). */
const ASPECT_TRACKED_SHAPES: ReadonlySet<HandShape> = new Set([
    "underline",
    "strikethrough",
    "box",
    "bracket",
]);

/** The thin (pen) rung — `pen`/`pencil` and any `circle` ring rest at the thin hand line; the
 *  explicit `marker`/`crayon` opt-ins ride the juicy band rung. */
const THIN_VARIANTS: ReadonlySet<MarkVariant> = new Set(["pen", "pencil"]);

export interface MarkMorphologyInput {
    /** The wrapper span the metrics are measured off (the slot inherits the call-site's type scale). */
    rootEl: Ref<HTMLElement | null>;
    /** The reactive variant getter (the matrix column). */
    variant: () => MarkVariant;
    /** The reactive shape getter (the matrix row). */
    shape: () => HandShape;
    /** The reactive draw-seam progress getter ([0..1] | undefined — the K-B `drawIn` unit-`t`). */
    progress?: () => number | undefined;
}

export interface MarkMorphology {
    /** The band weight (px for stroke rungs; the CONSTANT `HIGHLIGHT_WEIGHT_VB` for the hull). */
    bandWeight: ComputedRef<number>;
    /** The per-rung wobble roughness (the amplitude stand-in) — `undefined` for the hull (its preset
     *  wobble stands; no font-proportional override). */
    wobbleRoughness: ComputedRef<number | undefined>;
    /** The wobble segment count — `undefined` for the hull (the preset's). */
    segments: ComputedRef<number | undefined>;
    /** The aspect-correct strip height (px) handed to `--hu-strip`. */
    stripPx: ComputedRef<number>;
    /** True iff the highlighter (hull) rung — the band-HEIGHT-guarded slab, NOT aspect-tracked. */
    isHull: ComputedRef<boolean>;
    /** True iff a baseline stroke shape whose strip is aspect-pinned (the hull is EXEMPT). */
    aspectTracked: ComputedRef<boolean>;
    /** The `data-mark-stage` hook value — present iff a `progress` draw seam is bound. */
    markStage: ComputedRef<string | undefined>;
}

/** The morphology facility the generalized `HandMark` consumes. */
export function useMarkMorphology(input: MarkMorphologyInput): MarkMorphology {
    const { rootEl, variant, shape, progress } = input;

    const isHull = computed(() => variant() === "highlighter");
    const isThinRung = computed(
        () => shape() === "circle" || THIN_VARIANTS.has(variant()),
    );
    const aspectTracked = computed(
        () => !isHull.value && ASPECT_TRACKED_SHAPES.has(shape()),
    );

    // THE LIVE WORD METRICS — `fontPx` drives the weight/excursion solver; `wordWidthPx` drives the
    // aspect strip-pin. A ResizeObserver re-derives them on any reflow (fluid resize, orientation
    // flip). SSR-safe defaults (16px / 0px) keep the first paint sane and HMR-stable.
    const fontPx = ref(16);
    const wordWidthPx = ref(0);
    let ro: ResizeObserver | null = null;
    function readWordMetrics(): void {
        const el = rootEl.value;
        if (!el) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (Number.isFinite(fs) && fs > 0) fontPx.value = fs;
        const w = el.getBoundingClientRect().width;
        if (Number.isFinite(w) && w > 0) wordWidthPx.value = w;
    }
    onMounted(() => {
        readWordMetrics();
        if (typeof ResizeObserver !== "undefined" && rootEl.value) {
            ro = new ResizeObserver(() => readWordMetrics());
            ro.observe(rootEl.value);
        }
    });
    onBeforeUnmount(() => {
        ro?.disconnect();
        ro = null;
    });

    // ① the band weight — the HULL short-circuits to the CONSTANT VB weight (the §2.1 blob fix); the
    //    stroke rungs are font-proportional, clamped to the resting rung.
    const bandWeight = computed(() => {
        if (isHull.value) return HIGHLIGHT_WEIGHT_VB;
        const ofFont = isThinRung.value
            ? PEN_WEIGHT_OF_FONT
            : MARKER_WEIGHT_OF_FONT;
        const max = isThinRung.value ? PEN_WEIGHT_MAX : MARKER_WEIGHT_MAX;
        return Math.min(max, Math.max(WEIGHT_MIN, fontPx.value * ofFont));
    });

    // ③ the amplitude stand-in roughness/segments — omitted for the hull (its preset wobble stands).
    const wobbleRoughness = computed<number | undefined>(() =>
        isHull.value
            ? undefined
            : isThinRung.value
              ? PEN_ROUGHNESS
              : MARKER_ROUGHNESS,
    );
    const segments = computed<number | undefined>(() =>
        isHull.value ? undefined : WOBBLE_SEGMENTS,
    );

    // ② the aspect-correct strip — `renderedWidth × 1.04 / VB_ASPECT` (mirrors the library's
    //    `.hm__svg { width: 104% }`), floored/capped so a pre-measure frame or a giant word stays
    //    sane. The host applies it only to aspect-tracked shapes; the hull never reads it.
    const stripPx = computed(() => {
        const aspectStrip = (wordWidthPx.value * 1.04) / VB_ASPECT;
        const fallback = bandWeight.value * 2.4; // font-proportional until the word box is measured
        const target = aspectStrip > 0 ? aspectStrip : fallback;
        // THE FONT-PROPORTIONAL CEILING — a wide word never balloons the strip past ~0.7em (the
        // wide-word squiggle fix); a narrow word sits under the cap and rides its own aspect strip.
        const capped = Math.min(target, fontPx.value * STRIP_FONT_CAP);
        return Math.min(STRIP_MAX_PX, Math.max(STRIP_MIN_PX, capped));
    });

    // ④ the imperative `--mark-draw` write — OFF the VDOM, so a scroll-rate scrub never re-renders.
    //    Clamped to [0..1]; rests at the CSS default `1` (fully painted) when no progress is bound.
    watchEffect(() => {
        const el = rootEl.value;
        if (!el) return;
        const p = progress?.();
        if (p === undefined) return;
        el.style.setProperty("--mark-draw", String(Math.min(1, Math.max(0, p))));
    });
    const markStage = computed<string | undefined>(() =>
        progress?.() === undefined ? undefined : "draw",
    );

    return {
        bandWeight,
        wobbleRoughness,
        segments,
        stripPx,
        isHull,
        aspectTracked,
        markStage,
    };
}
