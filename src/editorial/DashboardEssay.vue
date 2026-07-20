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
// kicker, SM-1 data-hue), the <h2> title (a plain string OR a live VNode — <HandMark> /
// <ScrollLetteringHeading> — rendered identically), the dek, the chapter viz, and the trailing
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
// THE REVEAL CLOCK (the F6.3 single-writer law, T6): the native `view()` engine (scroll-driven.css)
// OWNS the fade+lift on the compositor whenever it is present — the host emits NO inline style on
// that path (the <Beat> markup is the host, the CSS is the writer). The JS reveal is the
// `@supports` fallback ONLY (Firefox / jsdom / SSR); its `style` is empty under native or PRM. So
// the reveal binding mounts ONCE per chapter without two clocks fighting.
//
// J-SCROLL §7 — the chapter reveal is now a `kind:"reveal"` FACET of the ONE clock, NOT a second
// `useScrollScene` rAF/geometry scene. `useScrollScene` retires: each chapter subscribes to the
// THIN page-clock subscriber (`useSectionReveal`, the light section-windowed 0..1 reader — one
// geometry read, no second scroll listener), and the host emits the fade+lift INLINE style ONLY on
// the @supports fallback path (`!supportsViewTimeline()`), empty under native or PRM (the
// single-writer law, T6 — the compositor is the sole writer under native; the beat is SET under
// PRM). The @supports fallback is thus the timeline's terminal `seek(1)`-equivalent: ONE reveal
// engine on ONE clock. (Phase-A SHAPE: subscribes to each section's own scroll position; on the
// Phase-C re-pin the source re-seats onto the BC `useScrollTrigger` page-reader — a one-line swap.)
import { computed, h, provide, ref, watch, type Component, type VNodeChild } from "vue";
import { useDeck } from "@mkbabb/glass-ui/deck";
import { useSectionReveal } from "../motion/useScrollTimeline.js";
import { supportsViewTimeline } from "../motion/useScrollProgress.js";
import { useReducedMotion } from "../motion/useReducedMotion.js";
import { toRoman } from "../platform/composables/useRomanNumeral.js";
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
import { recedeStyle } from "../story/corridor.js";
import type { StoryChapter } from "../story/story-contract.js";
import {
    chaptersOf,
    type ManifestChapter,
    type StoryManifest,
} from "../story/manifest.js";
import { resolveSkin, skinCssVars, SKIN_KEY } from "../skin/index.js";
import StoryCorridor from "../story/StoryCorridor.vue";
import { useActiveDashboard } from "../platform/stores/useActiveDashboard.js";
import { useActiveBeat } from "../platform/stores/useActiveBeat.js";
import { useMobileRegister } from "../platform/composables/useMobileRegister.js";
import { resolveHeroSystem } from "./hero-system.js";
import { useComponentPointLoading } from "./useComponentPointLoading.js";

const props = defineProps<{
    /** The canonical route story and sole source of essay order. */
    story: StoryManifest;
}>();
const storySkin = props.story.skin ? resolveSkin(props.story.skin) : null;
const storySkinStyle = storySkin ? skinCssVars(storySkin) : undefined;
if (storySkin) provide(SKIN_KEY, storySkin);
const chapters = computed<readonly ManifestChapter[]>(() => chaptersOf(props.story));
// The host's index-keyed composable pools require a static chapter shape for the lifetime of a route.
// Chapter content remains live through `chapters`; only this setup-time shape snapshot is fixed.
const chapterShape = chapters.value;
const activeDashboard = useActiveDashboard();

// ── K-EXPRESS D2 — THE AUTO-ZEBRA PLACEMENT (resolved ONCE, the sequence is STATIC per route) ──
// The masthead-phase index counts MASTHEAD-bearing beats only (the sentinels never consume a zebra
// slot), so the first narrative beat is phase 0 (title=left) deterministically. `layouts[i]` is the
// resolved side-set the <Beat> stamps as `data-*` registers + the fallback reveal axis reads. Hoisted
// here so `revealStyles` reads `layouts[i]` with no temporal-dead-zone hazard.
const phases = beatPhases(chapterShape);
// The Roman ordinal is a projection of the manifest order, never a second authored facet. Sentinels
// carry 0; every masthead-bearing chapter advances exactly once in the same phase sequence as layout.
const figures = chapterShape.map((c, i) =>
    hasMasthead(c) ? phases[i]! + 1 : 0,
);
const layouts = chapterShape.map((c, i) => resolveLayout(c, phases[i]!));

