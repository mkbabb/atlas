// platform/composables/useCountUp.ts — the ONE generalized count-up (C.W5.2, §9
// the A6 fold-in). The numeric-morph engine in its NUMERIC face: a keyframes.js
// `NumericAnimation` over a record of figures, counting from the currently-DISPLAYED
// value to a live target, `respectReducedMotion` → snap-to-final under PRM in one paint.
//
// THE LIFT (synth §9 / load-choreography-keyframes §3.2): the count-up was already the
// gold-standard seam — one `NumericAnimation`, PRM-snapped (the `FundLedgerFlow:104` /
// `RainbowStack:101` boilerplate). This composable lifts that boilerplate into ONE place
// so the two heroes (and any future counted figure) share the SAME engine, and — the
// load-Sequence's keystone — exposes `run()` as the AWAITABLE first link of the arrival
// `Sequence`. The count is the fire-and-forget numeric heartbeat: it runs ALONGSIDE the
// visual assembly (it is NOT `.add()`ed to the `Sequence` — `NumericAnimation` is the
// light value.js-free class, not the heavy `Animation` the `Sequence` composites), and
// `useLoadSequence` kicks it off at `play()` so the figures count WHILE the ribbon draws.
//
// It also kills BOTH the retired arrival-flag timers (the `setTimeout(…,60)` page-flip + the
// second mount timer): the only "when does it start" is the `Sequence` calling `run()` — no
// wall-clock offset survives. A live-target change (the program/year filter reshaping the
// totals) re-counts in DIFF mode from the displayed value to the new target, the SAME
// engine, no second code path.
//
// ── THE H.W11.b CARVE — the SCROLL-SCRUBBED face (the audacious figures, made live) ──
// H10 sizes the audacious figure; H11 makes the NUMBER live. The scroll-scrubbed mode turns
// the figure into a pure function of a [0,1] scroll scalar: the SAME `NumericAnimation`, but
// driven by `.at(progress)` (the zero-allocation stateless sampler that applies the easing
// per-segment INTERNALLY) instead of the rAF `.play()` loop. Because `display = at(p)` and `p`
// is the section's scroll POSITION (not a one-shot toggle), the count is bi-directional BY
// CONSTRUCTION: scroll down, the figure climbs; scroll up, it rewinds — the same reverse-for-
// free the native `view()` reveal gets, now on the digits. It is the scroll sibling of the
// `retriggerOnReentry` EDGE (M4): that mode is for an interior figure where jacking digits to
// scroll would be garish (a number is a value, not a position); THIS mode is for the LOAD-
// BEARING audacious figure a viz's scroll timeline has CHOSEN to scrub (the H11 facet map,
// under the motion budget). The two are mutually exclusive — a figure is either scrubbed or
// re-entry-counted, never both (the dual-path single-writer rule on the digit). PRM binds the
// scrub to its TERMINAL value (progress ≡ 1): the figure renders its final crown instantly,
// information parity, no scrub (the H11 first fence).

import {
    computed,
    onBeforeUnmount,
    ref,
    shallowRef,
    watch,
    type ComputedRef,
    type Ref,
} from "vue";
import { NumericAnimation, type TimingFunction } from "@mkbabb/keyframes.js";
import { clamp } from "@mkbabb/value.js/math";
import { easeOutExpo } from "@mkbabb/value.js/easing";
import { useReducedMotion } from "../../motion/useReducedMotion.js";

/** A record of numeric figures the count-up tweens together (e.g. `{in, out, net}`). */
export type CountFigures = Record<string, number>;

