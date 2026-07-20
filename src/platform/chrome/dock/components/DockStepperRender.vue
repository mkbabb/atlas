<script setup lang="ts">
// DockStepperRender — band 2, the SCROLLING MIDDLE (K-H-ARCH · the TEMPLATE-axis split, the one
// growing region). Extracted from Dock.vue's `#default` middle: the `FadingScroll`-wrapped Roman
// figure-number stepper riding the `ControlPlaneSpine`, the only `overflow:scroll` region of the
// rail. Per the composable-co-location law, `useDockStepper(ctx)` MOVES HERE — the dock's ONE
// IntersectionObserver (the single scroll-scalar writer) lives inside that composable, so the
// observer relocates WITH the band (still ONE observer, ZERO minted in any shell). The per-beat
// rivet-hue + the net-retention spine ramp resolve here (the rungs render here), each threaded into
// a `<DockNavItem>`.
//
// Vue 3.5 reactive-props convention (atlas/CLAUDE.md §Vue 3.5 reactive-props) — a NEW component. The
// destructured `ctx` is handed to `useDockStepper` exactly as the orchestrator's injected ctx was
// (a setup-time value snapshot, behaviour-identical); `ctx`/`ramp` read inside `rivetHue`/`spineRamp`
// compile to tracked `__props` reads, so they stay reactive without a manual wrapper.
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { Home } from "@lucide/vue";
import { FadingScroll } from "@mkbabb/glass-ui/fading-scroll";
import { DockSeparator } from "@mkbabb/glass-ui/dock";
import ControlPlaneSpine from "../ControlPlaneSpine.vue";
import DockNavItem from "./DockNavItem.vue";
import { useDockStepper } from "../composables/useDockStepper.js";
import type { DashboardContext } from "../../../../contract/index.js";

const { ctx, ramp, progress, sheet } = defineProps<{
    /** The active dashboard chrome contract — the stepper reads `nav` + the theme's ramp. */
    ctx: DashboardContext;
    /** The dock's `:ramp` prop (a SPECTRUM-thesis ramp) threaded into the spine fill; undefined ⇒
        the injected theme's ramp, else the single-accent fade. */
    ramp?: readonly string[];
    /** The dock's hoisted whole-document scalar. Read only for terminal-beat correction. */
    progress: number;
    /** THE PHONE SHEET REGISTER (M.W1 D2 · N.WG1 Arm B) — true while the phone dock is expanded:
        the SAME stepper renders as the top-left ruled section-menu (labeled rows, the home first
        row, ArrowUp/Down roving focus, select-closes). NOT a second component — a register. */
    sheet?: boolean;
}>();

const emit = defineEmits<{
    /** The sheet asks to close (a row was chosen / Home was taken) — the orchestrator collapses
        the dock and returns focus to the crest button (`focus({preventScroll})`, D2). */
    close: [];
}>();

// ── The figure-number stepper (J-ARCH §3 · useDockStepper) — the observer MOVES here ──────────
// The beat-observer (the dock's ONE IntersectionObserver — the single scroll-scalar writer), the
// Roman mapping, the "step N of M" projection, the single-writer mirror into `useActiveBeat`, and
// the terminal-beat + year cross-fade triggers are owned by `useDockStepper`. ZERO new observer is
// minted (the composable IS the dock's existing observer, relocated into this band).
const {
    activeBeatId,
    beatItems,
    activeStep,
    roman,
    activeYear,
    yearFading,
    scrollTo,
} = useDockStepper(ctx, () => progress);

/** SM-2 (design-suffusion §2 #2 · d-pops M1) — the per-beat RIVET HUE: each resting nav rivet
    carries its beat's data-hue as a thin ring, so the rail reads as a ≥3-colour INDEX at rest. A
    SPECTRUM dashboard reads its theme ramp's stop per beat; a single-hue register (USF) cycles
    the landed per-route TRITONE (`--route-accent` · `-warm` · `-cool`), each falling back to the
    primary `--route-accent` (the tokens.css neutral default guarantees it resolves — N.WG1 arm F
    retired the dead `--dock-accent` inner fallback). The ACTIVE rung keeps the lone red fill. */
const ROUTE_TRITONE = [
    "var(--route-accent)",
    "var(--route-accent-warm, var(--route-accent))",
    "var(--route-accent-cool, var(--route-accent))",
];
function rivetHue(index: number): string {
    const ramps = ctx.theme?.barometerRamp;
    if (ramps && ramps.length) return ramps[index % ramps.length];
    return ROUTE_TRITONE[index % ROUTE_TRITONE.length];
}

/** The net-retention ramp the spine fills with — the carried `:ramp` prop (C3-9), or the injected
    theme's `barometerRamp` when no prop is threaded. */
const spineRamp = computed<readonly string[] | undefined>(
    () => ramp ?? ctx.theme?.barometerRamp,
);

// ── THE SHEET INTERACTION (D2) — roving focus + select-closes, sheet register only ─────────────
const stepperEl = ref<HTMLElement | null>(null);

/** A beat row was chosen inside the sheet — scroll to it AND close (the D2 "Enter scrollTo+close";
    a plain rail click just scrolls, unchanged). */
function onSelect(id: string): void {
    scrollTo(id);
    if (sheet) emit("close");
}

/** ArrowUp/Down/Home/End roving focus across the sheet's rows (D2). Bound always, guarded on the
    register — the rail's Tab order is untouched. Esc is the ORCHESTRATOR's (Dock.vue) so it also
    covers focus resting in the foot band. */
