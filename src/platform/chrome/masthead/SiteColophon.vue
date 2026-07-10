<script setup lang="ts">
// SiteColophon.vue — the credits/provenance card every dashboard ends on (the Tableau
// "Contact"/"About" page made into one shared chrome piece). USF's ` Contact`, SCI's
// ` Contact`, and ECF's `Dashboard N` all carry the same shape: who made it (Ray Zeisz &
// Mike Babb, NCSU / Friday Institute / TIL), where the data comes from (the public-record
// provenance line), and the brand link out. So one card, fed by `site.config` for the org
// defaults and a per-dashboard `colophon` prop for the specifics (the authors, the
// dataset provenance, an optional "as of" date that differs per fund).
//
// It reads on a flat `--card` plate with a coloured left spine (the TIL-briefing idiom),
// the eyebrow→org→authors→provenance stack, and the brand link in the NCSU teal. Used by
// all three dashboards AND the gallery footer (where `colophon` is omitted and only the
// site defaults show).
//
// The spine accent is L3 CHROME (FD1 §4), never an L4 data ramp — so it DERIVES from the
// route's ONE accent authority `var(--route-accent)` (N.WG1 arm F — the retired `ctx.accent`
// dock-local pole is gone; the colophon lives inside the route subtree the shell binds the
// `--route-*` group on, so the token resolves). This guards the register breach where a
// consumer passes a data token (`--viz-sequential-high`) into a chrome surface (SCI S-P1-6 /
// SC-P1-6). The resolution order: an explicit `accent` prop (an opt-out for a deliberate
// override) → `var(--route-accent)` on a providing route → the brand teal fallback (the
// gallery footer, where no dashboard context is provided).
import { computed, inject } from "vue";
import { DASHBOARD_KEY, useAtlasSite } from "@/contract";
// CONSUME the C3-owned TIL crest (C.W6.d · AS-7) — the colophon's `.til-mark` form renders the
// shared <BrandMark> crest (the TIL raster + its single NCSU-red anomaly fleck) instead of a plain
// monogram text, KEEPING the HOME affordance: BrandMark is a RouterLink to `/` (the gallery root).
// C3 SOLELY creates BrandMark.vue + public/til-logo-padded.png; C6 CONSUMES (never re-creates the
// component or re-vendors the asset — ch-C6 D7/D8). The crest's red anomaly is the RED leg of the
// user-approved emergent tricolor (red civic mark + ivory paper + teal data pole; NO blue chrome).
import BrandMark from "@/platform/chrome/masthead/BrandMark.vue";

/** A credited author + their link out (a LinkedIn, a profile). */
export interface ColophonAuthor {
    name: string;
    href?: string;
}

/** The per-dashboard colophon: who + where-the-data-comes-from + an optional freshness date. */
export interface Colophon {
    /** The authors, in credit order. */
    authors?: ColophonAuthor[];
    /** A one-line "what this is" blurb (the dashboard's own About prose). */
    blurb?: string;
    /** The data-source provenance line — the public-record sources. */
    provenance?: string;
    /** A "data as of …" date (a frozen extract date, e.g. ECF's "May 27, 2022"). */
    asOf?: string;
    /** The brand link the org wordmark points at (default the TIL team page). */
    brandHref?: string;
}

const props = withDefaults(
    defineProps<{
        /** The per-dashboard colophon. Omit for the gallery footer (site defaults only). */
        colophon?: Colophon;
        /** An explicit accent spine colour — a deliberate override of the injected
            `ctx.accent` (the chrome-register default, K6). Omit it and the colophon derives
            its spine from the active dashboard's chrome accent, never a data ramp. */
        accent?: string;
        /** O-B19 (v1.0.29) — the build-SHA stamp: a subdued registration-mark line, rendered
            beside the til-mark row in the colophon's OWN caption register (same `text-caption`
            scale + muted ink as `asOf`/provenance, set in mono for the print-shop "run N" feel —
            an imprint, not a debug string). Omit ⇒ no stamp (byte-identical to every existing
            consumer). */
        buildSha?: string;
    }>(),
    {
        colophon: undefined,
        accent: undefined,
        buildSha: undefined,
    },
);

