// charts/frame/useHeadlineLift.ts — the STRADDLE-LIFT measurement seam of ChartFrame (O-B4R
// god-split of `ChartFrame.vue`, §A.9 — the resize/observer arm the B4 wave names). Measures the
// headline band's half-height (`--headline-lift`) so its midline rides the plate bezel, and
// re-measures on a ResizeObserver + a posture flip. Moved verbatim; the SFC keeps the posture
// predicates + the `plateVars` publish.

import {
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
    type ComputedRef,
    type Ref,
} from "vue";

export interface UseHeadlineLiftReturn {
    /** The band element — bound in the template, measured for the straddle lift. */
    headlineEl: Ref<HTMLElement | null>;
    /** Half the band's measured block-size, in px — the straddle lift (`--headline-lift`). */
    headlineLift: Ref<number>;
}

/** Measure the headline band's straddle lift off `straddling`/`hasHeadline`. Zero until measured
    (so the first paint is in-flow, never a jump to a guessed literal — the band measures, then
    lifts on the next frame). */
export function useHeadlineLift(
    hasHeadline: ComputedRef<boolean>,
    straddling: ComputedRef<boolean>,
): UseHeadlineLiftReturn {
    const headlineEl = ref<HTMLElement | null>(null);
    const headlineLift = ref(0);
    let headlineRO: ResizeObserver | null = null;

    function measureHeadline(): void {
        const el = headlineEl.value;
        if (!el) {
            headlineLift.value = 0;
            return;
        }
        // round to a device px so the lift is stable under sub-pixel reflow (no jitter loop).
        headlineLift.value = Math.round(el.getBoundingClientRect().height / 2);
    }

    onMounted(() => {
        if (!hasHeadline.value) return;
        measureHeadline();
        if (typeof ResizeObserver !== "undefined" && headlineEl.value) {
            headlineRO = new ResizeObserver(() => measureHeadline());
            headlineRO.observe(headlineEl.value);
        }
    });
    onBeforeUnmount(() => {
        headlineRO?.disconnect();
        headlineRO = null;
    });
    // Re-measure when the posture flips (straddle ⇆ inline at the mobile fold re-flows the band).
    watch(straddling, () => void nextTick(measureHeadline));

    return { headlineEl, headlineLift };
}
