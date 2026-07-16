// platform/composables/useLoadSequence.ts — the ONE arrival orchestrator
// (C.W5.2; load-choreography-keyframes §3.1). It REPLACES the retired four-timer
// wall-clock ladder ENTIRELY with a keyframes.js `Sequence` whose segments are
// CAUSALLY chained (each segment's `at` = the prior segment's END, by construction —
// `add(anim)` with `at` omitted auto-appends at the running cursor, the GSAP append-by-
// default timeline), interruptible by scroll (one `stop()` handing the page to the native
// `view()` Tide), and PRM-collapsed by ONE `respectReducedMotion` flag (the doc's
// `resolveInstant()` — every child snaps to its rest frame in a single paint).
//
// THE LOCKED PRIMITIVE (C5-8 / GOLDEN KF-1): `Sequence` — the master timeline — NOT
// `AnimationGroup` (the same-target compositor) nor a hand-rolled await-chain. Causality is
// the data structure, not five magic numbers; the only state is the playhead.
//
// THE LOAD IS A ONCE CLOCK (§4): it plays forward to `finished` or is `stop()`ped where it
// stands — NEVER `reverse()`d, never bound to scroll position. (`Sequence.reverse()`/
// `timeScale()`/`progress` exist for the SCROLL field's bidirectional `view()` Tide and for
// dev-scrub — NOT for the load.) load = once (this `Sequence`); scroll = bidirectional (the
// native `view()` timeline, W5.1). The two hand off at the fold — they never multiply.
//
// THE COUNT-UP IS NOT A SEGMENT (§3.0): it is the light `NumericAnimation` (value.js-free),
// not the heavy `Animation` the `Sequence` composites — and it is fire-and-forget (S3 §5.2
// "the count-up finishes … fire-and-forget numeric"). So `countUp()` is KICKED OFF at
// `play()` and runs ALONGSIDE the visual segments; it is never `.add()`ed, never halted by
// the scroll interrupt (it awaits its own `finished`).

import {
    onMounted,
    onBeforeUnmount,
    shallowRef,
    watch,
    type ShallowRef,
} from "vue";
import {
    Sequence,
    loadAnimationEngine,
    type AnimationEngine,
    type CSSKeyframesAnimation,
} from "@mkbabb/keyframes.js";
import { useReducedMotion } from "./useReducedMotion.js";

/** The engine surface `loadAnimationEngine()` resolves to (the value.js-bearing factories
    — `CSSKeyframesAnimation`, `fromDrawSVG`, `stagger`-fed fans — that build the
    heavy `Animation`s the `Sequence` composites). A segment builds against it. */
export type LoadEngine = AnimationEngine;

/** The keyframes.js `Animation` a `Sequence` segment adds — a `CSSKeyframesAnimation` with
    its var generic left OPEN (`any`) so a segment may return a draw-on
    (`{ "stroke-dashoffset" }`), an opacity/transform fan, or a text-shadow pulse — each a
    distinct keyframe shape — and `Sequence.add` (a `Sequence<any>` by default) accepts them
    all (`CSSKeyframesAnimation<V>` is invariant in `V`, so the open `any` is what unifies the
    heterogeneous segment returns). */
export type LoadAnimation = CSSKeyframesAnimation<any>;

/** What a segment's `build` returns — ONE animation (the trunk draw, the NET pulse) OR a
    SET added at the SAME start (a staggered fan, where each element carries its own internal
    `delay` so the set fans within one causal beat). The set rides one label, so it is still
    ONE causal link, not N appended segments. */
export type LoadBuildResult = LoadAnimation | LoadAnimation[];

export interface LoadSegment {
    /**
     * Build this segment's animation(s) against its already-mounted targets + the engine.
     * Returns the keyframes.js `Animation` (or a SET, for a staggered fan) to `.add()` at
     * the running cursor. The targets MUST be mounted (the composable builds in
     * `onMounted`), so a `build` reads its refs' `.value` directly. May be async.
     */
    build: (engine: LoadEngine) => LoadBuildResult | Promise<LoadBuildResult>;
    /**
     * Where on the master clock this segment starts. Omitted → the running cursor (the
     * prior segment's END — the causal auto-append). `"-=400"` overlaps the prior segment
     * by 400ms (the S3 §5.1 ribbon→strands cadence is an overlap, not a gap). An absolute
     * ms or a registered label is also accepted (the `Sequence` position grammar).
     */
    at?: string;
}

export interface LoadSequenceConfig {
    /**
     * The fire-and-forget numeric heartbeat (the count-up) — kicked off at `play()`, runs
     * ALONGSIDE the segments, never blocks them, never halted by the scroll interrupt. Its
     * own `respectReducedMotion` snaps it under PRM. Optional (only counted heroes).
     */
    countUp?: () => void | Promise<void>;
    /** The visual assembly, in causal order: e.g. [ribbonDraw, strandsFan, netResolve]. */
    segments: LoadSegment[];
    /**
     * THE TARGETS-MOUNTED GATE (N.WD1 readiness-ladder integration · N5 consult fix). The
     * composable's contract is "targets already mounted at `onMounted`" — but under the 4-rung
     * readiness ladder a VizPlate SLOT (and every template ref inside it) is `v-else`'d out while
     * the plate is `loading`, so the consumer's `onMounted` fires with its refs still null and the
     * first `build` throws (live-proven: `fromDrawSVG(null)` degraded the whole /usf route). A
     * consumer whose targets live in a ladder-gated slot passes its bound-signal here (e.g.
     * `() => trunkEl.value != null`); the arrival then builds on the FIRST tick the gate opens.
     * Omit when the targets mount with the component (the pre-ladder contract, unchanged).
     */
    mounted?: () => boolean;
}