/** The active dashboard's chrome context (the same seam the Dock reads). Undefined on the
    gallery footer, where no dashboard provides a context — then the brand fallback applies. */
const ctx = inject(DASHBOARD_KEY, undefined);

/** The instance tenant config (org/short/apex), read through the inject so core chrome never
    hard-imports `@/site.config` — the instance installs it at bootstrap (D1, L1-INVERSION). */
const site = useAtlasSite();

/** The spine accent (K6) — an explicit prop wins (a deliberate override), else (on a route)
    the ONE route accent authority `var(--route-accent)` (N.WG1 arm F — the retired `ctx.accent`
    dock-local pole is gone; the colophon lives inside the route subtree where `--route-accent`
    resolves), else the brand teal (the gallery footer, no providing route). This keeps the spine
    an L3 chrome tint, never an L4 data ramp. */
const accent = computed(() =>
    props.accent ?? (ctx ? "var(--route-accent)" : "var(--brand, #4996b2)"),
);

const authors = computed<ColophonAuthor[]>(() => props.colophon?.authors ?? []);
const brandHref = computed(() => props.colophon?.brandHref ?? "https://www.fi.ncsu.edu/teams/til/");
</script>

<template>
    <!-- O-D3 PLAT-6 — THE CONTENTINFO LANDMARK. SiteColophon IS the site's closing colophon on
         every surface it mounts (every dashboard's closing chapter AND the gallery footer, per
         the doc comment above) — a11y.md's worked example ("a nested `<footer>` … not
         contentinfo") is this exact block. `<footer role="contentinfo">` — the explicit role
         registers the landmark regardless of DOM nesting depth (unlike a bare `<footer>`'s
         IMPLICIT role, which HTML-AAM suppresses once nested inside `main`/`article`/etc.). -->
    <footer
        role="contentinfo"
        class="colophon"
        :style="{ '--colophon-accent': accent }"
        aria-label="About this dashboard"
        data-testid="site-colophon"
    >
        <p class="eyebrow">About</p>

        <!-- The blurb (the dashboard's own About prose), shown when given. -->
        <p v-if="colophon?.blurb" class="text-prose mt-1.5 max-w-prose">
            {{ colophon.blurb }}
        </p>

        <!-- The credit line — the org, then the authors.

             E6 (e-underlines §2): the colophon <InkMark> pen flourish RETIRED. The static pen
             underline read as an accidental text-underline on the institution's name and even
             occluded the descenders of g/y (belowWordPx=−1.4, e-underlines §Repro). The org name
             is now plain text beside the <BrandMark> crest below — the crest carries the brand
             mark; the name needs no second flourish. -->
        <p class="text-prose-muted mt-3">
            <span class="text-foreground">{{ site.org }}</span>
            <template v-if="authors.length">
                ·
                <template v-for="(a, i) in authors" :key="a.name">
                    <a
                        v-if="a.href"
                        :href="a.href"
                        class="colophon__author"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ a.name }}</a
                    >
                    <span v-else class="colophon__author">{{ a.name }}</span>
                    <span v-if="i < authors.length - 1">, </span>
                </template>
            </template>
        </p>

        <!-- The public-record provenance footnote — recessive, the source line. -->
        <p v-if="colophon?.provenance" class="text-caption mt-2">
            {{ colophon.provenance }}
        </p>

        <!-- The TIL crest mark (the `.til-mark` form) — the CONSUMED C3 <BrandMark>, the crest
             raster + its single NCSU-red anomaly fleck, a HOME affordance to `/`. It RENDERS the
             crest instead of a monogram text, keeping the home link. The freshness date + the
             external brand wordmark follow on the same row. -->
        <div class="til-mark mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <BrandMark variant="crest" to="/" :label="`${site.short} — home`" data-testid="colophon-crest" />
            <span v-if="colophon?.asOf" class="text-caption">Data as of {{ colophon.asOf }}</span>
            <a
                :href="brandHref"
                class="colophon__brand"
                target="_blank"
                rel="noopener noreferrer"
                >{{ site.short }} · {{ site.apex }}</a
            >
            <!-- O-B19 — the build-stamp imprint (the closing registration mark). -->
            <span v-if="buildSha" class="text-caption colophon__build" data-testid="colophon-build-sha">
                Build {{ buildSha }}
            </span>
        </div>
    </footer>
