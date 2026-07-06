// platform/composables/useScrollProgress.ts — scroll progress 0..1 over a section,
// the substrate the bidirectional scroll scenes (B4) drive their reveals from. A
// scrollytelling step needs ONE normalized scalar — "how far through this section
// is the viewport" — and everything else (a fill morph's t, a step index, an opacity
// ramp) is a pure function of it. This builds that scalar over @vueuse
// `useElementBounding` (the live target rect, recomputed on scroll/resize) measured
// against the viewport, so no component re-implements the geometry.
//
// PROGRESS GRAMMAR: 0 when the section's top first touches the bottom of the
// viewport (it is about to enter), 1 when its bottom passes the top of the viewport
// (it has fully left). The window of travel is therefore `sectionHeight + viewport`
// — the full span over which any part of the section is on screen — so a tall section
// scrubs across its whole length and a short one still gets a full 0→1 sweep.

import { computed, ref, type ComputedRef, type Ref } from "vue";
import { useElementBounding, useWindowScroll, useWindowSize } from "@vueuse/core";
import { clamp, smoothStep3 } from "@mkbabb/value.js";
import { supportsViewTimeline as glSupportsViewTimeline } from "@mkbabb/glass-ui";
import { useReducedMotion } from "./useReducedMotion";

/**
 * The single-writer GATE (C.W5.1; scroll-reveal-design §3.1). True when the engine carries a
 * genuine `view()` timeline + `animation-range` — i.e. when `platform/design/scroll-driven.css`
 * binds the per-beat reveal on the COMPOSITOR and OWNS the reveal axis. When it is true the JS
 * scene below (`useScrollScene`) MUST be inert: the native CSS is the sole writer per target
 * (T6), so the bespoke `useElementBounding` body never runs and no inline opacity/transform
 * fights the compositor-scrubbed keyframes. When it is false (Firefox today, jsdom, SSR) the
 * native `@supports` block is skipped and the JS scene is the sole writer — the dual-path
 * single-writer guarantee.
 *
 * NOTE: there is NO `NATIVE_SCROLL_TIMELINE` constant in this codebase — this detect IS the
 * gate (it did not exist before C.W5.1). glass-ui ships `supportsViewTimeline()` (the `view()`
 * value carries the `animation-range` probe implicitly); we re-export it under the wave's name
 * so the gate reads as one platform vocabulary and the fallback delegates to the shipped
 * primitive rather than re-rolling a `CSS.supports` check.
 */
export function supportsViewTimeline(): boolean {
    return glSupportsViewTimeline();
}

/** The composable's reactive surface. */
export interface UseScrollProgress {
    /**
     * Normalized travel through the section, clamped to [0, 1].
     *
     * THE FACET-WRITER PARITY (H.W11.a). This scalar maps the section's FULL transit — 0 when
     * its leading edge first touches the viewport bottom, 1 when its trailing edge leaves the
     * top (the `height + viewport` window below). That is EXACTLY the `cover 0% → cover 100%`
     * range the native `--scroll-tl` custom property animates in `scroll-driven.css`. So when
     * `useScrollTimeline` takes the `@supports` FALLBACK path (Firefox / jsdom / SSR), feeding
     * THIS `progress` into the `ManualTimeline.seek` lands the master position where the native
     * compositor path lands it — the dual-path single-writer parity (one engine, two sources,
     * identical axis). The engine watches this value and pushes it through the timeline; it is
     * the fallback's sole writer of the scroll-timeline master position.
     */
    progress: ComputedRef<number>;
    /** True while any part of the section is within the viewport (0 < p < 1). */
    inView: ComputedRef<boolean>;
}

function clamp01(t: number): number {
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Track a section's scroll progress as a [0, 1] scalar. `target` is the element (a
 * ref, or already-resolved element) the scene spans; reads recompute when the page
 * scrolls or the viewport resizes (both via @vueuse). When the target is absent the
 * progress is 0 (the pre-mount / SSR floor), so a binding never reads `NaN`.
 */
