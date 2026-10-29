// charts/composables/useXFacts.ts — the per-x facts hook for the line marks (U/B7c C1; sci T1/T2).
//
// A trend line's hover reads a PERIOD, not an entity: the reader points at a school year (or a
// month) and wants that period's facts (units, enrollment, bandwidth per student), the workbook's
// tooltip. TimeSeries and the MultiYearFigure family take a `factsAt(x)` hook; the pointer anywhere
// over the plot snaps to the nearest drawn x, the hook returns that x's card, and the mark publishes
// it through the one hover-readout store (the platform HoverCard renders it, anchored at the
// period's point on the first line). Leaving the plot, or an x the hook declines (null), clears it.
import { onBeforeUnmount, watch, type Ref } from "vue";
import type { EChartsType } from "echarts/core";
import type { Fact } from "../../interaction/HoverCard.vue";
import type { LineSeries } from "../marks/TimeSeries.vue";
import { useHoverReadout } from "../../platform/stores/useHoverReadout.js";
import { useSelection } from "../../platform/stores/useSelection.js";

/** One period's hover card. */
export interface XFacts {
    /** The period, as the reader reads it ("2025–26", "Sep 2025"). */
    title: string;
    subhead?: string;
    facts: Fact[];
    /** The dataset names the rows come from (the card's foot, O-19). */
    sources?: string[];
}

/** The hook: the card for one drawn x, or null for an x with nothing to say. */
export type FactsAt = (x: number) => XFacts | null;

/** The drawn x nearest to `x` (over every series' points with a value), or null when none. */
export function nearestX(series: readonly LineSeries[], x: number): number | null {
    let best: number | null = null;
    for (const s of series)
        for (const p of s.points) {
            if (p.y == null || !Number.isFinite(p.y)) continue;
            if (best === null || Math.abs(p.x - x) < Math.abs(best - x)) best = p.x;
        }
    return best;
}

/** The y the card anchors on: the first series with a value at `x`. */
function anchorY(series: readonly LineSeries[], x: number): number | null {
    for (const s of series) {
        const p = s.points.find((q) => q.x === x && q.y != null && Number.isFinite(q.y));
        if (p) return p.y as number;
    }
    return null;
}

export function useXFacts(opts: {
    chart: Ref<EChartsType | null>;
    host: Ref<HTMLElement | null>;
    series: () => readonly LineSeries[];
    factsAt: () => FactsAt | undefined;
    origin: () => string;
}): void {
    const selection = useSelection();
    const readout = useHoverReadout();
    let current: number | null = null;
    let detach: (() => void) | null = null;

    function leave(): void {
        if (current === null) return;
        current = null;
        selection.hover(null, opts.origin());
        readout.clear(opts.origin());
    }

    function move(e: { offsetX: number; offsetY: number }): void {
        const chart = opts.chart.value;
        const hook = opts.factsAt();
        if (!chart || !hook) return;
        const at = [e.offsetX, e.offsetY];
        if (!chart.containPixel({ gridIndex: 0 }, at)) return leave();
        const [raw] = chart.convertFromPixel({ gridIndex: 0 }, at) as number[];
        const x = nearestX(opts.series(), raw);
        if (x === null) return leave();
        if (x === current) return;
        const card = hook(x);
        if (!card) return leave();
        current = x;
        const origin = opts.origin();
        const y = anchorY(opts.series(), x);
        const rect = opts.host.value?.getBoundingClientRect();
        const px = y === null ? null : (chart.convertToPixel({ gridIndex: 0 }, [x, y]) as number[]);
        selection.hover(`x:${x}`, origin);
        readout.publish({
            origin,
            title: card.title,
            subhead: card.subhead,
            facts: card.facts,
            sources: card.sources,
            anchor: rect && px ? { x: rect.left + px[0], y: rect.top + px[1] } : null,
            density: "compact",
        });
    }

    watch(
        [opts.chart, () => Boolean(opts.factsAt())],
        ([chart, on]) => {
            detach?.();
            detach = null;
            if (!chart || !on) return leave();
            const zr = chart.getZr();
            zr.on("mousemove", move);
            zr.on("globalout", leave);
            detach = () => {
                zr.off("mousemove", move);
                zr.off("globalout", leave);
            };
        },
        { immediate: true },
    );

    onBeforeUnmount(() => {
        detach?.();
        leave();
    });
}