export interface UseCountUpOptions {
    /** The count duration in ms (the audacious figure's settle). Default 1600. */
    duration?: number;
    /**
     * Re-count automatically when the target changes (the filter/year reshaping the
     * totals — DIFF mode, from the displayed value to the new target). Default true.
     * Set false when the caller drives `run()` itself (e.g. the load `Sequence`).
     */
    autoRecount?: boolean;
    /**
     * M4 (ds2-motion-field) — re-count when the figure RE-ENTERS the viewport. A
     * one-shot-per-entry EDGE for an INTERIOR figure (a number you scroll back to should
     * arrive afresh, like a page turn), keyed to an IntersectionObserver entry — NOT to
     * `view()` progress (a number is a VALUE, not a position; jacking digits to scroll is
     * garish, MC-6). Default OFF — the FOLD's load-once count (the hero `$8.92B`) keeps the
     * default clock; only an interior figure opts in. Under PRM the figure is SET, no
     * re-count. Pass the element the count lives on so the observer can watch it.
     */
    retriggerOnReentry?: boolean;
    /** The element whose viewport entry re-fires the count (required by `retriggerOnReentry`). */
    reentryTarget?: () => Element | null | undefined;
    /**
     * H.W11.b — the SCROLL-SCRUBBED mode. Pass a `() => number` reader of a [0,1] scroll
     * scalar (the section's `useScrollTimeline` facet position, or a raw `useScrollProgress`)
     * and the `display` figures become a PURE FUNCTION of it: `display = NumericAnimation
     * .at(progress)`, the figure climbing as the facet enters and REWINDING on scroll-up
     * (bi-directional by construction — `.at` is the stateless, eased, zero-allocation
     * sampler). This is the LOAD-BEARING audacious figure a viz's scroll timeline CHOSE to
     * scrub (the H11 facet map); leave it OFF for an interior figure (use `retriggerOnReentry`
     * — a number is a value, not a position). Mutually exclusive with `retriggerOnReentry` +
     * `autoRecount` (the digit has ONE writer): when set, the auto-recount `watch` is the
     * curve REBUILD path (a live target reshapes the scrub endpoints), never a `run()`.
     * Under PRM the scrub binds to its TERMINAL value (progress ≡ 1) — the final crown, no
     * scrub (the H11 first fence). Optional `scrubEasing` overrides the per-segment curve the
     * scrub follows (default `easeOutExpo`, the count-up's settle).
     */
    scrollProgress?: () => number;
    /** The scrub's per-segment easing (default `easeOutExpo`). Honored only with `scrollProgress`. */
    scrubEasing?: TimingFunction;
}

export interface UseCountUp<T extends CountFigures> {
    /**
     * The live displayed figures — bind the template to these (counted, not the target).
     * In the default + re-entry modes this is a mutable `Ref` the rAF loop writes; in the
     * H11 scroll-scrubbed mode it is a `ComputedRef` derived from `at(scrollProgress)` (a
     * `ComputedRef` IS a readonly `Ref<T>`, so the binding is identical — `display.value.in`
     * either way).
     */
    display: Ref<T> | ComputedRef<T>;
    /**
     * Play the count from the currently-displayed value to the live target. The AWAITABLE
     * the load `Sequence` kicks off as its numeric heartbeat (fire-and-forget — it resolves
     * on its own `finished`, independent of the `Sequence` playhead). Under PRM it snaps to
     * the target and resolves next microtask (`respectReducedMotion`). In scroll-scrubbed
     * mode this is a no-op (the scrub IS the clock — the scrub position is the playhead),
     * resolving next microtask so a caller's `await run()` never hangs.
     */
    run: () => Promise<void>;
    /** Set the figures to the target instantly (the PRM / terminal path). No-op in scrub mode
        (the scrub's terminal IS the target — driven by `scrollProgress`, not a manual set). */
    snap: () => void;
}

/**
 * The generalized count-up over a reactive `target`. Returns the `display` figures to
 * bind, plus `run()` (the awaitable first link of the arrival `Sequence`) and `snap()`
 * (the terminal set). On a target change it re-counts in DIFF mode (or snaps under PRM /
 * when `autoRecount` is off).
 *
 * The composable does NOT count on mount — the load `Sequence` owns the first `run()` (so
 * the count is causal with the assembly, not a free-running mount timer). Pass an initial
 * `display` of all-zeros (the default) so the first `run()` counts up from 0.
 */
