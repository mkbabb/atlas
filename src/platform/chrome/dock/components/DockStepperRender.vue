<script setup lang="ts">
// DockStepperRender — band 2, the chapter rail: the Roman figure-number rungs, rendered straight
// into the dock's run (K-H-ARCH · the TEMPLATE-axis split). Per the composable-co-location law,
// `useDockStepper(ctx)` lives here — the dock's ONE IntersectionObserver (the single scroll-scalar
// writer) stays inside that composable, so ZERO observer is minted in any shell. The per-beat rivet
// hue resolves here (the rungs render here), threaded into each `<DockNavItem>`.
//
// THE RUNGS ARE THE RUN'S SEATS (B6 · U RULINGS §M M-4, §L D3-1). glass 10.1.0's GlassDock claims
// `role="toolbar"` on the element holding the #default slot and roves its DIRECT children as seats
// (`useDockRun`): one Tab stop per run (the `aria-current` seat, else the first), ArrowUp/Down/Home/End
// seat to seat, a reach-scroll that brings the focused seat into the run's view, and a status line
// that speaks the seat's name. So this component's template is a FRAGMENT of single controls — every
// root node is one rung (a `<button>` beat or a `<RouterLink>` view), and the phone sheet's Home row
// is one more. Nothing else may be a root element here: a wrapper would be one container seat that
// glass roves as a single stop, and a decorative element would be a seat with no control the arrows
// stall on. The spine is therefore paint on the run (Dock.css), and the live "step N of M" readout is
// teleported out of the run.
//
// Vue 3.5 reactive-props convention (atlas/CLAUDE.md §Vue 3.5 reactive-props). The destructured
// `ctx` is handed to `useDockStepper` exactly as the orchestrator's injected ctx was (a setup-time
// value snapshot, behaviour-identical); `ctx` read inside `rivetHue` compiles to a tracked
// `__props` read.
import { watch } from "vue";
import { RouterLink } from "vue-router";
import { Home } from "@lucide/vue";
import DockNavItem from "./DockNavItem.vue";
import { useDockStepper } from "../composables/useDockStepper.js";
import type { DashboardContext } from "../../../../contract/index.js";

const { ctx, progress, sheet } = defineProps<{
    /** The active dashboard chrome contract — the stepper reads `nav` + the theme's ramp. */
    ctx: DashboardContext;
    /** The dock's hoisted whole-document scalar. Read only for terminal-beat correction. */
    progress: number;
    /** THE PHONE SHEET REGISTER (M.W1 D2 · N.WG1 Arm B) — true while the phone dock is expanded:
        the SAME rungs render as the top-left ruled section-menu (labeled rows, the home first row,
        select-closes). NOT a second component — a register. */
    sheet?: boolean;
}>();

const emit = defineEmits<{
    /** The sheet asks to close (a row was chosen / Home was taken) — the orchestrator collapses
        the dock and returns focus to the crest button (`focus({preventScroll})`, D2). */
    close: [];
    /** The year cross-fade (B4 §4) is running. The spine is the run's paint, which the
        orchestrator owns, so the fade is handed up rather than drawn here. */
    "year-fade": [fading: boolean];
}>();

// ── The figure-number stepper (J-ARCH §3 · useDockStepper) — the dock's ONE observer ─────────
const { activeBeatId, beatItems, activeStep, roman, yearFading, scrollTo } = useDockStepper(
    ctx,
    () => progress,
);
watch(yearFading, (fading) => emit("year-fade", fading));

/** SM-2 (design-suffusion §2 #2 · d-pops M1) — the per-beat RIVET HUE: each resting rung carries
    its beat's data-hue as a thin ring, so the rail reads as a ≥3-colour INDEX at rest. A SPECTRUM
    dashboard reads its theme ramp's stop per beat; a single-hue register cycles the per-route
    TRITONE, each falling back to the primary `--route-accent`. The ACTIVE rung keeps the lone fill. */
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

/** A rung was chosen — scroll to it, and inside the sheet also close (the D2 "Enter
    scrollTo+close"; a plain rail click just scrolls). */
function onSelect(id: string): void {
    scrollTo(id);
    if (sheet) emit("close");
}
</script>

<template>
    <!-- The live wayfinding readout — the spine carries the hue, this carries the WORD (screen-reader
         "step N of M" as the reader scrolls). Never color-alone. It is teleported out of the run,
         where any element would be a seat (sr-only: acoustic, not visual placement). -->
    <Teleport to="body">
        <span v-if="activeStep" class="sr-only" aria-live="polite" data-testid="dock-step-readout">
            Step {{ activeStep }} of {{ beatItems.length }}
        </span>
    </Teleport>

    <!-- THE HOME ROW (D2) — inside the SHEET the crest is the toggle, so HOME rides as the labeled
         FIRST ROW (never a long-press, never a second pill). Sheet register only; the desktop rail's
         home stays the crest link. -->
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
</template>
