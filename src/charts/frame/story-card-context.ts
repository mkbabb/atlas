import { computed, shallowReactive, type ComputedRef, type InjectionKey } from "vue";
import type { AggregateStat } from "@/charts/contract/viz-contract";

export interface StoryCardContext {
    aggregateStats: ComputedRef<AggregateStat[]>;
    setAggregateStats(vizId: string, stats: readonly AggregateStat[]): void;
    clearAggregateStats(vizId: string): void;
}

export const STORY_CARD_KEY: InjectionKey<StoryCardContext> = Symbol("atlas-story-card");

/** One deterministic stats register shared by every plate nested in a StoryCard. */
export function createStoryCardContext(): StoryCardContext {
    const byViz = shallowReactive(new Map<string, readonly AggregateStat[]>());
    return {
        aggregateStats: computed(() => [...byViz.values()].flat()),
        setAggregateStats: (vizId, stats) => byViz.set(vizId, stats),
        clearAggregateStats: (vizId) => void byViz.delete(vizId),
    };
}
