<script setup lang="ts">
// DockFoot — band 3, the STICKY FOOT (K-H-ARCH · the TEMPLATE-axis split, the self-contained
// block-END anchor). Extracted VERBATIM from Dock.vue's `.usf-dock__persistent-foot` subtree: the
// selection-chip→FilterView opener, the @media(--phone) gear sheet, and the inline secondary
// controls (year-range / ⤓-save / filter pull-out / dark-toggle / collapse). Per the composable-
// co-location law, the foot-register composables MOVE HERE — `useDockGear` (the gear posture +
// chip-gate + opener), `useFilterPane` (the ONE-open-truth filter seam), and `useDockDataState`
// (the year-range + ⤓-save controls). The collapse posture stays the ORCHESTRATOR's (it binds the
// `<GlassDock ref>`), threaded in as `collapsed` + emitted back as `toggle-collapse`.
//
// THE FOOT IS GLASS'S `#persistent-end` BAND (B6 · RULINGS §M M-4, R-FOOT-1 realised). glass 10.1.0
// ships the block-end persistent slot the old sticky foot waited for, and seating the foot there takes
// it OUT of the toolbar run glass claims on `#default`. Inside that run each control after the first
// of a seat was written `tabindex=-1` and dropped from the Tab order (the B5 seat census: the year
// range, the dark toggle and the phone gear on 8 of 8 routes). Here every control is its own Tab
// stop: Filters, Compare years, Save this view, the theme toggle and Collapse (the gear on the
// phone). The collapsed rail hides this band with the deck (Dock.css), so it never shows on the disc.
//
// Vue 3.5 reactive-props convention (atlas/CLAUDE.md §Vue 3.5 reactive-props) — a NEW component. The
// destructured `ctx` is handed to `useDockDataState` exactly as the orchestrator's injected ctx was;
// `ctx` read inside `hasFilter` compiles to a tracked `__props` read (reactive without a wrapper).
import { DockSeparator } from "@mkbabb/glass-ui/dock";
import { DarkModeToggle } from "@mkbabb/glass-ui/dark-mode-toggle";
import {
    Download,
    GitCompareArrows,
    PanelLeftClose,
} from "@lucide/vue";
import { computed } from "vue";
import DockSettings from "../DockSettings.vue";
import DockFilterTrigger from "./DockFilterTrigger.vue";
import { useDockGear } from "../composables/useDockGear.js";
import { useDockDataState } from "../composables/useDockDataState.js";
import type { DashboardContext } from "../../../../contract/index.js";

const { ctx, disableTransitions, collapsed } = defineProps<{
    /** The active dashboard chrome contract — the data-state register + the filter-body gate read it. */
    ctx: DashboardContext;
    /** Wire glass-ui's no-transition fast-path on the dark toggle (an INSTANT theme re-print). */
    disableTransitions: boolean;
    /** The live collapse posture (the orchestrator owns `useDockCollapse`; the foot only renders the
        toggle's pressed state — the collapse machine binds the `<GlassDock ref>` upstream). */
    collapsed: boolean;
}>();

const emit = defineEmits<{
    /** The collapse toggle was pressed — the orchestrator drives the GlassDock expand/collapse. */
    "toggle-collapse": [];
}>();

// ── The MOBILE-GEAR posture register (J-DOCK · useDockGear) ────────────────────────────────────
// The gear-sheet open ref, the selection-chip mount-gate (`showChip`), the live `selectionCount`,
// the `@media(--phone)` register read (CONSUMING the ONE `useMobileRegister` seam — no second
// breakpoint home), and the FilterView opener (the C24 chip's job). The chip + the gear share the
// foot register, so the gate co-locates here.
const { gearOpen, isPhone } = useDockGear();

// ── The A4 dock pull-out filter seam (useFilterPane — the ONE open truth) ──────────────────────
// The foot's filter affordance summons the floating right `Drawer mode="live-behind"`; it drives
// the SAME shared `useFilterPane().open` singleton the FilterPanel trigger flips — ONE open truth.
// ── The data-state register (J-ARCH §3 · useDockDataState) ─────────────────────────────────────
// The year-scrubber RANGE-mode toggle + the `useSavedViews` ⤓-save door, on the SAME `useViewParams`
// year-scope and `platform:views` shelf they already shared (no second shelf, no second scope).
const { yearModeNow, hasYearScope, toggleRange, saveCurrentView, saveFlash } =
    useDockDataState(ctx);

