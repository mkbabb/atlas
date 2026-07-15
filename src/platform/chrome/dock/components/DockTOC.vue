<script setup lang="ts">
// DockTOC — the dock's SECOND view-mode: the scrollable clickable latex-paper TABLE OF CONTENTS
// (O-A23 · R-008, the owner's twice-asked "the dock scrollable/clickable TOC — a latex-paper view,
// animating in/out"). A SIBLING band to `DockStepperRender` (K-H-ARCH · the TEMPLATE-axis split): the
// route's beat/chapter roster rendered as a navigable index. TOGGLED beside the stepper (never a
// replacement) via `useDockViewMode`; the orchestrator (`Dock.vue`) `<Transition>`s it in/out off the
// shared motion tokens (CSS-only, PRM-gated — AG8-safe, 0 scroll-jack).
//
// THE DEEP-LINK (O-A3 anchor accuracy). A PURE presentational leaf, exactly like `DockNavItem`: a beat
// row emits `select(id)`, the orchestrator routes it through the EXISTING anchor machinery
// (`scrollToSection` — the ≤4px O-A3 `scrollIntoView` both view-modes now share). A "view" row
// self-routes (`RouterLink`). This component NEVER scrolls the document itself and mints NO observer:
// the ACTIVE-row mark reads the shared `useActiveBeat` store (the dock's ONE beat-observer, owned by
// the still-mounted `DockStepperRender`, is the sole writer — the single-scroll-scalar discipline
// holds; the TOC is a pure reader). No `wheel`/`touchmove` listener, no `preventDefault` — sticky/CSS
// only (the AG8 no-scroll-jack clause).
//
// ── THE GLASS RECONCILE — OWNER-HELD (R-059 / R-057 · the DEFERRAL CONTRACT R4) ──────────────────────
// The DRY target: render this roster THROUGH glass-ui's TOC/search primitive (root-repo DRY law),
// latex-paper-HOSTED off the WG-E latex-paper surface. glass-ui is at 4.2.0 with NO published
// TOC/search primitive and the WG-E abstraction arm is NOT yet a numbered wave — so the seam below
// (`GLASS_TOC_ABSTRACTION_AVAILABLE`) HOLDS and the atlas ships the INTERIM list, EXPLICITLY MARKED,
// never a silent fork. Headline: PARTIAL-on-fallback BY DESIGN (the RED-LEDGER `docktoc-latex-paper`).
//
// Vue 3.5 reactive-props convention (atlas/CLAUDE.md §Vue 3.5 reactive-props) — a NEW component; `ctx`
// reads in the template compile to tracked `__props` reads, reactive without a wrapper.
import { RouterLink } from "vue-router";
import { FadingScroll } from "@mkbabb/glass-ui/fading-scroll";
import { DockSeparator } from "@mkbabb/glass-ui/dock";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import type { DashboardContext } from "@/contract";

const { ctx } = defineProps<{
    /** The active dashboard chrome contract — the TOC roster IS `ctx.nav` (beats + view tabs). */
    ctx: DashboardContext;
}>();

const emit = defineEmits<{
    /** A beat row was chosen — the deep-link INTENT. The orchestrator routes it through the shared
        `scrollToSection` anchor machinery (the O-A3 ≤4px scroll); a "view" row self-routes instead. */
    select: [id: string];
}>();

// ── THE OWNER-HELD GLASS-ABSTRACTION SEAM (R-059 / R-057 · O-A23 DEFERRAL CONTRACT R4) ───────────────
// The REAL marked code seam (a named const + this comment naming the WG-E arm — NOT prose). While the
// WG-E glass TOC/search abstraction arm is round-deferred (no numbered wave; glass-ui 4.2.0 publishes
// no such primitive), this HOLDS `false` and the INTERIM atlas list renders (gated below + surfaced on
// `data-toc-source`). The lead flips it to `true` — routing the roster through the glass primitive,
// latex-paper-hosted off the WG-E surface — when the abstraction lands (or numbers the WG-E wave).
const GLASS_TOC_ABSTRACTION_AVAILABLE = false as const;

