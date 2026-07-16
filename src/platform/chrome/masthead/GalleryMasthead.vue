<script setup lang="ts">
// GalleryMasthead — the gallery's brand frame: the slides-reference masthead under the
// atlas's own identity (C-FEEDBACK-5 / F3b-1). The site.config is the single tenant-
// branding locus (the slides idiom), so the masthead carries no hard-coded org strings.
//
// THE SLIDES-REFERENCE REGISTER (F5.4/F5.5 · matched in SPIRIT, not copied): the masthead
// reads as the slides home — the TIL crest/BrandMark carried in the masthead region · the
// red TIL eyebrow rule + the `TECHNOLOGY INFRASTRUCTURE LAB` small-caps program line · the
// big Fraunces display title · the muted dek. The atlas's own voice is the title ("The
// Connectivity Atlas" with the four-voice TITLE-RED pick-out on "Connectivity") + the carried
// constellation/corner-glow ground — the same FAMILY as the slides home, never a clone.
//
// The BrandMark crest is a READ-ONLY carry (consumed, never edited) — the shared TIL crest +
// the home affordance. It rides the masthead head above the eyebrow as the magazine crest the
// reference sets in its colophon (F5.5 asks for it in BOTH the masthead region and the footer).
// The dark toggle does NOT float on the masthead — it seats in GalleryView's one quiet glass
// control top-right (the slides gear posture).
import { useAtlasSite } from "../../../contract/index.js";
import { Surface } from "@mkbabb/glass-ui/surface";
import BrandMark from "./BrandMark.vue";
import { useAuroraVeil } from "../background/composables/useAuroraVeil.js";

// THE MASTHEAD GLASS VEIL (C2 · I6 §A2 · J-GLASS §5 — the consume). The constellation/corner-glow
// ground reads THROUGH a `Surface tier="floating"` veil seated behind the head, NOT the
// retired CSS `::before` radial halo (`backdrop-filter:none` on `.masthead` today, F6). The Surface
// carries its OWN measurable `backdrop-filter` (the `.masthead`-own blur the re-authored
// `i0-masthead-veil` gate now requires), so the constellation is attenuated LOCALLY under the
// wordmark (recessive/veiled) while staying live at the margins. `useAuroraVeil` lights the veil's
// rim in the page-ground hue (UNLIT here — the cover ground has no staged datum, so the §AB neutral
// floor: strength 0, the rim collapses to the glass default; the veil still blurs). The title
// covers-scrub (O-C2 · G5-COVER) rides `.masthead__wordmark` — the platform `title-compact` font-size
// keyframe (recipes.css §1a), re-registered to the masthead's towering rest (the block below).
const { veilStyle } = useAuroraVeil({ hueSource: null });

// The instance tenant config, read through the inject (D1, L1-INVERSION) — core chrome never
// hard-imports `@/site.config`; the instance installs it at bootstrap.
const site = useAtlasSite();

// THE EYEBROW-SUPPRESSION SEAM (O-D20 declutter carry). The kicker row (`site.org`, below)
// duplicates the crest AND the dek — O-D20's hub declutter law kills it so the masthead reads
// crest / genre-line / h1 / dek (4 text rows → 3). Default `true` (byte-identical to every
// existing mount); a consumer complying with the declutter law passes `:show-eyebrow="false"`.
withDefaults(defineProps<{ showEyebrow?: boolean }>(), { showEyebrow: true });

// THE MASTHEAD PICK-OUT (E11 · e-underlines §1 · d-fd-gallery M3). The picked word
// ("Connectivity") is a COLOR pick-out, NOT a mark: the <HandUnderline> retired (its un-baselined
// y=32 struck through the glyph bowls — −23.5px occlusion, e-underlines §Repro). The word is set
// in the four-voice TITLE-RED at the SAME Fraunces display weight as the rest of the wordmark — a
// HUE event, never a weight event (a bolded red word reads as a button; a same-weight red word
// reads as a printed accent, d-fd-gallery M3). The light/dark pair is the EXACT tokens the mark
// resolved (--ncsu-red / --ncsu-red-bright), so the cohesion-layer red stays one voice. The
// load-clock draw the mark carried is replaced by the existing [data-reveal] masthead reveal —
// the word arrives WITH the headline, no bespoke play() chain (the mastheadInk ref +
// useLoadSequence node retire; the sequence loses one awaitable, already a no-op for non-load).
</script>