// ── P1 · CLS RESERVE — THE FIRST FIGURE BEAT (CLS-02) ────────────────────────────────────────
// The first figure-bearing beat is the data plate sitting directly below the cover — on-screen at
// first paint, so its `content-visibility` skip (Beat.vue) never fires and never reserves its box.
// Its plate then resolves its height a frame late (the ECharts/canvas mount) and reflows the whole
// column beneath. Below-fold beats are reserved by `content-visibility`; only this one on-screen beat
// needs an explicit floor. The stamp lets the CSS reserve its settled height (`--beat-cis`, the same
// route-measured median the skip uses) from first paint, so the mount fills reserved space.
const firstFigureIndex = chapterShape.findIndex((c) => hasFigure(c));

// ── THE REVEAL FACET — one per chapter, mounted ONCE (the §7 `kind:"reveal"` fallback writer) ──
// The per-beat `<section ref>` the bodies hand-rolled is hoisted here: ONE ref + ONE
// `useSectionReveal` per chapter (the thin page-clock subscriber — the §7 `kind:"reveal"` enter
// facet, NOT a `useScrollScene` rAF/geometry scene). The chapter's reveal STYLE (opacity + lift)
// is the `beatStyle()` output the bodies hard-coded — but emitted INLINE only on the @supports
// fallback path (`!supportsViewTimeline()`), EMPTY under the native `view()` engine or PRM (the
// single-writer law, T6 — scroll-driven.css is the sole writer under native; the beat is SET under
// PRM). The chapter sequence is STATIC per route (a route's `context.ts` declares its `Chapter[]`
// once), so the subscriber pool is built ONCE at setup — composables run only in setup (never
// inside a computed); `setBeatEl` populates the per-beat element ref each subscriber reads from.
const reduced = useReducedMotion();
const beatEls = chapterShape.map(() => ref<HTMLElement | null>(null));
function setBeatEl(el: HTMLElement | null, i: number): void {
    if (beatEls[i]) beatEls[i].value = el;
}
const reveals = chapterShape.map((c, i) =>
    useSectionReveal(beatEls[i], { tail: c.reveal?.tier === "tail" }),
);

// ── PA-5 · PHONE PAGING — native document scroll snap + Glass `useDeck` for a11y ONLY ────────────
// On phone each beat is a DOCUMENT scroll-snap page (the CSS below; the page scrolls on <html>, so
// there is NO nested scroller). Glass `useDeck` is consumed ONLY for the SETTLED-page index, the
// `aria-current` stamp, and the polite "Slide N of M: <name>" live announcement — it drives NO
// scroll clock and mounts NO observer. The settled page is read off the dock's EXISTING active-beat
// store (`activeBeatId`, the ONE upper-third observer), so there is no second observer or rAF clock,
// and no `useDeckDetent`. Desktop sets no snap-type (continuous, unchanged).
const { isPhone } = useMobileRegister();
const activeBeat = useActiveBeat();
const deck = useDeck(chapterShape.length, {
    label: (i) => chapterShape[i]?.eyebrow ?? chapterShape[i]?.id ?? "",
});
const settledIndex = computed(() =>
    Math.max(0, chapterShape.findIndex((c) => c.id === activeBeat.activeBeatId)),
);
watch(settledIndex, (i) => deck.go(i));
/** Glass's portable "Slide N of M: <name>" announcement off the settled index (the sole a11y read). */
const pageAnnouncement = deck.liveMessage;

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
/** Which chapters host a shared-element corridor edge (a director + a resolvable edge) — the ONLY
    beats whose masthead recedes. The native CSS `corridor-recede` keyframe (scroll-driven.css) is
    GATED to these via the `data-corridor-recede` stamp (below); an un-staged route stamps nothing. */
const hasCorridorEdge = storyChapters.map(
    (c) => !!director && director.edgeFor(c.id) !== null,
);

/** The per-chapter corridor recede — the arriving masthead cluster damps to `--corridor-prose-floor`
    across its shared-element edge (0 at the poles). O-A18 MIGRATION: EMPTY under the native `view()`
    engine (the compositor `corridor-recede` keyframe is the single writer off `--beat-tl` — the same
    hand-off `revealStyles` makes) OR PRM (`recedeStyle({prm})` already returns `{}`; the beat rests at
    opacity 1, information parity). The JS `recedeStyle` survives ONLY as the `@supports` fallback
    writer (Firefox/jsdom/SSR), reading the director's `edge.t` per frame — one writer per environment. */
