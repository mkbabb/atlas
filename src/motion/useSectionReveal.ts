// motion/useSectionReveal.ts — THE THIN PAGE-CLOCK SUBSCRIBER (J-SCROLL §6/§7), extracted from
// `useScrollTimeline.ts` (O-B4R god-split, §A.9). A section-windowed 0..1 reveal scalar that does
// NOT mint a `ManualTimeline`, join the `activeViz` argmin registry, or open a second scroll
// listener — the LIGHT path the static-lettering titles + the chapter `kind:"reveal"` enter
// subscribe to. Moved verbatim; `useScrollTimeline` re-exports it so the `@/motion` surface holds.

import { computed, type ComputedRef, type Ref } from "vue";
import { clamp } from "@mkbabb/value.js/math";
import { smoothStep3 } from "@mkbabb/value.js/easing";
import { useElementBounding, useWindowSize } from "@vueuse/core";
import { useReducedMotion } from "./useReducedMotion.js";
import { titleRevealProgress } from "../story/corridor.js";

// ── THE THIN PAGE-CLOCK SUBSCRIBER (J-SCROLL §6/§7 — the demotion target) ──────────────────────
// A SECTION-WINDOWED 0..1 scalar that does NOT mint a `ManualTimeline`, register a scrub host with
// the `activeViz.ts` argmin registry, or open a second scroll listener — it is the LIGHT path the
// static-lettering titles (§6) and the chapter `kind:"reveal"` enter (§7) subscribe to once
// `useScrollScene`/the full `useScrollTimeline` engine retire. It re-uses ONLY the section-rect
// geometry read (`useScrollProgress`, the sole `useElementBounding` cost — no registry membership,
// no native custom-property read) and windows the raw transit into the ENTRY-anchored span
// the native `view()` register settles in (the same `entry X% ≡ X%·v/(h+v)` math the fallback
// reveal uses, F6 §2.4) — so the demoted title/reveal lands its end-state as the beat ENTERS, then
// rests, bi-directional by construction (a pure function of the section's scroll position).
//
// PHASE NOTE (J-SCROLL Phase-A SHAPE): the "clock" this subscribes to is the section's OWN scroll
// position (`useScrollProgress`, the geometry reader). On the Phase-C consume off the published
// 4.1.0 cut the atlas now pins, the source re-seats onto the BC `useScrollTrigger` page-reader's coalesced whole-page scalar
// windowed to this section's entry span — a ONE-LINE source swap (the windowing math + the
// consumer-facing `t` scalar are unchanged), NOT a re-architecture. Under PRM the scalar pins to 1
// (the terminal reveal, information parity, no per-frame work).

/** The entry-anchored window the reveal/lettering settles in — `entry 5%` first ink → `entry 22%`
    settled, the native interior register the fallback rhymes with (F6 §2.4 / scroll-driven.css). */
const SECTION_REVEAL_IN = 0.05;
const SECTION_REVEAL_OUT = 0.22;

export interface UseSectionReveal {
    /** The section's entry-anchored reveal scalar, [0, 1] — 0 before the entry band, eased to 1
        as the beat settles in view. 1 under reduced motion (terminal, no scrub). */
    t: ComputedRef<number>;
}