export function useScrollProgress(
    target: Ref<HTMLElement | null> | HTMLElement | null,
): UseScrollProgress {
    // THE DEAD-PATH GEOMETRY FENCE (J-SCROLL §2 · j0-no-native-gbcr). Where the native `view()`
    // engine OWNS the reveal axis (`supportsViewTimeline()`), this section scalar is a DEAD writer:
    // the consumer scrubs off the compositor `--scroll-tl` custom property, never this fallback. So
    // attaching `useElementBounding` here — which defaults to `windowScroll:true`/`windowResize:true`
    // and so wires a WINDOW SCROLL-LISTENER + per-scroll `getBoundingClientRect` — is pure dead-path
    // tax on the native path (the `useElementBounding` body must NEVER run, no per-beat gBCR, no
    // second window scroll-listener under the D5 single-writer law). Return the inert 0-floor with
    // ZERO geometry watchers; the section-rect geometry below attaches ONLY on the genuine
    // `@supports` fallback (Firefox / jsdom / SSR) where this scalar IS the sole writer. This mirrors
    // the `useScrollScene` gate (`supportsViewTimeline()` → inert terminal surface), and complements
    // the caller-side lazy instantiation: the geometry never attaches on native from EITHER end.
    // (`useDocumentScrollProgress` — the whole-document single-writer scalar below — is UNAFFECTED;
    // it is the always-live barometer/aurora source, not a per-section reveal fallback.)
    if (supportsViewTimeline()) {
        const zero = computed(() => 0);
        const never = computed(() => false);
        return { progress: zero, inView: never };
    }

    const el =
        target && "value" in (target as Ref<HTMLElement | null>)
            ? (target as Ref<HTMLElement | null>)
            : ref(target as HTMLElement | null);

    const { top, height } = useElementBounding(el);
    const { height: viewport } = useWindowSize();

    const progress = computed(() => {
        // No element yet (pre-mount / SSR) → the 0 floor, so a binding never reads a
        // spurious 1 from an all-zero bounding rect.
        if (!el.value) return 0;
        const win = height.value + viewport.value;
        if (win <= 0) return 0;
        // `top` is the section's top relative to the viewport: +viewport when it is
        // one screen below the fold (entering), -height when its bottom has just
        // crossed the top (left). Map that travel onto [0, 1].
        const travelled = viewport.value - top.value;
        return clamp01(travelled / win);
    });

    const inView = computed(() => progress.value > 0 && progress.value < 1);

    return { progress, inView };
}

/**
 * Whole-DOCUMENT scroll progress as a [0, 1] scalar — 0 pinned at the page top, 1 at
 * the bottom of the scrollable range. The section variant above answers "how far through
 * THIS beat", which is the right scalar for a per-viz reveal; the dock barometer instead
 * needs "how far through the WHOLE story" — the spine-fill that rides the stepper thread
 * (S2 §2.4). This is that scalar, built over @vueuse `useWindowScroll` (the live scrollY,
 * recomputed on scroll) divided by the document's scrollable height (`scrollHeight −
 * viewport`). When the page is shorter than the viewport (nothing to scroll) progress is
 * 0 — the thread reads "at the top", not a spurious 1.
 *
 * THE SINGLE-SCROLL-SCALAR DISCIPLINE (D1.1 · D1 AUGMENT 6 · ds2-motion-field M2). This is
 * the ONE writer of the whole-document scroll scalar. The `useWindowScroll`/`scrollY` read
 * lives HERE and NOWHERE ELSE in `src/`; every consumer READS this computed:
 *   • the Dock spine fill / barometer (`Dock.vue`),
 *   • the Aurora Tide hue/nuclei drift (`useAuroraConfig.ts` → `Aurora.vue`).
 * A SECOND `useWindowScroll` or raw `window.scrollY` writer is a DEFECT (two writers drift
 * out of phase and double the scroll cost) — consolidate any such onto this scalar. The D5
 * grep (T6-class) seals it: `useWindowScroll`/`scrollY` may appear only in this file.
 */
export function useDocumentScrollProgress(): ComputedRef<number> {
    const { y } = useWindowScroll();
    const { height: viewport } = useWindowSize();

    return computed(() => {
        if (typeof document === "undefined") return 0;
        // READ `y` BEFORE any early return — the scroll ref is the computed's heartbeat, and a
        // dep is only tracked on the branch actually taken. A subscriber whose FIRST evaluation
        // lands pre-layout (mount-time, `scrollHeight ≤ viewport`) used to take the `scrollable
        // <= 0` return WITHOUT reading `y` — leaving `y` untracked and (since `scrollHeight` is
        // not reactive) freezing the scalar at 0 for that subscriber FOREVER (the N.WB1 story
        // director's storyT froze this way; the dock barometer + aurora ride the same scalar).
        const scrolled = y.value;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - viewport.value;
        if (scrollable <= 0) return 0;
        return clamp01(scrolled / scrollable);
    });
}

