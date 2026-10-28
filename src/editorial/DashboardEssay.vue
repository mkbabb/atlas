<script setup lang="ts">
// platform/editorial/DashboardEssay.vue — THE DECLARATIVE-ESSAY HOST (I3.a · the beat scaffold, once).
//
// LIFTED (N.WB3 · §4.B3) out of the instance `src/dashboards/` into `platform/editorial/` so the essay
// ASSEMBLER is publishable beside the vocabulary it composes (`@atlas/core/editorial` now carries BOTH
// the Beat/DashboardHero/AnimatedRule vocabulary AND this one assembler). Its type dep re-points at the
// core contract (`@/contract`), never `@/dashboards` — the L1 inversion fence holds.
//
// The body becomes DATA. A route declares its narrative as one StoryManifest; THIS
// host iterates it and renders the FULL beat scaffold ONCE per chapter — the `section-anchor beat`
// wrapper (via the shared <Beat> shell), the <FigureInitial> drop-cap, the eyebrow (icon · Roman ·
// kicker, SM-1 data-hue), the <h2> title (a plain string OR a `TitleFacet` the title register
// paints whole), the dek, the chapter viz, and the trailing
// <AnimatedRule> whose `:seed` cadence the host derives from the chapter INDEX (the SM-1/`:seed`
// drift folds — the cadence is a function of position, never hand-incremented per body).
//
// THIS IS THE SINGLE SCAFFOLD the three bodies (usf/sci/ecf) collapse onto (I3 §2 / Hard Gate 1):
// the per-beat `<section ref>` + `useScrollScene` + `beatStyle()` + the eyebrow icon + the Roman
// number + the dek that was hand-copied 6–9 times per body lives ONCE here. The bodies stop
// re-spelling it; they declare the story and mount `<DashboardEssay :story>`.
//
// THE VIZ SEAM (I3 §1, the I2 contract CONSUMED): a chapter's `viz` is a feature-plate Component
// (the plate owns its own <VizPlate>/contract, the way the bodies mount `<FundLedgerFlow />`), a
// declared `VizContract` (the host renders it through <VizPlate>, the E8 PlateVoid routing through
// `isEmpty()`), or a `"hero"`/`"colophon"` page-level sentinel. The host never re-mints the I2
// contract — it consumes it.
//
// N.WB3 · THE PAGE-FACETS (colophon + cover-figures as DATA): a `"hero"` chapter MAY carry a declared
// `hero` facet (title · dek · HeroFigure[] crown series) the host renders through <DashboardHero>, and
// a `"colophon"` chapter MAY carry a declared `colophon` facet the host renders through <SiteColophon>
// — the hand-built cover/foot become DATA the host renders, exactly as it already renders the beats.
// A chapter that declares NEITHER falls back to the body's `#hero`/`#colophon` slot (byte-identical to
// every un-migrated route), so the facet is a widening, not a break (the `EditorialChapter` seam).
//
// AT REST (U/B7 · PLAN §4.2, §5.1 S-4/S-5): the essay paints every beat at rest. There is no
// per-beat fade or lift, no scroll-bound title size and no scroll snap at any width. A beat's
// component point mounts in idle time once the beat comes within 1.5 viewports (F9), behind a
// reserve at the route's beat height; a cold `#fragment` mounts its target and the beat before it
// at setup, so the restore lands on settled content.
import { computed, h, ref, watch, type Component, type Ref, type VNodeChild } from "vue";
import { useRoute } from "vue-router";
import Beat from "./Beat.vue";
import EssayTitle from "./EssayTitle.vue";
import AnimatedRule from "./AnimatedRule.vue";
import DashboardHero from "./DashboardHero.vue";
import StoryCard from "./StoryCard.vue";
import SiteColophon from "../platform/chrome/masthead/SiteColophon.vue";
import VizPlate from "../charts/frame/VizPlate.vue";
import VizAggregateStats from "../charts/legend/VizAggregateStats.vue";
import ChapterStageView from "../charts/scene/ChapterStage.vue";
import StickyScene from "../charts/scene/StickyScene.vue";
import { isVizContract, type VizContract } from "../charts/contract/viz-contract.js";
import {
    isChapterScene,
    isChapterStage,
    type ChapterScene,
    type ChapterStage,
} from "../charts/contract/scene-contract.js";
import type { Chapter, ChapterTitle } from "../contract/index.js";
import { resolveLayout, beatPhases, hasMasthead, figureLabelFor } from "./useBeatLayout.js";
import type { EditorialChapter, HeroFacet } from "./editorial-contract.js";
import { provideStoryDirector } from "../story/story-director-provide.js";
import type { StoryChapter } from "../story/story-contract.js";
import {
    chaptersOf,
    isPlateBeat,
    versalRegisters,
    type ManifestChapter,
    type StoryManifest,
} from "../story/manifest.js";
import StoryCorridor from "../story/StoryCorridor.vue";
import { figureLadderScalar } from "../story/beat-template.js";
import { useActiveDashboard } from "../platform/stores/useActiveDashboard.js";
import { resolveHeroSystem } from "./hero-system.js";
import { useComponentPointLoading } from "./useComponentPointLoading.js";
import { watchFigureSettle } from "./first-figure-floor.js";
import PlateSkeleton from "../charts/frame/PlateSkeleton.vue";

