// platform/editorial/editorial-contract.ts — the DECLARED PAGE-FACETS the essay host renders (N.WB3).
//
// The `DashboardEssay` assembler renders the manifest's projected chapters; N.WB3 makes the two page-level
// surfaces the bodies hand-built — the COVER-FIGURE crown series and the provenance COLOPHON — into
// DATA the host renders too. This module widens `Chapter` with the two optional facets, mirroring the
// `StoryChapter` = `Chapter & ChapterChoreography` seam (`platform/story/story-contract`).
//
// The types are core-clean platform references (the hero series is `DashboardHero`'s own contract; the
// colophon is `SiteColophon`'s), so the editorial unit stays publishable — no `@/dashboards` reach.

import type { Chapter } from "../contract/index.js";
import type { Component } from "vue";
import type { ColorKind } from "../charts/scale/colorKind.js";
import type { HeroFigure } from "./DashboardHero.vue";
import type { Colophon } from "../platform/chrome/masthead/SiteColophon.vue";
import type { TitleAlign } from "./title-align.js";
import type { StoryCardFacet } from "./story-card.js";

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
    /** The bounded page-title pole; omit/auto preserves the start-aligned cover. */
    align?: TitleAlign;
    /** Optional live provenance content seated in DashboardHero's named provenance slot. */
    provenance?: Component;
}

/** A `Chapter` widened with the editorial PAGE-FACETS the essay host renders directly. A `viz:"hero"`
    chapter may carry `hero`; a `viz:"colophon"` chapter may carry `colophon`. Both optional — a chapter
    declaring neither renders through the host's `#hero`/`#colophon` slot (the widening never breaks a
    route that has not adopted the facet). */
export type EditorialChapter = Chapter & {
    /** Optional fixed-sector veil card. Omit to retain the existing bare Beat rendering. */
    card?: StoryCardFacet;
    /** The declared page-cover crown (renders through <DashboardHero> in place of the `#hero` slot). */
    hero?: HeroFacet;
    /** The declared provenance colophon (renders through <SiteColophon> in place of the `#colophon` slot). */
    colophon?: Colophon;
    /** Optional marginal device projected from the canonical story point. */
    ornament?: Component;
};
