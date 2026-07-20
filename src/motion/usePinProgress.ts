// platform/motion/usePinProgress.ts — THE PIN CLOCK, RE-FOUNDED (W-MOTION-CORE · spec-motion §b.1).
//
// The `pin` DriverEdge: one composed [0,1] scalar over a pinned stage's N narrated steps. It reads the
// per-step scrub hosts `StickyScene` ALREADY registers (`useScrollTimeline(stepEls[i], …)` →
// `registerScrubHost`) off the SAME per-frame cache the ONE `--scroll-tl` reader writes — a Set lookup
// via `readScrubHostProgress`, never a second `getComputedStyle` poll and never a rect read (the A8
// single-source law, the exact `useCoverProgress` idiom).
//
// ── WHAT IS DELETED (the KILL-M2 repair) ──────────────────────────────────────────────────────────
// The pass-2 seam read the STAGE ROOT (`host.closest("[data-pin-stage]")`) and asked the registry for
// its progress. The root is NEVER registered — `StickyScene.vue:9` is verbatim "NO scroll timeline, NO
// `--scroll-tl` host, NO per-frame poll"; it registers a host PER STEP, never the root. So the lookup
// returned `null` and the pin was born permanently settled at 1. That read does not exist here: the
// composition takes its step signals from the deck the host already owns, and there is no ancestor
// walk of any kind in this module.
//
// ── THE MEASURED WINDOW REMAP (the retirement CONDITION of record — EVIDENCE §2) ──────────────────
// The naive composition `(stepIndex + coverOfActiveStep) / stepCount` is MEASURED-DISCONTINUOUS on the
// SHIPPED geometry: adjacent full-height steps carry OVERLAPPING `view()` covers by construction
// (`animation-range: cover 0% cover 100%` — step k is still exiting while k+1 enters), so at the deck
// boundary `pinT` jumps 0.1375 per 0.025-grain sample at N=4 (≈ +0.5/N). The cure travels with the
// retirement and is mandatory: re-normalize each step's master position into its DECLARED [from,to]
// window before composing — the same facet-window remap `useScrollTimeline` already ships
// (`useScrollTimeline.ts:398`). Remapped, the identical geometry reads maxΔ 0.025 (= the grain),
// monotone, 0 → 1. The naive form ships nowhere: there is no un-remapped path in this file.
//
// ── THE FALLBACK DEGRADATION (owner dial 15, RATIFIED — ship it, do not engineer around it) ───────
// On non-`view()` browsers the registered record carries no element (`useScrollTimeline.ts:383-386`
// `record.el = native ? target.value : null`), so the el-keyed Set lookup returns `null`, `within`
// collapses to 0, and the pin quantizes to `stepIndex/stepCount` — a DISCRETE STEPPER, not a
// continuous scrub. Information parity holds (the IO-driven stepping and every scene's content
// survive; only the intra-step scrub is lost). This is the designed degradation, named here so it can
// never ship as a silent behavior fork.

import { computed, type ComputedRef, type Ref } from "vue";
import { clamp } from "@mkbabb/value.js/math";
import { useReducedMotion } from "./useReducedMotion.js";
import { useDocumentScrollProgress } from "./useScrollProgress.js";
import { readScrubHostProgress } from "../charts/composables/activeViz.js";

/** THE DECLARED PER-STEP WINDOW — the MEASURED remap (EVIDENCE §2 · spec-motion :282-284). A step's
    `view()` cover reads 0.5 exactly as its block crosses the viewport centre (the `useCoverProgress`
    grammar, and the same band the deck flips its active index on), and reaches 1 as its successor
    crosses. So [0.5, 1] is the span over which a step is the ACTIVE one — the windows ABUT, and the
    composition is continuous across every boundary. A deck whose steps are not viewport-height
    declares its own window; the overlapping raw cover [0, 1] is never composed. */
export const PIN_STEP_WINDOW: readonly [number, number] = [0.5, 1];

/** Re-normalize one step host's master position into its declared `[from,to]` window (the
    `useScrollTimeline` facet remap, same arithmetic). Total: a degenerate window reads as a step at
    `from`; the result is always clamped to [0,1]. */
