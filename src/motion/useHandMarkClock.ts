// motion/useHandMarkClock.ts — the ONE mark clock (I-MARK.c · GAP-4 · the I16 reusable-facility-DRY
// pass at the MARK altitude). The mark wrappers re-threaded the SAME policy BY HAND — the load/
// scroll/static clock map and the `useThemeKey`+`.dark`-read dark-lift resolver. This composable owns
// both as ONE source.
//
// THE CLOCK MAP — glass-ui 9.0.0's `<HandMark>` has ONE draw switch (`draw`), so the clock reduces to
// whether the library draws the mark on:
//   • `load`   → `draw: true` — the mark draws on at mount; the parent's load `Sequence` may re-fire
//                it via the exposed `play()`.
//   • `scroll` → `draw: false` — the mark rests DRAWN; the atlas `crayon-wipe` view()-timeline scrubs
//                it bidirectionally under real scroll.
//   • `static` → `draw: false` — present, at rest.
// (The 4.x–8.x `appear`/`animation` modes and the `draw-then-boil` living line retired with the
// brush continuum at glass 9.0.0; there is no boil to budget.)
//
// THE DARK-LIFT — the library colours the ink with any CSS colour, so the dark-lift is resolved HERE,
// never `#cc0000` on graphite (the muddy T-2 failure). `useThemeKey()` bumps on every `<html>`
// theme-class flip so the no-prop default re-resolves the moment the dock toggles dark.
// `resolveInkColor(explicit)` returns the explicit prop verbatim when present, else the token pair
// with its light/dark lift.

import { computed, type ComputedRef } from "vue";
import { useThemeKey } from "@/platform/composables/useThemeKey";

export type MarkClock = "load" | "scroll" | "static";

/** A light/dark token pair the dark-lift resolver picks between. */
export interface DarkLiftPair {
    light: string;
    dark: string;
}

/** The editorial-red ink pair — the HandMark default (the red→bright-red lift on graphite). */
export const RED_INK: DarkLiftPair = {
    light: "var(--ncsu-red, #cc0000)",
    dark: "var(--ncsu-red-bright, #e6322a)",
};

/** The clock → library `draw` map: only the `load` clock draws the mark on. */
export function clockDraws(clock: MarkClock): boolean {
    return clock === "load";
}

/** The shared mark-clock facility. Pass a reactive `clock` getter and an optional dark-lift pair
 *  (defaults to the editorial red); receive the reactive `draw` the library prop binds + a
 *  `resolveInkColor(explicit)` that honours an explicit colour and otherwise lifts the pair. */
export function useHandMarkClock(
    clock: () => MarkClock,
    pair: DarkLiftPair = RED_INK,
): {
    draw: ComputedRef<boolean>;
    resolveInkColor: (explicit?: () => string | undefined) => ComputedRef<string>;
} {
    const draw = computed<boolean>(() => clockDraws(clock()));

    // The dark-lift signal — bumps on every theme-class flip so a no-prop default re-resolves.
    const themeKey = useThemeKey();

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

    return { draw, resolveInkColor };
}
