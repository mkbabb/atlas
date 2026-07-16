// platform/composables/useScrollChrome.ts — THE COLLAPSE-ON-SCROLL EDGE (CD-05 · O-A21).
//
// The owner's chronic "the dock collapses on scroll" (CD-05, 5 tranches) lived only as COMMENTS in
// `useDockCollapse.ts` — `#persistent-foot` and collapse-on-scroll were NAMED, never wired (L7 dock
// lineage; recap R-005/CD-05). This is that mechanism, finally OWNED: ONE hook the dock waves
// consume so the collapse is code, not prose.
//
// WHAT IT IS. A scroll-DIRECTION hook off the ONE page scroll signal: scrolling DOWN past a
// threshold collapses the chrome, scrolling UP (or reaching the top) expands it. It emits a boolean
// EDGE and nothing else.
//
// THE THREE LAWS this hook is built to (animation-taxonomy §A1; motion-arch §A1-2):
//   • AG8 / NO-scrolljacking — it NEVER `preventDefault`s `wheel`/`touchmove`, mints ZERO wheel/
//     touch listeners, and drives NO continuous transform. Native scroll is untouched; the hook is
//     a pure READER that flips a discrete boolean. (The only scroll listener in play is the
//     document scalar's own passive `useWindowScroll`, owned upstream — see below.)
//   • READ-ONLY over the scroll clock — it READS `useDocumentScrollProgress()` (the ONE whole-
//     document [0,1] scalar; the `useWindowScroll`/`scrollY` token is sealed to `useScrollProgress.ts`
//     by the D5 single-scroll-scalar law). It mints no second scroll writer.
//   • WRITES NOTHING TO THE DOCK STATE — the dock CONSUMES this edge; the hook holds only its own
//     local `collapsed`/`direction` refs and touches no store, no `expand()`/`collapse()`, no glass
//     instance. It is the SINGLE owner of the collapse-on-scroll mechanism — the dock binds this
//     edge, it does not re-implement it [dock-chrome L12 "two collapse machines fighting over one
//     box"]. This hook adds NO progress chrome: Roman rungs carry beat position and the collapsed
//     published Glass rim carries whole-document progress. This hook is collapse-ONLY.
//
// THE CLOCK IS A FRACTION, NOT PIXELS. The one signal it reads is the [0,1] document-progress scalar,
// so the thresholds below are PAGE FRACTIONS (e.g. 2% down = a committed down-scroll), the honest
// consequence of reading the single clock rather than a second `scrollY` writer.
//
// THE MOUNT-LATCH CURE (dock-chrome L16). The dock's `:start-collapsed` is a mount-ONLY latch — read
// once, never reactive, so a desktop→narrow resize strands the dock expanded. A consumer that binds a
// `watch` on THIS hook's live edge re-collapses on any post-mount scroll/resize; a read-once latch
// cannot. O-D1/O-D2 build the fuller reactive register bridge atop this witness.

import {
    computed,
    ref,
    toValue,
    watch,
    type ComputedRef,
    type MaybeRefOrGetter,
    type Ref,
} from "vue";
import { useDocumentScrollProgress } from "../../../../motion/useScrollProgress.js";
import { useReducedMotion } from "../../../../motion/useReducedMotion.js";

/** The scroll-travel direction the edge derives from — `null` before the first supra-tolerance move. */
export type ScrollDirection = "up" | "down" | null;

/** Tuning + dependency-injection surface. All thresholds are PAGE FRACTIONS on the [0,1] clock; the
    `source`/`reducedMotion` overrides let a consumer share one instance (or a test drive a synthetic
    fixture) instead of re-deriving the clock — the DI style `useAuroraVeil` already models. */
export interface UseScrollChromeOptions {
    /** The [0,1] scroll scalar to read. Defaults to the ONE page clock (`useDocumentScrollProgress`);
        a consumer/test MAY inject its own ref/getter. READ-ONLY — the hook never writes it. */
    source?: MaybeRefOrGetter<number>;
    /** The reduced-motion fence. Defaults to `useReducedMotion()`; injectable for the same DI reason. */
    reducedMotion?: MaybeRefOrGetter<boolean>;
    /** Page fraction past which a DOWN move may collapse — the "committed down-scroll" gate (0.02 ≈
        2% of the page below the crown). Below it a down-scroll never collapses (top-of-page calm). */
    threshold?: number;
    /** Page fraction at/below which the reader is "at the top" — always EXPANDS (0.004 ≈ the crown). */
    topThreshold?: number;
    /** Minimum supra-jitter delta that registers a direction change — a DISCRETE hysteresis (not a
        timer, not a transform) so a trackpad micro-jiggle never thrashes the edge (0.002). */
    tolerance?: number;
}