const props = defineProps<{
    /** The canonical route story and sole source of essay order. */
    story: StoryManifest;
}>();
const chapters = computed<readonly ManifestChapter[]>(() => chaptersOf(props.story));
// The host's index-keyed composable pools require a static chapter shape for the lifetime of a route.
// Chapter content remains live through `chapters`; only this setup-time shape snapshot is fixed.
const chapterShape = chapters.value;
const activeDashboard = useActiveDashboard();

// ── K-EXPRESS D2 — THE AUTO-ZEBRA PLACEMENT (resolved ONCE, the sequence is STATIC per route) ──
// The masthead-phase index counts MASTHEAD-bearing beats only (the sentinels never consume a zebra
// slot), so the first narrative beat is phase 0 (title=left) deterministically. `layouts[i]` is the
// resolved side-set the <Beat> stamps as `data-*` registers.
const phases = beatPhases(chapterShape);
// The Roman ordinal is a projection of the manifest order, never a second authored facet. Sentinels
// carry 0; every masthead-bearing chapter advances exactly once in the same phase sequence as layout.
const figures = chapterShape.map((c, i) =>
    hasMasthead(c) ? phases[i]! + 1 : 0,
);
const layouts = chapterShape.map((c, i) => resolveLayout(c, phases[i]!));

// ── P1 · CLS RESERVE — THE FIRST FIGURE BEAT (CLS-02, U §M M-2) ─────────────────────────────
// The first figure-bearing beat sits directly below the cover, on screen at first paint, so its
// `content-visibility` skip (Beat.vue) never reserves its box. While its plate resolves it is stamped
// `held` and reserves the route's declared `--first-figure-cis` (else the `--beat-cis` median); once
// the figure's own boxes hold still it is stamped `settled` and is its own height, so no blank band is
// left under a figure shorter than the median (`first-figure-floor.ts`).
const firstFigureIndex = chapterShape.findIndex((c) => isPlateBeat(c));
const firstFigureHeld = ref(firstFigureIndex >= 0);

// ── U/B7b · CLS RESERVE — THE COVER (F11, the `--hero-cis` hook) ─────────────────────────────────
// A route whose cover is a component point (/speedtest, /vft-germination) paints an empty cover at
// first paint and the component then pushes the whole column down (Z0 phone: 0.727 and 0.852 of
// the 0.772 and 0.867 CLS). While the cover resolves it is stamped `held` and reserves the route's
// declared `--hero-cis`; once its own boxes hold still it is `settled` and is its own height, the
// same release as the first figure. A route that declares no `--hero-cis` reserves nothing.
const coverIndex = chapterShape.findIndex((c, i) => isCoverChapter(c, i));
const coverHeld = ref(coverIndex >= 0);

