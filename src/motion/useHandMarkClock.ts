// platform/composables/useHandMarkClock.ts — the ONE mark clock (I-MARK.c · GAP-4 · the I16
// reusable-facility-DRY pass at the MARK altitude). The three hand-rolled mark wrappers
// (`HandUnderline`, `HandHighlight`, `AnimatedRule`) all re-threaded the SAME policy BY HAND —
// the verbatim load/scroll/static clock map, the verbatim `useThemeKey`+`.dark`-read dark-lift
// resolver, and the verbatim `@media (prefers-reduced-motion: no-preference) { @supports
// (animation-timeline: view()) }` `crayon-wipe` scroll-scrub block (the `@keyframes crayon-wipe`
// itself lives in the atlas-owned `platform/design/map-draw.css`, NOT glass-ui). That is the "verbs re-threaded
// by hand" pathology (I-PATH §1) at the mark altitude. This composable owns the clock map + the
// dark-lift resolver as ONE source; the copy-pasted scroll-scrub CSS collapses to one scoped
// stylesheet (`mark-scroll-scrub.css`) the three wrappers import.
//
// THE CLOCK MAP — the load/scroll/static policy the library `appear`/`animation` props consume:
//   • `load`   → `appear:"manual"` + `animation:"draw-on"` — the parent's load `Sequence` fires
//                the wipe ONCE via the exposed `play()` (no setTimeout).
//   • `scroll` → `appear:"mount"` + `animation:"none"` — the paths rest DRAWN, the library IO clock
//                OFF; the scoped `.crayon-wipe` view()-timeline (in `mark-scroll-scrub.css`) scrubs
//                the draw bidirectionally under real scroll.
//   • `static` → `appear:"mount"` + `animation:"none"` — present, undrawn (a non-animated consume).
//
// THE DARK-LIFT — the library colours the SVG fill directly (any CSS colour), so the dark-lift is
// resolved HERE, never `#cc0000` on graphite (the muddy T-2 failure). `useThemeKey()` bumps on every
// `<html>` theme-class flip so the no-prop default re-resolves the moment the dock toggles dark.
// `resolveInkColor(explicit)` returns the explicit prop verbatim when present (it wins on both
// grounds — passed straight to the brush fill), else the token pair with its light/dark lift.

import { computed, type ComputedRef } from "vue";
import { useThemeKey } from "@/platform/composables/useThemeKey";

export type MarkClock = "load" | "scroll" | "static";

/** The library `appear` mode a clock maps to. */
export type MarkAppear = "manual" | "mount";
/** The library `animation` mode a clock maps to. The resting clock map only ever yields
 *  `none`/`draw-on`; `draw-then-boil` is the I-MARK.d HERO exception (the §U "one continuously-
 *  animated option once drawn") — a SEPARATE opt-in (`boil`), never a resting-clock value, so the
 *  default everywhere stays static-once-drawn (the boil frame-guard the AnimatedRule rule keeps). */
export type MarkAnimation = "none" | "draw-on" | "draw-then-boil";

/** A light/dark token pair the dark-lift resolver picks between. The default is the editorial red
 *  (`--ncsu-red` / `--ncsu-red-bright`); a wrapper passes its own pair (the highlighter wash). */
export interface DarkLiftPair {
    light: string;
    dark: string;
}

/** The editorial-red ink pair — the HandUnderline default (the red→bright-red lift on graphite). */
export const RED_INK: DarkLiftPair = {
    light: "var(--ncsu-red, #cc0000)",
    dark: "var(--ncsu-red-bright, #e6322a)",
};

/** The clock → `appear` map (the static-masthead default rests `mount`; only `load` is `manual`). */
export function clockAppear(clock: MarkClock): MarkAppear {
    return clock === "load" ? "manual" : "mount";
}

/** The clock → `animation` map (only `load` draws-on; `scroll`/`static` rest present-DRAWN — the
 *  scroll arm is then scrubbed by the `.crayon-wipe` view-timeline in `mark-scroll-scrub.css`).
 *
 *  `boil` is the I-MARK.d HERO exception (C10 / E2 · the §U "one continuously-animated option once
 *  drawn"): the ONE budgeted hero mark draws on the `load` arrival and THEN settles into the gentle
 *  living line (`draw-then-boil`, the shipped 4.0.1 pencil-boil singleton-rAF clock). It is the
 *  load-clock's escalation, NOT a fourth clock — so a boil opt-in is meaningful only on `load`; on
 *  `scroll`/`static` it is ignored (those rest DRAWN, the frame-guard intact). The BUDGET (exactly
 *  ONE living boil per route, `BOIL_BUDGET` in mark-tokens.ts) is the CALLER's contract — this map
 *  only resolves the library `animation` value for a mark that has earned the boil. */
export function clockAnimation(clock: MarkClock, boil = false): MarkAnimation {
    if (clock !== "load") return "none";
    return boil ? "draw-then-boil" : "draw-on";
}

/** The shared mark-clock facility the three wrappers consume. Pass a reactive `clock` getter and an
 *  optional dark-lift pair (defaults to the editorial red); receive the reactive `appear`/`animation`
 *  the library props bind + a `resolveInkColor(explicit)` that honours an explicit colour prop and
 *  otherwise lifts the pair for the live theme. */
export function useHandMarkClock(
    clock: () => MarkClock,
    pair: DarkLiftPair = RED_INK,
    boil?: () => boolean,
): {
    appear: ComputedRef<MarkAppear>;
    animation: ComputedRef<MarkAnimation>;
    resolveInkColor: (explicit?: () => string | undefined) => ComputedRef<string>;
} {
    const appear = computed<MarkAppear>(() => clockAppear(clock()));
    // The animation arm honours the HERO boil opt-in (the §U one living line): a budgeted hero on
    // the `load` clock resolves to `draw-then-boil` (draw-on, then settle); every other mark keeps
    // the resting `draw-on`/`none` map (the boil frame-guard intact — the default is static).
    const animation = computed<MarkAnimation>(() =>
        clockAnimation(clock(), boil?.() ?? false),
    );

    // The dark-lift signal — bumps on every theme-class flip so a no-prop default re-resolves the
    // moment the dock toggles dark (the SVG-fill re-derive seam, CH-5).
    const themeKey = useThemeKey();

    // The dark-lift ink resolver — pass a reactive getter for an explicit `color` prop (it wins
    // verbatim — passed straight to the brush fill); when it returns nothing the pair lifts for the
    // live theme. The getter keeps the `props.color` reactivity the wrappers had before the extract.
    function resolveInkColor(explicit?: () => string | undefined): ComputedRef<string> {
        return computed<string>(() => {
            const c = explicit?.();
            if (c) return c;
            void themeKey.value; // touch so this re-derives on the dark flip
            const dark =
                typeof document !== "undefined" &&
                document.documentElement.classList.contains("dark");
            return dark ? pair.dark : pair.light;
        });
    }

    return { appear, animation, resolveInkColor };
}
