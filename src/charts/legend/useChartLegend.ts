// charts/legend/useChartLegend.ts — the ITEM-LAYOUT derivation off the ChartLegend render
// (O-B4R god-split of `ChartLegend.vue`, §A.9). The ramp/stepped `background` builders, the
// hairline seam overlay, the hinge/mid tick positions, and the mode predicates — the pure
// reactive derivation the SFC template binds, moved verbatim. The SFC keeps the `LegendChip`
// contract + the props; this owns the render math (the ChartFrame/VizPlate host+composable
// pattern the B4 wave names).

import { computed, type ComputedRef } from "vue";
import { colorKindStops, type ColorKind } from "@/charts/scale/colorKind";

/** The reactive inputs the legend derivation reads — the structural subset of the SFC props
    (so `withDefaults(defineProps<…>())` is assignable without a type cycle back into the SFC). */
export interface ChartLegendInputs {
    mode: "continuous" | "discrete" | "stepped";
    layout?: "chips" | "ledger";
    colorKind?: ColorKind;
    hinge: number;
    gradient?: string;
    chips?: readonly { color: string }[];
    midPosition?: number;
}

/** The named return surface (the `UseXReturn` floor) — the eight derived bindings the template reads. */
export interface UseChartLegendReturn {
    rampBackground: ComputedRef<string>;
    steppedBackground: ComputedRef<string>;
    steppedSeams: ComputedRef<string>;
    hingeLeft: ComputedRef<string>;
    midLeft: ComputedRef<string>;
    isContinuous: ComputedRef<boolean>;
    isStepped: ComputedRef<boolean>;
    isLedger: ComputedRef<boolean>;
}

export function useChartLegend(props: ChartLegendInputs): UseChartLegendReturn {
    // The continuous ramp's `background` — an explicit `gradient` wins, else the kind's stops
    // (the SAME `colorKind.ts` source the dropped-cap glyph reads) laid left→right (the legend
    // reads base/low at the LEFT, apex/high at the RIGHT, so the up-the-glyph crown→foot stops
    // are reversed: foot/low → crown/high as offset grows). Resolved late by the cascade so a
    // theme flip retunes the bar from the locus.
    const rampBackground = computed<string>(() => {
        if (props.gradient) return props.gradient;
        const kind = props.colorKind ?? "diverging";
        // colorKindStops runs crown(0)→foot(100); the horizontal bar reads low/base at the left,
        // so we map each stop's UP-the-glyph offset to its LEFT-to-RIGHT position (100 − offset).
        const stops = colorKindStops(kind, props.hinge)
            .map((s) => ({ pos: 100 - s.offset, color: s.color }))
            .sort((a, b) => a.pos - b.pos);
        const css = stops.map((s) => `${s.color} ${s.pos}%`).join(", ");
        return `linear-gradient(90deg, ${css})`;
    });

    // The STEPPED bar's `background` — N verbatim chips laid as ADJOINING hard steps (each colour
    // occupies its equal-width slot with a hard stop at both edges — `c 0% 7.14%, c 7.14% 14.3%…`),
    // so the bar shows the QUANTIZATION (a stepped scale, NEVER an interpolated fade — FD1 §3.3
    // honored by geometry). The hairline `--engrave` seams are drawn as a second layer (below).
    const steppedBackground = computed<string>(() => {
        const list = props.chips ?? [];
        const n = list.length;
        if (n === 0) return "transparent";
        const segs: string[] = [];
        list.forEach((c, i) => {
            const a = (i / n) * 100;
            const b = ((i + 1) / n) * 100;
            segs.push(`${c.color} ${a}% ${b}%`);
        });
        return `linear-gradient(90deg, ${segs.join(", ")})`;
    });

    /** The stepped bar's hairline SEAM overlay — a thin `--engrave` tick at every internal step
        boundary, so the eye SEES the bar is quantized into N tiers (the editorial tell). */
    const steppedSeams = computed<string>(() => {
        const n = (props.chips ?? []).length;
        if (n <= 1) return "none";
        const seamColor = "color-mix(in oklab, var(--engrave, currentColor), transparent 35%)";
        const lines: string[] = [];
        for (let i = 1; i < n; i++) {
            const pos = (i / n) * 100;
            // a 1px-ish hairline centred on each boundary (transparent either side).
            lines.push(
                `linear-gradient(90deg, transparent calc(${pos}% - 0.5px), ${seamColor} calc(${pos}% - 0.5px), ${seamColor} calc(${pos}% + 0.5px), transparent calc(${pos}% + 0.5px))`,
            );
        }
        return lines.join(", ");
    });

    /** The hinge tick's left position as a percent (the hinge fraction along the bar). */
    const hingeLeft = computed(() => `${Math.min(0.95, Math.max(0.05, props.hinge)) * 100}%`);

    /** The stepped mid-anchor's left position as a percent (the declared boundary, e.g. 1 Gb/s). */
    const midLeft = computed(() =>
        props.midPosition == null
            ? "50%"
            : `${Math.min(0.96, Math.max(0.04, props.midPosition)) * 100}%`,
    );

    const isContinuous = computed(() => props.mode === "continuous");
    const isStepped = computed(() => props.mode === "stepped");
    const isLedger = computed(() => props.mode === "discrete" && props.layout === "ledger");

    return {
        rampBackground,
        steppedBackground,
        steppedSeams,
        hingeLeft,
        midLeft,
        isContinuous,
        isStepped,
        isLedger,
    };
}