/**
 * The boundary-snap epsilon (S3 §2.1): within 0.5% of 0 or 1, `p` snaps to the exact
 * bound so a settled reveal LANDS — no endpoint micro-jitter flickering a fill between
 * "done" and "almost done" each frame. The same 0.005 keyframes.js `Timeline` carries.
 */
const BOUNDARY_EPS = 0.005;

/** Snap `p` to an exact endpoint when it is within `BOUNDARY_EPS` of 0 or 1. */
function snapBoundary(p: number): number {
    if (p <= BOUNDARY_EPS) return 0;
    if (p >= 1 - BOUNDARY_EPS) return 1;
    return p;
}

// ── THE ENTRY-ANCHORED REVEAL WINDOW (F6 §2.4 — the JS fallback parity recut) ──────────────────
// The fallback must land where the native `view()` register lands: an ENTRY-anchored window (a
// fraction of the `v`-only entry span), NOT a fraction of the full `height + viewport` transit.
// A beat's raw `p` runs over the full `h + v` travel; `entry X%` corresponds to progress
// `X%·v / (h + v)`. So the in/out thresholds are HEIGHT-DERIVED (matching the native draw): the
// reveal completes at `entry 22%` (≡ scroll d = 0.22·v ≡ progress 0.22·v/(h+v)), the same place
// the native interior register's `entry 24%`/`cover 34%` draws settle. This generalizes the tail
// register's existing `height/(h+v)` cap (the already-entry-anchored shape) to every interior beat.
/** The entry-anchored IN threshold — `entry 5%` of the v-only span (the draw's first ink). */
const REVEAL_IN_FRAC = 0.05;
/** The entry-anchored OUT threshold — `entry 22%` of the v-only span (the interior register; the
    plate is full-lit as it arrives, well before it leaves). The tail register caps higher (the
    beat's max attainable progress) so a colophon beat still completes. */
const REVEAL_OUT_ENTRY = 0.22;

/** The arrival lift, in viewport-height units: the plate rises this far from below as it
    reveals (`y: +6% → 0`, S3 §2.3). Engraved, restrained — a settle, never a swoop. */
const LIFT_VH = 6;

/** A scene's reactive reveal surface — the `f(p)` outputs a beat section binds. */
export interface UseScrollScene {
    /** The beat's raw scroll progress, [0, 1], boundary-snapped (the substrate scalar). */
    progress: ComputedRef<number>;
    /** The reveal fraction `r = f(p)` ∈ [0, 1] — smoothstepped over the arrival window,
        1 under reduced motion (instant, no progressive draw). */
    reveal: ComputedRef<number>;
    /** The ready-to-bind inline style: `opacity` + a `translateY` lift that both run off
        `reveal`, so the plate fades up from below as `p` advances and fades back DOWN as
        you scroll up (the bidirectional reverse, S3 §2.1). Empty under reduced motion —
        the plate is simply SET, no transform. */
    style: ComputedRef<Record<string, string>>;
}

/**
 * A bidirectional scroll SCENE over a beat section — the `f(p)` reveal driver (S3 §2,
 * B4.1). Where `useScrollProgress` answers "how far through this beat" as a bare scalar,
 * this turns that scalar into the reveal a beat section binds: an opacity + lift that
 * resolves over the beat's arrival window and **reverses exactly on scroll-up**, because
 * the underlying `p` is a position (`viewport − top`), not a one-shot IntersectionObserver
 * toggle — scroll up, `p` decreases, `reveal` retraces its path, the plate fades back down.
 *
 * Boundary-snapped (the endpoint jitter dies at `BOUNDARY_EPS`); PRM-fenced via
 * `useReducedMotion` — with reduced motion the reveal is pinned to 1 and the style is
 * empty, so the plate is fully lit the instant it mounts (information parity, no
 * choreography). The reveal is a pure function of `p`, so nothing is timer-driven and no
 * scene runs work while its beat sits offscreen (the bounding read is the only cost).
 */
