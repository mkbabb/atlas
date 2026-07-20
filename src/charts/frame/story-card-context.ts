import { computed, shallowReactive, type ComputedRef, type InjectionKey } from "vue";
import type { AggregateStat } from "../contract/viz-contract.js";

export interface StoryCardContext {
    /** A-11 · THE NUMERALS POLE — the resolved `BeatLayout.numbers` side (`resolveLayout`), the ONE
        authority the card's aggregate band reads for its `placement`. The zebra alternates it
        even=top/odd=bottom by masthead phase; an authored `layout.numbers` overrides. The pole is
        GRID PLACEMENT only — the band's DOM seat never moves (the no-reorder keystone). */
    numbers: "top" | "bottom";
    aggregateStats: ComputedRef<AggregateStat[]>;
    setAggregateStats(vizId: string, stats: readonly AggregateStat[]): void;
    clearAggregateStats(vizId: string): void;
}

export const STORY_CARD_KEY: InjectionKey<StoryCardContext> = Symbol("atlas-story-card");

/** One deterministic stats register shared by every plate nested in a StoryCard. */
export function createStoryCardContext(numbers: "top" | "bottom"): StoryCardContext {
    const byViz = shallowReactive(new Map<string, readonly AggregateStat[]>());
    return {
        numbers,
        aggregateStats: computed(() => [...byViz.values()].flat()),
        setAggregateStats: (vizId, stats) => byViz.set(vizId, stats),
        clearAggregateStats: (vizId) => void byViz.delete(vizId),
    };
}
