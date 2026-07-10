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
// R-FOOT-2 (the idiomatic end-anchor, NOT an interim workaround). OQ-1 proved the singular
// `#persistent` slot CANNOT serve the foot — it is already consumed by the crest and is hard-anchored
// to the block-START by glass-ui's `.dock-persistent + .dock-layers` adjacency combinator, with no
// `persistentSide`/`anchor`/`order` prop in 4.1.0 OR 4.2.0 to flip it. So the atlas's
// `position:sticky bottom:0` foot is the idiomatic block-END anchor (it self-serves on sticky, ZERO
// glass-ui dependency); a future `#persistent-end` re-host is an OPTIONAL 4.3.0 simplification
// (R-FOOT-1, off the K critical path), never a K-H dependency. The sticky CSS rides VERBATIM below.
//
// Vue 3.5 reactive-props convention (atlas/CLAUDE.md §Vue 3.5 reactive-props) — a NEW component. The
// destructured `ctx` is handed to `useDockDataState` exactly as the orchestrator's injected ctx was;
// `ctx` read inside `hasFilter` compiles to a tracked `__props` read (reactive without a wrapper).
import { computed } from "vue";
import { DockSeparator } from "@mkbabb/glass-ui/dock";
import { StatusDot } from "@mkbabb/glass-ui/status-dot";
import { DarkModeToggle } from "@mkbabb/glass-ui/controls";
import {
    Download,
    GitCompareArrows,
    SlidersHorizontal,
    PanelLeftClose,
} from "@lucide/vue";
import DockSettings from "../DockSettings.vue";
import { useFilterPane } from "@/filter/composables/useFilterPane";
import { useDockGear } from "@/platform/chrome/dock/composables/useDockGear";
import { useDockDataState } from "@/platform/chrome/dock/composables/useDockDataState";
import type { DashboardContext } from "@/contract";

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
const { gearOpen, showChip, selectionCount, isPhone, openFilterView } =
    useDockGear();
const selectionChipLabel = computed(() => `${selectionCount.value} selected`);

// ── The A4 dock pull-out filter seam (useFilterPane — the ONE open truth) ──────────────────────
// The foot's filter affordance summons the floating right `Drawer mode="live-behind"`; it drives
// the SAME shared `useFilterPane().open` singleton the FilterPanel trigger flips — ONE open truth.
const { open: filterOpen } = useFilterPane();
/** Show the pull-out only when the active dashboard ships a filter body (else there is no lens). */
const hasFilter = computed(() => Boolean(ctx.filterBody));

// ── The data-state register (J-ARCH §3 · useDockDataState) ─────────────────────────────────────
// The year-scrubber RANGE-mode toggle + the `useSavedViews` ⤓-save door, on the SAME `useViewParams`
// year-scope and `platform:views` shelf they already shared (no second shelf, no second scope).
const { yearModeNow, hasYearScope, toggleRange, saveCurrentView, saveFlash } =
    useDockDataState(ctx);
</script>

