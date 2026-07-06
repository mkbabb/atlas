<script setup lang="ts">
// ControlPlaneSpine.vue — the ONE wayfinding spine of the floating instrument
// (C.W3.2, C3.md §Scope 3, CP-5/A4a). It carries the net-retention RAMP + the scroll
// PLAYHEAD as the dock's visual rail; the Roman figure-rungs (Dock.vue) ride above it
// and ARE the beats. The spine is two layers and no more:
//
//   · Layer A — the net-retention ramp fill (`spine__fill`), the fused Barometer thread
//     (SCI's rainbow / ECF's sequential / USF's single-accent fade), a thin vertical
//     gradient bar foot→crown.
//   · Layer B — the achromatic scroll playhead (`spine__playhead`), the "where am I in
//     the story" answer, draining on scroll-up.
//
// ── THE RIVET OVERLAY RETIRED (E2 · audit-e/e-dock R2) ──────────────────────────
// The spine FORMERLY rotated a HORIZONTAL `GlassTimeline variant="continuous"` -90deg to
// fake a vertical rail, dragging the primitive's per-boundary `.continuous-dot` markers
// into the rung gutter — a SECOND beat-encoding ghosting through the Roman rungs (the
// rivet-on-rung overlaps the E9a gate measured: 6 on /usf, 10 on /sci). That rotor + its
// `100cqb` container gymnastics + the `.continuous-dot` family are DELETED whole. The
// platform already carries the beats as the interactive Roman rungs (the real wayfinding)
// and the net-retention as the `spine__fill` gradient + the `spine__playhead` — the dots
// added nothing but the ghost. This is the elegance transposition the e-dock R2 named: the
// spine becomes what it visually IS (a fill bar + a playhead behind interactive rungs), not
// a CSS-tortured horizontal widget. The smoke gate (re-pointed at E0) now asserts the
// `.spine__fill` + `.spine__playhead` exist — the real wayfinding artefacts — never the
// decorative rivets.
//
// ── THE NET-RETENTION FILL (the inheritor obligation, UNCHANGED) ─────────────────
// The spine re-consumes `ctx.barometerRamp` (the field C1 mints into `DashboardContext`,
// types.ts:101) for the Layer-A net-retention fill, or the deleted `*-chrome.css`
// `!important` barometer overrides regress. TWO paths fuse: the RAMP path (multi-stop
// `ctx.barometerRamp` painted base→apex — SCI's rainbow, ECF's ramp) and the SINGLE-ACCENT
// path (the accent fading from a recessive foot to a saturated crown, OKLab-mixed).
//
// ── THE PLAYHEAD (Layer B, the achromatic scroll fill) ──────────────────────────
// A separate achromatic overlay (`--cp-playhead`) riding the rail, a RESERVED full-height
// footprint `scaleY()`'d by `progress` (0..1 document scroll) from the crown — a compositor
// transform, never a layout-driving `block-size` animation (P5/M16). It is the "where am I in
// the story" answer — it drains on scroll-up. PRM-fenced: it SNAPS under reduced-motion
// (information never depends on the eased follow).
import { computed } from "vue";
import { useReducedMotion } from "@/motion/useReducedMotion";

const props = withDefaults(
    defineProps<{
        /** The active dashboard's chrome-register accent — the single-hue fill pole
            (USF's receiver-teal, ECF's fund pole) when no ramp is declared. */
        accent?: string;
        /** The ordered multi-stop net-retention ramp (base → apex) — `ctx.barometerRamp`,
            the C1-minted field (SCI's rainbow, ECF's sequential). Undefined ⇒ the
            single-accent fade. This is the C3-8 inheritor obligation: the spine MUST read
            it or the deleted *-chrome.css overrides regress. */
        ramp?: readonly string[];
        /** Document scroll progress 0..1 — drives the achromatic Layer-B playhead. */
        progress?: number;
        /** The probe handle. Defaults to the canonical `control-plane-spine` (the dock's rail —
            the wayfinding-of-record the smoke/render-matrix gates read). Overridable so a second
            instance can carry a distinct id without a strict-mode `getByTestId` collision; the
            always-expanded dock mounts exactly one spine, so the default stands. */
        testid?: string;
    }>(),
    {
        // N.WG1 arm F — the spine's single-hue fill pole re-points to the route's cool leg (the
        // ONE `--route-*` accent authority), falling back to the primary `--route-accent` (the
        // tokens.css neutral default guarantees it resolves). The retired `ctx.accent` prop no
        // longer overrides it; a consumer may still pass an explicit `accent` for a bespoke pole.
        accent: "var(--route-accent-cool, var(--route-accent))",
        ramp: undefined,
        progress: 0,
        testid: "control-plane-spine",
    },
);

const reduced = useReducedMotion();

