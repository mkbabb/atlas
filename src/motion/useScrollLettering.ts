// platform/composables/useScrollLettering.ts — the AUDACIOUS LETTERING reveal (H.W11.b).
//
// The user's "more audacious lettering" as MOTION: a Fraunces cover-line (or any audacious
// headline) reveals CHARACTER BY CHARACTER as its facet enters — the glyphs ink in cadence,
// each one rising + un-blurring on a keyframes.js spring, and REWINDING on scroll-up. It is the
// lettering sibling of `useCountUp`'s scroll-scrubbed face (H11.b): the SAME law — the reveal is
// a pure function of a [0,1] scroll scalar, so it is bi-directional BY CONSTRUCTION (scroll down,
// the line writes itself; scroll up, it un-writes), the same reverse-for-free the native `view()`
// reveal gets, now per-glyph.
//
// THE ENGINE (consume, don't re-roll): keyframes.js's `stagger` builds the per-index delay
// DISTRIBUTION (the cadence shape — `from: "first"` writes left-to-right, `"center"` blooms from
// the middle), and `springTimingFunction` is the per-glyph reveal CURVE (the soft settle the
// audacious register wants — a glyph that springs up, never a linear fade). We do NOT use their
// rAF `.play()`: a scroll-scrubbed reveal samples the curve at the scroll position, stateless.
//
// THE CARDINAL LAW — WITHIN A SENSE OF PROPORTION (the motion budget): a glyph cascade that
// reveals ALL characters at once reads busy; one that crawls a single glyph at a time reads
// fussy. So the reveal runs a SLIDING ACTIVE BAND of FIXED WIDTH (`concurrencyCap` glyphs) that
// travels through the line as `p` advances — at ANY scroll position at most `concurrencyCap`
// glyphs are mid-reveal, the rest fully OUT (ahead of the band) or fully IN (behind it). The cap
// is the mark-scarcity discipline extended to motion: a small fixed count of concurrent reveals,
// independent of line length, so a 6-glyph word and a 40-glyph headline read with the SAME
// composed cadence. (This is why the per-glyph window is `cap/total` of the progress span, not a
// fixed fraction — the band's character-width is the invariant, the budget.)
//
// THE THREE FENCES (designed, not degraded):
//   • reduced-motion → the line is FULLY REVEALED instantly (every glyph at its terminal state,
//     no transform, no scrub) — information parity, the H11 first fence. The returned `styles`
//     are all-empty (no opacity ramp, no lift), so the headline simply IS.
//   • touch / keyboard → this composable is PURE GEOMETRY off a `progress` reader; the scrubber
//     that DRIVES `progress` (tap/drag/arrow-keys) lives in `ScrollTimeline.vue` (H11.a/.c). The
//     lettering inherits operability from its scroll source — it makes no pointer assumption.
//
// THE CONSUMER CONTRACT (for H11.c — the per-viz apply):
//   1. `split(text)` → grapheme-safe `string[]` (so an emoji / combining mark is ONE cell). Use
//      it to v-for the per-character `<span>`s of the cover-line.
//   2. bind each span's inline style to `styles.value[i]` — `{ opacity, transform }`, the reveal
//      state of glyph `i` at the current scroll position. (Whitespace glyphs get an empty style —
//      a space has no ink to reveal; it never consumes a band slot.)
//   3. for a11y the headline's ACCESSIBLE text must stay whole — render the original string in a
//      visually-hidden sibling (or `aria-label` the wrapper + `aria-hidden` the per-glyph spans),
//      so a screen reader reads the cover-line as one phrase, never glyph-by-glyph. The reveal is
//      DECORATION over text that is always present (the scrub never changes the accessible name).
//
// ONE clock, many faces: `progress` is a READER the caller supplies (the section's
// `useScrollTimeline` lettering-facet position, or a raw `useScrollProgress`). This composable
// NEVER reads scroll itself — no second scalar, no `getBoundingClientRect`, no listener (the
// single-scroll-scalar discipline; the hot path is the band arithmetic, pure).

import { computed, type ComputedRef } from "vue";
import { clamp, type TimingFunction } from "@mkbabb/value.js";
import {
    stagger,
    springTimingFunction,
    type StaggerOrigin,
} from "@mkbabb/keyframes.js";
import { useReducedMotion } from "./useReducedMotion.js";

/** The per-character reveal style — an inline `style` object to bind on each glyph span. */
export type LetteringStyle = Record<string, string>;

