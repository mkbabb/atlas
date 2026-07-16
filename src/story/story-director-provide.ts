// platform/story/story-director-provide.ts — THE DIRECTOR PROVIDE SEAM (N.WB1).
//
// `DashboardEssay` (the story host) PROVIDES the active `StoryDirectorContext` once; a figure plate
// INJECTS it to register its `MarkStageHandle` (the morph-participation seam) WITHOUT the host knowing
// the chart type (the D5 no-overfit law). Outside a story host the inject default is `null`, so a plate
// mounted standalone (a preview harness, a route with no choreographed transition) is byte-unchanged —
// the register is a no-op (`useMarkStage` degrades silently, the documented befitting-silent default).

import {
    inject,
    provide,
    onBeforeUnmount,
    type InjectionKey,
} from "vue";
import type {
    MarkStageHandle,
    StoryChapter,
} from "./story-contract.js";
import {
    useStoryDirector,
    type StoryDirectorContext,
} from "./useStoryDirector.js";

/** The provide/inject token the figure plates read the active director through (null outside a host). */
export const STORY_DIRECTOR_KEY: InjectionKey<StoryDirectorContext | null> =
    Symbol("story-director");

/** Mount the director for a story host and PROVIDE it to the subtree. The host calls this ONCE when
    any chapter declares a `transition`; it returns the context so the host also reads `storyT`/`edgeFor`
    for the corridor recede. */
export function provideStoryDirector(
    chapters: readonly StoryChapter[],
): StoryDirectorContext {
    const director = useStoryDirector(chapters);
    provide(STORY_DIRECTOR_KEY, director);
    return director;
}

/** Read the active director, or `null` outside a providing story host (never throws — the
    befitting-silent default a figure plate treats as optional). */
export function useOptionalStoryDirector(): StoryDirectorContext | null {
    return inject(STORY_DIRECTOR_KEY, null);
}

/**
 * A figure plate registers its `MarkStageHandle` with the active director (the morph-participation
 * seam). `id` is the plate's chapter id (the anchor the director keys the edge on); `buildHandle`
 * constructs the handle over the plate's live marks. Registers on call, disposes on unmount. Outside a
 * story host it is a NO-OP (the plate is byte-unchanged standalone). Returns the director (or null) so
 * the caller may read `edgeFor`/`storyT` for its own scrub if it wants.
 */
export function useMarkStage(
    id: string,
    buildHandle: () => MarkStageHandle,
): StoryDirectorContext | null {
    const director = useOptionalStoryDirector();
    if (!director) return null;
    const dispose = director.registerStage(id, buildHandle());
    onBeforeUnmount(dispose);
    return director;
}