const recedeStyles = storyChapters.map((c) =>
    computed<Record<string, string>>(() => {
        if (!director || supportsViewTimeline()) return {};
        const edge = director.edgeFor(c.id);
        if (!edge || !edge.active.value) return {};
        return recedeStyle(edge.t.value, { prm: reduced.value });
    }),
);

/** The arrival lift in viewport-height units — the beat rises this far from below as it reveals
    (`y: +6% → 0`, the same engraved settle the retired `useScrollScene` carried, S3 §2.3). */
const REVEAL_LIFT_VH = 6;
/** The horizontal scroll-in magnitude (vw) — the fallback mirror of scroll-driven.css's
    `--reveal-shift: 6vw` (the K-EXPRESS D2 axis swap). */
const REVEAL_SHIFT_VW = 6;

/** The per-chapter reveal STYLE — the @supports fallback writer (the §7 terminal-bind path). EMPTY
    under the native `view()` engine (the compositor owns the fade+lift — single writer, T6) OR PRM
    (the beat stands at its terminal state, information parity). On the fallback path the opacity +
    the lift/slide both run off the subscriber's entry-anchored `t` (1 ⇒ settled), so the beat fades
    in as it enters and fades back on scroll-up (bidirectional by construction). The transform AXIS is
    the D2 scroll-in: a masthead beat slides along `layouts[i].scrollIn` (left/right/up); the sentinels
    (no masthead, never stamped `data-scroll-in`) keep the VERTICAL rise — closing the divergence the
    native path already has (`--reveal-x:0` where `data-scroll-in` is absent). */
const revealStyles = reveals.map((r, i) =>
    computed<Record<string, string>>(() => {
        // A SCENE beat emits NO beat-level reveal transform (the steps ARE its reveal) — a transform
        // ancestor perturbs the scene graphic's `position:sticky` pin (the K-SCENE pin-safety guard).
        if (
            chapters.value[i]!.card?.mode === "stage" ||
            isChapterStage(chapters.value[i]!.viz) ||
            isChapterScene(chapters.value[i]!.viz)
        )
            return {} as Record<string, string>;
        if (supportsViewTimeline() || reduced.value)
            return {} as Record<string, string>;
        const t = r.t.value;
        const dir = hasMasthead(chapters.value[i]!) ? layouts[i]!.scrollIn : "up";
        const off = 1 - t;
        const x =
            dir === "left"
                ? -off * REVEAL_SHIFT_VW
                : dir === "right"
                  ? off * REVEAL_SHIFT_VW
                  : 0;
        const y = dir === "up" ? off * REVEAL_LIFT_VH : 0;
        return {
            opacity: String(t),
            transform: `translate3d(${x.toFixed(3)}vw, ${y.toFixed(3)}vh, 0)`,
        };
    }),
);

/** The HandMark grain seed for a masthead beat's picked-word title — a host constant rotated by the
    beat's masthead phase (the 3..6 pool; a seed is wobble determinism, not data — no `seed` field). */
function titleSeed(i: number): number {
    return 3 + (phases[i]! % 4);
}

/** P-CF06 · THE `data-reveal-shape` STAMP — present ONLY for the non-default settle shape
    (the CSS default `lift` needs no attribute, mirroring `data-dense`/
    `data-chrome`'s "attribute present only when non-default" convention). Read directly off
    `chapter.reveal` — no `hasMasthead` gate needed (a sentinel's `reveal` never carries a
    variation-zipped `shape`, the same ungated precedent `data-scroll-tl` already sets below). */