/** Layer A — the net-retention fill, a vertical gradient bar foot→crown. TWO paths fuse
    (mirroring the deleted Barometer's `threadGradient`):

      · the RAMP path — `ctx.barometerRamp` painted base→apex as an evenly-spaced
        linear-gradient (the spectrum-thesis dashboards: SCI's rainbow, ECF's ramp).
        Rendered `to top` so the base sits at the foot, the apex at the crown.
      · the SINGLE-ACCENT path — the accent fades from a recessive foot (low alpha)
        to a saturated crown, OKLab-mixed so the fade reads perceptually even. */
const fillGradient = computed<string>(() => {
    const ramp = props.ramp;
    if (ramp && ramp.length > 0) {
        const stops =
            ramp.length === 1
                ? `${ramp[0]}, ${ramp[0]}`
                : ramp
                      .map((c, i) => `${c} ${(i / (ramp.length - 1)) * 100}%`)
                      .join(", ");
        return `linear-gradient(to top, ${stops})`;
    }
    return (
        `linear-gradient(to top,` +
        ` color-mix(in oklab, ${props.accent} 22%, transparent),` +
        ` color-mix(in oklab, ${props.accent} 55%, transparent) 45%,` +
        ` ${props.accent})`
    );
});

/** Layer B playhead FILL as a clamped 0..1 SCALE (the P5 transform-driven fill — the playhead
    occupies a reserved full-height footprint and `scaleY()`s over it, so the fill is a compositor
    transform, never a layout-driving `block-size` animation, M16/P5). */
const playheadScale = computed(() => {
    const p = props.progress;
    return p < 0 ? 0 : p > 1 ? 1 : p;
});
</script>

<template>
    <!-- The spine is a VERTICAL rail of two layers: the net-retention ramp fill + the
         scroll playhead. `aria-hidden` on the decorative shell — the Dock's `aria-current`
         + live region carry the wayfinding WORD, the Roman rungs carry the interaction. -->
    <div
        class="spine"
        :class="{ 'spine--snap': reduced }"
        :data-testid="testid"
        :style="{ '--spine-playhead-scale': playheadScale, '--spine-fill': fillGradient }"
    >
        <!-- Layer A — the net-retention RAMP FILL (the fused barometer thread: SCI's
             rainbow signature / ECF's sequential ramp / USF's single-accent fade), painted
             as the vertical rail substrate foot→crown. The Roman figure-rungs (Dock.vue)
             ride ABOVE it and ARE the beats — no rivet overlay, no second beat-encoding. -->
        <span class="spine__fill" aria-hidden="true" />

        <!-- Layer B — the achromatic scroll playhead riding ON TOP of the rail (the
             "where am I in the story" answer). Drains on scroll-up; snaps under PRM. -->
        <span class="spine__playhead" aria-hidden="true" />
    </div>
</template>

<style scoped>
/* The spine occupies the dock's stepper column — a thin vertical rail centred on the
   dock axis. It is `position: relative` so the fill + playhead anchor to it. */
.spine {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: stretch;
    justify-content: center;
    inline-size: 100%;
    min-block-size: 0;
}

/* Layer A — the net-retention ramp fill (the barometer thread). A thin vertical bar at
   the rail width, centred on the dock axis, painted with the multi-stop `--spine-fill`
   (foot→crown). Sits BENEATH the playhead (Layer B). The 0.6s OKLab settle matches the
   deleted Barometer's curve on a ramp swap. */
.spine__fill {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 50%;
    inline-size: var(--cp-rail-w, 3px);
    translate: -50% 0;
    border-radius: var(--cp-rail-w, 3px);
    background-image: var(--spine-fill);
    pointer-events: none;
    transition: background-image 0.6s var(--ease-engrave);
}
.spine--snap .spine__fill {
    transition: none;
}

/* Layer B — the bright achromatic scroll playhead. A thin fill riding the dock axis,
   from the CROWN (top) down to `progress`. Narrower than the rail so the net-retention
   ramp reads at its edges. `--cp-playhead` is the achromatic ink (foreground). */
.spine__playhead {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 50%;
    /* P5 (M16 · N.WG1 arm D) — the playhead is a RESERVED full-height footprint that `scaleY()`s
       over its length from the crown (`transform-origin: top`), so the scroll fill is a compositor
       transform, NEVER a layout-driving `block-size` animation (the motion-canon P5 law). */
    inline-size: 1px;
    block-size: 100%;
    transform-origin: top center;
    transform: translateX(-50%) scaleY(var(--spine-playhead-scale, 0));
    border-radius: var(--radius-mark);
    background: var(--cp-playhead, var(--foreground));
    pointer-events: none;
    /* tracks scroll directly — a short linear lerp so the fill follows without lag,
       draining on scroll-up. Transforms only (P5), so the follow never reflows the rail. */
    transition: transform 80ms linear;
}

/* PRM — the playhead snaps to its terminal height (no eased follow). Information never
   depends on motion (A4a / S2 §2.5). */
.spine--snap .spine__playhead {
    transition: none;
}

@media (prefers-reduced-motion: reduce) {
    .spine__playhead {
        transition: none;
    }
}
</style>