// ── THE VERSAL (FigureInitial) — off unless a chapter declares it (U/B7 · PLAN §5.8). A declared
// `route` versal carries the route's `--versal-ink`; `atmosphere`/`legend` re-point the token. ──
const VERSAL_OVERRIDE_INK: Record<"atmosphere" | "legend", string> = {
    atmosphere: "var(--attn-atmosphere)",
    legend: "var(--attn-legend)",
};
const versals = versalRegisters(chapterShape);
const versalStyles = versals.map((v) =>
    v === "atmosphere" || v === "legend"
        ? { "--versal-ink": VERSAL_OVERRIDE_INK[v] }
        : null,
);

const beatEls = chapterShape.map(() => ref<HTMLElement | null>(null));
function setBeatEl(el: HTMLElement | null, i: number): void {
    if (beatEls[i]) beatEls[i].value = el;
}

// The first-figure and cover floors' release (see `firstFigureHeld` and `coverHeld` above): one watch
// on each beat's element.
function releaseOnSettle(index: number, held: Ref<boolean>): void {
    if (index < 0) return;
    watch(
        beatEls[index]!,
        (beat, _was, onCleanup) => {
            if (!beat || !held.value) return;
            onCleanup(watchFigureSettle(beat, () => (held.value = false)));
        },
        { immediate: true, flush: "post" },
    );
}
releaseOnSettle(firstFigureIndex, firstFigureHeld);
releaseOnSettle(coverIndex, coverHeld);

// ── N.WB1 · THE STORY DIRECTOR + THE CORRIDOR RECEDE (the T1 primitives, LIVE — guarded) ──────────
// The essay is the story host. When ANY chapter declares a `transition` facet, it mounts the ONE
// story-spanning director (`storyT` off `centreAxis`) + PROVIDES it to the subtree (a figure plate
// registers its MarkStageHandle through the provide seam), and the arriving masthead cluster RECEDES
// across the shared-element corridor (a compositor-only opacity write off `recedeStyle`, D7-safe).
// ZERO-COST otherwise: a route with no `transition` builds no director + no recede (every other route
// stays byte-identical). The chapters carry the optional choreography facets (a `StoryChapter` is a
// `Chapter` + `transition?`/`focus?`), read via the widening cast — the base prop stays `Chapter[]`.
const storyChapters = chapterShape as StoryChapter[];
// N.WB3 · THE EDITORIAL FACET WIDENING — the same array read as `EditorialChapter[]` so the template
// reads the optional `hero`/`colophon` page-facets (the base prop stays `Chapter[]`; a route that
// declares neither is byte-identical). One array, two facet lenses (story + editorial), zero copies.
// A COMPUTED, not a setup const — the bodies rebuild the chapter ARRAY when their live derivations
// change (sci's hero figures + easter-egg title re-derive once the feed attaches), so the template
// must iterate the LIVE prop (the old in-body host did exactly that). Only the chapter DATA is live;
// the chapter COUNT + per-index SHAPE (masthead/sentinel) stay static per route — the setup-time
// pools above (phases/layouts/beatEls/reveals, index-keyed) rest on that static-shape law.
const editorialChapters = computed(() => chapters.value as readonly EditorialChapter[]);
const hasChoreography = storyChapters.some((c) => c.transition !== undefined);
const director = hasChoreography ? provideStoryDirector(storyChapters) : null;
if (director) {
    storyChapters.forEach((c, i) => {
        const el = beatEls[i];
        if (el) director.registerAnchor(c.id, el);
    });
}
/** The HandMark grain seed for a masthead beat's picked-word title — a host constant rotated by the
    beat's masthead phase (the 3..6 pool; a seed is wobble determinism, not data — no `seed` field). */
function titleSeed(i: number): number {
    return 3 + (phases[i]! % 4);
}