</template>

<style scoped>
/* The TIL-briefing card: flat --card paper, the coloured left spine, print-crisp
   corners (the colophon is editorial chrome, not an app card). */
.colophon {
    background: var(--card);
    border: 1px solid var(--engrave, var(--border));
    border-left: 3px solid var(--colophon-accent);
    border-radius: var(--radius-plate, 6px);
    padding: 1rem 1.25rem;
}
/* C-1 (K-DESIGN-SUFFUSE · the one-voice colophon pops) — the §2.2 `eyebrow` recipe opens "About" with a
   brand-RED leading-rule, but the colophon's OTHER two chrome pops — the left SPINE + the brand link —
   both speak the route's icon-palette pole (--colophon-accent, derived off ctx.accent, K6). So the
   red rule reads as a third, dissonant voice. C-1 tints the eyebrow's `::before` bar to the SAME
   --colophon-accent, at the SAME --attn-chrome recession the recipe already binds, so the card's three
   chrome marks read as ONE accent voice (spine + eyebrow rule + brand link). Scoped to the colophon's
   own eyebrow — the platform-wide `eyebrow` keeps its brand-red rule. An L3 chrome tint within
   proportion (the colorkind/three-red law GREEN — a chrome accent, never a data fill). */
.colophon .eyebrow::before {
    background: var(--colophon-accent);
}
/* The author link reads as an editorial credit, not a button — but it MUST be
   distinguishable from the surrounding muted prose by more than colour (the warm-ink
   link on warm-muted prose is 2.64:1 < the 3:1 link-in-text-block floor, axe serious).
   A faint persistent underline (the engrave hairline, offset) is the accessible +
   editorial answer: it reads as a credit at rest, deepens to the ink on hover. */
.colophon__author {
    color: var(--foreground);
    text-decoration: underline;
    text-decoration-color: var(--engrave, var(--muted-foreground));
    text-underline-offset: 2px;
}
.colophon__author:hover {
    text-decoration-color: currentColor;
}
/* The brand link in the route accent — the one chromatic accent in the card. O-C7 D5: the LINK
   TEXT wears the readable INK of the accent (hue kept, L clamped to the contrast band per theme —
   the tokens.css §INK recipe), while the SPINE carrier keeps the raw --colophon-accent vivid. This
   cures the both-theme colophon fail (darkmode §1 row 8: cyan 2.74 / amber 2.65 / red 3.81). */
.colophon__brand {
    color: light-dark(
        oklch(from var(--colophon-accent) min(l, 0.52) min(c, 0.17) h),
        oklch(from var(--colophon-accent) max(l, 0.75) min(c, 0.15) h)
    );
    font-size: 0.8125rem;
    text-decoration: none;
}
.colophon__brand:hover {
    text-decoration: underline;
}
/* O-B19 (v1.0.29) — the build-stamp imprint: the SAME --type-caption scale + muted ink every
   other colophon caption wears (asOf/provenance), set in mono for the registration-mark feel (a
   printer's run number sat beside the plate's crest, not a debug string) and one notch fainter
   still so it never competes with the asOf date it sits beside. */
.colophon__build {
    font-family: var(--font-mono);
    opacity: 0.75;
}
</style>
