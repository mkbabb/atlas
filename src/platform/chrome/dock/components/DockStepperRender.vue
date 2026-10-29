<script setup lang="ts">
// DockStepperRender — band 2, the chapter rail: the Roman figure-number rungs, rendered straight
// into the dock's run (K-H-ARCH · the TEMPLATE-axis split). The per-beat rivet hue resolves here
// (the rungs render here), threaded into each `<DockNavItem>`.
//
// THE RUNGS ARE THE RUN'S SEATS (B6 · U RULINGS §M M-4, §L D3-1). glass 10.1.0's GlassDock claims
// `role="toolbar"` on the element holding the #default slot and roves its DIRECT children as seats
// (`useDockRun`): one Tab stop per run (the `aria-current` seat, else the first), ArrowUp/Down/Home/End
// seat to seat, a reach-scroll that brings the focused seat into the run's view, and a status line
// that speaks the seat's name. So this component's template is a FRAGMENT of single controls — every
// root node is one rung (a `<button>` beat or a `<RouterLink>` view), and each rung declares itself with
// `data-glass-dock-seat` (glass 10.1.2 roves only declared seats; DockNavItem sets it). Nothing else may be a root element here: a wrapper would be one container seat that
// glass roves as a single stop, and a decorative element would be a seat with no control the arrows
// stall on. The spine is therefore paint on the run (Dock.css), and the live "step N of M" readout is
// teleported out of the run.
//
// The stepper (`useDockStepper`, the dock's one IntersectionObserver) is owned by the orchestrator,
// which outlives a route change (U/B7 §2.2: the dock is mounted once above the router) and shares the
// same handle with the section pager. This component renders its rungs.
import DockNavItem from "./DockNavItem.vue";
import type { UseDockStepper } from "../composables/useDockStepper.js";
import type { DashboardContext } from "../../../../contract/index.js";

const { ctx, stepper } = defineProps<{
    /** The active dashboard chrome contract — the rungs read `nav` + the theme's ramp. */
    ctx: DashboardContext;
    /** The orchestrator's stepper handle (active beat, step, Roman mapping, section jump). */
    stepper: UseDockStepper;
}>();

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

/** A rung was chosen: a section control's jump (it writes `?at=`). */
function onSelect(id: string): void {
    stepper.goToSection(id);
}
</script>

<template>
    <!-- The live wayfinding readout — the spine carries the hue, this carries the WORD (screen-reader
         "step N of M" as the reader scrolls). Never color-alone. It is teleported out of the run,
         where any element would be a seat (sr-only: acoustic, not visual placement). -->
    <Teleport to="body">
        <span v-if="stepper.activeStep.value" class="sr-only" aria-live="polite" data-testid="dock-step-readout">
            Section {{ stepper.activeStep.value }} of {{ stepper.beatItems.value.length }}
        </span>
    </Teleport>

    <DockNavItem
        v-for="(item, i) in ctx.nav"
        :key="item.kind === 'beat' ? `beat-${item.id}` : `view-${item.to}`"
        :item="item"
        :index="i"
        :active="item.kind === 'beat' && stepper.activeBeatId.value === item.id"
        :rivet-hue="rivetHue(i)"
        :roman="stepper.roman(i + 1)"
        @select="onSelect"
    />
</template>