// ── THE ACTIVE-ROW MARK — a pure READ of the shared beat store (NO second observer) ─────────────────
// The dock's ONE beat-observer lives in the still-mounted `DockStepperRender` (`useDockStepper`), the
// sole writer of `activeBeatId` into this platform store. The TOC READS it to mark the section the
// reader is in — the same scalar the stepper's raised pill tracks, so the two view-modes never
// disagree, and zero new observer is minted.
const activeBeat = useActiveBeat();
</script>

<template>
    <!-- THE LATEX-PAPER TABLE OF CONTENTS (the interim register — the true latex-paper HOSTING rides
         WG-E). `data-toc-source` surfaces the OWNER-HELD seam: `interim` while the glass abstraction is
         deferred, `glass` once it lands. The `<nav>` is the labelled landmark; each row deep-links. -->
    <nav
        class="usf-toc"
        aria-label="Table of contents"
        data-testid="dock-toc"
        :data-toc-source="GLASS_TOC_ABSTRACTION_AVAILABLE ? 'glass' : 'interim'"
    >
        <DockSeparator />

        <!-- INTERIM LIST (OWNER-HELD fallback, explicitly marked): the roster as a latex-paper index.
             Replaced by the abstracted glass TOC/search primitive when the WG-E arm lands. -->
        <FadingScroll
            v-if="!GLASS_TOC_ABSTRACTION_AVAILABLE"
            axis="y"
            class="usf-toc__scroll"
            data-testid="dock-toc-scroll"
        >
            <ol class="usf-toc__list">
                <li
                    v-for="(item, i) in ctx.nav"
                    :key="item.kind === 'beat' ? `beat-${item.id}` : `view-${item.to}`"
                    class="usf-toc__item"
                >
                    <!-- A beat row → the deep-link INTENT (emit `select`); the orchestrator scrolls via
                         the shared O-A3 anchor machinery. Marked active off the shared beat store. -->
                    <button
                        v-if="item.kind === 'beat'"
                        type="button"
                        class="usf-toc__row"
                        :class="{
                            'usf-toc__row--active': activeBeat.activeBeatId === item.id,
                        }"
                        :aria-current="
                            activeBeat.activeBeatId === item.id ? 'true' : undefined
                        "
                        :aria-label="`${i + 1}. ${item.label}`"
                        :data-testid="`dock-toc-row-${i + 1}`"
                        @click="emit('select', item.id)"
                    >
                        <span class="usf-toc__num" aria-hidden="true">{{ i + 1 }}</span>
                        <span class="usf-toc__label">{{ item.label }}</span>
                        <span class="usf-toc__leader" aria-hidden="true" />
                    </button>
                    <!-- A view row → self-routes (a sibling URL); the RouterLink owns its active state. -->
                    <RouterLink
                        v-else
                        :to="item.to"
                        class="usf-toc__row"
                        active-class="usf-toc__row--active"
                        :aria-label="`${i + 1}. ${item.label}`"
                        :data-testid="`dock-toc-row-${i + 1}`"
                    >
                        <span class="usf-toc__num" aria-hidden="true">{{ i + 1 }}</span>
                        <span class="usf-toc__label">{{ item.label }}</span>
                        <span class="usf-toc__leader" aria-hidden="true" />
                    </RouterLink>
                </li>
            </ol>
        </FadingScroll>
    </nav>
</template>

<style scoped>
/* ── THE LATEX-PAPER TOC (O-A23 · the interim register) ────────────────────────────────────────────
   A scrollable index styled as a LaTeX \tableofcontents: numbered rows, a serif title stack, and the
   iconic dotted leader. The paper cue is a recessive grain wash over the dock's own plate — the true
   latex-paper HOSTING (a real paper surface) rides the WG-E line; this is the honest interim skin.
   Theme-aware throughout (the `--paper-*` / `--engrave` / `--foreground` tokens retune per arm). */
