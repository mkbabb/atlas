<script setup lang="ts">
// platform/editorial/DashboardEssay.vue — THE DECLARATIVE-ESSAY HOST (I3.a · the beat scaffold, once).
//
// LIFTED (N.WB3 · §4.B3) out of the instance `src/dashboards/` into `platform/editorial/` so the essay
// ASSEMBLER is publishable beside the vocabulary it composes (`@atlas/core/editorial` now carries BOTH
// the Beat/DashboardHero/AnimatedRule vocabulary AND this one assembler). Its type dep re-points at the
// core contract (`@/contract`), never `@/dashboards` — the L1 inversion fence holds.
//
// The body becomes DATA. A route declares its narrative as a `Chapter[]` in `context.ts`; THIS
// host iterates it and renders the FULL beat scaffold ONCE per chapter — the `section-anchor beat`
// wrapper (via the shared <Beat> shell), the <FigureInitial> drop-cap, the eyebrow (icon · Roman ·
// kicker, SM-1 data-hue), the <h2> title (a plain string OR a live VNode — <HandUnderline> /
// <ScrollLetteringHeading> — rendered identically), the dek, the chapter viz, and the trailing
// <AnimatedRule> whose `:seed` cadence the host derives from the chapter INDEX (the SM-1/`:seed`
// drift folds — the cadence is a function of position, never hand-incremented per body).
//
// THIS IS THE SINGLE SCAFFOLD the three bodies (usf/sci/ecf) collapse onto (I3 §2 / Hard Gate 1):
// the per-beat `<section ref>` + `useScrollScene` + `beatStyle()` + the eyebrow icon + the Roman
// number + the dek that was hand-copied 6–9 times per body lives ONCE here. The bodies stop
// re-spelling it; they declare the chapters and mount `<DashboardEssay :chapters>`.
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
import { computed, ref, type Component, type VNodeChild } from "vue";
import { useSectionReveal } from "@/motion/useScrollTimeline";
import { supportsViewTimeline } from "@/motion/useScrollProgress";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { toRoman } from "@/platform/composables/useRomanNumeral";
import Beat from "@/editorial/Beat.vue";
import AnimatedRule from "@/editorial/AnimatedRule.vue";
import DashboardHero from "@/editorial/DashboardHero.vue";
import SiteColophon from "@/platform/chrome/masthead/SiteColophon.vue";
import VizPlate from "@/charts/frame/VizPlate.vue";
import VizAggregateStats from "@/charts/legend/VizAggregateStats.vue";
import StickyScene from "@/charts/scene/StickyScene.vue";
import { isVizContract, type VizContract } from "@/charts/contract/viz-contract";
import { isChapterScene, type ChapterScene } from "@/charts/contract/scene-contract";
import type { Chapter, ChapterTitle } from "@/contract";
import { resolveLayout, beatPhases, hasMasthead } from "./useBeatLayout";
import type { EditorialChapter } from "./editorial-contract";
import { provideStoryDirector } from "@/story/story-director-provide";
import { recedeStyle } from "@/story/corridor";
import type { StoryChapter } from "@/story/story-contract";
import StoryCorridor from "@/story/StoryCorridor.vue";

const props = defineProps<{
    /** The narrative as data — the route's chapters, declared in `context.ts` (I3 §1). */
    chapters: Chapter[];
}>();

// ── K-EXPRESS D2 — THE AUTO-ZEBRA PLACEMENT (resolved ONCE, the sequence is STATIC per route) ──
// The masthead-phase index counts MASTHEAD-bearing beats only (the sentinels never consume a zebra
// slot), so the first narrative beat is phase 0 (title=left) deterministically. `layouts[i]` is the
// resolved side-set the <Beat> stamps as `data-*` registers + the fallback reveal axis reads. Hoisted
// here so `revealStyles` reads `layouts[i]` with no temporal-dead-zone hazard.
const phases = beatPhases(props.chapters);
// O-A15 · THE ONE-FACET READ (the collapse). When a route carries the resolved variation facet
// (`chapter.template`, zipped by `expandStory` from its `BeatVariationPolicy`), the beat's PLACEMENT
// reads from THAT single facet — the title pole + its pole-following scroll-in axis — instead of the
// separate `resolveLayout` zebra derive. `resolveLayout` still runs (the orchestration law: the
// template ORCHESTRATES the resolver, it does not replace it — dock/numbers stay its output); the
// template only OVERRIDES the two poles it authors. Un-varied routes carry no `template` ⇒ byte-identical.
const layouts = props.chapters.map((c, i) => {
    const base = resolveLayout(c, phases[i]!);
    const t = (c as StoryChapter).template;
    return t
        ? { ...base, title: t.title, scrollIn: t.reveal.layout?.scrollIn ?? base.scrollIn }
        : base;
});

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
const beatEls = props.chapters.map(() => ref<HTMLElement | null>(null));
function setBeatEl(el: HTMLElement | null, i: number): void {
    if (beatEls[i]) beatEls[i].value = el;
}
const reveals = props.chapters.map((c, i) =>
    useSectionReveal(beatEls[i], { tail: c.reveal?.tier === "tail" }),
);

