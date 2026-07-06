// platform/composables/useRankMotion.ts — THE rank→MOTION-BAND host reader (K-ANIM A5 · proto/A5-afford.md §2.3).
//
// Binds a viz's reactive K-C `rank` to the reveal-stage band re-parameterizer (the reparam seam). ONE
// return: `reparameterizeBand(from,to)`. IDENTITY when no rank (the byte-clean path — an un-ranked viz
// reveals on the canonical K-B band, untouched). NO style stamp, NO CSS token: AMPLITUDE is A3's
// RANK_INTENSITY, SIZE is --rank-scale, A5 owns only the band geometry.

import { computed, type ComputedRef } from "vue";
import {
    resolveRankBand,
    reparameterizeBand as reshape,
    type RankTier,
} from "./rankMotionBand";

export interface UseRankMotion {
    /** The reveal-stage band re-parameterizer (ORDER + DURATION). Pure + reactive:
        re-reads the current rank's budget each call. IDENTITY (returns `[from,to]` unchanged) when no
        rank — the byte-clean path. */
    reparameterizeBand: (from: number, to: number) => readonly [number, number];
}

export function useRankMotion(rank: ComputedRef<RankTier | undefined>): UseRankMotion {
    const budget = computed(() => resolveRankBand(rank.value));
    return {
        reparameterizeBand: (from, to) => reshape(budget.value, from, to),
    };
}