export interface UseScrollLetteringOptions {
    /**
     * THE MOTION BUDGET — the fixed number of glyphs allowed mid-reveal at any scroll position
     * (the sliding active-band width). Independent of line length: a small cap reads composed.
     * Default 6 (a ~word-wide band — enough to feel a cadence, never a wall of motion).
     */
    concurrencyCap?: number;
    /**
     * Where the cascade ORIGINATES (the `stagger` distribution shape): `"first"` writes
     * left-to-right (the default, a line being typed), `"center"` blooms from the middle,
     * `"edges"` closes inward. The audacious default is `"first"` — a cover-line reads as it
     * writes. Maps to keyframes.js `StaggerOrigin`.
     */
    from?: StaggerOrigin;
    /**
     * The per-glyph reveal CURVE. Default a soft spring (`springTimingFunction`, ζ 0.62) — the
     * glyph springs up + settles, the audacious register's voice. Pass any `TimingFunction` to
     * override (e.g. a flatter `easeOutExpo` for a quieter sub-head).
     */
    glyphEasing?: TimingFunction;
    /**
     * The arrival LIFT in em units — each glyph rises this far as it reveals (`y: +lift → 0`).
     * Default 0.5em (a restrained rise, scaled to the glyph's own size, never a swoop).
     */
    liftEm?: number;
    /**
     * The arrival BLUR in px at the start of a glyph's reveal (`blur(b) → blur(0)`). Default 6 —
     * the glyph resolves INTO focus as it inks (the "more audacious" texture, proportioned). Set
     * 0 to disable (a clean fade+lift only).
     */
    blurPx?: number;
}

export interface UseScrollLettering {
    /**
     * The per-character reveal styles, indexed parallel to `split(text)`. `styles.value[i]` is
     * glyph `i`'s `{ opacity, transform, filter }` at the current scroll position. Whitespace
     * glyphs carry an empty style (no ink). Under PRM every entry is empty — the line is fully
     * lit, no transform (the terminal binding).
     */
    styles: ComputedRef<LetteringStyle[]>;
    /**
     * The count of glyphs at least partially revealed (`reveal > 0`) at the current scroll
     * position — the born-RED gate's witness (0 at p=0, the full count at p=1, monotone with p).
     * Under PRM it is the full count (all revealed).
     */
    revealedCount: ComputedRef<number>;
}

/**
 * Grapheme-safe split — one cell per USER-PERCEIVED character (an emoji, a combining accent, a
 * ZWJ sequence is ONE glyph, not its code units), via `Intl.Segmenter` where present. Falls back
 * to the spread (code-point split) on engines without it. Static — call once at setup to build
 * the v-for list; it is NOT reactive (the cover-line text is fixed copy).
 */
export function splitGraphemes(text: string): string[] {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
        return Array.from(seg.segment(text), (s) => s.segment);
    }
    return Array.from(text);
}

/** The default per-glyph spring — a soft, audacious settle (ζ 0.62, a touch of ring, no wobble). */
const DEFAULT_GLYPH_SPRING: TimingFunction = springTimingFunction({
    response: 0.42,
    dampingFraction: 0.62,
}).fn;

/**
 * The audacious character-stagger reveal, scroll-scrubbed. Given the line's glyph list (via
 * `splitGraphemes`) and a `progress` reader, returns per-character reveal `styles` that ink the
 * glyphs in cadence as `p` advances and rewind as `p` recedes — bi-directional by construction,
 * under a fixed motion budget (the sliding active band). PRM binds to fully-revealed (no scrub).
 *
 * @param glyphs   the grapheme cells (call `splitGraphemes(text)` once at setup).
 * @param progress a `() => number` reader of the [0,1] lettering-facet scroll scalar.
 */