// ── N.WB1 · THE STORY DIRECTOR + THE CORRIDOR RECEDE (the T1 primitives, LIVE — guarded) ──────────
// The essay is the story host. When ANY chapter declares a `transition` facet, it mounts the ONE
// story-spanning director (`storyT` off `centreAxis`) + PROVIDES it to the subtree (a figure plate
// registers its MarkStageHandle through the provide seam), and the arriving masthead cluster RECEDES
// across the shared-element corridor (a compositor-only opacity write off `recedeStyle`, D7-safe).
// ZERO-COST otherwise: a route with no `transition` builds no director + no recede (every other route
// stays byte-identical). The chapters carry the optional choreography facets (a `StoryChapter` is a
// `Chapter` + `transition?`/`focus?`), read via the widening cast — the base prop stays `Chapter[]`.
const storyChapters = props.chapters as StoryChapter[];
// N.WB3 · THE EDITORIAL FACET WIDENING — the same array read as `EditorialChapter[]` so the template
// reads the optional `hero`/`colophon` page-facets (the base prop stays `Chapter[]`; a route that
// declares neither is byte-identical). One array, two facet lenses (story + editorial), zero copies.
// A COMPUTED, not a setup const — the bodies rebuild the chapter ARRAY when their live derivations
// change (sci's hero figures + easter-egg title re-derive once the feed attaches), so the template
// must iterate the LIVE prop (the old in-body host did exactly that). Only the chapter DATA is live;
// the chapter COUNT + per-index SHAPE (masthead/sentinel) stay static per route — the setup-time
// pools above (phases/layouts/beatEls/reveals, index-keyed) rest on that static-shape law.
const editorialChapters = computed(() => props.chapters as EditorialChapter[]);
const hasChoreography = storyChapters.some((c) => c.transition !== undefined);
const director = hasChoreography ? provideStoryDirector(storyChapters) : null;
if (director) {
    storyChapters.forEach((c, i) => {
        const el = beatEls[i];
        if (el) director.registerAnchor(c.id, el);
    });
}
/** The per-chapter corridor recede — the arriving masthead cluster damps to `--corridor-prose-floor`
    across its shared-element edge (0 at the poles). `{}` when no edge / not active / no director. */