// The route-control group (Filters · Compare years · Save this view) paints only when the route
// declares that content, and the hairlines that fence it paint with it (W-22≡W-74: no phantom rule).
const routeHasFilter = computed(() => Boolean(ctx?.filterBody));
const hasRouteControls = computed(() => routeHasFilter.value || hasYearScope.value);
</script>

<template>
    <!-- ══ THE FOOT (glass `#persistent-end`) ══════════════════════════════════════════════════
         Two groups, top to bottom: the ROUTE controls (Filters, Compare years, Save this view),
         then, below a hairline, the CHROME controls (theme, Collapse). Each control is one Tab
         stop. On the phone the route group keeps Filters and the rest folds behind the gear. -->
    <div class="usf-dock__persistent-foot" data-testid="dock-persistent-foot">
        <DockSeparator v-if="isPhone || hasRouteControls" />

        <template v-if="isPhone">
            <DockFilterTrigger />
            <!-- THE MOBILE GEAR (@media(--phone), C23): Compare years, Save this view and the theme
                 toggle fold behind one Settings glyph opening the DockSettings sheet. -->
            <DockSettings
                v-model:open="gearOpen"
                :has-year-scope="hasYearScope"
                :year-mode-now="yearModeNow"
                :save-flash="saveFlash"
                :disable-transitions="disableTransitions"
                @toggle-range="toggleRange"
                @save-view="saveCurrentView"
            />
        </template>

        <template v-else>
            <!-- The ROUTE controls: what the reader is looking at (filters, years) and keeping it. -->
            <div v-if="hasRouteControls" class="usf-dock__foot-controls">
                <DockFilterTrigger />
                <!-- The year-scrubber RANGE-mode control: the pressed accent pill is range mode. -->
                <button
                    v-if="hasYearScope"
                    type="button"
                    class="usf-dock__ctl"
                    :class="{ 'usf-dock__ctl--on': yearModeNow === 'range' }"
                    :aria-pressed="yearModeNow === 'range'"
                    aria-label="Compare years (range mode)"
                    title="Compare years"
                    data-testid="dock-year-range"
                    @click="toggleRange"
                >
                    <GitCompareArrows class="usf-dock__ctl-glyph" aria-hidden="true" />
                </button>
                <!-- The ⤓-save door (PL-5): the current URL state onto the platform:views shelf. -->
                <button
                    v-if="hasYearScope"
                    type="button"
                    class="usf-dock__ctl"
                    :class="{ 'usf-dock__ctl--flash': saveFlash }"
                    aria-label="Save this view"
                    title="Save this view"
                    data-testid="dock-save-view"
                    @click="saveCurrentView"
                >
                    <Download class="usf-dock__ctl-glyph" aria-hidden="true" />
                    <span class="sr-only" aria-live="polite">{{
                        saveFlash ? "View saved" : ""
                    }}</span>
                </button>
            </div>

            <DockSeparator v-if="hasRouteControls" />

            <!-- The CHROME controls: the theme toggle (`size="dock"`, the instant re-print) and the
                 collapse toggle driving the orchestrator's collapse machine. -->
            <div class="usf-dock__foot">
                <DarkModeToggle size="dock" :disable-transitions="disableTransitions" />
                <button
                    type="button"
                    class="usf-dock__ctl"
                    :class="{ 'usf-dock__ctl--on': collapsed }"
                    :aria-pressed="collapsed"
                    aria-label="Collapse the dock"
                    title="Collapse dock"
                    data-testid="dock-collapse-toggle"
                    @click="emit('toggle-collapse')"
                >
                    <PanelLeftClose class="usf-dock__ctl-glyph" aria-hidden="true" />
                </button>
            </div>
        </template>
    </div>
</template>

<style scoped>
/* ── THE FOOT BAND (glass `#persistent-end`) ──────────────────────────────────────────────────────
   glass seats this band after the deck at the rail's block-end, outside the scrolling run, so it
   needs no sticky anchor: the rail scrolls, the foot stays. It carries the dock's column rhythm. */
.usf-dock__persistent-foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    inline-size: 100%;
}

/* The data-state register — the range toggle + the ⤓-save door, stacked above the theme toggle in
   the dock foot. A quieter chrome register (engraved outlines), the same figure-rung idiom as the
   stepper but in the control (not wayfinding) role. */
.usf-dock__foot-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    margin-block-start: auto;
    padding-block-start: 0.5rem;
}

/* The A4 pull-out row (D4.c) — the filter affordance, stacked into the foot register below the
   year/save controls. It claims NO second auto-margin (that would open a gap above it); it just
   sits in the foot stack on the shared 0.4rem rhythm. */
.usf-dock__foot-controls--pullout {
    margin-block-start: 0;
}