function revealShapeAttr(c: Chapter): string | undefined {
    const shape = c.reveal?.shape;
    return shape && shape !== "lift" ? shape : undefined;
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

// Plain component points load from the dock's existing active-beat observer and remain mounted once
// reached. ChapterStage/ChapterScene retain their own virtualization and bypass this ledger.
const loadedComponentIds = useComponentPointLoading(
    chapterShape.map((chapter, index) => ({
        id: chapter.id,
        component: vizComponent(chapter.viz) !== null,
        eager: isCoverChapter(chapter, index),
    })),
);

/** Canonical component-backed cover points keep the same lead treatment as the legacy hero arm. */
function isCoverChapter(chapter: Chapter, index: number): boolean {
    return chapter.viz === "hero" || (index === 0 && chapter.isBeat === false);
}

/** Non-beat sentinels never consume or render a FigureInitial, regardless of viz backing. */
function hasFigure(chapter: Chapter): boolean {
    return chapter.isBeat !== false && chapter.viz !== "hero" && chapter.viz !== "colophon";
}

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
    <div
        class="essay-flow"
        :class="{ 'essay-flow--staged': director }"
        :data-skin="storySkin?.id"
        :style="storySkinStyle"
    >
    <template v-for="(chapter, i) in editorialChapters" :key="chapter.id">
        <component
            :is="chapter.card ? StoryCard : Beat"
            :facet="chapter.card"
            :id="chapter.id"
            :ref="(el: any) => setBeatEl(el?.$el ?? el ?? null, i)"
            :figure="hasFigure(chapter) ? figures[i] : undefined"
            :color-kind="chapter.colorKind ?? 'diverging'"
            :hinge="chapter.hinge ?? 0.5"
            :figure-label="figureLabelFor(chapter, figures[i]!)"
            :reveal="chapter.reveal?.tier ?? 'default'"
            :lift="chapter.reveal?.lift ?? !isCoverChapter(chapter, i)"
            :testid="chapter.id"
            :data-point="chapter.id"
            :title-owned="hasMasthead(chapter)"
            :sticky="
                chapter.card?.mode === 'stage' ||
                isChapterStage(chapter.viz) ||
                isChapterScene(chapter.viz)
            "
            class="essay-beat"
            :class="{ 'essay-beat--aside': chapter.reveal?.aside }"
            :aria-current="isPhone && i === settledIndex ? 'true' : undefined"
            :style="revealStyles[i]?.value"
            :data-scroll-tl="
                chapter.reveal?.aside || chapter.reveal?.scrub ? '' : undefined
            "
            :data-reveal-shape="revealShapeAttr(chapter)"
            :data-first-figure="i === firstFigureIndex ? '' : undefined"
            :data-title="hasMasthead(chapter) ? layouts[i]!.title : undefined"
            :data-dock="hasMasthead(chapter) ? layouts[i]!.dock : undefined"
            :data-scroll-in="hasMasthead(chapter) ? layouts[i]!.scrollIn : undefined"
        >
            <!-- THE HEADER TRIPLET — eyebrow · <h2> · dek. The page cover + colophon carry their
                 own header internally (the hero <h1>, the colophon About rung), so they omit it. -->
            <template v-if="hasMasthead(chapter)" #header>
                <!-- N.WB1 · THE MASTHEAD CLUSTER — eyebrow · <h2> · dek, ONE wrapper (the recede's
                     single opacity write). It damps to `--corridor-prose-floor` across the arriving
                     shared-element corridor (compositor-only opacity + ≤0.25rem translate); `{}` (no
                     style, byte-identical) when the beat has no active edge or the route is un-staged. -->
                <div
                    class="essay-masthead-cluster space-y-3"
                    :style="recedeStyles[i]?.value"
                    :data-corridor-recede="hasCorridorEdge[i] ? '' : undefined"
                >
                    <!-- SM-1 — the eyebrow carries the chapter's nav icon, tinted in the route data hue
                         (the "pops live in the icons" site). The TEXT stays muted ink (fill-vs-label). -->
                    <p class="eyebrow">
                        <component
                            :is="chapter.icon"
                            class="eyebrow__icon"
                            :size="14"
                            aria-hidden="true"
                        />
                        {{ toRoman(figures[i]!) }} · {{ chapter.eyebrow }}
                    </p>
                    <h2 class="text-section-fluid">
                        <!-- THE TITLE REGISTER (A-15) — a plain string or a `TitleFacet` (the 3-arm
                             register: plain/typewriter/lettering + marginalia). `lead`/`seed` are
                             position-derived (the first masthead beat inks on the load clock). -->
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
            :variant="storyChapters[i]?.rule"
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
        <!-- PA-5 · the polite paging announcement — Glass `useDeck`'s portable "Slide N of M:
             <name>" seam surfaced in ONE sr-only status region. Phone only (desktop is continuous). -->
        <p v-if="isPhone" class="sr-only" role="status" aria-live="polite">
            {{ pageAnnouncement }}
        </p>
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

/* P1 · CLS RESERVE — THE FIRST FIGURE BEAT (CLS-02). The beat stamped `data-first-figure` is the
   data plate directly below the cover: on-screen at first paint, so Beat.vue's `content-visibility`
   skip never fires for it and never reserves its box — its plate resolves height a frame late and
   reflows the column. Reserve its settled height (`--beat-cis`, the SAME route-measured median the
   below-fold skip reserves with) from first paint, so the mount fills reserved space instead of
   growing into it. Below-fold beats keep their `content-visibility` reservation; this floors the ONE
   on-screen beat the skip cannot reach. */
.essay-beat[data-first-figure] {
    min-block-size: var(--beat-cis, 720px);
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

/* THE EYEBROW DATA-HUE ICON (design-suffusion §2 #1 / d-pops M2) — the section eyebrow carries its
   beat's nav icon tinted in the route's DATA hue (the literal "pops live in the icons" site). The
   icon resolves `--route-eyebrow-hue` via `color`, so the `currentColor`-stroked Lucide glyph paints
   in the data hue; it sits at --attn-chrome (the eyebrow's editorial recession). The eyebrow TEXT
   stays muted ink (the §3.4 fill-vs-label law). This is the de-copy of the per-body `.eyebrow__icon`
   block the three bodies each re-spelled — hoisted here ONCE. */
.eyebrow__icon {
    color: var(--route-eyebrow-hue);
    opacity: var(--attn-chrome);
    flex: none;
    margin-inline-end: 0.4em;
}

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

    /* THE DROP-CAP COUNTERWEIGHT — the tinted Roman rides the title side. title=left ⇒ cap left
       (Beat.vue's default `translateX(-115%)` breaks into the reserved LEFT dock gutter — it has
       112px of room). title=right has NO mirror gutter (the content stage pads only the START), so
       the mirrored `translateX(115%)` pushed the cap PAST the right viewport edge at wide desktop
       (the systemic masthead right-edge bleed). Seat the right cap AT the block's right edge instead
       (`translateX(0)`) — the manuscript grid-break still overlaps the masthead's top-right corner,
       contained within the viewport. */
    .essay-beat[data-title="right"] :deep(.beat__initial:not(.beat__initial--inline)) {
        inset-inline-start: auto;
        inset-inline-end: 0;
        transform: translateX(0);
    }

    /* THE ASIDE INSET — keyed on the class, independent of title placement. Aside retains only
       its genuine inset + scrub-host semantics; the authored/zebra title pole remains authoritative. */
    .essay-beat--aside {
        margin-inline-start: clamp(2rem, 8%, 6rem);
        margin-inline-end: 0;
    }
}

/* O-A15 (item 8) · THE TITLE-LAW SCROLL CLAMP — the resolved title couples its size to the SAME
   `--scroll-tl` the beat reveal rides (the MECHANISM is the template's; the SIZE values are WG-C's —
   O-C1/O-C2's Title-law ladder). It is INERT this cut: `--title-law-min`/`--title-law-max` default to
   the `text-section-fluid` size (`--type-heading-section`), so the interpolation is the IDENTITY (the
   title renders at its normal fluid size, no visual change) until WG-C sets the ladder endpoints. Bound
   only where `--scroll-tl` is live (`[data-scroll-tl]` beats on the native view() engine); under PRM /
   no-timeline it never attaches. The mechanism is scroll-driven, ZERO per-frame JS (the compositor
   reads `--scroll-tl` — the H11 faceted scrub host owns the axis; this only samples it). */
@media (prefers-reduced-motion: no-preference) {
    @supports (animation-timeline: view()) {
        .essay-beat[data-scroll-tl] .essay-masthead-cluster h2 {
            font-size: calc(
                var(--title-law-min, var(--type-heading-section)) +
                    (
                        var(--title-law-max, var(--type-heading-section)) -
                        var(--title-law-min, var(--type-heading-section))
                    ) * var(--scroll-tl, 0)
            );
        }
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

/* ── PA-5 · PHONE PAGING — native DOCUMENT scroll snap (the page scrolls on <html>, so this is the
   root scroller, NOT a nested one). Each beat is a snap page; `proximity` (never `mandatory`) so a
   taller-than-viewport beat never TRAPS the reader on a pathologically long phone page. Desktop sets
   no snap-type (continuous, unchanged). The root rule is a no-op on routes with no `.essay-beat`
   targets (home/gallery), so it needs no route gate. The settled page + its `aria-current`/live
   announcement ride Glass `useDeck` off the existing active-beat observer (no second clock). */
@media (--phone) {
    :global(html) {
        scroll-snap-type: y proximity;
    }
    .essay-beat {
        scroll-snap-align: start;
        /* PA-5 · SNAP SAFE-INSET — the collapsed dock crest pill floats over the phone's head margin
           (PlatformShell reserves `--shell-head-reserve` of block-start for it). A beat snapping to
           `start` would seat its eyebrow UNDER that pill; the scroll-margin lifts each snap stop clear
           of the crest by the SHELL-OWNED reserve (inherited from `.platform-shell__main`), so no
           snapped page seats beneath the sticky masthead. */
        scroll-margin-block-start: var(--shell-head-reserve);
    }
}
</style>
