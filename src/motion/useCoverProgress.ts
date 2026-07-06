// platform/composables/useCoverProgress.ts — THE NEAREST-HOST COVER READER (K-B-MOTION · verdict-B).
//
// Walks `host` UP to the nearest ancestor carrying [data-scroll-tl] (the beat/essay scrub host the
// page ALREADY animates — the scroll-driven.css enumerated set) and reads THAT host's live cover
// scalar. It introduces ZERO new standing bindings (the cover-host-fanout.gate stays GREEN by
// construction, K-FEEDBACK-3 §A.6 ¶2): the walk REUSES the existing host, it never stamps a new
// [data-scroll-tl] per plate (the verdict-A 1 → ~29 fan-out the proto first picked). The walk is
// deterministic — it terminates at the FIRST [data-scroll-tl] ancestor (a beat that nests two hosts
// is the reserved verdict-A case: a per-plate ENUMERATED host passed explicitly, never a bare attr).
//
// ── THE READER IS THE A8 SINGLE-SOURCE SEAM, NOT A SECOND --scroll-tl POLL (D1 refined) ───────────
// The cover scalar is the host's master transit position [0,1] (0.50 ≡ viewport centre — the host's
// geometric-centre crossing). On NATIVE Chromium the per-section JS reveal scalar (useSectionReveal's
// `t`, via useScrollProgress) is a DEAD 0-floor (useScrollProgress.ts:87-91 — the section JS scalar
// is the dead writer on the native path; the live reveal scrubs the compositor --scroll-tl). So this
// reader does NOT re-point useSectionReveal. It reads the host's live cover position off the ONE
// activeViz registry --scroll-tl reader's per-frame cache (`readScrubHostProgress`, the A8 forward-
// seam K-ACTIVE minted for exactly this walk) — NO second getComputedStyle(--scroll-tl) poll, so the
// SINGLE-SOURCE law holds (activeViz.ts stays the sole --scroll-tl reader) and R-E stays CLOSED, not
// transiently re-opened. The §4.4 D1 sketch (`acquireSampler` reading getComputedStyle directly) is
// SUPERSEDED by the landed registry seam — gestalt, not patch.
//
// ── THE HEARTBEAT IS THE PAGE'S ONE LIVE DOCUMENT-SCROLL SCALAR (NO new clock) ────────────────────
// `readScrubHostProgress` reads a plain per-frame cache — reading it inside a `computed` forms no
// reactive dependency on its own. The reveal re-evaluates each scroll frame off `useDocumentScroll-
// Progress` (the SINGLE window-scroll writer, live on the native path where --scroll-tl-derived JS
// scalars are dead). It is consumed ONLY as the reactive TICK — the cover VALUE is the registry
// cache, never this whole-document scalar. No ManualTimeline, no rAF self-reschedule, no second
// scroll listener of our own, no view() binding (the de-dup law: ONE cover reader, no second clock).
//
// ── PRM / host-less / un-registered → terminal 1 (information parity, never throws) ───────────────
// Under reduced motion the cover reveal is terminal the instant it mounts (no scrub). A host-less
// mount (no [data-scroll-tl] ancestor) or a host the registry never registered (no live cover axis)
// degrades to a settled 1 — the chart shows fully drawn (the missing-stage-terminal law's peer).

import { computed, type ComputedRef, type Ref } from "vue";
import { clamp } from "@mkbabb/value.js";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { useDocumentScrollProgress } from "@/motion/useScrollProgress";
import { readScrubHostProgress } from "@/charts/composables/activeViz";

/** The cover-host attribute the ancestor-walk terminates at — the beat/essay scrub host the page
    already animates (the scroll-driven.css enumerated set). REUSED, never re-declared (verdict-B). */
const COVER_HOST_SELECTOR = "[data-scroll-tl]";

/** The reader's reactive surface — one 0..1 cover scalar (the exact peer shape of useSectionReveal). */
export interface UseCoverProgress {
    /** The nearest cover host's live cover scalar [0,1] — 0.50 ≡ viewport centre (the host's master
        transit midpoint). 1 under reduced motion, a host-less mount, or an un-registered host. */
    t: ComputedRef<number>;
}

/**
 * Resolve a plate's cover-fraction scalar by walking to its nearest [data-scroll-tl] scrub host and
 * reading that host's live cover position. `host` is the plate's figure-stage element; the returned
 * `t` is the cover scalar (0.50 = viewport centre) the re-parameterized REVEAL_BANDS window against.
 * The exact thin peer of `useSectionReveal` (one host Ref, one 0..1 `t`, PRM-pinned to 1) — but it
 * RESOLVES the windowing host by ancestor-walk and SAMPLES the page's live cover axis off the one
 * activeViz registry reader, never a second standing binding and never a second --scroll-tl poll.
 */
export function useCoverProgress(host: Ref<HTMLElement | null>): UseCoverProgress {
    const reduced = useReducedMotion();
    // The page's ONE live document-scroll scalar (the single window-scroll writer) — consumed ONLY
    // as the reactive heartbeat that re-evaluates `t` each scroll frame. NOT the cover value.
    const heartbeat = useDocumentScrollProgress();

    // Walk UP to the nearest [data-scroll-tl] ancestor (the cover host) — recomputes on a host
    // re-mount, NOT on scroll (the resolved ancestor is structural, not a scroll function).
    const coverHost = computed<HTMLElement | null>(() => {
        const el = host.value;
        return el ? (el.closest(COVER_HOST_SELECTOR) as HTMLElement | null) : null;
    });

    const t = computed(() => {
        // PRM: the cover reveal is terminal the instant it mounts — information parity, no scrub.
        if (reduced.value) return 1;
        // Register the per-scroll-frame reactive dependency on the page's live scroll scalar.
        void heartbeat.value;
        const hostEl = coverHost.value;
        if (!hostEl) return 1; // host-less mount → settled terminal (the chart shows fully drawn).
        // The A8 single-source seam: this host's last master position cached by the ONE activeViz
        // --scroll-tl reader this frame — NO second poll. An un-registered host → terminal 1.
        const p = readScrubHostProgress(hostEl);
        return p === null ? 1 : clamp(p, 0, 1);
    });

    return { t };
}