export function useScrollLettering(
    glyphs: string[],
    progress: () => number,
    options: UseScrollLetteringOptions = {},
): UseScrollLettering {
    const {
        concurrencyCap = 6,
        from = "first",
        glyphEasing = DEFAULT_GLYPH_SPRING,
        liftEm = 0.5,
        blurPx = 6,
    } = options;
    const reduced = useReducedMotion();

    const n = glyphs.length;

    // Which cells carry INK — a whitespace glyph has nothing to reveal, so it neither animates
    // nor consumes a band slot (the budget is spent on visible glyphs only). The inked indices
    // are what the cascade walks; their COUNT sets the band's progress-width.
    const inkIndex: number[] = [];
    const isInk: boolean[] = glyphs.map((g, i) => {
        const ink = g.trim().length > 0;
        if (ink) inkIndex.push(i);
        return ink;
    });
    const inkCount = inkIndex.length;

    // THE STAGGER DISTRIBUTION (consume keyframes.js): the per-ink-index delay shape (the cadence
    // origin — `"first"`/`"center"`/`"edges"`). We read it as NORMALIZED start-offsets in [0,1]
    // (delay / maxDelay), so the reveal centers map onto the progress axis regardless of `each`.
    // `each` is arbitrary here (we normalize it away); the SHAPE is what `from` controls.
    const staggerFn = stagger(Math.max(inkCount, 1), { each: 1, from });
    const rawDelays = staggerFn.delays(Math.max(inkCount, 1));
    const maxDelay = Math.max(1, ...rawDelays);
    // The normalized reveal-START position (in [0,1]) for each INK index, by its cascade order.
    const startOf = rawDelays.map((d) => d / maxDelay);

    // THE BAND WIDTH (the motion budget made geometry): the active band spans `cap` glyphs, so in
    // PROGRESS units its width is `cap / inkCount` of the cascade span. A glyph's reveal runs from
    // its normalized start to `start + bandWidth`; outside that it is fully OUT (ahead) or fully
    // IN (behind). Clamped to (0, 1]: a line shorter than the cap reveals as one band (all
    // together, but that IS ≤ cap glyphs — still within budget).
    const bandWidth = inkCount > 0 ? clamp(concurrencyCap / inkCount, 0.0001, 1) : 1;

    // The cascade must finish BY p=1: the last band's start is `1 - bandWidth` of a normalized
    // axis, so we compress the start positions into `[0, 1 - bandWidth]` and let each glyph's own
    // band carry it to full. (Without this a `from:"first"` line whose last start is ~1 would only
    // BEGIN revealing its tail at p=1 and never finish.)
    const startSpan = Math.max(0, 1 - bandWidth);

    /** Glyph `i`'s reveal fraction [0,1] at progress `p` — 0 (out) → 1 (in), eased; band-local. */
    function revealAt(orderInCascade: number, p: number): number {
        const start = startOf[orderInCascade] * startSpan;
        const local = (p - start) / bandWidth; // 0 at the band's leading edge, 1 at its trailing
        return glyphEasing(clamp(local, 0, 1));
    }

    const styles = computed<LetteringStyle[]>(() => {
        // PRM — the terminal binding: every glyph fully lit, NO transform/blur, no scrub.
        if (reduced.value) return glyphs.map(() => ({}) as LetteringStyle);

        const p = clamp(progress(), 0, 1);
        // Map each ink index to its order in the cascade (the delays array is in ink-index order).
        const out: LetteringStyle[] = new Array(n);
        let order = 0;
        for (let i = 0; i < n; i++) {
            if (!isInk[i]) {
                out[i] = {}; // whitespace — no ink, no motion, no slot.
                continue;
            }
            const r = revealAt(order, p);
            order++;
            // The arrival: fade + rise + resolve-into-focus, each driven off the one `r`. A
            // settled glyph (r=1) carries NO residual transform/filter (a clean terminal).
            if (r >= 1) {
                out[i] = { opacity: "1" };
                continue;
            }
            const lift = ((1 - r) * liftEm).toFixed(3);
            const blur = blurPx > 0 ? ((1 - r) * blurPx).toFixed(2) : "0";
            out[i] = {
                opacity: r.toFixed(3),
                transform: `translate3d(0, ${lift}em, 0)`,
                filter: blurPx > 0 ? `blur(${blur}px)` : "",
            };
        }
        return out;
    });

    const revealedCount = computed<number>(() => {
        // PRM: every INK glyph is revealed (whitespace never counts — it has no ink). This equals
        // the non-PRM terminal (`p=1 → inkCount`), so the witness reads identically with or without
        // reduced motion — true information parity, not an off-by-the-spaces drift.
        if (reduced.value) return inkCount;
        const p = clamp(progress(), 0, 1);
        let count = 0;
        let order = 0;
        for (let i = 0; i < n; i++) {
            if (!isInk[i]) continue;
            if (revealAt(order, p) > 0) count++;
            order++;
        }
        return count;
    });

    return { styles, revealedCount };
}