export function remapStepProgress(
    cover: number,
    [from, to]: readonly [number, number] = PIN_STEP_WINDOW,
): number {
    const span = to - from;
    if (span <= 0) return cover >= from ? 1 : 0;
    return clamp((cover - from) / span, 0, 1);
}

/** THE PIN COMPOSITION (spec-motion §b.1 C-1) — the active step's index plus its remapped within-step
    progress, over the step count. Pure + total (a zero-step deck reads terminal 1, the
    missing-stage-terminal law's peer). */
export function composePinT(stepIndex: number, within: number, stepCount: number): number {
    if (stepCount <= 0) return 1;
    const k = clamp(stepIndex, 0, stepCount - 1);
    return clamp((k + clamp(within, 0, 1)) / stepCount, 0, 1);
}

/** The deck signals the pinned host SURFACES — every one an EXISTING signal, never recomputed here:
    `stepIndex` is `useStageDeck(N).activeIndex` (`StickyScene.vue:150`), `activeStepEl` is
    `stepEls[activeIndex]` (`:207`) — the very element `StickyScene.vue:74` registered — and
    `stepCount` is the deck's `N`. */
export interface PinDeck {
    /** The deck's active step index (`useStageDeck(N).activeIndex`). */
    readonly stepIndex: Ref<number>;
    /** The ACTIVE step's element — the registered per-step scrub host, or null before mount. */
    readonly activeStepEl: () => HTMLElement | null;
    /** The step count `N` (the deck's cardinality — a constant). */
    readonly stepCount: number;
    /** The declared per-step remap window. Omit ⇒ {@link PIN_STEP_WINDOW}. */
    readonly window?: readonly [number, number];
}

/** The pin clock's reactive surface — one composed [0,1] scalar plus the deck position it composed
    from (a rail reads the pair without asking the deck twice). */
export interface UsePinProgress {
    /** The composed pin scalar [0,1] — monotone across the stage transit, terminal 1 under PRM. */
    readonly pinT: ComputedRef<number>;
    /** The deck's active step index (passed through — the rail's lit stop). */
    readonly stepIndex: Ref<number>;
    /** The step count `N`. */
    readonly stepCount: number;
}

/**
 * Compose a pinned stage's `pin` DriverEdge from its already-registered per-step hosts. Adds ZERO new
 * hosts, ZERO `--scroll-tl` polls and ZERO layout reads: the value is a Set lookup off the cache the
 * ONE registry reader wrote this frame, re-evaluated on the page's single document-scroll heartbeat
 * (the `useCoverProgress` idiom — the heartbeat is the TICK, never the value).
 */
export function usePinProgress(deck: PinDeck): UsePinProgress {
    const reduced = useReducedMotion();
    // The page's ONE live document-scroll scalar — consumed ONLY as the reactive heartbeat that
    // re-evaluates `pinT` each scroll frame. NOT the pin value.
    const heartbeat = useDocumentScrollProgress();
    const stepWindow = deck.window ?? PIN_STEP_WINDOW;

    const pinT = computed(() => {
        // PRM: every scene settled, the jack released (§e — a jack under `reduce` must RELEASE, not
        // freeze the reader in a held viewport).
        if (reduced.value) return 1;
        void heartbeat.value; // the per-scroll-frame reactive dependency
        const el = deck.activeStepEl();
        // Boundary guard — a step element not yet mounted composes off the index alone, never a
        // null-pin at 1 (the born-settled seam this file exists to retire).
        if (!el) return composePinT(deck.stepIndex.value, 0, deck.stepCount);
        // The A8 single-source seam: this host's last master position, cached by the ONE activeViz
        // `--scroll-tl` reader. `null` = the dial-15 fallback path (no element registered) → the
        // designed discrete stepper.
        const cover = readScrubHostProgress(el);
        const within = cover === null ? 0 : remapStepProgress(cover, stepWindow);
        return composePinT(deck.stepIndex.value, within, deck.stepCount);
    });

    return { pinT, stepIndex: deck.stepIndex, stepCount: deck.stepCount };
}