export function useCountUp<T extends CountFigures>(
    target: () => T,
    options: UseCountUpOptions = {},
): UseCountUp<T> {
    const {
        duration = 1600,
        autoRecount = true,
        retriggerOnReentry = false,
        reentryTarget,
        scrollProgress,
        scrubEasing = easeOutExpo,
    } = options;
    const reduced = useReducedMotion();

    // Seed the display at all-zeros (the same keys as the target) so the first run counts
    // up from 0 — the arrival's "the figures climb from $0" (S1 §2.2).
    const seed = Object.fromEntries(Object.keys(target()).map((k) => [k, 0])) as T;

    // ── THE H.W11.b SCROLL-SCRUBBED FACE ──────────────────────────────────────────────────
    // When `scrollProgress` is passed the digit has ONE writer — the scrub — so `display` is a
    // pure `computed` over `at(progress)`, NOT a Ref the rAF loop mutates. The `NumericAnimation`
    // here is used STATELESSLY (no `.play()`): `at(p)` is the zero-allocation eased sampler, so
    // the figure is `f(scrollPosition)`, bi-directional for free. A live target reshapes the
    // scrub by REBUILDING the curve (the `[seed → target]` endpoints), the SAME engine. Under
    // PRM the curve is sampled at its TERMINAL (`at(1)`) regardless of scroll — the final crown,
    // information parity (the H11 first fence). The `run`/`snap`/auto-recount/re-entry machinery
    // below is dead in this branch (the dual-path single-writer rule on the digit).
    if (scrollProgress) {
        // `shallowRef` — store the engine BY REFERENCE (no deep reactive proxy over the
        // NumericAnimation's private segment buffers); a reassignment in `rebuildScrubCurve`
        // still re-triggers the `computed`.
        const scrubAnim = shallowRef<NumericAnimation<T> | null>(null);
        function rebuildScrubCurve(): void {
            scrubAnim.value = new NumericAnimation<T>([{ ...seed }, { ...target() }], {
                timingFunction: scrubEasing,
            });
        }
        rebuildScrubCurve();
        // A live target (the year/program filter reshaping the crown) rebuilds the scrub curve in
        // place — the scrub then re-reads the new endpoints at the current scroll position, no
        // jump, no second code path. (Always watch the target here — `autoRecount` governs the
        // rAF `run()` path, which is inert in scrub mode.)
        watch(target, rebuildScrubCurve, { deep: true });

        const display = computed<T>(() => {
            const anim = scrubAnim.value;
            if (!anim) return { ...seed };
            // PRM: bind to the terminal value — the full figure, instantly, no scrub.
            const p = reduced.value ? 1 : clamp(scrollProgress(), 0, 1);
            // `.at` returns a SHARED pre-allocated result object (zero-alloc) — spread so each
            // computed read is its own snapshot Vue can diff (never the engine's live buffer).
            return { ...anim.at(p) };
        });

        return {
            display,
            // The scrub IS the playhead — `run`/`snap` are no-ops that keep the API total so a
            // caller (the load Sequence, a PRM path) can call them unconditionally.
            run: () => Promise.resolve(),
            snap: () => {},
        };
    }

    const display = ref<T>(seed) as Ref<T>;

    let anim: NumericAnimation<T> | null = null;

    function snap(): void {
        display.value = { ...target() };
    }

    async function run(): Promise<void> {
        // PRM: snap to the target in one paint, resolve next microtask (no rAF loop).
        if (reduced.value) {
            snap();
            return;
        }
        // Halt any in-flight count so a re-trigger starts cleanly from the displayed value.
        anim?.stop();
        anim = new NumericAnimation<T>([{ ...display.value }, { ...target() }], {
            duration,
            timingFunction: easeOutExpo,
            respectReducedMotion: true,
        });
        await anim.play((v) => {
            display.value = { ...v };
        });
    }

    // Re-count on a target change (the filter/year reshaping the totals) — DIFF mode, the
    // SAME engine, from the displayed value to the new target. Snaps under PRM.
    if (autoRecount) {
        watch(target, () => {
            void run();
        });
    }

    // M4 — the re-entry EDGE: a one-shot-per-entry re-count for an INTERIOR figure. An
    // IntersectionObserver fires `run()` fresh each time the target ENTERS the viewport (the
    // page-turn arrival), and ONLY then — it never scrubs digits per scroll-frame (a number is
    // a value, not a position). The edge is "was-out → now-in"; staying in view never re-fires
    // (no metronome). Under PRM the count snaps (run() short-circuits to snap), so the figure is
    // SET on entry, no motion. Default OFF — the FOLD figures keep the load-once clock.
    if (
        retriggerOnReentry &&
        reentryTarget &&
        typeof IntersectionObserver !== "undefined"
    ) {
        let wasVisible = false;
        let io: IntersectionObserver | null = null;
        // Defer the observe to the first microtask so the caller's `ref` has resolved its node.
        void Promise.resolve().then(() => {
            const el = reentryTarget();
            if (!el) return;
            io = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        const nowVisible = entry.isIntersecting;
                        // The rising edge (out → in) is the re-entry — re-count once. Resetting
                        // the displayed figures to the seed makes the count climb from 0 again
                        // (the "page turn reveals a new figure" arrival), not a no-op DIFF of 0.
                        if (nowVisible && !wasVisible) {
                            display.value = { ...seed };
                            void run();
                        }
                        wasVisible = nowVisible;
                    }
                },
                // A generous margin so the count completes as the figure settles into view, not
                // only once fully on-screen; the threshold fires the edge as it crosses in.
                { threshold: 0.35 },
            );
            io.observe(el);
        });
        onBeforeUnmount(() => io?.disconnect());
    }

    return { display, run, snap };
}
