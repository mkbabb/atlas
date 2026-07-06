// platform/composables/useGoldOneShot.ts — THE GOLD ONE-SHOT (D7.b · M6, the affirmation
// moment). The `.text-gilt` one-pass shimmer (glass-ui 3.10) is the lawful home for the
// "affirmation" the disco-star used to carry: gold passes ONCE over the route's thesis
// figure at its count-up FINISH, then RECEDES — a seal being pressed, never a marquee.
//
// THE FOUR-VOICE LAW (C-AESTHETIC §6.1): gold is the MEDAL — TRANSIENT, never permanent
// furniture, never a data-meaning fill. So this composable applies `.text-gilt` for exactly
// ONE pass and then REMOVES it, restoring the figure's own resting ink (the thesis figure's
// data-pole hue on USF, its audacious ink on SCI/ECF). The gold catches the light once and
// is gone — it never lingers on a figure that carries data meaning.
//
// THE BUDGET (C-AESTHETIC §6.1): ≤1 one-shot FIRE per route per theme. One consumer per
// dashboard wires this to its single thesis figure; the `fired` latch makes it idempotent
// (a filter re-count never re-fires the seal — the affirmation is the ARRIVAL, once).
//
// PRM: under reduced-motion the shimmer is SKIPPED entirely — no class, no pass, the figure
// keeps its static ink (the library's `.text-gilt` PRM arm would hold a static gradient, but
// we never even apply the class under PRM, so a data-meaning figure keeps its pole hue). The
// gold is present in the platform's vocabulary; this one moment is simply not animated.

import { onBeforeUnmount, ref, type Ref } from "vue";
import { useReducedMotion } from "./useReducedMotion";

/** The single one-pass duration of `gold-shimmer-slide` (glass-ui `--duration-shimmer` = 5s)
    — the window the `.text-gilt` class stays applied before it is removed and the figure
    settles back to its own ink. Kept in one place so the removal matches the library pass. */
const SHIMMER_PASS_MS = 5000;

export interface UseGoldOneShot {
    /** Bind to the thesis figure's class: `:class="{ 'text-gilt': goldShimmer }"`. True only
        during the single pass; false at rest (so the figure's own ink is the resting state). */
    shimmer: Ref<boolean>;
    /**
     * Fire the one-shot ONCE. Call at the count-up FINISH (e.g. `await runCount(); fire()`).
     * Idempotent — a second call (a filter re-count, a re-mount) is a no-op; the seal is the
     * arrival, pressed once. Under PRM it is a no-op (no shimmer, the static ink holds).
     */
    fire: () => void;
}

/**
 * The gold one-shot for a route's thesis figure. Returns `shimmer` (bind to `.text-gilt`)
 * and `fire()` (call at the count-up finish). Fires at most once; PRM-skipped; self-removes
 * after one pass so the gold is transient (the medal), never permanent ink on the figure.
 */
export function useGoldOneShot(): UseGoldOneShot {
    const reduced = useReducedMotion();
    const shimmer = ref(false);
    let fired = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function fire(): void {
        if (fired || reduced.value) return; // once; never under PRM (the static ink holds)
        fired = true;
        shimmer.value = true;
        timer = setTimeout(() => {
            shimmer.value = false; // the pass is done — recede to the figure's own ink
            timer = null;
        }, SHIMMER_PASS_MS);
    }

    onBeforeUnmount(() => {
        if (timer) clearTimeout(timer);
    });

    return { shimmer, fire };
}