function onSheetKeydown(e: KeyboardEvent): void {
    if (!sheet) return;
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const rows = Array.from(
        stepperEl.value?.querySelectorAll<HTMLElement>(".usf-dock__step") ?? [],
    );
    if (!rows.length) return;
    e.preventDefault();
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const next =
        e.key === "ArrowDown"
            ? Math.min(rows.length - 1, i + 1)
            : e.key === "ArrowUp"
              ? Math.max(0, i - 1)
              : e.key === "Home"
                ? 0
                : rows.length - 1;
    rows[next]?.focus();
}
</script>

<template>
    <!-- The live wayfinding readout — the spine carries the hue, this carries the WORD (screen-reader
         "step N of M"). Never color-alone. Rides above the scroll middle (sr-only — acoustic, not
         visual placement). -->
    <span v-if="activeStep" class="sr-only" aria-live="polite">
        Step {{ activeStep }} of {{ beatItems.length }}
    </span>

    <!-- ══ BAND 2 — THE SCROLLING MIDDLE (the Roman stepper ONLY) ══════════════════════
         `FadingScroll` wraps the ONE growing region so the over-long stepper feathers at its scroll
         edges. The DockSeparator hairline fences the band; the stepper is the only `overflow:scroll`
         region, so under a forced overflow the crest (band 1) AND the foot (band 3) stay
         top-invariant while ONLY this middle scrolls (`j0-dock-bands`). -->
    <FadingScroll axis="y" class="usf-dock__scroll" data-testid="dock-scroll-middle">
        <!-- The dock divider — glass-ui's public DockSeparator (E2 · audit-e/e-dock R1). -->
        <DockSeparator />

        <!-- The figure-number stepper riding the identity spine: ONE ControlPlaneSpine (the
             net-retention ramp) with the Roman rungs riding ABOVE it (beats scroll, views route).
             Whole-document progress lives on the collapsed Glass rim, never a second rail. -->
        <div
            id="dock-sheet"
            ref="stepperEl"
            class="usf-dock__stepper"
            :class="{ 'usf-dock__stepper--year-fade': yearFading }"
            :data-year="activeYear ?? undefined"
            @keydown="onSheetKeydown"
        >
            <!-- N.WG1 arm F — no `:accent` prop: the spine derives the route's cool leg
                 (`var(--route-accent-cool, var(--route-accent))`, its default), the ONE accent
                 authority, never the retired `ctx.accent` dock-local pole. -->
            <ControlPlaneSpine
                class="usf-dock__spine"
                :ramp="spineRamp"
            />

            <!-- THE HOME ROW (D2) — inside the SHEET the crest is the toggle, so HOME rides as the
                 labeled FIRST ROW (never a long-press, never a second pill). Sheet register only;
                 the desktop rail's home stays the crest link. -->
            <RouterLink
                v-if="sheet"
                to="/"
                class="usf-dock__step figure usf-dock__step--home"
                data-testid="dock-home-row"
                @click="emit('close')"
            >
                <span class="usf-dock__step-num" aria-hidden="true">
                    <Home :size="15" aria-hidden="true" />
                </span>
                <span class="usf-dock__step-label">Home</span>
            </RouterLink>

            <DockNavItem
                v-for="(item, i) in ctx.nav"
                :key="item.kind === 'beat' ? `beat-${item.id}` : `view-${item.to}`"
                :item="item"
                :index="i"
                :active="item.kind === 'beat' && activeBeatId === item.id"
                :rivet-hue="rivetHue(i)"
                :roman="roman(i + 1)"
                @select="onSelect"
            />
        </div>
    </FadingScroll>
</template>

<style scoped>
/* ── BAND 2 · THE SCROLLING MIDDLE (J-DOCK §approach-3) ──────────────────────────────────
   The `FadingScroll` wrapper IS the dock's ONE scroll port — the Roman stepper is the only
   growing region. It flex-GROWS to claim the space between the crest and the sticky foot, and
   scrolls its OWN block axis on overflow. The crest (band 1) and the foot (band 3) stay pinned
   while ONLY this middle scrolls. */
.usf-dock__scroll {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    inline-size: 100%;
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-y: auto;
}

/* The stepper column — the figure-numbers on an 8px vertical sub-rhythm, the spine threading
   behind them. `position: relative` anchors the absolute spine to this box. */
.usf-dock__stepper {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding-block: 0.5rem;
    min-block-size: 0;
}

/* The spine runs BEHIND the figure-numbers, down their gutter (the identity rail + Roman markers).
   It is absolutely placed by ControlPlaneSpine's own `position:
   relative` shell; here we pin it to the stepper's full height. */
.usf-dock__spine {
    position: absolute;
    inset: 0;
}

/* The year-change cross-fade (B4 §4): on a year scrub the spine fill dips and recovers — a
   patient settle that re-weights the rail to the selected year, the same 0.6s curve the accent
   re-tint uses. Runs once per change; never loops. Targets the spine's net-retention ramp fill. */
.usf-dock__stepper--year-fade :deep(.spine__fill) {
    animation: dock-year-fade 0.6s var(--ease-engrave);
}
@keyframes dock-year-fade {
    0% {
        opacity: 1;
    }
    35% {
        opacity: 0.35;
    }
    100% {
        opacity: 1;
    }
}

/* PRM — the year-change cross-fade is delight, not information — kill it under PRM. */
@media (prefers-reduced-motion: reduce) {
    .usf-dock__stepper--year-fade :deep(.spine__fill) {
        animation: none;
    }
}
</style>
