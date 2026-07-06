// platform/charts/trajectory-marks.ts — THE M4 BOUNDARY-MARK VOCABULARY (H.W2.a).
//
// The ONE shared primitive vocabulary the multi-year crown family (M1 TrajectoryPlate,
// M2 WindowArcPlate, M3 MultiYearFigure) draws its marks from — so the rivet, the cycle
// bracket, and the boundary drop-rule read as ONE convention across the 10/12/3-year
// depths (`design-multiyear-viz-system` SEAM-3 + `fd-cross-route-coherence`). No route
// hand-rolls a mark; every crown asks for the SAME shapes here.
//
// THE FOUR MARK FORMS (each a pure ECharts option fragment — the canvas marks — PLUS a
// matching DOM marker the gate's crown-mark selector reads; see the belt-and-suspenders
// note below):
//   · markPointRivet  — the active-year PEAK RIVET (the crown's identity mark, teal).
//   · markAreaBand    — the CYCLE BRACKET / window-arc shaded span (a two-point band).
//   · dropRule        — a vertical boundary MarkLine (forecast | oversub | partial voice),
//                       reusing TimeSeries' EXACT rich-text run recipe (the `{yr|}{lab|}`
//                       Fira-tabular year + caps-eyebrow runs).
//
// THE BELT-AND-SUSPENDERS DOM MARKER (the gate's crown-mark count, h0-multiyear.spec.ts:78-80).
// The gate counts crown marks off `[class*="markPoint"]…` OR `[data-mark-rivet]/-bracket/-rule`.
// An ECharts CANVAS mark surfaces no SVG class (the canvas renderer paints to a bitmap), so the
// crown ALSO stamps a tiny DOM marker node per mark form — `TrajectoryMarkerKind` →
// `data-mark-{rivet,bracket,rule}` — so the count is robust whether the chart renders as SVG or
// canvas. The DOM markers are aria-hidden, zero-size overlay nodes (no visual weight); the REAL
// mark is the ECharts option fragment. This module owns BOTH halves so the family shares one
// vocabulary, never two parallel definitions.
//
// THE CANVAS-COLOUR LAW (T-4): every colour handed into a mark fragment must be a RESOLVED rgb
// string (the `useVizPalette` bridge / a `--route-accent`-resolved teal), NEVER a raw `var(--…)`
// — the canvas cannot read a CSS var. The consumer (M1/M2/M3) resolves the token and passes the
// concrete string in; this module never reads the cascade itself (it is pure).

/** A trajectory mark's family role — selects its DOM marker attribute + its semantic. */
export type TrajectoryMarkerKind = "rivet" | "bracket" | "rule";

/** The drop-rule's editorial VOICE — chooses the tint + the caps-eyebrow label (the same
    three-voice register TimeSeries' boundary markLine builds: a forecast boundary, an
    over-subscription crossing, or a partial-year data-completeness slot). */
export type DropRuleKind = "forecast" | "oversub" | "partial";

// ─────────────────────────────────────────────────────────────────────────────
// THE MARK-POINT RIVET — the active-year peak rivet (the crown's identity mark).
// ─────────────────────────────────────────────────────────────────────────────

/** One ECharts `markPoint` datum riveting a single (x, y) on the trajectory — the teal
    active-year peak rivet. The colour is a RESOLVED rgb the caller passes (the
    `--route-accent` teal signal, the "one signal, one clock"); the symbol is a filled pin
    so the rivet reads as a deliberate annotation, not a fourth data point. */
export interface MarkPointRivetSpec {
    /** the x (the active year) the rivet sits at. */
    x: number;
    /** the y (the lead measure's value at the active year). */
    y: number;
    /** the RESOLVED teal signal rgb (never a raw `var(--…)` — the canvas-colour law). */
    color: string;
    /** an optional short label riding the rivet (e.g. the active year). */
    label?: string;
}

/** Build the `markPoint` option fragment for the active-year rivet. The datum is `coord`-
    anchored (the value space, so it rides the data, not a pixel), a small filled pin in the
    resolved teal, silent (it never steals the hover — the lines own interaction). */