/**
 * Bind a SECTION-WINDOWED reveal scalar to a beat's scroll position — the thin page-clock
 * subscriber the §6 lettering-title demotion + the §7 `kind:"reveal"` chapter enter consume in
 * place of a full `useScrollTimeline`/`useScrollScene`. `target` is the section element; the
 * returned `t` is the entry-anchored 0..1 reveal (eased), settling by `entry 22%` and rewinding
 * on scroll-up. No `ManualTimeline`, no rAF sampler, no second scroll listener — the raw transit
 * derives from THIS subscriber's one `useElementBounding` read, windowed.
 *
 * LIVE ON BOTH ENGINES (the N-batch3 title cure). Phase-A sourced `raw` off
 * `useScrollProgress(target)` — but that scalar carries the DEAD-PATH FENCE (frozen 0 wherever
 * the native `view()` engine owns the reveal axis), which is correct for consumers the CSS
 * writes (the essay beat reveal) and WRONG for the lettering titles: the per-glyph ink is a
 * JS-ONLY writer with NO native CSS twin, so under Chrome the titles never inked (opacity 0,
 * the h2 a blank gap — usf/sci/ecf all rode it). The transit is therefore derived HERE, off the
 * `useElementBounding` this composable ALREADY attaches for its entry window (same math as
 * `useScrollProgress`: `(viewport − top) / (height + viewport)`, clamped) — live under native,
 * byte-identical on the fallback, and one geometry instance instead of two. The single-writer
 * law holds: consumers whose writer IS the native CSS (`DashboardEssay`'s fallback styles)
 * guard on `supportsViewTimeline()` BEFORE reading `t`, so this scalar stays an unread lazy
 * computed on their native path.
 */
export function useSectionReveal(
    target: Ref<HTMLElement | null>,
    options: { tail?: boolean; settle?: "entry" | "title" } = {},
): UseSectionReveal {
    const reduced = useReducedMotion();
    const { top, height } = useElementBounding(target);
    const { height: viewport } = useWindowSize();

    /** The section's full-transit scalar — 0 as its top touches the viewport bottom, 1 as its
        bottom leaves the top (the `height + viewport` window; `useScrollProgress`'s grammar,
        derived from this subscriber's own live geometry so it ticks under BOTH engines). */
    const raw = computed(() => {
        // No element yet (pre-mount / SSR) → the 0 floor — an all-zero bounding rect would
        // otherwise read a spurious 1 (the same guard `useScrollProgress` carries).
        if (!target.value) return 0;
        const win = height.value + viewport.value;
        if (win <= 0) return 0;
        return clamp((viewport.value - top.value) / win, 0, 1);
    });

    /** `entry X%` of the v-only span expressed in the beat's full-transit progress units (the
        height-derived window the native interior register settles in — F6 §2.4). */
    const entryToProgress = (entryFrac: number): number => {
        const v = viewport.value;
        const win = height.value + v;
        return win > 0 ? (entryFrac * v) / win : entryFrac;
    };

    const t = computed(() => {
        // PRM: the reveal is terminal the instant it mounts — information parity, no scrub.
        if (reduced.value) return 1;
        // THE TITLE REGISTER (P193 · G-N13 — the ratified story timing law, ADOPTED live).
        // A lettering title is a FOREGROUND performance, not the structural beat fade: on the
        // entry window it settles at `entry 22%` ≈ cover 0.09 — fully inked at the viewport's
        // bottom edge, the write-on never seen. The title law instead completes the reveal at
        // cover `TITLE_COMPLETE_AT` (0.32, `titleRevealProgress` — corridor.ts), lower-middle
        // viewport: the cascade visibly writes as the beat rises, settled STRICTLY before the
        // count's cover-0.50 centre (title-before-centre; the count lands AT centre).
        if (options.settle === "title") return titleRevealProgress(raw.value);
        const inP = entryToProgress(SECTION_REVEAL_IN);
        // The OUT threshold: interior beats settle at `entry 22%`; a TAIL/colophon beat (which a
        // tall section can never scroll to `entry 22%` of before the document ends) caps at its MAX
        // ATTAINABLE progress (`height / (height + viewport)` ≡ `entry 100%`, fully on-screen) so the
        // reveal still completes when the beat is fully present (never resting dim — the F6 §2.4 cap).
        let outP = Math.max(inP + 1e-3, entryToProgress(SECTION_REVEAL_OUT));
        if (options.tail) {
            const win = height.value + viewport.value;
            if (win > 0) outP = Math.max(inP + 1e-3, height.value / win);
        }
        const r = clamp((raw.value - inP) / (outP - inP), 0, 1);
        return smoothStep3(r);
    });

    return { t };
}