<template>
    <!-- ══ BAND 3 — THE STICKY FOOT (the idiomatic block-END anchor · R-FOOT-2) ════════════════
         The foot is `position:sticky`-pinned to the rail's block-end so the gear + controls +
         dark-toggle do NOT scroll away when the stepper overflows. The leading DockSeparator fences
         it off the scroll middle above. The `#persistent-end` re-host is an OPTIONAL future 4.3.0
         simplification (R-FOOT-1, off the K critical path), never a K-H dependency. -->
    <div class="usf-dock__persistent-foot" data-testid="dock-persistent-foot">
        <DockSeparator />

        <!-- ⓪ THE SELECTION CHIP → the FilterView OPENER (C24 · J-FEEDBACK-4 §2/§9). Mounts ONLY
             when a selection is live (`v-if="showChip"`) — at count 0 the node is ABSENT. When shown
             it is the FilterView OPENER: a `<button>` `N selected` pip that RAISES J-FILTER's
             filter-view facility. The StatusDot carries the non-color ON signal; `aria-live="polite"`
             announces the count when the chip mounts on the first select. -->
        <button
            v-if="showChip"
            type="button"
            class="usf-dock__sel-chip usf-dock__sel-chip--active"
            data-testid="dock-selection-chip"
            :data-selection-count="selectionCount"
            aria-live="polite"
            :aria-label="`${selectionChipLabel} — open the filter view`"
            :title="`${selectionChipLabel} — open the filter view`"
            @click="openFilterView"
        >
            <StatusDot
                variant="custom"
                size="sm"
                class="usf-dock__sel-dot"
                color="var(--cp-accent, var(--foreground))"
            />
            <span class="usf-dock__sel-label">{{ selectionChipLabel }}</span>
        </button>

        <!-- ① THE MOBILE GEAR (@media(--phone), C23) — the four secondary controls collapse behind
             ONE `Settings` glyph opening the `DockSettings` controls sheet. The desktop register is
             BYTE-UNCHANGED: above `--phone` the four controls stay inline below. -->
        <DockSettings
            v-if="isPhone"
            v-model:open="gearOpen"
            :has-year-scope="hasYearScope"
            :year-mode-now="yearModeNow"
            :save-flash="saveFlash"
            :has-filter="hasFilter"
            :filter-open="filterOpen"
            :disable-transitions="disableTransitions"
            @toggle-range="toggleRange"
            @save-view="saveCurrentView"
            @toggle-filter="filterOpen = !filterOpen"
        />

        <!-- ② THE INLINE SECONDARY CONTROLS (above --phone) — the year-range toggle, the ⤓-save
             door, the filter pull-out, and the dark-toggle, inline on the rail at the desktop
             register. Each keeps its rail `data-testid` so the gate finds them as direct rail
             children above --phone. -->
        <template v-if="!isPhone">
            <!-- ③ The data-state register — the year-range toggle + the ⤓-save door. -->
            <div v-if="hasYearScope" class="usf-dock__foot-controls">
                <!-- The year-scrubber RANGE-mode control — the `GitCompareArrows` glyph + the
                     pressed `--on` pill (the active range mode). -->
                <button
                    type="button"
                    class="usf-dock__ctl"
                    :class="{ 'usf-dock__ctl--on': yearModeNow === 'range' }"
                    :aria-pressed="yearModeNow === 'range'"
                    aria-label="Compare years (range mode)"
                    title="Compare years"
                    data-testid="dock-year-range"
                    @click="toggleRange"
                >
                    <GitCompareArrows
                        class="usf-dock__ctl-glyph"
                        aria-hidden="true"
                    />
                </button>

                <!-- The ⤓-save door (PL-5) — quick-save the current full URL state onto the shared
                     platform:views shelf. -->
                <button
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

            <!-- ④ The A4 dock pull-out — the filter affordance summoning the floating right
                 live-behind Drawer; it drives the SAME `useFilterPane().open` the FilterPanel
                 trigger flips (ONE open truth). -->
            <div
                v-if="hasFilter"
                class="usf-dock__foot-controls usf-dock__foot-controls--pullout"
            >
                <button
                    type="button"
                    class="usf-dock__ctl"
                    :class="{ 'usf-dock__ctl--on': filterOpen }"
                    aria-label="Toggle filters"
                    title="Filters"
                    :aria-expanded="filterOpen"
                    data-testid="dock-filter-pullout"
                    @click="filterOpen = !filterOpen"
                >
                    <SlidersHorizontal
                        class="usf-dock__ctl-glyph"
                        aria-hidden="true"
                    />
                </button>
            </div>

            <!-- The DARK-TOGGLE DIVIDER (H.W9 §D) — the DockSeparator fencing the dark toggle into
                 its own compartment, a visually separate register from the controls. -->
            <DockSeparator />

            <!-- ⑤ The dark-mode toggle + the collapse toggle (the TOC view-mode toggle RETIRED,
                 O-DIR-4 ARM 3 — the owner's "entirely worthless" verdict on the A23 interim; the
                 DockTOC code + useDockViewMode stay on disk behind the GLASS_TOC_ABSTRACTION_AVAILABLE
                 owner-held seam, unconsumed). `size="dock"` routes the theme toggle through the
                 dock-control register; `:disable-transitions` wires the INSTANT theme re-print. Beside
                 it, the GEAR-TOGGLED COLLAPSE control (C26) toggling the re-enabled collapse posture
                 (the orchestrator drives the GlassDock `expand()`/`collapse()`). Fenced into its own
                 zone below the divider. -->
            <div class="usf-dock__foot">
                <DarkModeToggle
                    size="dock"
                    :disable-transitions="disableTransitions"
                />
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
                    <PanelLeftClose
                        class="usf-dock__ctl-glyph"
                        aria-hidden="true"
                    />
                </button>
            </div>
        </template>
    </div>
</template>

<style scoped>
/* ── BAND 3 · THE STICKY FOOT (the idiomatic block-END anchor · J-DOCK §approach-3 · R-FOOT-2) ──
   The foot is `position:sticky`-pinned to the rail's block-end so the gear + controls + dark-toggle
   do NOT scroll away when the stepper overflows. It carries the dock's column rhythm; its `bottom:0`
   sticky anchor pins it under the scroll-middle. (The CSS rides VERBATIM with the band — R-FOOT-2.) */
.usf-dock__persistent-foot {
    position: sticky;
    bottom: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    inline-size: 100%;
    /* a hair of background-matched padding so a scrolled-under stepper rung does not bleed through
       the sticky foot's leading edge (the foot reads as a fenced band, not a gap). */
    padding-block-start: 0.25rem;
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
    outline: 2px solid var(--ring, currentColor);
    outline-offset: 2px;
}
/* The selection dot rides the consumed glass-ui <StatusDot variant="custom"> — it OWNS the circle
   shape + size; the accent fill (the `:color` prop) reads as the channel's ON signal. */
.usf-dock__sel-dot :deep(.status-dot__dot) {
    transition: background-color var(--transition-control);
}
.usf-dock__sel-label {
    font-family: var(--font-mono);
    font-size: 0.625rem;
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
    outline: 2px solid var(--ring, currentColor);
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
