// platform/composables/useVizOverlay.ts — THE .viz-overlay CHART-HERO PROJECTOR (K-ANIM A2 ·
// proto/A2-catalog.md §5 · NOT a new ChartFrame seam).
//
// The GENERALIZATION of RankedStrip.vue:232-284 (`reanchorGlyphs`) from glyph silhouettes to <path>/
// <polyline> hero leaves. Called in the CHART-bearing component (which owns useEChart AND the <svg ref>
// in its OWN template, INSIDE the ChartFrame slot — so the SVG Teleports WITH the canvas on expand, the
// strand-fix). It projects each declared leaf's data-space points to PIXEL space via `convertToPixel`,
// and re-anchors on the host chart's readiness primitive (useEChart, U RULINGS §J J-1): it projects only
// while the chart is `settled` (in a lazy paint window `convertToPixel` answers `undefined`) and re-runs
// on its `frame` clock (every `finished`); plus the SHIPPED `EXPAND_SETTLE_KEY` tick (the re-parent
// reanchor — NO new seam) and a ResizeObserver (non-expand resizes). No private `finished` subscription
// and no try/catch: useEChart owns the one `finished` site. Coarse signals only — the geometry is
// re-derived when the GRID moves, NEVER per scroll-tick; the catalog's draw scrub then drives the stroke
// off the STABLE projected `d`. ChartFrame is byte-UNTOUCHED.

import { inject, watch, onBeforeUnmount, type Ref } from "vue";
import type { EChartReadiness } from "./useEChart.js";
import { EXPAND_SETTLE_KEY } from "../scene/expand-settle.js"; // the SHIPPED seam — consumed, not re-minted

/** A declared hero leaf — a class hook + a thunk producing its data-space points (re-projected to pixels
    each reanchor). `as` is the SVG tag. The data-space points: [[seriesIndex,[x,y]],…]. */
export interface OverlayLeaf {
    /** the catalog target hook, e.g. "hero-line" → ".viz-overlay .hero-line". */
    className: string;
    as: "path" | "polyline";
    points: () => Array<[number, [number, number]]>;
}

export function useVizOverlay(
    echart: EChartReadiness,
    svgRef: Ref<SVGSVGElement | null>,
    leaves: OverlayLeaf[],
): void {
    function project(): void {
        const svg = svgRef.value;
        const ec = echart.chart.value;
        if (!svg || !ec || !echart.settled.value) return; // no chart, no svg, or a paint in flight: hold
        for (const leaf of leaves) {
            let el = svg.querySelector<SVGGeometryElement>(`.${leaf.className}`);
            if (!el) {
                el = document.createElementNS("http://www.w3.org/2000/svg", leaf.as);
                el.classList.add(leaf.className);
                el.setAttribute("fill", "none");
                el.setAttribute("stroke", "currentColor"); // the data hue flows from the host CSS
                svg.appendChild(el);
            }
            // The overlay shares the canvas box (inset:0 sibling), so convertToPixel px == SVG user-units (1 unit = 1px).
            const px: Array<[number, number]> = [];
            for (const [si, v] of leaf.points()) {
                const p = ec.convertToPixel({ seriesIndex: si }, v) as [number, number] | undefined;
                if (Array.isArray(p)) px.push(p);
            }
            if (px.length < 2) {
                el.removeAttribute("d");
                el.removeAttribute("points");
                continue; // not enough anchors yet — clear, don't draw a stale stroke
            }
            if (leaf.as === "polyline") {
                el.setAttribute("points", px.map(([x, y]) => `${x},${y}`).join(" "));
            } else {
                el.setAttribute(
                    "d",
                    `M ${px.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`,
                );
            }
        }
    }

    // THE REANCHOR CLOCK: the host chart's `frame` (every `finished`), the expand tick, a resize.
    watch(() => echart.frame.value, project, { immediate: true });
    const settle = inject(EXPAND_SETTLE_KEY, undefined); // the SHIPPED expand-settle tick — no new seam
    if (settle) watch(settle.tick, project);
    let ro: ResizeObserver | null = null;
    watch(
        svgRef,
        (el) => {
            ro?.disconnect();
            if (el && typeof ResizeObserver !== "undefined") {
                ro = new ResizeObserver(() => project());
                ro.observe(el);
            }
        },
        { immediate: true },
    );
    onBeforeUnmount(() => {
        ro?.disconnect();
    });
}
