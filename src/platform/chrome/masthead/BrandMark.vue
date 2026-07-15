<script setup lang="ts">
// platform/chrome/BrandMark.vue — the shared TIL crest, a true HOME affordance to
// `/` (the gallery root). This RETIRES the per-dashboard "U"/"◈"/"◆" monograms
// (CP-7, C-AESTHETIC §2.5 L364-374): the brand is no longer a dashboard-scoped glyph
// pointing at a flagship route — it is ONE crest, the same on every dashboard, the
// home button of the whole Connectivity Atlas. C3 is the SOLE creator of this
// component + `public/til-logo.svg`; C6 CONSUMES it (colophon/link-card), it
// does NOT re-create (C3-7 / ch-deps-sequencing D3 / ch-C6 D8).
//
// The crest is the TIL crest asset (`/til-logo.svg` — the J-PERF asset-slice retires the
// 94 KB unoptimized `til-logo-padded.png` raster from the LCP-adjacent dock path; the SVG
// wraps the pixel-faithful crest at ~3.5 KB, a 96% shave). ONE NCSU-red anomaly node
// rides the crest: a single saturated fleck (the --cp-accent chrome anomaly, the only
// chromatic note on the otherwise paper-toned crest), the "look here / this is home"
// register. Quiet at rest, a lift-on-hover home affordance like the monogram it replaces.

import { ref, type Component } from "vue";
import { RouterLink } from "vue-router";

/** The TIL crest, a PUBLIC asset (`public/til-logo.svg`, served from the site root). Bound as a
    runtime string, NOT a static `src="/til-logo.svg"` — a static asset attribute trips
    `@vitejs/plugin-vue`'s `transformAssetUrls`, which mints an asset-import module
    (`til-logo.svg.js`); in the @atlas/core lib build (copyPublicDir:false) that chunk emits
    ORPHANED, pointing at an asset the lib does not ship (N.WE1 B8 residual). The bound form keeps
    the public-root URL a plain runtime string — the instance serves it verbatim, the lib emits no
    stray chunk. */
const CREST_SRC = "/til-logo.svg";

/** The crest variant — the dock-mounted home affordance. Reserved as a discriminator
    so C6's colophon/link-card consumers can request future register variants without a
    second component; today the dock crest is the only variant. */
type BrandVariant = "crest";

const props = withDefaults(
    defineProps<{
        /** The register the crest renders in. Today only `"crest"` (the dock home mark). */
        variant?: BrandVariant;
        /** The HOME destination — the gallery root by default (a true home affordance,
            not a per-dashboard flagship route; that monogram→flagship coupling is retired). */
        to?: string;
        /** The accessible label for the home link. */
        label?: string;
        /** The ELEMENT register (M.W1 D2 · N.WG1 Arm B — the phone crest-BUTTON). `"link"` is the
            home affordance (the RouterLink, unchanged everywhere it renders today); `"button"` is
            the phone dock's section-menu trigger — the SAME crest mark as a `<button>` (a native
            click target, never a link-inside-a-button nesting), the caller wiring
            `aria-expanded`/`aria-controls`/`@click` through the fall-through attrs. */
        as?: "link" | "button";
        /** Inline-SVG route crest. Omit to retain the TIL asset. */
        crest?: Component;
    }>(),
    {
        variant: "crest",
        to: "/",
        label: "The Connectivity Atlas — home",
        as: "link",
    },
);

// The mark's root control — resolved through the dynamic `<component>` (a plain element on the
// button register, a RouterLink instance on the link register). The SFC root is a FRAGMENT (the
// leading doc-comment), so a consumer's `$el` read lands on a comment node — `focus()` is the
// exposed, register-safe way to move focus here (the D2 sheet-close focus return).
const rootRef = ref<HTMLElement | { $el?: HTMLElement } | null>(null);
function focus(opts?: FocusOptions): void {
    const r = rootRef.value;
    const el = r instanceof HTMLElement ? r : (r?.$el ?? null);
    el?.focus?.(opts);
}
defineExpose({ focus });
</script>