/** Is a chapter `viz` a mountable Component (vs a contract or a sentinel)? Anything that is not
    a sentinel string and not a `VizContract` is treated as the feature-plate component the beat
    body mounts (the `<FundLedgerFlow />` form). */
function vizComponent(v: Chapter["viz"]): Component | null {
    if (
        v === "hero" ||
        v === "colophon" ||
        isVizContract(v) ||
        isChapterStage(v) ||
        isChapterScene(v)
    ) return null;
    return v as Component;
}

// F9 · Plain component points mount in idle time once their beat is within 1.5 viewports, so the
// work lands before the beat scrolls in and outside scroll frames. ChapterStage/ChapterScene keep
// their own virtualization and bypass this ledger. A cold `#fragment` names its target at setup.
const route = useRoute();
const loadedComponentIds = useComponentPointLoading(
    chapterShape.map((chapter, index) => ({
        id: chapter.id,
        component: vizComponent(chapter.viz) !== null,
        // The cover and the first figure beat are on screen at first paint: they mount at setup.
        eager: isCoverChapter(chapter, index) || index === firstFigureIndex,
    })),
    beatEls,
    { fragment: route.hash ? decodeURIComponent(route.hash.slice(1)) : null },
);

/** Whether a chapter's component point is still waiting for its idle mount (the beat reserves its
    route height and shows the skeleton until then). */
function pointPending(chapter: Chapter): boolean {
    return vizComponent(chapter.viz) !== null && !loadedComponentIds.value.has(chapter.id);
}

/** Canonical component-backed cover points keep the same lead treatment as the legacy hero arm. */
function isCoverChapter(chapter: Chapter, index: number): boolean {
    return chapter.viz === "hero" || (index === 0 && chapter.isBeat === false);
}

/** A-08 · THE FIGURE-LADDER WIRE (dial 12 — WIRE). A chapter's DECLARED `figure` ladder resolved to
    its 0..1 rung and published on the beat root as `--crown-rung`, which the `CrownFigure` inside
    reads for its track. Declared-unwired since O-A15: five routes authored the field and the
    resolver dead-ended. A chapter with no ladder publishes nothing (its crown rests at the full
    audacious measure), so an un-declaring route is byte-unchanged. */
const ladderStyles = chapterShape.map((c) =>
    c.figure ? { "--crown-rung": String(figureLadderScalar(c.figure)) } : null,
);

/** DashboardHero's prop payload excludes the component carried for its named provenance slot. */
function heroPropsOf(hero: HeroFacet): ReturnType<typeof resolveHeroSystem>["heroProps"] {
    return resolveHeroSystem({ hero }).heroProps;
}

/** THE TITLE REGISTER (A-15) — resolve a chapter's title onto the ONE register: the plain-string
    arm and the `TitleFacet` 3-arm register (`EssayTitle`, position-derived clock/seed/boil). */
function TitleSlot(props_: {
    title: ChapterTitle;
    lead: boolean;
    seed: number;
}): VNodeChild {
    const t = props_.title;
    if (typeof t === "string") return t;
    return h(EssayTitle, { facet: t, lead: props_.lead, seed: props_.seed });
}
</script>