<template>
    <header class="masthead">
        <div class="masthead__head" data-reveal :style="{ '--d': 0 }">
            <!-- THE GLASS VEIL (C2 · I6 §A2 · J-GLASS §5) — the constellation/corner-glow ground
                 reads THROUGH this `Surface tier="floating"` veil seated BEHIND the head ink
                 (the retired `::before` radial halo is gone). The panel carries its OWN measurable
                 `backdrop-filter` (the `.masthead`-own blur the re-authored gate requires), so the
                 constellation is veiled LOCALLY under the wordmark while staying live at the margins.
                 It is `aria-hidden` (pure decoration) and `pointer-events:none`, anchored as the
                 head's backing layer (it rides the same scroll-shrink transform — it is INSIDE
                 `.masthead__head`). `useAuroraVeil` carries the page-ground rim hue (UNLIT floor on
                 the cover; the veil still blurs). -->
            <Surface
                tier="floating"
                class="masthead__veil"
                :style="veilStyle"
                aria-hidden="true"
            />
            <!-- THE CREST (F5.5) — the TIL crest/BrandMark carried in the masthead region, the
                 way the slides home sets its mark. A READ-ONLY carry (consumed, never edited):
                 the shared crest + the home affordance (it links `/`, harmless on the home
                 route itself — the same crest the dock + colophon wear). It rides above the
                 eyebrow as the magazine masthead crest. -->
            <BrandMark class="masthead__crest" />
            <!-- THE PROGRAM LINE (F5.5) — the mono tracked-caps program kicker with the red TIL
                 leading-rule (the slides `TECHNOLOGY INFRASTRUCTURE LAB` register). It stays the §2.2
                 `eyebrow` (the editorial margin mark); the LOCKUP's whispered standfirst is the
                 SEPARATE script/italic register below it. SUPPRESSIBLE (O-D20): it duplicates the
                 crest + the dek, so a hub complying with the declutter law hides it via `showEyebrow`. -->
            <span v-if="showEyebrow" class="eyebrow">{{ site.org }}</span>
            <!-- THE TWO-REGISTER MASTHEAD LOCKUP (J-PAPER ARM c · C47 · §approach-3). The whispered
                 script/italic eyebrow STANDFIRST seats OVER the towering grained serif wordmark: the
                 audacity is the SCALE contrast (a small Fraunces italic over a colossal cover-line),
                 the VC masthead move. `masthead-eyebrow` is the Fraunces italic kicker; the wordmark
                 rides `masthead-headline` (the towering serif LAYOUT rung) + `masthead-headline-grain`
                 (J-HANDMARK §6's grain-clip mark-register — the headline wears the shipped
                 `--paper-aged-texture` within its letterforms, SOLID-INK fallback-first, NEVER on the
                 prose tagline below). -->
            <h1 class="masthead-headline masthead__wordmark">
                The <span class="text-pickout">Connectivity</span> Atlas
            </h1>
            <p class="text-prose-muted masthead__tagline">{{ site.tagline }}</p>
        </div>
    </header>
</template>

