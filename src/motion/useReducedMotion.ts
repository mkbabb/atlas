// platform/composables/useReducedMotion.ts — the JS-side reduced-motion fence,
// over @vueuse `usePreferredReducedMotion` (INV: lib leverage, A6/CQ7 §4). The
// global CSS guard (`@media (prefers-reduced-motion: reduce)`) does NOT reach JS
// rAF / ECharts / keyframes loops: a JS animation must check this explicitly and
// snap to its terminal state instead of driving frames. This wraps @vueuse's
// media-query primitive so every motion site reads one reactive source of truth
// that tracks live OS changes — retiring the bespoke `lib/motion.ts` matchMedia
// plumbing (B3/B4 migrate the call sites, then drop the lib).

import { computed, type ComputedRef } from "vue";
import { usePreferredReducedMotion } from "@vueuse/core";

/**
 * Reactive `prefers-reduced-motion: reduce` flag (live-updating). True when the
 * user asked for reduced motion — the one signal a JS animation reads to snap to
 * its terminal frame. @vueuse owns the media-query listener; we project its
 * `'reduce' | 'no-preference'` string to a boolean so call sites branch on a flag.
 */
export function useReducedMotion(): ComputedRef<boolean> {
    const preference = usePreferredReducedMotion();
    return computed(() => preference.value === "reduce");
}