/** The collapse-on-scroll edge — the reactive surface the dock CONSUMES (all read-only to it). */
export interface UseScrollChromeReturn {
    /** The discrete collapse edge — `true` after a committed down-scroll, `false` on up-scroll / at
        the top. A boolean, never a transition: the consumer owns the (PRM-gated) morph. */
    collapsed: Readonly<Ref<boolean>>;
    /** The last registered scroll-travel direction (`"up" | "down" | null`). */
    direction: Readonly<Ref<ScrollDirection>>;
    /** True while the reader sits at/near the crown (`progress ≤ topThreshold`) — the always-expand
        zone. Live off the clock, so it re-evaluates the instant the page returns to the top. */
    atTop: ComputedRef<boolean>;
}

/** 2% of the page below the crown — the committed down-scroll before the chrome collapses. */
const DEFAULT_THRESHOLD = 0.02;
/** 0.4% of the page — the crown "at-top" zone that always expands. */
const DEFAULT_TOP_THRESHOLD = 0.004;
/** 0.2% supra-jitter floor — the discrete hysteresis that kills per-pixel edge thrash. */
const DEFAULT_TOLERANCE = 0.002;

/**
 * The collapse-on-scroll hook (CD-05). Reads the ONE page scroll clock and emits a discrete collapse
 * edge — down past `threshold` collapses, up / at-top expands. PRM-guarded: under `prefers-reduced-
 * motion` the collapse is still an INSTANT state change (this hook never animates — it flips a
 * boolean), and the reduce request is honoured by minimising posture flips (position-anchored, below).
 * AG8-safe by construction: no `wheel`/`touchmove` listener, no `preventDefault`, no continuous
 * transform. Writes nothing to the dock state — the dock binds `collapsed` and drives its own machine.
 */
export function useScrollChrome(
    opts: UseScrollChromeOptions = {},
): UseScrollChromeReturn {
    const {
        threshold = DEFAULT_THRESHOLD,
        topThreshold = DEFAULT_TOP_THRESHOLD,
        tolerance = DEFAULT_TOLERANCE,
    } = opts;

    // READ-ONLY over the ONE page scroll clock. `??` short-circuits, so the document scalar is
    // instantiated ONLY when no source is injected (the sanctioned per-consumer read — aurora / cover
    // each call it the same way). The hook writes no `scrollY`/`useWindowScroll` of its own (D5 law).
    const scalar: MaybeRefOrGetter<number> =
        opts.source ?? useDocumentScrollProgress();
    const read = (): number => toValue(scalar);

    // The reduced-motion fence — the ONE reactive PRM source (over @vueuse), injectable for DI/tests.
    const reduced: MaybeRefOrGetter<boolean> =
        opts.reducedMotion ?? useReducedMotion();

    const collapsed = ref(false);
    const direction = ref<ScrollDirection>(null);
    const atTop = computed<boolean>(() => read() <= topThreshold);

    // The committed anchor — the last position at which a supra-tolerance move registered. Held
    // (not moved) across sub-tolerance jitter so many tiny same-way ticks still accumulate to an edge.
    let anchor = read();

    watch(read, (curr) => {
        // AT-TOP always EXPANDS (both motion modes) — returning to the crown re-reveals the dock.
        if (curr <= topThreshold) {
            if (curr < anchor - tolerance) direction.value = "up";
            collapsed.value = false;
            anchor = curr;
            return;
        }

        const delta = curr - anchor;
        // Sub-tolerance jitter → HOLD the posture. A discrete hysteresis (no timer, no transform): the
        // anchor stays put so accumulated same-way motion still crosses, but a micro-jiggle never flips.
        if (Math.abs(delta) < tolerance) return;

        const dir: ScrollDirection = delta > 0 ? "down" : "up";
        direction.value = dir;
        anchor = curr;

        if (toValue(reduced)) {
            // PRM — POSITION-anchored: minimise dock motion. Collapse once past the commit threshold;
            // ONLY the at-top zone re-expands (no re-expand-on-up-scroll). Fewer posture flips = less
            // motion — the reduce request honoured — and each flip is still an INSTANT boolean.
            if (curr > threshold) collapsed.value = true;
        } else {
            // Full motion — DIRECTION-anchored headroom: down past the threshold collapses, ANY
            // up-scroll re-expands. A discrete boolean either way — no preventDefault, no transform.
            if (dir === "down" && curr > threshold) collapsed.value = true;
            else if (dir === "up") collapsed.value = false;
        }
    });

    return { collapsed, direction, atTop };
}