<template>
    <!-- The essay iterates the chapters and scaffolds each beat ONCE. The page cover (`viz:"hero"`)
         + the colophon (`viz:"colophon"`) chapters scaffold through the SAME loop, surfacing the
         body's `#hero`/`#colophon` slot in place of a plate — so the cover/foot are chapters too,
         not bespoke `<section>`s the body re-spells.

         J-CLOSE · THE COVER IS A LEAD BEAT (the ≤0.1 CLS LAW — the figure-mount root). The `:lift`
         default below resolves the COVER (`viz:"hero"`) to `lift:false`, so the cover renders as a
         `.beat--lead` (Beat.vue) — EXEMPT from the interior beat's `content-visibility:auto` +
         `contain-intrinsic-size: auto 720px` placeholder. Without this the cover (which carries NO
         `reveal.lift` in any route's context.ts) fell to the `?? true` interior default and reserved
         the generic 720px box at first paint, then COLLAPSED to its real ~301px height when its
         content laid out — pulling the entire below-cover column UP ~419px (the live trace's dominant
         demand-desktop CLS, `cover h:720→301`). The cover is the above-fold page crown: it is ALWAYS
         visible (it never earns the below-fold render-skip) and fades IN PLACE (the lead's load-
         anchored draw), so a lead beat is its CORRECT register — the exemption is semantic, not a
         CLS hack. A route may still force `reveal.lift` explicitly; this only changes the default. -->
    <!-- N.WB1 · THE STORY FLOW — a layout-transparent wrapper (`display:contents`) for every
         un-staged route (byte-identical), promoted to a positioned block (`--staged`) ONLY when the
         route declares a `transition`, so the between-beat clone overlay has a scroll-invariant
         relative origin (the marks + the overlay scroll together in this flow). -->
    <div class="essay-flow" :class="{ 'essay-flow--staged': director }">
    <template v-for="(chapter, i) in editorialChapters" :key="chapter.id">
        <component
            :is="chapter.card ? StoryCard : Beat"
            :facet="chapter.card"
            :id="chapter.id"
            :ref="(el: any) => setBeatEl(el?.$el ?? el ?? null, i)"
            :figure="versals[i] !== 'off' ? figures[i] : undefined"
            :color-kind="chapter.colorKind ?? 'diverging'"
            :hinge="chapter.hinge ?? 0.5"
            :figure-label="figureLabelFor(chapter, figures[i]!)"
            :lift="chapter.reveal?.lift ?? !isCoverChapter(chapter, i)"
            :testid="chapter.id"
            :data-point="chapter.id"
            :title-owned="hasMasthead(chapter)"
            :numbers="chapter.card ? layouts[i]!.numbers : undefined"
            :sticky="
                chapter.card?.mode === 'stage' ||
                isChapterStage(chapter.viz) ||
                isChapterScene(chapter.viz)
            "
            class="essay-beat"
            :class="{ 'essay-beat--aside': chapter.reveal?.aside }"
            :style="[ladderStyles[i], versalStyles[i]]"
            :data-scroll-tl="
                chapter.reveal?.aside || chapter.reveal?.scrub ? '' : undefined
            "
            :data-first-figure="
                i === firstFigureIndex ? (firstFigureHeld ? 'held' : 'settled') : undefined
            "
            :data-cover="i === coverIndex ? (coverHeld ? 'held' : 'settled') : undefined"
            :data-point-pending="pointPending(chapter) ? '' : undefined"
            :data-title="hasMasthead(chapter) ? layouts[i]!.title : undefined"
            :data-dock="hasMasthead(chapter) ? layouts[i]!.dock : undefined"
        >
            <!-- THE HEADER — <h2> and dek. The eyebrow is off (U/B7 · PLAN §5.8: it repeated the
                 nav label and the Roman numeral; `chapter.eyebrow` stays the dock's nav label). The
                 page cover + colophon carry their own header internally, so they omit it. -->
            <template v-if="hasMasthead(chapter)" #header>
                <div class="essay-masthead-cluster space-y-3">
                    <h2 class="text-section-fluid">
                        <!-- THE TITLE REGISTER (A-15) — a plain string or a `TitleFacet` (the 2-arm
                             register: plain/lettering + marginalia). `lead`/`seed` are
                             position-derived (the first masthead beat's mark draws on the load clock). -->
                        <TitleSlot
                            :title="chapter.title"
                            :lead="phases[i] === 0"
                            :seed="titleSeed(i)"
                        />
                    </h2>
                    <p class="text-prose-muted max-w-2xl">{{ chapter.dek }}</p>
                </div>
            </template>

            <template #figure>
            <component
                :is="chapter.ornament"
                v-if="chapter.ornament"
                class="essay-ornament"
                :stage="figures[i]"
                :data-ornament-stage="figures[i]"
                aria-hidden="true"
            />

            <!-- THE BEAT BODY — the chapter's viz. A feature-plate Component (the `<FundLedgerFlow />`
                 form, the plate owning its own <VizPlate>), a declared `VizContract` (rendered
                 through <VizPlate>, the E8 PlateVoid routing through `isEmpty()`), or the page-level
                 `#hero`/`#colophon` slot the body provides. -->
            <!-- N.WB3 · THE PAGE COVER — the `hero` facet (title · dek · HeroFigure[] crown) rendered
                 through <DashboardHero> when declared as DATA, else the body's `#hero` slot (the
                 un-migrated routes, byte-identical). -->
            <template v-if="chapter.viz === 'hero'">
                <DashboardHero
                    v-if="chapter.hero"
                    v-bind="heroPropsOf(chapter.hero)"
                    :category="activeDashboard.entry?.category"
                >
                    <template #provenance>
                        <component
                            :is="chapter.hero.provenance"
                            v-if="chapter.hero.provenance"
                        />
                    </template>
                </DashboardHero>
                <slot v-else name="hero" />
            </template>
            <!-- N.WB3 · THE PAGE FOOT — the `colophon` facet (the hand-built provenance literal made
                 DATA) rendered through <SiteColophon> when declared, else the body's `#colophon` slot. -->
            <template v-else-if="chapter.viz === 'colophon'">
                <SiteColophon v-if="chapter.colophon" :colophon="chapter.colophon" />
                <slot v-else name="colophon" />
            </template>
            <ChapterStageView
                v-else-if="isChapterStage(chapter.viz)"
                :stage="chapter.viz as ChapterStage"
                :index="i"
                :beat-id="chapter.id"
            />
            <!-- K-SCENE — a `ChapterScene` mounts the `<StickyScene>` host (the pinned-graphic stepped
                 narrative). It is neither a sentinel, a contract, nor a plain Component, so `vizComponent`
                 would mis-mount it; this branch precedes the contract + component branches. -->
            <StickyScene
                v-else-if="isChapterScene(chapter.viz)"
                :scene="chapter.viz as ChapterScene"
                :index="i"
                :beat-id="chapter.id"
            />
            <VizPlate
                v-else-if="isVizContract(chapter.viz)"
                :contract="chapter.viz as VizContract"
            >
                <!-- J-STORY §13 — the `aggregateStats` PLACEMENT (C44 · J-FEEDBACK-5 §2/§7). J-FRAME
                     declares the facet on the contract; VizPlate routes it to this slot at BOTH the
                     top and the bottom OUTSIDE the gridded body (the viz-area-is-viz-ONLY law). This
                     ONE shared placement renders the band with the numbers-hierarchy (lead audacious,
                     supports stepped), so every declarative-contract chapter gets the outside-the-grid
                     band without a per-route fill. Absent when the contract declares no facet (VizPlate's
                     guarded `v-if="aggregateStats.length"` keeps the slot un-invoked). -->
                <template #aggregate-stats="{ stats, placement }">
                    <VizAggregateStats
                        :stats="stats"
                        :placement="placement === 'bottom' ? 'bottom' : 'top'"
                    />
                </template>
            </VizPlate>
            <component
                :is="vizComponent(chapter.viz)"
                v-else-if="
                    vizComponent(chapter.viz) && loadedComponentIds.has(chapter.id)
                "
            />
            <!-- F9 · the reserve while the point waits for its idle mount. -->
            <PlateSkeleton
                v-else-if="pointPending(chapter)"
                class="essay-beat__pending"
                :label="typeof chapter.title === 'string' ? chapter.title : undefined"
            />
            </template>

        </component>

        <!-- THE TRAILING CHAPTER RULE — the engraved <AnimatedRule> parting this beat from the next.
             The `:seed` is DERIVED from the chapter index (the SM-1/`:seed` cadence drift folds — the
             grain determinism is a function of position, never hand-incremented per body with gaps).
             The LAST chapter draws no trailing rule (the colophon closes the page). The hero cover
             takes the heavier `weight="hero"` rule (the band ends, the lead beat begins). -->
        <!-- The divider treatment projects directly from the authored story point. -->
        <AnimatedRule
            v-if="i < chapters.length - 1 && chapter.card?.seamRule !== false"
            :weight="chapter.card ? 'seam' : isCoverChapter(chapter, i) ? 'hero' : 'full'"
            :seed="(props.story.seed ?? 0) + i + 1"
        />
    </template>
        <!-- N.WB1 · THE BETWEEN-BEAT DOM-CLONE OVERLAY (SVG/DOM path) — mounted ONLY on a choreographed
             route; flies the shared-element clones between the participating stages' MarkStageHandles,
             seated IN the content stage (no ink in the dock gutter). Inert (0 clones) when the arriving
             stage exposes no handle / shares no keys — the corridor recede is then the whole effect. -->
        <StoryCorridor
            v-if="director"
            :director="director"
            :chapters="storyChapters"
        />
    </div>
</template>

<style scoped>
/* N.WB1 · THE STORY FLOW WRAPPER — unstaged routes remain layout-transparent. A staged route alone
   becomes the corridor's local containing/stacking context, keeping its overlay within the essay. */
.essay-flow {
    display: contents;
}
.essay-flow--staged {
    display: block;
    position: relative;
    isolation: isolate;
}

.essay-masthead-cluster {
    position: relative;
    isolation: isolate;
}

/* P1 · CLS RESERVE — THE FIRST FIGURE BEAT (CLS-02, U §M M-2). While its plate resolves (`held`)
   the first figure beat reserves the route's declared `--first-figure-cis`, else its `--beat-cis`
   median. Once the figure has settled the floor is gone and the beat is its own height, so the
   trailing chapter rule never sits under a band of empty paper. */
.essay-beat[data-first-figure="held"] {
    min-block-size: var(--first-figure-cis, var(--beat-cis, 720px));
}

/* U/B7b · CLS RESERVE — THE COVER (F11). While a component cover resolves (`held`) it reserves the
   route's declared `--hero-cis`; a route that declares none reserves nothing. Released once the cover
   has settled, like the first figure. */
.essay-beat[data-cover="held"] {
    min-block-size: var(--hero-cis, auto);
}

/* F9 · A beat whose point waits for its idle mount reserves the route's beat height, so the mount
   (which runs 1.5 viewports ahead, outside scroll frames) fills reserved space. */
.essay-beat[data-point-pending] {
    min-block-size: var(--beat-cis, 720px);
}
.essay-beat__pending {
    flex: 1;
}

/* THE STRUCTURAL ORNAMENT — a chapter's optional botanical/figure ornament, seated LOCALLY in the
   beat flow (centred at its own measure). S2/VFT retired the per-beat ornament consumers, so the
   absolute-margin placement rule (which floated the ornament out over the trailing AnimatedRule and
   past the right viewport edge at wide desktop) is retired with them — a declared ornament now seats
   in flow, never absolutely across the rule. */
.essay-ornament {
    inline-size: clamp(3rem, 5vw, 4.5rem);
    max-block-size: 9rem;
    margin-inline: auto;
    color: var(--route-accent);
}

/* N.WB1 · THE MASTHEAD CLUSTER — the ONE wrapper the corridor recede's single opacity write rides
   (eyebrow · h2 · dek). It carries `space-y-3` (a utility class, no scoped rule needed) so the triplet
   keeps its vertical rhythm now that it is one child of `.beat__header` (whose own `space-y-3` falls
   inert with a single child); a plain block with no inline style is byte-identical to the former
   direct-flow triplet. When an edge is active the inline `opacity` + `≤0.25rem translateY` damp the
   whole cluster (compositor-only, no layout write; `will-change` is set inline for the flight only). */

/* ── K-EXPRESS D2 — THE AUTO-ZEBRA PLACEMENT (the a11y keystone: grid placement, NEVER `order`) ──
   The masthead furniture HUGS the title side (even=left, odd=right); the data plate stays
   full-measure, CENTRED — the stable anchor the furniture orbits without moving. The whole treatment
   is DESKTOP-gated — LOAD-BEARING, not cosmetic: below 1024px the FigureInitial cap is position:static
   (Beat.vue's absolute rule is itself @media ≥1024), so making `.essay-beat` a grid at ALL widths
   would pull the in-flow cap into grid auto-placement and reorder the mobile column. Inside the gate
   the cap is absolute (out of grid flow) so only the masthead <header> + the plate flow the grid;
   below 1024 the beat stays byte-identical block flow (cap → header → body, as today). */
@media (min-width: 1024px) {
    /* THE ZEBRA GRID — single-column; the masthead places into its named area; the plate
       auto-places into `data` with NO justify-self and NO inset ⇒ full-measure, CENTRED (the STABLE
       CENTRE). NO `order`, NO DOM reorder. */
    .essay-beat {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "masthead" "data";
    }
    .essay-beat :deep(.beat__header) {
        grid-area: masthead;
    }

    /* THE SWING — the masthead hugs the title side (a justify-self of the grid item); the prose stays
       LEFT-aligned (ragged-right) inside the hugged block — NO `text-align:end` (a right-aligned dek
       hurts scanning; the block-hug alone reads as the side placement). */
    .essay-beat[data-title="left"] :deep(.beat__header) {
        justify-self: start;
        max-inline-size: min(46rem, 70%);
    }
    .essay-beat[data-title="right"] :deep(.beat__header) {
        justify-self: end;
        max-inline-size: min(46rem, 70%);
    }

    /* O-A15 · THE CENTER THIRD POLE (the missing middle pole) — the masthead centres its block, the
       third `justify-self` case. Spent SPARINGLY (cover/summary/synthesis/close, ≤2 C per corridor):
       a ceremonial pole, so its title/dek centre (unlike the side poles' ragged-left prose — a centred
       masthead reads as centred). NO `order`, NO DOM reorder — grid placement only (the a11y keystone). */
    .essay-beat[data-title="center"] :deep(.beat__header) {
        justify-self: center;
        max-inline-size: min(46rem, 88%);
        text-align: center;
    }

    /* THE DROP-CAP COUNTERWEIGHT — the tinted Roman rides the title side. This rule is now only the
       SIDE: Beat.vue seats the cap at its beat's start edge, so the right pole re-anchors it to the
       end edge and nothing else. It used to also cancel a `translateX(115%)` mirror that pushed the
       cap PAST the right viewport edge at wide desktop (the systemic masthead right-edge bleed) —
       the seat-at-the-edge cure this pole reached first. Beat.vue has since found the SAME defect on
       the left (the "reserved dock gutter" the outward flank aimed into is 20px clear, not 112), so
       the seat is the shared law and the cancellation here is dead: deleted, not kept as an
       override of a rule that no longer exists. */
    .essay-beat[data-title="right"] :deep(.beat__initial:not(.beat__initial--inline)) {
        inset-inline-start: auto;
        inset-inline-end: 0;
    }

    /* THE ASIDE INSET — keyed on the class, independent of title placement. Aside retains only
       its genuine inset + scrub-host semantics; the authored/zebra title pole remains authoritative. */
    .essay-beat--aside {
        margin-inline-start: clamp(2rem, 8%, 6rem);
        margin-inline-end: 0;
    }
}

/* THE reading-flow PROGRESSIVE UPGRADE (@supports) — INERT for the shipped HUG, the named forward
   seam for the future RAIL placement. For the HUG zebra DOM order == visual order at ALL times (the
   masthead always sits ABOVE the plate, only hugging a margin), so this block changes NOTHING today;
   it is the documented @supports hook that lights up only when a future RAIL placement reorders the
   visual grid flow (where reading-flow restores tab/reading order TO the visual order). */
@media (min-width: 1024px) {
    @supports (reading-flow: grid-order) {
        .essay-beat {
            reading-flow: normal; /* explicit no-op for the HUG; the RAIL extension re-keys it */
        }
    }
}

</style>