/* THE SELECTION CHIP → the FilterView OPENER (J-DOCK · C24, J-FEEDBACK-4 §9). A compact HORIZONTAL
   foot pip (the accent dot + the `N selected` count), wearing the dock-control register's hitbox
   (≥44px block) and the engrave-at-rest/accent-on hover the foot controls carry. The accent dot IS
   the non-color-channel ON signal (the `N selected` word carries the same fact for forced-colors /
   color-blind readers). The chip is born active (it only exists with a selection). */
.usf-dock__sel-chip {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-block-size: var(--dock-control-size, 2.75rem);
    padding-inline: 0.5rem;
    border-radius: var(--radius-pill);
    border: 1px solid var(--engrave, color-mix(in srgb, currentColor 18%, transparent));
    background: color-mix(in srgb, var(--card) 70%, transparent);
    color: var(--foreground);
    cursor: pointer;
    transition:
        color var(--transition-control),
        background var(--transition-control),
        border-color var(--transition-control);
}
.usf-dock__sel-chip:hover {
    border-color: color-mix(in srgb, var(--foreground) 35%, transparent);
}
.usf-dock__sel-chip:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: 2px;
}
/* The selection dot rides the consumed glass-ui <StatusDot variant="custom"> — it OWNS the circle
   shape + size; the accent fill (the `:color` prop) reads as the channel's ON signal. */
.usf-dock__sel-dot :deep(.status-dot__dot) {
    transition: background-color var(--transition-control);
}
.usf-dock__sel-label {
    font-family: var(--font-mono);
    font-size: var(--type-micro);
    letter-spacing: 0.04em;
    line-height: 1;
    text-transform: lowercase;
    white-space: nowrap;
}
@media (forced-colors: active) {
    .usf-dock__sel-dot :deep(.status-dot__dot),
    .usf-dock__sel-dot :deep(.status-dot__fill) {
        background-color: Highlight;
        border-color: Highlight;
    }
}
@media (prefers-reduced-motion: reduce) {
    .usf-dock__sel-chip,
    .usf-dock__sel-dot :deep(.status-dot__dot) {
        transition: none;
    }
}

/* A dock control — a ≥44px tap target (WCAG 2.5.5; the foot register shares the dock's
   --dock-control-size 2.75rem floor). At rest an engraved outline, the chrome accent on
   active/flash (one-color-one-meaning: --cp-accent, never a data hue). */
.usf-dock__ctl {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: var(--dock-control-size, 2.75rem);
    block-size: var(--dock-control-size, 2.75rem);
    border-radius: var(--radius-pill);
    border: 1px solid var(--engrave, color-mix(in srgb, currentColor 18%, transparent));
    background: color-mix(in srgb, var(--card) 70%, transparent);
    color: var(--muted-foreground);
    font-size: 0.95rem;
    line-height: 1;
    cursor: pointer;
    transition:
        color var(--transition-control),
        background var(--transition-control),
        border-color var(--transition-control);
}
.usf-dock__ctl-glyph {
    inline-size: 1.05rem;
    block-size: 1.05rem;
}
.usf-dock__ctl:hover {
    color: var(--foreground);
    border-color: color-mix(in srgb, var(--foreground) 35%, transparent);
}
.usf-dock__ctl:focus-visible {
    outline: 2px solid var(--focus-ring-color, currentColor);
    outline-offset: 2px;
}
/* The range toggle ON-state (range mode active) — the chrome accent pill, the same raised-meaning
   the stepper's active rung carries. */
.usf-dock__ctl--on {
    color: var(--cp-accent-ink, var(--background));
    border-color: transparent;
    background: var(--cp-accent, var(--foreground));
}
/* The ⤓-save flash — a brief accent confirm after a save (the "View saved" live region carries the
   word; this is the visual echo). A patient settle, never a loop. */
.usf-dock__ctl--flash {
    color: var(--cp-accent-ink, var(--background));
    border-color: transparent;
    background: var(--cp-accent, var(--foreground));
    transition:
        color 120ms ease,
        background 120ms ease,
        border-color 120ms ease;
}

/* The foot — the dark-mode toggle + the gear-toggled collapse control, fenced into their OWN zone
   (H.W9 §D · requirement #1). The DockSeparator renders directly ABOVE this foot (the dark-toggle
   divider). The foot carries a hair MORE block-gap than the control rhythm above it, so the eye
   groups [wayfinding + controls] | [theme + collapse] — a DISTINCT register. */
.usf-dock__foot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding-block-start: 0.75rem;
}
</style>
