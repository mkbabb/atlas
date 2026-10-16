// editorial/useEvidenceFloor.ts — the reactive face of the evidence floor (U-F25, §H M-5).
//
// A figure binds its live n once and reads three things off it: whether rank and superlative words
// are licensed, the count line ("n = 3 filers") that names what n counts, and the floor in force.
// Titles, crowns, legend keys and the sub-floor plate all branch on the same `licensed`, so a figure
// cannot crown a value while its title declines to rank it.
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { EVIDENCE_FLOOR, floorMet, nCount, nounFor, type CountNoun } from "./evidence-floor.js";

export interface EvidenceFloor {
    /** The live sample size. */
    n: ComputedRef<number>;
    /** The floor in force (the library constant unless the feed carries its own). */
    floor: ComputedRef<number>;
    /** Rank, crown, superlative and "median" wording is licensed. */
    licensed: ComputedRef<boolean>;
    /** "n = 1 filer": the line a sub-floor cell prints beside its value. */
    count: ComputedRef<string>;
    /** The bare noun for n ("filer" / "filers"), for captions such as "3 filers shown". */
    noun: ComputedRef<string>;
}

export function useEvidenceFloor(
    n: MaybeRefOrGetter<number>,
    noun: CountNoun,
    floor: MaybeRefOrGetter<number> = EVIDENCE_FLOOR,
): EvidenceFloor {
    const nRef = computed(() => toValue(n));
    const floorRef = computed(() => toValue(floor));
    return {
        n: nRef,
        floor: floorRef,
        licensed: computed(() => floorMet(nRef.value, floorRef.value)),
        count: computed(() => nCount(nRef.value, noun)),
        noun: computed(() => nounFor(nRef.value, noun)),
    };
}