<template>
    <!-- ONE crest, two element registers (D2): the home LINK (every register today) and the phone
         section-menu BUTTON (the dock's crest-button — same mark, native disclosure semantics). -->
    <component
        :is="props.as === 'button' ? 'button' : RouterLink"
        ref="rootRef"
        :to="props.as === 'button' ? undefined : props.to"
        :type="props.as === 'button' ? 'button' : undefined"
        class="brand-mark"
        :class="`brand-mark--${props.variant}`"
        :aria-label="props.label"
        data-testid="brand-mark"
    >
        <!-- The TIL crest (the ~3.5 KB SVG, CONSUMED not re-vendored — J-PERF retires the
             94 KB raster from the LCP-adjacent dock path). -->
        <component
            :is="props.crest"
            v-if="props.crest"
            class="brand-mark__crest brand-mark__crest--drawn"
            aria-hidden="true"
        />
        <img
            v-else
            class="brand-mark__crest"
            :src="CREST_SRC"
            alt=""
            aria-hidden="true"
            width="44"
            height="44"
            decoding="async"
        />
        <!-- The one NCSU-red anomaly node — the single chromatic fleck (the --cp-accent
             chrome anomaly), the "this is home" register. -->
        <span v-if="!props.crest" class="brand-mark__anomaly" aria-hidden="true" />
    </component>
</template>

<style scoped>
/* The crest — a lift-on-hover HOME affordance (it inherits the monogram's home-button
   register; the glyph is now the TIL crest raster, the home is now `/`). */
.brand-mark {
    position: relative;
    display: flex;
    block-size: 2.5rem;
    inline-size: 2.5rem;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    text-decoration: none;
    user-select: none;
    transition: scale 160ms var(--ease-engrave);
}
/* The BUTTON register carries no UA chrome — the crest mark IS the control (D2). The link
   register is untouched (these properties are inert on an <a>). */
button.brand-mark {
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
}

.brand-mark__crest {
    display: block;
    block-size: 100%;
    inline-size: 100%;
    object-fit: contain;
    /* The crest reads as a paper-toned mark at rest; the anomaly node carries the only
       saturation (the chrome register stays quiet until summoned). */
    pointer-events: none;
}

.brand-mark__crest--drawn :deep([data-crest-path]) {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
    transition: stroke-dashoffset var(--crest-morph-dur, 320ms) var(--ease-engrave);
}

.brand-mark[data-morph-stage="seed"]
    .brand-mark__crest--drawn
    :deep([data-crest-stage]:not([data-crest-stage="1"]) [data-crest-path]) {
    stroke-dashoffset: 1;
}

.brand-mark[data-morph-stage="seed"]:hover
    .brand-mark__crest--drawn
    :deep([data-crest-stage="2"] [data-crest-path]) {
    stroke-dashoffset: 0;
}

/* The single NCSU-red anomaly node — one fleck, the chrome accent (--cp-accent), the
   "look here / home" register. It sits at the crest's corner, quiet but present. */
.brand-mark__anomaly {
    position: absolute;
    inset-block-start: 0.125rem;
    inset-inline-end: 0.125rem;
    block-size: 0.4375rem;
    inline-size: 0.4375rem;
    border-radius: var(--radius-pill);
    background: var(--cp-accent, var(--ncsu-red, #cc0000));
    box-shadow: 0 0 0 2px var(--cp-glass-bg, var(--card, #fff));
    transition:
        scale 160ms var(--ease-engrave),
        opacity 160ms ease;
}

.brand-mark:hover {
    scale: 1.08;
}
.brand-mark:hover .brand-mark__anomaly {
    scale: 1.15;
}
.brand-mark:focus-visible {
    outline: 2px solid var(--cp-accent, var(--focus-ring-color, currentColor));
    outline-offset: 2px;
}

/* ── C7.c · THE MOBILE TAP-TARGET HARDENING (G2 / WCAG 2.5.5) ─────────────────────────
   The crest is a STANDALONE home link (the dock home affordance + the colophon "… — home"
   mark) — a genuine control, NOT an inline-in-a-sentence link, so it IS gated at the 44px
   WCAG 2.5.5 floor. At rest it renders 2.5rem = 40×40px (below the floor). This @media is a
   MOBILE PROPERTY: at the phone register the crest's OWN box reaches 44px; the crest raster
   stays object-fit:contain inside it (the glyph keeps its proportion, the box pads to the tap
   floor). Desktop is byte-unchanged. */
@media (--phone) {
    .brand-mark {
        block-size: 44px;
        inline-size: 44px;
        min-block-size: 44px;
        min-inline-size: 44px;
    }
}

/* PRM — the lift + anomaly pulse are spring eases; under reduced-motion they become
   instant state changes (the home affordance still reads, just without the bounce). */
@media (prefers-reduced-motion: reduce) {
    .brand-mark,
    .brand-mark__anomaly {
        transition: none;
    }
    .brand-mark:hover,
    .brand-mark:hover .brand-mark__anomaly {
        scale: 1;
    }
    .brand-mark__crest--drawn {
        --crest-morph-dur: 0ms;
    }
    .brand-mark__crest--drawn :deep([data-crest-path]) {
        stroke-dashoffset: 0 !important;
    }
}
</style>