export function useScrollScene(
    target: Ref<HTMLElement | null> | HTMLElement | null,
    options: { tail?: boolean } = {},
): UseScrollScene {
    const reduced = useReducedMotion();

    // THE SINGLE-WRITER GATE (C.W5.1). Native `view()` present OR PRM → this scene is INERT:
    // the compositor-scrubbed `[data-reveal-beat]` reveal in `scroll-driven.css` owns the axis
    // (native), or the beat is simply SET (PRM). Return the terminal surface with NO writes —
    // the `useElementBounding` body below NEVER attaches (no per-beat getBoundingClientRect,
    // no per-frame inline style), so the native keyframes are the sole writer per target. The
    // bespoke geometry runs ONLY where native is absent (Firefox / jsdom / SSR) — the
    // `@supports` fallback. (scroll-reveal-design §3.1/§3.3; the app's `useScrollScene`
    // signature stays — this is the gate, NOT a rename to glass-ui's config form; C5-6.)
    if (supportsViewTimeline() || reduced.value) {
        const one = computed(() => 1);
        const empty = computed<Record<string, string>>(
            () => ({}) as Record<string, string>,
        );
        return { progress: one, reveal: one, style: empty };
    }

    const { progress: raw } = useScrollProgress(target);

    const progress = computed(() => snapBoundary(raw.value));

    // THE HEIGHT-DERIVED ENTRY-ANCHORED THRESHOLDS (F6 §2.4). The beat's raw `p` runs over the
    // full `height + viewport` travel; `entry X%` ≡ progress `X%·v / (h + v)`. Both the IN and OUT
    // thresholds are therefore HEIGHT-derived, so the fallback lands the reveal where the native
    // `view()` register lands (the entry-anchored span), NOT over `0.12 → 0.42` of the full transit.
    const { height } = useElementBounding(
        target && "value" in (target as Ref<HTMLElement | null>)
            ? (target as Ref<HTMLElement | null>)
            : ref(target as HTMLElement | null),
    );
    const { height: viewport } = useWindowSize();
    /** `entry X%` of the v-only span expressed in the beat's full-transit progress units. */
    const entryToProgress = (entryFrac: number): number => {
        const v = viewport.value;
        const win = height.value + v;
        return win > 0 ? (entryFrac * v) / win : entryFrac;
    };
    /** The IN threshold — `entry 5%` (the draw's first ink), height-derived. */
    const revealIn = computed(() => entryToProgress(REVEAL_IN_FRAC));
    // THE OUT THRESHOLD (D1.1 · audit-d/d-reveal-ribbon §c.2 — the tail register the F6 §2.4 recut
    // now GENERALIZES). Interior beats land at `entry 22%` (height-derived — the native interior
    // register's settle). A FINAL/colophon beat (`tail: true`) cannot reach even `entry 22%` of a
    // tall section before the document ends — so it caps at the beat's MAX ATTAINABLE progress
    // (`height / (height + viewport)` ≡ `entry 100%`, the beat fully on-screen), the deepest a tail
    // beat ever scrolls to. Capped there, the tail reveal completes (reveal → 1) exactly when the
    // beat is fully present, never resting dim. (The tail cap was already this height-aware shape;
    // the recut makes every interior beat rhyme with it, just at the `entry 22%` interior stop.)
    const revealOut = computed(() => {
        const interior = entryToProgress(REVEAL_OUT_ENTRY);
        if (!options.tail) return Math.max(revealIn.value + 0.001, interior);
        const win = height.value + viewport.value;
        if (win <= 0) return Math.max(revealIn.value + 0.001, interior);
        // `entry 100%` = beat fully on-screen = progress `height / (height + viewport)`; never
        // below the IN threshold (a degenerate tiny beat) so the window is always positive.
        return Math.max(revealIn.value + 0.001, height.value / win);
    });

    const reveal = computed(() => {
        // PRM: the plate is SET, never drawn — the reveal is always complete.
        if (reduced.value) return 1;
        // Map the beat's entry-anchored arrival window onto [0, 1], then smoothstep so the fade
        // eases in and out of its endpoints (no linear hard edges). `smoothStep3` is the value.js
        // 3t²−2t³ Hermite — the same monotone curve the design pins for scroll reveals.
        const r = clamp(
            (progress.value - revealIn.value) / (revealOut.value - revealIn.value),
            0,
            1,
        );
        return smoothStep3(r);
    });

    const style = computed<Record<string, string>>(() => {
        // PRM: no transform, no opacity ramp — the plate stands at its terminal state.
        if (reduced.value) return {} as Record<string, string>;
        const r = reveal.value;
        return {
            opacity: String(r),
            transform: `translate3d(0, ${((1 - r) * LIFT_VH).toFixed(3)}vh, 0)`,
        };
    });

    return { progress, reveal, style };
}