export function markPointRivet(spec: MarkPointRivetSpec): Record<string, unknown> {
    return {
        silent: true,
        symbol: "pin",
        symbolSize: 18,
        data: [
            {
                coord: [spec.x, spec.y],
                itemStyle: { color: spec.color, opacity: 0.9 },
                ...(spec.label != null
                    ? {
                          label: {
                              show: true,
                              formatter: spec.label,
                              fontFamily: "Fira Code",
                              fontWeight: 600,
                              fontSize: 9,
                              color: "#fff",
                          },
                      }
                    : { label: { show: false } }),
            },
        ],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MARK-AREA BAND — the cycle bracket / window-arc shaded span.
// ─────────────────────────────────────────────────────────────────────────────

/** A two-point `markArea` band spanning `[fromX, toX]` on the x-axis — the cycle bracket
    that brackets the measured window (the window-arc's shaded span). The fill is faint (the
    band is read, not a competing figure); the colour is a RESOLVED rgb the caller passes. */
export interface MarkAreaBandSpec {
    fromX: number;
    toX: number;
    /** the RESOLVED band fill rgb (the muted/teal chrome, never a raw `var(--…)`). */
    color: string;
    /** the faint fill opacity (default 0.08 — a recessive bracket, never a solid block). */
    opacity?: number;
}

/** Build the `markArea` option fragment for the cycle bracket. The area is a vertical band
    over the full y-range between `fromX` and `toX` (`yAxis` omitted ⇒ floor-to-ceiling),
    silent, faint — the window the trajectory continuously covers. */
export function markAreaBand(spec: MarkAreaBandSpec): Record<string, unknown> {
    return {
        silent: true,
        itemStyle: { color: spec.color, opacity: spec.opacity ?? 0.08 },
        data: [[{ xAxis: spec.fromX }, { xAxis: spec.toX }]],
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE DROP-RULE — a vertical boundary MarkLine (forecast | oversub | partial voice),
// reusing TimeSeries.vue:268-300's EXACT rich-text run recipe (the `{yr|}{lab|}` runs).
// ─────────────────────────────────────────────────────────────────────────────

/** A vertical boundary drop-rule at year `x` — the forecast boundary, the over-subscription
    crossing, or the partial-year slot. Reuses TimeSeries' in-canvas rich-text run recipe: a
    Fira-tabular `{yr|}` year run + a `{lab|}` caps eyebrow run, voiced by `kind`. */
export interface DropRuleSpec {
    /** the x (year) the rule sits at. */
    x: number;
    /** the eyebrow label run (e.g. "forecast", "over ceiling", "partial"). */
    label: string;
    /** the RESOLVED rule rgb (the diverging pole for oversub, the muted for partial/forecast). */
    color: string;
    /** the editorial voice — forecast (dashed, → glyph) | oversub (solid, → glyph) | partial (dashed). */
    kind: DropRuleKind;
    /** an optional pre-formatted year string (e.g. via a route's xFormat); defaults to `x`. */
    yearText?: string;
}

/** Build ONE `markLine` datum (a vertical rule + its rich-text label) for a boundary. The
    forecast/oversub voices carry the `→` directional glyph (the boundary points forward in
    time); the partial voice is the neutral data-completeness slot. The caller collects these
    data into one markLine (`{ silent, symbol:"none", data:[…] }`) — the SAME shape TimeSeries
    already builds, so the two paths share one mark vocabulary. */
export function dropRule(spec: DropRuleSpec): Record<string, unknown> {
    const dashed = spec.kind !== "oversub";
    const yr = spec.yearText ?? String(spec.x);
    const arrow = spec.kind === "partial" ? "" : "{arr|  →}";
    return {
        xAxis: spec.x,
        lineStyle: {
            color: spec.color,
            type: dashed ? "dashed" : "solid",
            width: 1,
            opacity: spec.kind === "partial" ? 0.6 : 0.7,
        },
        label: {
            formatter: `{yr|${yr}}{lab|  ${spec.label}}${arrow}`,
            position: spec.kind === "oversub" ? "insideStartTop" : "insideEndTop",
            rich: {
                yr: {
                    fontFamily: "Fira Code",
                    fontWeight: 500,
                    fontSize: 11,
                    color: spec.color,
                },
                lab: {
                    fontFamily: "Fira Code",
                    fontWeight: 600,
                    fontSize: 9,
                    color: spec.color,
                },
                arr: {
                    fontFamily: "Fira Code",
                    fontWeight: 600,
                    fontSize: 11,
                    color: spec.color,
                },
            },
        },
    };
}

/** Collect one or more `dropRule` data into the single markLine option a series carries (the
    same `{ silent, symbol:"none", data }` envelope TimeSeries builds). Returns `undefined`
    when no rules are passed (so the series simply omits `markLine`). */
export function dropRuleMarkLine(
    rules: Record<string, unknown>[],
): Record<string, unknown> | undefined {
    return rules.length > 0
        ? { silent: true, symbol: "none" as const, data: rules }
        : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE FORECAST / OVER-SUBSCRIPTION BOUNDARY X — the named span boundaries.
// ─────────────────────────────────────────────────────────────────────────────

/** `forecastBoundaryX` — the x where measured years end and the projected tail begins (the
    dashed boundary drop-rule, "2027 →"). The default boundary is ONE year past the latest
    real year of the measure's trajectory — the seam where measured becomes projected. A
    consumer may override; this is the family's default convention. */
export function forecastBoundaryX(latestRealYear: number): number {
    return latestRealYear + 1;
}

/** `overSubscriptionX` — the band-sign crossing where the trajectory's lead measure first met
    its ceiling. This is the SAME shape TimeSeries already takes as a prop (TimeSeries.vue:160),
    surfaced here so M3 can forward the SAME value the two mark paths share. Given a per-year
    series of `(year, value)` and a per-year `ceiling`, returns the FIRST year value ≥ ceiling,
    or `undefined` if the trajectory never crossed. */
export function overSubscriptionX(
    points: { year: number; value: number | null; ceiling: number | null }[],
): number | undefined {
    for (const p of points) {
        if (p.value != null && p.ceiling != null && p.value >= p.ceiling) return p.year;
    }
    return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE DOM MARKER (belt-and-suspenders — the gate's crown-mark selector reads these).
// ─────────────────────────────────────────────────────────────────────────────

/** The `data-mark-*` attribute name for a mark kind — the DOM marker the crown stamps so the
    gate's crown-mark count surfaces even off a canvas mark (which has no SVG class). */
export function markerAttr(kind: TrajectoryMarkerKind): string {
    return `data-mark-${kind}`;
}
