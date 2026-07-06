// platform/charts/beat-title.ts — the BEAT-TITLE authority (the K-F title-dedup seam).
//
// A chapter renders its title ONCE — as the beat's <h2> (DashboardEssay.vue). A declarative
// VizContract plate fell through to ChartFrame's masthead and re-painted `contract.title` ON TOP
// of that <h2> (the double-title the J-render flagged). This seam names the ONE authority: the
// StoryBeat OWNS the title for an interior figure and PROVIDES that ownership DOWN its subtree;
// VizPlate INJECTS it and suppresses its own masthead title RUNG when the beat owns it. The
// `contract.title` field STAYS — it is the aria/export/caption/?fig=-expand source; only the
// painted line is suppressed. A figure mounted OUTSIDE a providing beat (the teleported ?fig=
// expand, the gallery preview) injects NO context ⇒ paints its own title (degrades exactly right).
//
// It mirrors the live expand-settle.ts seam: a small context + an OPTIONAL InjectionKey, so a
// figure outside a providing beat simply sees no provider and behaves exactly as before.

import { inject, type InjectionKey } from "vue";

/** The title-ownership a StoryBeat provides to the figure(s) it wraps. */
export interface BeatTitleContext {
    /** TRUE iff the beat renders the title itself (its <h2>) and the figure must NOT re-paint it.
        Owned for every interior chapter; FALSE for the `hero`/`colophon` page-level sentinels. */
    owned: boolean;
}

/** Optional inject (`inject(BEAT_TITLE_KEY, undefined)`): present only inside a title-owning Beat. */
export const BEAT_TITLE_KEY: InjectionKey<BeatTitleContext> = Symbol("platform:beat-title");

/** Read the beat's title-ownership, or `undefined` outside a providing Beat (a figure
    mounted standalone — the teleported `?fig=` expand, a gallery preview — sees no
    provider and paints its own title exactly as before). Never throws — this context's
    entire purpose is a befitting-silent default. */
export function useOptionalBeatTitleContext(): BeatTitleContext | undefined {
    return inject(BEAT_TITLE_KEY);
}