<style scoped>
.masthead {
    position: relative;
}
.masthead__head {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

/* ── THE MASTHEAD COVERS-SCRUB (O-C2 · G5-COVER — the ONE title-compact machinery, reused) ──────────
   The cover wordmark CONTRACTS as the gallery scrolls: it rests at its towering register and scrubs
   down toward a compact bar (the slides-home posture, where the title shrinks into a fixed header on
   scroll). G5-COVER (Q-10) STRUCK the static-cover exemption — every cover h1 scrubs, monotonically
   non-increasing in scrollY, bijective, never static — so this no longer rides a bespoke transform
   fork: it BINDS the platform's canonical `title-compact` keyframe (recipes.css §1a — the SAME font-
   size scrub the dashboard `.text-page-title` h1 rides), re-pointing only the register endpoints to
   the masthead's own `--type-masthead-headline{,-compact}` (the transform:scale `masthead-shrink`
   second mechanism retires — one scrub machinery platform-wide, the covers measurably shrink).

   FONT-SIZE, not sticky (the grain-clip constraint): the wordmark's `masthead-headline-grain`
   background-clips the paper texture to its glyph fill, so it CANNOT carry the paper wayfinding
   backing `.text-page-title` uses to sit sticky over scrolling content — it scrubs in flow, exactly
   the shrink-then-scroll-away trajectory the retired transform drew, now measurable in px.

   FALLBACK-FIRST (H-ROOT-1): the scrub rides inside `@media (prefers-reduced-motion: no-preference)`
   AND `@supports (animation-timeline: scroll())`. Where either fails (PRM on, or Firefox/jsdom/SSR
   without scroll-timeline) the block is skipped — the wordmark RESTS LARGE at its recipe register (the
   PRM-sane un-animated cover; information parity, the I6 veil + pickout intact). No shim, no JS. */
@media (prefers-reduced-motion: no-preference) {
    @supports (animation-timeline: scroll()) {
        .masthead__wordmark {
            /* the register endpoints the shared `title-compact` keyframe interpolates: the towering
               rest (88 @1440 — the recipe's own `--type-masthead-headline`) → the ruled 0.78 compact
               terminal. Weight held at the masthead's display 560 both ends (the audacity is FACE +
               SCALE, never a weight lift — design-typography R5/T3; distinct from the dashboards'
               560→600 tighten). */
            --title-rest-size: var(--type-masthead-headline);
            --title-compact-size: var(--type-masthead-headline-compact);
            --title-rest-weight: 560;
            --title-compact-weight: 560;
            animation: title-compact linear both;
            animation-timeline: scroll(root);
            animation-range: 0px var(--title-scrub-range, 320px);
        }
    }
}

/* THE GLASS VEIL (C2 · I6 §A2 · J-GLASS §5 — the consume; the `::before` radial halo is DELETED).
   The `<Surface tier="floating">` veil is the head's backing layer: a real glass surface
   carrying its OWN `backdrop-filter` (consumed from the library — the `.masthead`-own blur the
   re-authored `i0-masthead-veil` gate requires), so the constellation/corner-glow ground reads
   THROUGH it (recessive/veiled under the wordmark, live at the margins). It is anchored to the head
   box, pushed a hair past the ink bounds, and pulled UNDER the ink in the stacking order (z:-1) —
   pure decoration (`aria-hidden`, no pointer events). It rides the head's scroll-shrink transform
   (it is inside `.masthead__head`). The blur is the library's; no hand-rolled membrane survives. */
.masthead__veil {
    position: absolute;
    inset: -2rem -2.5rem;
    z-index: -1;
    pointer-events: none;
    /* the plate round (the atlas print-crisp tell, the d-hierarchy radius ladder) so the veil reads
       as a calm DEPTH plate behind the title; the floating-tier rim is the library's, lit by
       `useAuroraVeil`'s `--glass-accent` seam. */
    border-radius: var(--radius-plate);
}
.masthead__tagline {
    max-width: 42rem;
}

/* THE CREST (F5.5) — the TIL crest above the eyebrow, the magazine masthead mark the slides
   home sets. Offset a hair from the eyebrow so the red rule + small-caps read as the line
   beneath it. BrandMark owns the crest's own size/hover/PRM (40px rest / 44px mobile tap
   floor); this only seats it in the head flow and left-aligns it (flex-start, not the column's
   stretch). */
.masthead__crest {
    align-self: flex-start;
    margin-block-end: 0.35rem;
}

/* THE TWO-REGISTER MASTHEAD LOCKUP (J-PAPER ARM c · C47 · §approach-3) — the cover's audacious
   masthead is now the LOCKUP: the whispered Fraunces-italic standfirst seated OVER the towering
   grained serif wordmark. The wordmark rides the `masthead-headline` recipe (the towering cover-line
   LAYOUT rung, recipes.css §6) so the cover-scoped `.text-hero` size override RETIRES — the recipe
   owns the scale now (fluid clamp, phone-safe). This is COVER-scoped seating only (the shared
   `text-hero`/`text-headline` recipes the dashboards inherit are untouched). */
.masthead__wordmark {
    /* the towering serif sits hard against its box; the `masthead-headline` recipe owns face/size/
       weight/track. Only the lockup SEAT (the tight gap to the standfirst above) lands here. */
    margin-block-start: 0;
}

/* THE PICK-OUT (E11 · e-underlines §1 · d-fd-gallery M3) — "Connectivity" as the cover's ONE
   chromatic title event: the four-voice TITLE-RED (C-AESTHETIC §6.1 — the one place red exceeds
   a hairline in the title register), NOT an underline. font-weight: inherit holds the Fraunces
   display weight (a HUE event, not a weight event); the word stays inside the wordmark, never a
   link or a CTA. The light/dark pair is the EXACT tokens HandUnderline resolved, so the red voice
   is continuous with the mark it replaces.

   THE GRAIN-CLIP EXEMPTION (J-PAPER ARM c · J-HANDMARK §6 fallback law) — the wordmark's
   `masthead-headline-grain` clips the aged grain to the glyph fill via `-webkit-text-fill-color:
   transparent`, which INHERITS to children. The pickout is a HUE event (the brand red), NOT a grain
   surface — so it OPTS OUT of the clip (re-asserting its own `-webkit-text-fill-color` to the red),
   keeping the four-voice TITLE-RED a clean solid pick-out while the surrounding wordmark wears the
   paper tooth. This is the headline-only grain fence applied at the glyph level: grain on the serif
   body, solid hue on the one chromatic word. */
.text-pickout {
    color: var(--ncsu-red);
    -webkit-text-fill-color: var(--ncsu-red); /* opt OUT of the parent grain-clip — the red reads solid */
    background-image: none; /* no grain texture on the chromatic pick-out word */
    font-weight: inherit;
    text-wrap: nowrap;
}
/* The T-2 dark-lift — the SAME tokens HandUnderline resolved. Written as `.dark .text-pickout`
   (NOT `:global(.dark) .text-pickout`, which the Vue 3.5 scoped compiler collapses to a bare
   `.dark`): the plain form keeps the scope on `.text-pickout` and matches the `.dark` ancestor
   on `<html>`. */
.dark .text-pickout {
    color: var(--ncsu-red-bright);
    -webkit-text-fill-color: var(--ncsu-red-bright); /* opt OUT of the grain-clip on dark too */
}
</style>
