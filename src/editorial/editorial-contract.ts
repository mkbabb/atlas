// platform/editorial/editorial-contract.ts — the DECLARED PAGE-FACETS the essay host renders (N.WB3).
//
// The `DashboardEssay` assembler already renders a route's `Chapter[]`; N.WB3 makes the two page-level
// surfaces the bodies hand-built — the COVER-FIGURE crown series and the provenance COLOPHON — into
// DATA the host renders too. This module widens `Chapter` with the two optional facets, mirroring the
// `StoryChapter` = `Chapter & ChapterChoreography` seam (`platform/story/story-contract`): the base
// prop stays `Chapter[]`, the host reads the facets via a widening cast, and a chapter that declares
// NEITHER falls back to the `#hero`/`#colophon` slot (every un-migrated route is byte-identical).
//
// The types are core-clean platform references (the hero series is `DashboardHero`'s own contract; the
// colophon is `SiteColophon`'s), so the editorial unit stays publishable — no `@/dashboards` reach.

import type { Chapter } from "@/contract";
import type { ColorKind } from "@/charts/scale/colorKind";
import type { HeroFigure } from "./DashboardHero.vue";
import type { Colophon } from "@/platform/chrome/masthead/SiteColophon.vue";

/** The declared HERO facet — the page cover as DATA. Its shape is the `<DashboardHero>` prop surface
    (the crown lives on the chapter, not hand-mounted in the body), so the host renders it with a bare
    `v-bind`. The `figures` HeroFigure[] IS the audacious crown series (three co-equal, or a `rank:"lede"`
    crown + flanking sub-aggregates). Omit the facet ⇒ the `#hero` slot renders (the un-migrated route). */
export interface HeroFacet {
    /** The page <h1> title (the dashboard's editorial name). */
    title: string;
    /** Optional kicker rendered above the page title. */
    eyebrow?: string;
    /** The Newsreader dek beneath the title. */
    dek: string;
    /** The audacious cover-figure crown series (three co-equal, or a ranked crown + flanks). */
    figures: HeroFigure[];
    /** The page palette tinting the figures (the FigureInitial gradient echo). Omit ⇒ diverging. */
    colorKind?: ColorKind;
    /** The index of the thesis figure that wears the route's ONE gold seal. Omit ⇒ 0. */
    thesisIndex?: number;
    /** The cover kicker tucked above the audacious cover-line (derived at the call site). Omit ⇒ none. */
    coverKicker?: string;
    /** The magazine-deck standfirst beneath the cover (derived off the signed thesis figure). */
    standfirst?: string | null;
}

/** A `Chapter` widened with the editorial PAGE-FACETS the essay host renders directly. A `viz:"hero"`
    chapter may carry `hero`; a `viz:"colophon"` chapter may carry `colophon`. Both optional — a chapter
    declaring neither renders through the host's `#hero`/`#colophon` slot (the widening never breaks a
    route that has not adopted the facet). */
export type EditorialChapter = Chapter & {
    /** The declared page-cover crown (renders through <DashboardHero> in place of the `#hero` slot). */
    hero?: HeroFacet;
    /** The declared provenance colophon (renders through <SiteColophon> in place of the `#colophon` slot). */
    colophon?: Colophon;
};
