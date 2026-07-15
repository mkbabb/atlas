<script setup lang="ts">
// DockNavItem — ONE figure-number rung (K-H-ARCH · the TEMPLATE-axis split, the clear REPEATING
// structure). Extracted VERBATIM from Dock.vue's `v-for` body: the `kind` discriminates the two
// registers under one roof — a "beat" rung is a `<button>` that emits `select` (the parent's
// `useDockStepper.scrollTo`), a "view" rung is a self-routing `<RouterLink>`. A PURE presentational
// leaf (zero composables): the parent (`DockStepperRender`) owns the stepper state and threads each
// rung its `active` / `rivetHue` / `roman` scalars. It carries its OWN complete skin — the resting
// engrave + per-beat rivet ring, the raised-active pill, the WCAG tap floor, and the liquid
// rung-rise entrance staggered by its `--rivet-i` index.
//
// Vue 3.5 reactive-props convention (atlas/CLAUDE.md §Vue 3.5 reactive-props) — a NEW component, so
// it uses the reactive-props destructure; no destructured prop is handed to a composable/watch/
// computed here, so none needs the getter wrapper (the scalars are read directly in the template).
import { RouterLink } from "vue-router";
import type { DockNavItem } from "@/contract";

const { item, index, active, rivetHue, roman } = defineProps<{
    /** The nav entry — its `kind` discriminates the `beat` button from the `view` RouterLink. */
    item: DockNavItem;
    /** The 0-based rung index (drives the `--rivet-i` stagger + the `dock-step-N` testid). */
    index: number;
    /** Whether this rung is the active beat (the raised red pill; views self-route their active). */
    active: boolean;
    /** The per-beat rivet hue (the `--rivet-hue` ring — the ≥3-colour rail index at rest). */
    rivetHue: string;
    /** The pre-computed Roman figure-number (`I`/`II`/…) the parent maps from `index + 1`. */
    roman: string;
}>();

const emit = defineEmits<{
    /** A beat rung was activated — the parent scrolls to this beat's section id. */
    select: [id: string];
}>();
</script>

<template>
    <!-- SM-2 (design-suffusion §2 #2 · d-pops M1) — each resting beat-rivet carries its beat's
         data-hue as a thin ring, so the rail reads as a ≥3-colour INDEX at rest. The ACTIVE rung
         keeps the lone red fill (the wayfinding singleton — never two filled rungs). -->
    <button
        v-if="item.kind === 'beat'"
        type="button"
        class="usf-dock__step figure"
        :class="{ 'usf-dock__step--active': active }"
        :style="{ '--rivet-hue': rivetHue, '--rivet-i': index }"
        :aria-current="active ? 'true' : undefined"
        :aria-label="`${roman}. ${item.label}`"
        :data-testid="`dock-step-${index + 1}`"
        @click="emit('select', item.id)"
    >
        <span class="usf-dock__step-num" aria-hidden="true">{{ roman }}</span>
        <!-- The SECTION LABEL (M.W1 D2) — hidden at the rail register (the Roman rung is the mark;
             `aria-label` already speaks the name), SHOWN as the ruled row's word inside the phone
             sheet (the dock-state cascade in Dock.vue flips it — one node, two registers). -->
        <span class="usf-dock__step-label" aria-hidden="true">{{
            item.label
        }}</span>
    </button>
    <RouterLink
        v-else
        :to="item.to"
        class="usf-dock__step figure"
        active-class="usf-dock__step--active"
        :style="{ '--rivet-hue': rivetHue, '--rivet-i': index }"
        :aria-label="`${roman}. ${item.label}`"
        :data-testid="`dock-step-${index + 1}`"
    >
        <span class="usf-dock__step-num" aria-hidden="true">{{ roman }}</span>
        <span class="usf-dock__step-label" aria-hidden="true">{{
            item.label
        }}</span>
    </RouterLink>
</template>

<style scoped>
/* A figure-number rung — Fira-Code tabular caps in a stepper pill. At rest an engraved
   outline (recessive); raised when active. The glyph sits ABOVE the spine. */
.usf-dock__step {
    position: relative;
    z-index: 1;
    display: flex;
    block-size: 2rem;
    inline-size: 2rem;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-pill);
    /* SM-2 (d-pops M1) — the resting rivet wears its beat's data-hue as a thin (≤2px) ring, so the
       rail reads as a ≥3-colour INDEX at rest (the `--rivet-hue` per-beat token, set inline). The
       hue is the BORDER only — a quiet ring, never a fill (the active red fill stays the lone
       wayfinding singleton). Falls back to the engrave hairline where `--rivet-hue` is unresolved. */
    border: 1.5px solid
        color-mix(
            in srgb,
            var(--rivet-hue, var(--engrave, currentColor)) 55%,
            transparent
        );
    /* THE LIQUID PLATE-BG (C3-desktop · J-GLASS §5) — the rung's resting fill reads the dock's
       morph-derived `--dock-plate-bg` so the rail surface is ONE liquid material lifted by the
       morph scalar; falls back byte-correct to the prior `--card 70%` wash where the morph token
       is unresolved (the pre-consume base). */
    background: var(--dock-plate-bg, color-mix(in srgb, var(--card) 70%, transparent));
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--muted-foreground);
    text-decoration: none;
    cursor: pointer;
    transition:
        scale 200ms var(--ease-overshoot),
        color 160ms ease,
        background 160ms ease,
        border-color 160ms ease;
}
.usf-dock__step:hover {
    color: var(--foreground);
    border-color: color-mix(in srgb, var(--foreground) 35%, transparent);
}
.usf-dock__step:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: 2px;
}