export interface UseLoadSequence {
    /** The live `Sequence` (null before its async build resolves). Exposed for dev-scrub
        (`seq.value.progress = …`) — NEVER bound to scroll on the load path (§4). */
    seq: ShallowRef<Sequence | null>;
}

/**
 * Orchestrate a hero's load arrival as ONE keyframes.js `Sequence`. Call once from a
 * feature's `setup`; pass the count-up heartbeat + the causal segment list. On mount the
 * composable resolves the engine, builds each segment against its mounted targets,
 * `add`s them causally, kicks the count-up, arms ONE scroll-interrupt listener, and plays.
 * Under PRM the whole arrival collapses to terminal state in one paint (no listener armed —
 * there is nothing to interrupt). The playhead is stopped + the listener detached on
 * unmount so a fast route change never drives a torn-down hero.
 */
export function useLoadSequence(config: LoadSequenceConfig): UseLoadSequence {
    const reduced = useReducedMotion();
    const seq = shallowRef<Sequence | null>(null);
    let detachInterrupt: (() => void) | null = null;

    onMounted(async () => {
        // The targets-mounted gate — when the consumer's targets live in a ladder-gated slot,
        // wait for the FIRST tick its refs bind before building (the watch rides the component
        // scope, so an unmount while waiting tears it down with everything else).
        if (config.mounted && !config.mounted()) {
            await new Promise<void>((resolve) => {
                const stop = watch(
                    () => config.mounted!(),
                    (ok) => {
                        if (!ok) return;
                        stop();
                        resolve();
                    },
                    { flush: "post" },
                );
            });
        }
        // The numeric heartbeat — parallel, fire-and-forget (never awaited here, so the
        // visual segments build + play without waiting on the count).
        void config.countUp?.();

        // ONE fence: PRM collapses the whole arrival to terminal state in one paint
        // (`play()` → a terminal `seek(duration)`, no rAF loop — the doc's resolveInstant).
        const s = new Sequence({ respectReducedMotion: reduced.value });
        // The heavy half (drawSVG / animate / stagger) rides the dynamic boundary.
        const engine = await loadAnimationEngine();

        let labelSeq = 0;
        for (const seg of config.segments) {
            const built = await seg.build(engine);
            if (Array.isArray(built)) {
                // A staggered SET — register ONE label at this segment's start and add every
                // member there, so the whole set is one causal beat (each member fans on its
                // own internal `delay`). A label is needed because `add` advances the cursor
                // to each member's end; without it the members would chain, not overlap.
                const label = `seg-${labelSeq++}`;
                s.label(label, seg.at);
                for (const anim of built) s.add(anim, label);
            } else {
                // ONE animation — `at` omitted → auto-append at the prior segment's END
                // (causal-by-construction).
                s.add(built, seg.at);
            }
        }
        seq.value = s;

        // INTERRUPT (§3.3): a scroll during the arrival SETTLES the `Sequence` to its
        // TERMINAL frame and hands the page to the native `view()` Tide. D7-close fix:
        // a bare `stop()` froze the playhead WHERE IT STOOD — the tapered ribbon trunk
        // rested half-swept (stroke-dashoffset ~932 of 1078, the stuck/half-drawn state
        // the proof-motion interrupt gate prosecutes). The ONCE clock never reverses
        // (§4), so the interrupt LANDS the arrival: `seek(duration)` scrubs every
        // segment to its final frame synchronously (the timeline-scrub contract), THEN
        // `stop()` halts the play loop. The count-up is NOT stopped (fire-and-forget).
        // ONE listener, armed at play, disarmed at finished. Not armed under PRM —
        // there is no animation to interrupt.
        if (!reduced.value) {
            const onScrollIntent = (): void => {
                s.seek(s.duration); // land the terminal frame (never a half-drawn hero)
                s.stop(); // halt the play loop + resolve the pending play()
                detachInterrupt?.();
            };
            const opts = { once: true, passive: true } as const;
            window.addEventListener("wheel", onScrollIntent, opts);
            window.addEventListener("touchmove", onScrollIntent, opts);
            window.addEventListener("keydown", onScrollIntent, opts); // PageDown/Space/arrows
            detachInterrupt = () => {
                window.removeEventListener("wheel", onScrollIntent);
                window.removeEventListener("touchmove", onScrollIntent);
                window.removeEventListener("keydown", onScrollIntent);
                detachInterrupt = null;
            };
        }

        await s.play(); // respectReducedMotion → one-paint terminal snap; else the assembly
        detachInterrupt?.(); // arrival done — the native view() Tide owns the page
    });

    onBeforeUnmount(() => {
        seq.value?.stop();
        detachInterrupt?.();
    });

    return { seq };
}
