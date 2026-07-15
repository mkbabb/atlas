<script setup lang="ts">
// platform/charts/ScatterPlate.vue — THE SHARED SCATTER ENGINE (J-ARCH §1 · D6 major).
//
// The two consequence scatters — sci/features/scatter/SciScatter.vue + usf/features/balance/
// BreakEvenScatter.vue — mirror the SAME host scaffold over ~12 platform primitives: the
// `VizPlate` host mount, the `useEChart` lifecycle over a transparent hit-field option, the
// `ChartLegend` furniture, the `AxisNameLockup` ×2 reserved-gutter lockups, the `VizAnnotation`
// hinge/break-even chip seated by `VizTextOverlay`, and the `useHoverReadout` publish. I-ARCH
// (AR-2/AR-8) extracted the OPTION assembly into colocated `useXOption` composables; this engine
// takes the seam ONE altitude up — it OWNS the HOST scaffold the option extraction left mirrored,
// so each scatter collapses to a thin declaration that provides only the genuine forks.
//
// THE GENUINE FORKS (J-FEEDBACK-3 §1 — NOT byte-for-byte shared scaffold):
//   • the option BUILDER (`useScatterOption` / `useBreakEvenOption`, passed as the `option` prop);
//   • the `<Glyph>` SVG OVERLAY — an OPTIONAL `#overlay` SLOT (a BreakEvenScatter/RankedStrip
//     facility ABSENT from SciScatter, which rides ECharts marks);
//   • the MARQUEE — a parameterized arm via the `chart` ref the engine EXPOSES (ECharts `Brush`
//     on BreakEven vs a distinct co-filter / SelectionRegion on Sci — each plate wires its own off
//     the exposed `chart`, never an engine render-mode conditional);
//   • the readout BUILDER (`sciEntityReadout` / `usfStateReadout`) — the plate hands a ready
//     `HoverReadout | null` via the `readout` prop; the engine owns the publish/clear watch;
//   • the axis LABELS + the annotation placements + the legend slot.
//
// THE CARDINAL LAW (J-ARCH): a refactor moves CODE, not PIXELS. The chart-BODY render is
// byte-identical pre/post on BOTH scatters — the engine mounts the SAME `<VizPlate>` + host +
// overlay + lockups + chip + the `data-reveal-fan` keyframe the two plates carried inline.
import { computed, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import VizPlate from "@/charts/frame/VizPlate.vue";
import AxisNameLockup from "@/charts/legend/AxisNameLockup.vue";
import VizTextOverlay, {
    type VizPlacement,
} from "@/charts/legend/VizTextOverlay.vue";
import { useEChart } from "@/charts/composables/useEChart";
import { armMorphPush, withMorphIdentity } from "@/charts/morph";
import EChartOrnament from "@/charts/glyph/EChartOrnament.vue";
import { useHoverReadout, type HoverReadout } from "@/platform/stores/useHoverReadout";
import type { AxisLockup, VizContract } from "@/charts/contract/viz-contract";

const props = withDefaults(
    defineProps<{
        /** The viz contract (I2) the plate declares from its props — rendered whole by VizPlate. */
        contract: VizContract;
        /** The pure (rows, dials, palette) → EChartsOption derivation (the I-ARCH `useXOption`
            seam, passed in). The engine threads it into `useEChart` unchanged. */
        option: () => EChartsOption;
        /** Active view id. Changes are pushed once with morph animation; ordinary paints stay inert. */
        activeView?: string;
        /** Data-only repaint fingerprint. Deliberately excludes `activeView`. */
        fingerprint?: () => string;
        /** Selected mark keyed ornament; null leaves the chart unadorned. */
        ornamentKey?: string | null;
        /** Map a datum's ECharts params to its entity key (onHover + the highlight bridge). */
        keyOf: (params: unknown) => string | null;
        /** Stamp the hovered key + this plate's origin into the store (the owner-gate enter). */
        onHover: (key: string | null) => void;
        /** The plate's accessible host label (role=img) — the figure name. Named `figureLabel`
            (NOT `ariaLabel`) so Vue binds it as the PROP, not a fall-through native `aria-label`
            on the component root. */
        figureLabel: string;
        /** The host box CSS class (`chart-h-md` / `chart-h-lg`) — the plate's reserved height. */
        hostClass: string;
        /** The host `data-testid` (the e2e + body-parity selector). */
        testid: string;
        /** The styled x-axis lockup (the reserved bottom-gutter measure/unit). */
        xLockup: AxisLockup;
        /** The styled y-axis lockup (the reserved left-gutter measure/unit). */
        yLockup?: AxisLockup | null;
        /** The reserved-gutter insets the lockups seat against (the ECharts grid.left/bottom etc.,
            differing per plate — SciScatter 70/52, BreakEven 72/72). Each is the CSS length the
            lockup edge anchors to; omit ⇒ the SciScatter default (the common case). Applied as
            `--axis-*` CSS vars on the host `.relative` so the scoped lockup geometry reads them. */
        axisInsets?: Partial<{
            xBottom: string;
            xLeft: string;
            xRight: string;
            yLeft: string;
            yTop: string;
            yBottom: string;
        }>;
        /** The in-plate annotation chip placements (the hinge / break-even chip), each naming a
            `#<id>` slot the plate fills with a <VizAnnotation>. Empty ⇒ no chip. */
        annotationPlacements?: VizPlacement[];
        /** The READY readout payload the plate built (`sciEntityReadout`/`usfStateReadout`) for the
            live hovered datum, or null to clear. The engine owns the publish/clear watch + the
            owner-gate; the plate owns only the projection. */
        readout?: HoverReadout | null;
        /** The plate's stable hover ORIGIN (the owner-gate key — `clear` blanks only this origin). */
        origin: string;
    }>(),
    {
        annotationPlacements: () => [],
        readout: null,
        axisInsets: () => ({}),
        activeView: undefined,
        fingerprint: undefined,
        yLockup: null,
        ornamentKey: null,
    },
);

// The reserved-gutter insets → the `--axis-*` CSS vars the scoped lockup geometry reads (omitted
// keys fall back to the SciScatter default in the scoped CSS `var(…, <default>)`).
const axisInsetVars = computed<Record<string, string>>(() => {
    const i = props.axisInsets;
    const v: Record<string, string> = {};
    if (i.xBottom != null) v["--axis-x-bottom"] = i.xBottom;
    if (i.xLeft != null) v["--axis-x-left"] = i.xLeft;
    if (i.xRight != null) v["--axis-x-right"] = i.xRight;
    if (i.yLeft != null) v["--axis-y-left"] = i.yLeft;
    if (i.yTop != null) v["--axis-y-top"] = i.yTop;
    if (i.yBottom != null) v["--axis-y-bottom"] = i.yBottom;
    return v;
});

// ── THE HOST (the engine owns the `<div ref=host>` the chart mounts into — it owns the useEChart
// lifecycle, so it owns the host box that pairs with the lazy-mount deferral). The plate hands the
// box CLASS (`chart-h-md`/`chart-h-lg`) + the testid + the aria label as props; the engine reserves
// the sized box (no scroll-in CLS) and EXPOSES the chart so the plate projects its overlay/anchor. ──
const host = ref<HTMLElement | null>(null);

// ── THE useEChart LIFECYCLE (the shared host scaffold) — init on the host, the deferred lazy-mount
// paint (the host pre-sizes its box, no scroll-in CLS), the highlight/downplay bridge EXPOSED so
// the plate wires its shared-hover watch off it. The option/onHover/keyOf are the plate's forks. ──
const { chart, stageMorphOwned, highlight, downplay } = useEChart({
    host,
    option: () => {
        const option = props.option();
        const identity = props.contract.viewSet?.identity;
        return identity ? withMorphIdentity(option, identity) : option;
    },
    fingerprint: props.fingerprint ? () => props.fingerprint?.() ?? "" : undefined,
    onHover: (key) => props.onHover(key),
    keyOf: (params) => props.keyOf(params),
    // T-PERF-4 — defer init+paint to first viewport; the host box is pre-sized by `hostClass`.
    lazyMount: true,
});

watch(
    () => props.activeView,
    (active, previous) => {
        const set = props.contract.viewSet;
        if (
            stageMorphOwned ||
            !set ||
            active == null ||
            previous == null ||
            active === previous ||
            !chart.value
        ) return;
        chart.value.setOption(
            armMorphPush(withMorphIdentity(props.option(), set.identity), set.transition),
            { notMerge: true, lazyUpdate: true },
        );
    },
    { flush: "post" },
);

// ── d-hover M1·M3·M5 — the OWNER-GATED publish (the shared readout seam). The plate hands a ready
// `readout` payload (its own `sciEntityReadout`/`usfStateReadout` projection); the engine owns the
// publish/clear watch + the owner-gate (`publish` REJECTS a non-owner; `clear(origin)` blanks only
// this plate's payload). One law, the store's — the per-plate publish wiring folds here once. ──
const hoverReadout = useHoverReadout();
watch(
    () => props.readout,
    (r) => {
        if (!r) {
            hoverReadout.clear(props.origin);
            return;
        }
        hoverReadout.publish(r);
    },
    { immediate: true },
);

// EXPOSE the engine's chart + host + highlight/downplay bridge so the plate wires its forks (the
// marquee brush, the shared-hover highlight, the datum-anchor `convertToPixel` projection that
// needs the host's viewport rect) off the SAME instance — the parameterized-arm seam, never an
// engine render-mode conditional.
defineExpose({ chart, host, highlight, downplay });
</script>

<template>
    <!-- De-double-titled: the figure-number eyebrow + the visible title are the DashboardBody
         section's (the one Roman thread). VizPlate composes the frame internally + mounts the E2
         options trigger off `contract.options`; the `chart` ref is passed for the E3 canvas PNG
         export (getDataURL). A consumer `#legend` slot wins (the bespoke colour key). The ECharts
         BODY stays byte-identical (the split-baseline regression proof). -->
    <VizPlate :contract="contract" :chart="chart">
        <!-- SX-5 / DV-2 — the colour-channel key through the shared <ChartLegend> (the SOLE legend
             mechanism). The plate fills it: a diverging hinge tick, a magnitude ramp, or none. -->
        <template v-if="$slots.legend" #legend>
            <slot name="legend" />
        </template>
        <!-- Forward the #provenance facet slot WITH its scope (the GeoPlate.vue precedent — the
             same O-A9 residue class: VizPlate invokes it ONLY when the contract declares a
             provenance facet, so a scatter plate paints the source bar through the SAME slot a
             VizPlate plate does; absent a consumer fill, nothing changes). -->
        <template v-if="$slots.provenance" #provenance="slotProps">
            <slot name="provenance" v-bind="slotProps" />
        </template>
        <!-- Forward the #foot slot WITH its scope (the EX-70 find): VizPlate renders #foot as an
             UNCONDITIONAL sibling of the keyStats/provenance ternary, so a consumer can mount an
             inline source bar here WITHOUT setting `contract.provenance` — both the key-stats
             band and the provenance foot coexist. Absent a fill, nothing changes. -->
        <template v-if="$slots.foot" #foot="slotProps">
            <slot name="foot" v-bind="slotProps" />
        </template>
        <!-- C-FOLD-SCAT-8 (C.W5.4) — the marks FAN IN on beat-entry. A scatter is an ECharts
             CANVAS (animation:false), so the per-mark stagger cannot ride a CSS `view()` timeline
             (no per-mark DOM nodes): the faithful realization is the plate-level marks-fan — the
             whole field fades + lifts in on the beat's `view()` timeline (`data-reveal-fan` → the
             scoped keyframe below), un-fanning on scroll-up, bound to the SAME `--beat-tl`. The
             keyboard control persona + the optional <Glyph> overlay layer as siblings over the
             canvas in ONE `.relative` host. -->
        <div class="relative" :style="axisInsetVars">
            <div
                ref="host"
                :class="['w-full', hostClass]"
                role="img"
                :aria-label="figureLabel"
                :data-testid="testid"
                data-reveal-fan
            />
            <!-- THE OPTIONAL <Glyph> SVG OVERLAY SLOT (J-FEEDBACK-3 §1) — a BreakEvenScatter/
                 RankedStrip facility ABSENT from SciScatter. ECharts is the invisible hit+layout
                 layer; this absolutely-positioned overlay carries the VISIBLE silhouettes. The
                 plate owns the placement projection + the delegated pointer; the engine reserves
                 its slot. -->
            <slot name="overlay" />
            <EChartOrnament :chart="chart" :mark-key="ornamentKey" />
            <!-- F6.9 (#14) — THE STYLED AXIS-NAME LOCKUPS (the BreakEvenScatter/RankedStrip seam):
                 measure + recessive unit typeset in the reserved grid gutters. The gutter geometry
                 is the plate's skin (the `--axis-*` placement CSS); the MOUNT is the engine's. -->
            <AxisNameLockup
                class="scatter-axis scatter-axis--x"
                :measure="xLockup.measure"
                :unit="xLockup.unit"
                :pole="xLockup.pole"
                axis="x"
            />
            <AxisNameLockup
                v-if="yLockup"
                class="scatter-axis scatter-axis--y"
                :measure="yLockup?.measure ?? ''"
                :unit="yLockup?.unit"
                :pole="yLockup?.pole"
                axis="y"
            />
            <!-- F6.9 (#16) — THE ANNOTATION CHIP (the hinge / break-even chip): eyebrow + figure,
                 anchored at its data coord by the platform overlay (convertToPixel), lazy-mounted
                 to pair with the chart's deferral. The plate names a `#<id>` slot per placement
                 with its own <VizAnnotation> voice. Empty placements ⇒ no chip. -->
            <VizTextOverlay
                :chart="chart"
                :placements="annotationPlacements"
                :lazy-mount="true"
            >
                <template v-for="p in annotationPlacements" #[p.id]>
                    <slot :name="`annotation-${p.id}`" />
                </template>
            </VizTextOverlay>
            <!-- THE CONTROL PERSONA SLOT — the SelectionRegion keyboard listbox (SciScatter) layers
                 here as a sibling over the canvas (WCAG 4.1.2). A plate without a keyboard door
                 (the BreakEven overlay carries its own delegated pointer) fills nothing. -->
            <slot name="controls" />
        </div>
        <!-- D1.2 — NO per-viz HoverCard mount. The plate that OWNS the pointer PUBLISHES its
             readout payload (handed in as `readout`); the engine's watch deposits it to the ONE
             platform card. -->
    </VizPlate>
</template>

<style scoped>
/* F6.9 (#14) — the DOM axis-name lockups seated in the ECharts grid gutters. The gutter INSETS
   (`grid.left`/`grid.bottom`) differ per plate — SciScatter's 70/52, BreakEven's 64/72 — so the
   plate provides the concrete insets through the `--axis-*` CSS vars; the engine seats the lockup
   absolute + pointer-transparent (the canvas keeps the hover). A plate omitting a var falls back
   to the SciScatter inset (the common case). */
.scatter-axis {
    position: absolute;
    z-index: 1;
}
.scatter-axis--x {
    bottom: var(--axis-x-bottom, 4px);
    left: var(--axis-x-left, 70px); /* the grid.left inset — centre over the plot */
    right: var(--axis-x-right, 24px); /* the grid.right inset */
    text-align: center;
}
.scatter-axis--y {
    left: var(--axis-y-left, 4px);
    top: var(--axis-y-top, 16px); /* the grid.top inset */
    bottom: var(--axis-y-bottom, 52px); /* the grid.bottom inset — centre up the plot */
    display: flex;
    align-items: center;
    justify-content: center;
}

/* C-FOLD-SCAT-8 (C.W5.4) — the marks-FAN reveal, keyed to the beat's `view()` timeline. The
   scatter is a canvas (no per-mark DOM), so the fan is the plate-level field fading + lifting in
   as the beat enters — the compositor-only `{opacity, transform}` whitelist, zero JS. Bound to the
   SAME `--beat-tl` the map draw-on + the beat reveal ride (declared on the [data-reveal-beat] host
   section). The OUTER PRM `@media` is the structural fence — under reduced motion the block never
   binds and the field rests at its terminal (all marks present, opacity:1). The INNER `@supports`
   gates the native timeline; where it is absent the field simply rests present. The keyframe name
   is component-scoped by Vue, so this never collides with the map/line fans. */
@media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
        @keyframes scatter-fan {
            from {
                opacity: 0;
                transform: translate3d(0, 2.5vh, 0) scale(0.985);
            }
            to {
                opacity: 1;
                transform: translate3d(0, 0, 0) scale(1);
            }
        }
        [data-reveal-fan] {
            animation: scatter-fan auto linear both;
            animation-timeline: --beat-tl;
            /* Fan in over the entry-anchored span (F6 §2.4 recut — `entry 6% → entry 24%`) so the
               field is settled as it enters — bidirectional on the position timeline. */
            animation-range: entry 6% entry 24%;
        }
    }
}
</style>