/* The ACTIVE beat is RAISED (S2 §2.2/§2.3): the accent-filled pill, scaled up — the one
   beat you are reading. The chrome accent is --cp-accent (NCSU red, CHROME-ONLY), so the
   wayfinding obeys the one-color-one-meaning law and never reads as a data fill. */
.usf-dock__step--active {
    scale: 1.18;
    color: var(--cp-accent-ink, var(--background));
    border-color: transparent;
    background: var(--cp-accent, var(--foreground));
    box-shadow: 0 2px 8px
        color-mix(in srgb, var(--cp-accent, var(--foreground)) 30%, transparent);
}

/* THE CHILD-STAGGER (C3-desktop · the liquid suffusion) — the rung rises on the library's
   `--glass-reveal-*` envelope so the surface morph reads as ONE liquid reveal: the consumed
   `--glass-reveal-slide` lift + `--glass-reveal-blur` settle, staggered down the column by this
   rung's `--rivet-i` index, NOT a stack of independently-animating chrome. PRM-fenced — under
   reduce the rung sits at its resting transform (info-parity: the rail is fully legible, only the
   liquid rise is cut). The token fallbacks keep the pre-consume base byte-correct. */
@media (prefers-reduced-motion: no-preference) {
    @keyframes usf-dock-rung-rise {
        from {
            transform: translateY(var(--glass-reveal-slide, 6px));
            filter: blur(var(--glass-reveal-blur, 2px));
            opacity: 0;
        }
        to {
            transform: none;
            filter: none;
            opacity: 1;
        }
    }
    .usf-dock__step.figure {
        /* M16 (N.WG1 Arm D · motion conformance): the raw 360ms cubic-bezier retires — the rung
           rise rides the library spring register (`--spring-snappy` + its duration), the same
           40ms×i column stagger (the D2 row-stagger law; the old curve stands as the fallback
           only where the glass tokens are unresolved). */
        animation: usf-dock-rung-rise var(--spring-snappy-duration, 360ms)
            var(--spring-snappy, cubic-bezier(0.22, 1, 0.36, 1)) both;
        animation-delay: calc(var(--rivet-i, 0) * 40ms);
    }
}

/* THE SHEET-ROW LABEL — dormant at the rail register (the Roman rung + `aria-label` carry the
   name); the phone sheet's dock-state cascade (Dock.vue) reveals it as the ruled row's word. */
.usf-dock__step-label {
    display: none;
}

/* ── C7.c · THE MOBILE TAP-TARGET FLOOR (G2 / WCAG 2.5.5) ─────────────────────────────
   On a touch phone the vertical rail's icon-rungs (2rem at rest) must clear the 44px tap
   floor. Desktop keeps the compact 2rem rungs. */
@media (--phone) {
    .usf-dock__step {
        min-block-size: 44px;
        min-inline-size: 44px;
    }
}

/* PRM — the raised-pill scale is a spring ease; under reduced-motion it becomes an instant
   state change (the raised state still reads, just without the bounce). */
@media (prefers-reduced-motion: reduce) {
    .usf-dock__step {
        transition:
            color 160ms ease,
            background 160ms ease,
            border-color 160ms ease;
    }
}
</style>