.usf-toc {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    inline-size: 100%;
    flex: 1 1 auto;
    min-block-size: 0;
    gap: 0.5rem;
    /* the recessive paper wash — the shipped static grain (no live shader), floored so the plate reads
       as tooth, never a loud texture. Falls back to no image where the token is unresolved. */
    background-image: var(--paper-aged-texture, none);
    background-blend-mode: multiply;
}

/* THE SCROLL PORT — the ONE growing region (mirrors the stepper's `FadingScroll` idiom): it feathers
   at its scroll edges (CSS mask, no wheel/touch capture — AG8) and flex-grows so the row list scrolls
   its OWN block axis while the crest + foot bands stay pinned. */
.usf-toc__scroll {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
}

.usf-toc__list {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    margin: 0;
    padding: 0.25rem 0.5rem;
    list-style: none;
}
.usf-toc__item {
    display: flex;
    inline-size: 100%;
}

/* A TOC ROW — the full-measure clickable line: [n] [title] [dotted leader]. Ruled by the engrave
   hairline between rows (the latex-paper ink); the resting row is quiet (recessive), the active row
   carries the chrome accent — the SAME wayfinding singleton the stepper's raised pill speaks (so the
   two view-modes agree). ≥2.75rem block (the WCAG 2.5.5 tap floor the dock register shares). */
.usf-toc__row {
    display: flex;
    align-items: baseline;
    inline-size: 100%;
    gap: 0.5rem;
    min-block-size: 2.75rem;
    padding: 0.5rem 0.25rem;
    border: 0;
    border-block-end: 1px solid var(--engrave, color-mix(in srgb, currentColor 16%, transparent));
    background: transparent;
    color: var(--foreground);
    text-align: start;
    text-decoration: none;
    cursor: pointer;
    transition:
        color var(--transition-control, 160ms ease),
        background var(--transition-control, 160ms ease);
}
.usf-toc__row:hover {
    color: var(--foreground);
    background: color-mix(in srgb, var(--foreground) 6%, transparent);
}
.usf-toc__row:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: -2px;
}

/* THE SECTION NUMBER — mono tabular figures (the latex \thesection mark), quiet at rest. */
.usf-toc__num {
    flex: none;
    min-inline-size: 1.5rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
}

/* THE TITLE — the serif Computer-Modern stack (the latex body face), truncating on overflow. */
.usf-toc__label {
    flex: 0 1 auto;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-serif);
    font-size: 0.9375rem;
    line-height: 1.3;
}

/* THE DOTTED LEADER — the iconic \dotfill: a baseline-aligned dotted rule filling the row to the
   right margin (a repeating-radial dot, so it reads as leader dots, not a solid rule). */
.usf-toc__leader {
    flex: 1 1 auto;
    align-self: flex-end;
    min-inline-size: 1rem;
    block-size: 0.5rem;
    background-image: radial-gradient(
        circle,
        var(--muted-foreground) 0.5px,
        transparent 0.5px
    );
    background-position: left bottom 0.15rem;
    background-size: 0.375rem 0.375rem;
    background-repeat: repeat-x;
    opacity: 0.5;
}

/* THE ACTIVE ROW — the chrome accent bar (--cp-accent, CHROME-ONLY: one-color-one-meaning, never a
   data hue), the same raised-meaning the stepper's active rung carries. The number + leader ride the
   accent ink so the whole row reads as the one you are in. */
.usf-toc__row--active {
    background: var(--cp-accent, var(--foreground));
    color: var(--cp-accent-ink, var(--background));
    border-block-end-color: transparent;
    border-radius: var(--radius-control, 0.4rem);
}
.usf-toc__row--active .usf-toc__num {
    color: inherit;
}
.usf-toc__row--active .usf-toc__leader {
    background-image: radial-gradient(
        circle,
        var(--cp-accent-ink, var(--background)) 0.5px,
        transparent 0.5px
    );
    opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
    .usf-toc__row {
        transition: none;
    }
}
</style>