const recedeStyles = storyChapters.map((c) =>
    computed<Record<string, string>>(() => {
        if (!director) return {};
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
        if (isChapterScene(props.chapters[i]!.viz))
            return {} as Record<string, string>;
        if (supportsViewTimeline() || reduced.value)
            return {} as Record<string, string>;
        const t = r.t.value;
        const dir = hasMasthead(props.chapters[i]!) ? layouts[i]!.scrollIn : "up";
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

/** Is the title a render-slot factory (a live VNode carrier) vs a plain string? */
function isTitleFactory(t: ChapterTitle): t is () => VNodeChild {
    return typeof t === "function";
}

/** Render a chapter's title — invoke the factory (the live <HandUnderline>/<ScrollLettering>
    VNode) or render the plain string. ONE call site, no per-body branching (the host renders
    BOTH shapes the same way: a string is wrapped as text, a factory is invoked). */
function renderTitle(t: ChapterTitle): VNodeChild {
    return isTitleFactory(t) ? t() : t;
}

/** Is a chapter `viz` a mountable Component (vs a contract or a sentinel)? Anything that is not
    a sentinel string and not a `VizContract` is treated as the feature-plate component the beat
    body mounts (the `<FundLedgerFlow />` form). */
function vizComponent(v: Chapter["viz"]): Component | null {
    if (v === "hero" || v === "colophon" || isVizContract(v)) return null;
    return v as Component;
}

/** The chapter's title rendered as the <h2> child (the render-function bridge for the template). */
function TitleSlot(props_: { title: ChapterTitle }): VNodeChild {
    return renderTitle(props_.title);
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
    <div class="essay-flow">
    <template v-for="(chapter, i) in editorialChapters" :key="chapter.id">
        <Beat
            :id="chapter.id"
            :ref="(el: any) => setBeatEl(el?.$el ?? el ?? null, i)"
            :figure="chapter.viz === 'colophon' ? undefined : chapter.figure"
            :color-kind="chapter.colorKind ?? 'diverging'"
            :hinge="chapter.hinge ?? 0.5"
            :figure-label="`Chapter ${toRoman(chapter.figure)}, ${chapter.eyebrow}`"
            :reveal="chapter.reveal?.tier ?? 'default'"
            :lift="chapter.reveal?.lift ?? chapter.viz !== 'hero'"
            :testid="chapter.id"
            :title-owned="hasMasthead(chapter)"
            :sticky="isChapterScene(chapter.viz)"
            class="essay-beat"
            :class="{ 'essay-beat--aside': chapter.reveal?.aside }"
            :style="revealStyles[i]?.value"
            :data-scroll-tl="
                chapter.reveal?.aside || chapter.reveal?.scrub ? '' : undefined
            "
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
                        {{ toRoman(chapter.figure) }} · {{ chapter.eyebrow }}
                    </p>
                    <h2 class="text-section-fluid">
                        <!-- The title — a plain string OR a live VNode (<HandUnderline> /
                             <ScrollLetteringHeading>), rendered identically (the host renders the
                             string, or invokes the render-slot factory). -->
                        <TitleSlot :title="chapter.title" />
                    </h2>
                    <p class="text-prose-muted max-w-2xl">{{ chapter.dek }}</p>
                </div>
            </template>

            <!-- THE BEAT BODY — the chapter's viz. A feature-plate Component (the `<FundLedgerFlow />`
                 form, the plate owning its own <VizPlate>), a declared `VizContract` (rendered
                 through <VizPlate>, the E8 PlateVoid routing through `isEmpty()`), or the page-level
                 `#hero`/`#colophon` slot the body provides. -->
            <!-- N.WB3 · THE PAGE COVER — the `hero` facet (title · dek · HeroFigure[] crown) rendered
                 through <DashboardHero> when declared as DATA, else the body's `#hero` slot (the
                 un-migrated routes, byte-identical). -->
            <template v-if="chapter.viz === 'hero'">
                <DashboardHero v-if="chapter.hero" v-bind="chapter.hero" />
                <slot v-else name="hero" />
            </template>
            <!-- N.WB3 · THE PAGE FOOT — the `colophon` facet (the hand-built provenance literal made
                 DATA) rendered through <SiteColophon> when declared, else the body's `#colophon` slot. -->
            <template v-else-if="chapter.viz === 'colophon'">
                <SiteColophon v-if="chapter.colophon" :colophon="chapter.colophon" />
                <slot v-else name="colophon" />
            </template>
            <!-- K-SCENE — a `ChapterScene` mounts the `<StickyScene>` host (the pinned-graphic stepped
                 narrative). It is neither a sentinel, a contract, nor a plain Component, so `vizComponent`
                 would mis-mount it; this branch precedes the contract + component branches. -->
            <StickyScene
                v-else-if="isChapterScene(chapter.viz)"
                :scene="chapter.viz as ChapterScene"
                :index="i"
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
                v-else-if="vizComponent(chapter.viz)"
            />
        </Beat>

        <!-- THE TRAILING CHAPTER RULE — the engraved <AnimatedRule> parting this beat from the next.
             The `:seed` is DERIVED from the chapter index (the SM-1/`:seed` cadence drift folds — the
             grain determinism is a function of position, never hand-incremented per body with gaps).
             The LAST chapter draws no trailing rule (the colophon closes the page). The hero cover
             takes the heavier `weight="hero"` rule (the band ends, the lead beat begins). -->
        <!-- O-A15 · THE RESOLVED RULE VARIANT — the divider variant reads from the beat's ONE resolved
             facet (`template.rule`, the tier-rotated register) instead of the hard-coded static `rule`.
             ABSENT template ⇒ `rule` (byte-identical to every un-varied route). The ghost numeral binds
             the current chapter's figure (used only when the resolved variant is `numeral`). -->
        <AnimatedRule
            v-if="i < chapters.length - 1"
            :variant="storyChapters[i]?.template?.rule ?? 'rule'"
            :weight="chapter.viz === 'hero' ? 'hero' : 'full'"
            :numeral="chapter.figure"
            :seed="i + 1"
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
/* N.WB1 · THE STORY FLOW WRAPPER — LAYOUT-TRANSPARENT (`display:contents`: the wrapper generates NO
   box, so the beats + rules flow the parent EXACTLY as before on every route — byte-identical). It
   exists only to give the between-beat clone overlay a stable subtree sibling; the overlay itself
   positions `absolute` against the route's own positioned essay container (the manuscript column is
   already `position:relative`), so no positioned block is introduced here (zero layout perturbation). */
.essay-flow {
    display: contents;
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

    /* THE DROP-CAP COUNTERWEIGHT — the tinted Roman rides the title side's OUTER gutter. title=left ⇒
       cap left (today's default, Beat.vue unchanged); title=right ⇒ cap right. This SUBSUMES the
       retired `.essay-beat--aside` cap-right rule: the aside beat resolves to data-title="right", so
       it matches HERE — one rule for the zebra-right pole AND the legacy aside. */
    .essay-beat[data-title="right"] :deep(.beat__initial:not(.beat__initial--inline)) {
        inset-inline-start: auto;
        inset-inline-end: 0;
        transform: translateX(115%);
    }

    /* THE ASIDE INSET — RETAINED for the ONE legacy normalization beat ONLY (keyed on the CLASS, NOT
       on data-title), so the zebra NEVER insets the plate (the stable centre holds for every other
       beat). The aside beat is BOTH cap-right (above) AND inset (here) — its exact current visual,
       byte-preserved without a route edit. */
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
</style>
