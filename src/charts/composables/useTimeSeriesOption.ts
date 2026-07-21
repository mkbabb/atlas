// platform/charts/composables/useTimeSeriesOption.ts — the SHARED line-primitive option builder
// (I-ARCH.AR-8 · the platform-side mirror of the feature-side useXOption convention). TimeSeries is
// a PLATFORM chart primitive (many consumers — the SCI utilization plate, the MultiYearFigure
// family, StackedBar's sibling), so its option-assembly extracts to `platform/charts/composables/`
// (the §Y "shared → platform" arm), NOT a colocated feature dir.
//
// THE PURE DERIVATION — `(series, dials, palette) → EChartsOption`. No Vue refs, no side-effects;
// the same inputs always yield the same option (the byte-identical parity proof). The derivation is
// the EXACT inline TimeSeries assembly (the E15a ceiling reserve, the band-emphasis figure/ground
// inversion, the partial-year clamp, the over-subscription crossing, the forecast boundary, the
// band-sign invariant) — moved, not rewritten. The resolved chrome inks the canvas cannot read are
// threaded through `palette` (the T-4 canvas-colour bridge), the boundary/crown x's + the formatters
// through `dials`.

import type { EChartsOption } from "echarts";
import { VIZ_GRID_CROWN } from "../lib/grid.js";
import type { VizPalette } from "./useVizPalette.js";
import { boundedBlur } from "../scale/emphasis-policy.js";
import { useTrendline } from "./useTrendline.js";
import { dropRule } from "../marks/trajectory-marks.js";
import { BOUNDARY_AXIS, type LineSeries, type SeriesPoint } from "../marks/TimeSeries.vue";
import {
    dashedHairline,
    recessedBaseline,
    directEndLabel,
    END_LABEL_ON_PLOT,
} from "../contract/chartRecipe.js";

/** THE PLOT-TRACK FLOOR (A-04 · the L4 law — a mark never renders below its legibility floor, and
    below it the OWNING mark changes strategy, never the consumer). The px a line needs between the
    DECLARED insets to read as a trajectory rather than a sliver (`containLabel` reserves the axis
    labels ON TOP of these, so the drawn track is narrower still — the floor is the trigger, the
    collapse is the cure). A fixed end-label gutter (a consumer's 96) is a DESKTOP declaration: at a
    phone measure it eats the plot to a stub, so the gutter collapses to the crown's own inset and
    the terminal labels move ONTO the lines (`END_LABEL_ON_PLOT`). An OWNED constant — the floor is
    the mark's, never an option a dashboard sets. */
const PLOT_TRACK_FLOOR_PX = 240;

/** THE FLOOR PREDICATE — does the declared end-label gutter leave the plot below its track floor?
    The option builder reads it for the grid + the terminal-label seat; the MARK reads it for its
    re-paint fingerprint (the `useEChart` fast-path watches the digest, so a floor crossing must
    move that string or the collapse would compute without painting). An unmeasured host (0) is
    never below the floor — the declared gutter renders verbatim (SSR/jsdom byte-parity). */
export function endLabelGutterCollapsed(
    hostWidth: number | undefined,
    gridRight: number | undefined,
): boolean {
    if (!hostWidth || hostWidth <= 0) return false;
    const right = gridRight ?? (VIZ_GRID_CROWN.right as number);
    return hostWidth - (VIZ_GRID_CROWN.left as number) - right < PLOT_TRACK_FLOOR_PX;
}

import {
    niceCeil,
    timeSeriesXAxisValues,
    pinnedTickSpec,
    type TimeSeriesDials,
} from "./timeSeriesAxis.js";
export {
    niceCeil,
    niceFloor,
    timeSeriesXAxisValues,
    pinnedTickSpec,
    type TimeSeriesDials,
} from "./timeSeriesAxis.js";

/** THE PURE OPTION BUILDER — `(series, dials, palette) → EChartsOption`. No refs, no side-effects. */
export function buildTimeSeriesOption(
    series: LineSeries[],
    dials: TimeSeriesDials,
    palette: VizPalette,
): EChartsOption {
    const xAxisValues = timeSeriesXAxisValues(series, dials.partialYearX);

    // THE CEILING RESERVE (E15a · the symmetric mirror of the min:0 floor) — nice-round of
    // `dataMax × 1.08` so the topmost datum always clears the bezel by a tick. STACK-AWARE — a
    // `bandEmphasis` band stacks ON its baseline, so the rendered top is the per-x STACKED SUM.
    const yCeiling = (() => {
        const stackedByX = new Map<string, Map<number, number>>(); // stackId → (x → Σy)
        let looseMax = 0;
        for (const s of series) {
            const drop = dials.partialYearX;
            for (const p of s.points) {
                if (p.y == null || !Number.isFinite(p.y)) continue;
                if (drop != null && p.x === drop) continue; // the clamped partial year never sets the crown
                if (s.stack) {
                    let byX = stackedByX.get(s.stack);
                    if (!byX) stackedByX.set(s.stack, (byX = new Map()));
                    byX.set(p.x, (byX.get(p.x) ?? 0) + p.y);
                } else if (p.y > looseMax) {
                    looseMax = p.y;
                }
            }
        }
        let dataMax = looseMax;
        for (const byX of stackedByX.values()) {
            for (const sum of byX.values()) if (sum > dataMax) dataMax = sum;
        }
        return niceCeil(dataMax * 1.08);
    })();

    // THE BAND-EMPHASIS ROLE (fw-sci FW-III) — if any series declares `bandEmphasis`, the form
    // inverts: the gap band fills at figure weight and every plain line RECEDES to reference weight.
    const bandIsSubject = series.some((s) => s.bandEmphasis);
    // THE PARTIAL-YEAR CLAMP — a gated terminal year is dropped from every drawn line/band.
    const drop = dials.partialYearX;
    const clampPoints = (pts: SeriesPoint[]): SeriesPoint[] =>
        drop == null ? pts : pts.filter((p) => p.x !== drop);
    // The annotated boundary rules — the partial-year gate AND the over-subscription crossing —
    // ride ONE markLine on the first drawn series.
    const crossX = dials.overSubscriptionX;
    const markLineData: Array<Record<string, unknown>> = [];
    if (drop != null) {
        // F6.9 (§2.2a) — the YEAR in Fira-tabular figure ink + the `· partial` caption in a
        // recessive Fira-caps eyebrow run. NEUTRAL voice (a data-completeness boundary, muted).
        markLineData.push({
            xAxis: drop,
            lineStyle: {
                color: palette.muted,
                type: "dashed",
                width: 1,
                opacity: 0.6,
            },
            label: {
                formatter: `{yr|${dials.xFormat ? dials.xFormat(drop) : drop}}{lab|  partial}`,
                position: "insideEndTop",
                rich: {
                    yr: {
                        fontFamily: palette.fontMono,
                        fontWeight: 500,
                        fontSize: 11,
                        color: palette.muted,
                    },
                    lab: {
                        fontFamily: palette.fontMono,
                        fontWeight: 600,
                        fontSize: 9,
                        color: palette.muted,
                    },
                },
            },
        });
    }
    if (crossX != null) {
        // F6.9 (§2.2a · §5 R4) — the over-subscription crossing is the EDITORIAL voice: the YEAR
        // figure + a Fira-caps eyebrow + the `→` glyph, all in the warm diverging pole (the
        // threshold's own meaning). The pole tint is a DISCRETE editorial role.
        // A-03 · THE CROSSING SPEAKS ITS OWN WORDS. The eyebrow run was hardwired to `over ceiling`
        // — SCI's capacity semantics narrating every route's crossing — while `dropRule` one layer
        // down already took the run as a parameter. The hand-rolled twin is DELETED for that
        // extant recipe (the `oversub` voice is byte-identical to what stood here), and the label
        // is the declarer's, defaulting to SCI's own words so its render is unmoved.
        markLineData.push(
            dropRule({
                x: crossX,
                label: dials.overSubscriptionLabel ?? "over ceiling",
                color: palette.diverging.low,
                fontMono: palette.fontMono,
                kind: "oversub",
                yearText: dials.xFormat ? dials.xFormat(crossX) : String(crossX),
            }),
        );
    }
    // THE FORECAST BOUNDARY (H.W2.a M2) — the dashed `forecast →` drop-rule joins the
    // partial/over-subscription rules on the SAME boundary markLine, built through the M4 recipe.
    if (dials.forecastBoundaryX != null) {
        markLineData.push(
            dropRule({
                x: dials.forecastBoundaryX,
                label: "forecast",
                color: palette.muted,
                fontMono: palette.fontMono,
                kind: "forecast",
                yearText: dials.xFormat
                    ? dials.xFormat(dials.forecastBoundaryX)
                    : String(dials.forecastBoundaryX),
            }),
        );
    }
    const boundaryMarkLine =
        markLineData.length > 0
            ? { silent: true, symbol: "none" as const, data: markLineData }
            : undefined;
    // THE EXTERNAL markLine FRAGMENT (the markPoint/markArea sibling) — a ready ECharts fragment the
    // consumer hands whole (the VFT survival overlay). When an internal boundary rule is ALSO present
    // the two `data` arrays concat onto ONE markLine (a single series can carry only one); otherwise
    // whichever is present rides the first series. Defensive: the germination figure carries no
    // boundary dial, so `mergedMarkLine === externalMarkLine` (it keeps its own silent/symbol/label).
    const externalMarkLine = dials.markLine as
        | { data?: unknown[]; [k: string]: unknown }
        | undefined;
    const mergedMarkLine =
        boundaryMarkLine && externalMarkLine
            ? {
                  silent: true,
                  symbol: "none" as const,
                  data: [
                      ...markLineData,
                      ...((externalMarkLine.data as unknown[]) ?? []),
                  ],
              }
            : (boundaryMarkLine ?? externalMarkLine);
    let markLinePlaced = false;
    // The crown's peak-rivet (markPoint) + cycle-bracket (markArea) ride the FIRST drawn series.
    let crownMarksPlaced = false;
    // ── A-04 · THE END-LABEL GUTTER FLOOR ────────────────────────────────────────────────────────
    // The declared gutter holds while the plot clears `PLOT_TRACK_FLOOR_PX`; below it the reserve
    // COLLAPSES to the crown's own inset and the terminal labels seat ON the lines. Keyed to the
    // MEASURED host box (a mark in a narrow column collapses exactly like a mark on a phone), never
    // a viewport media query; an unmeasured host (SSR/jsdom/pre-measure) keeps the declared gutter.
    const declaredRight = dials.gridRight ?? (VIZ_GRID_CROWN.right as number);
    const gutterCollapsed = endLabelGutterCollapsed(dials.hostWidth, dials.gridRight);
    const built = series.flatMap((s) => {
        // A SHADED BAND series carries a fill + a stack baseline and is recessive; a plain line is
        // a 2px stroke with no fill. (FD4 §3.1 / B3.1.)
        const isBand = s.areaStyle != null;
        // When the band is the subject, a non-band line is REFERENCE: it thins to 1px and dims.
        const recede = bandIsSubject && !isBand;
        // The emphasised band fills at figure weight — the named ~0.22 floor; a non-emphasised band
        // keeps its faint default.
        const bandOpacity = s.bandEmphasis
            ? (s.areaStyle?.opacity ?? 0.22)
            : (s.areaStyle?.opacity ?? 0.1);
        const attachMark = mergedMarkLine != null && !markLinePlaced;
        if (attachMark) markLinePlaced = true;
        const attachCrown =
            !crownMarksPlaced && (dials.markPoint != null || dials.markArea != null);
        if (attachCrown) crownMarksPlaced = true;
        // THE BAND-SIGN INVARIANT (E15b) — a band's drawn height is `max(0, y)`, so it NEVER fills
        // downward. A plain line is unguarded (a line may go negative).
        const bandSign = (y: number | null): number | null =>
            y == null ? null : isBand ? Math.max(0, y) : y;
        // THE CURVE-LATCH VISUAL (W-VFT · the CurvePersist hallmark — "click on the curves… persist
        // that"). A real drawn line whose key matches the SFC-held `latchedKey` renders as the
        // PERSISTENT read a click leaves behind: it thickens (2 → 3) to full opacity. Driven off the
        // OPTION (not ECharts' `select` state — a line-series select does not restyle the whole
        // stroke), so it re-paints deterministically on latch (the SFC folds `latchedKey` into the
        // re-paint fingerprint). A band / hidden-base is never a latch target. `latchedKey` unset ⇒
        // `latched` is false for every series ⇒ the lineStyle is BYTE-IDENTICAL (every consumer that
        // never latches is unmoved).
        const latched =
            dials.latchedKey != null && s.key === dials.latchedKey && !isBand && !s.hidden;
        const line = {
            type: "line" as const,
            name: s.label,
            data: clampPoints(s.points).map(
                (p) => [p.x, bandSign(p.y)] as [number, number | null],
            ),
            showSymbol: false,
            // THE CURVE-LATCH EVENT TARGET (W-VFT · CurvePersist — F-CP1 cure). A `showSymbol:false`
            // line does not dispatch a series `click`/`mouseover` on its STROKE unless
            // `triggerLineEvent` is on. The arm wired the click LISTENER (`useEChart`) but never made
            // the stroke a pick target, so the latch could never fire on a real gesture. Enabled ONLY
            // on the arm's SELECTABLE real lines (`selectableCurves`, never a band / hidden base — the
            // same targets that can latch), so every other consumer's option is BYTE-IDENTICAL (no
            // field emitted) and the render is unmoved: `triggerLineEvent` makes the stroke pickable
            // WITHOUT symbols (compatible with `showSymbol:false`), it paints nothing.
            ...(dials.selectableCurves && !isBand && !s.hidden
                ? { triggerLineEvent: true }
                : {}),
            ...(attachMark ? { markLine: mergedMarkLine } : {}),
            ...(attachCrown && dials.markPoint != null
                ? { markPoint: dials.markPoint }
                : {}),
            ...(attachCrown && dials.markArea != null
                ? { markArea: dials.markArea }
                : {}),
            ...(s.stack ? { stack: s.stack } : {}),
            lineStyle: {
                color: s.color,
                width: s.hidden ? 0 : isBand ? 0 : latched ? 3 : recede ? 1 : 2,
                opacity: s.hidden ? 0 : isBand ? 0 : latched ? 1 : recede ? 0.45 : 1,
                // THE NON-COLOUR SECONDARY ENCODING (1.4.1) — the dash pattern rides the stroke so a
                // line is told apart WITHOUT hue. Bands keep their solid (zero-width) edge.
                ...(s.dash && !isBand ? { type: s.dash } : {}),
            },
            itemStyle: { color: s.color },
            ...(isBand
                ? {
                      areaStyle: {
                          color: s.color,
                          opacity: bandOpacity,
                      },
                  }
                : {}),
            // E4-integration (F6): series scope retained, the blur floor bounded at the policy.
            emphasis: { focus: "series" as const, ...boundedBlur() },
            connectNulls: false,
            ...(s.silent ? { silent: true } : {}),
            ...(isBand ? { tooltip: { show: false } } : {}),
            // THE DIRECT END-OF-LINE LABEL (1.4.1 · the botanical-plate direct-labelling idiom) —
            // each line names itself at its terminal datum (name + colour + dash colocated on the
            // mark, so no colour-only key is needed). `labelLayout.moveOverlap:"shiftY"` nudges
            // near-coincident terminals apart (the no-smoke 86% / smoke 80% endpoints).
            //   K-PAPER-CHART: when the chart-wide `directLabels` dial is ON, EVERY drawn line
            //   (non-band, non-hidden, IN the legend) carries the NYT terminal label in its OWN
            //   `s.color` via the recipe fragment (`chartRecipe.directEndLabel`); else the per-series
            //   `s.endLabel` string opt-in holds VERBATIM. directLabels off ⇒ the else branch IS the
            //   prior expression, so the option is BYTE-IDENTICAL for every existing consumer.
            ...(dials.directLabels && !isBand && !s.hidden && !s.hideInLegend
                ? directEndLabel(s, palette.fontMono, gutterCollapsed)
                : s.endLabel && !isBand && !s.hidden
                  ? {
                        endLabel: {
                            show: true,
                            formatter: s.endLabel,
                            color: s.color,
                            fontFamily: dials.axisFontFamily ?? palette.fontMono,
                            fontSize: 12,
                            fontWeight: 600,
                            // A-04 — below the plot-track floor the label seats ON the line.
                            ...(gutterCollapsed ? END_LABEL_ON_PLOT : { distance: 8 }),
                        },
                        labelLayout: {
                            moveOverlap: "shiftY" as const,
                            hideOverlap: false,
                        },
                    }
                  : {}),
        };
        if (!s.trend) return [line];

        // The fitted trend: a dashed, half-opacity twin of the series colour. The partial terminal
        // year is clamped out FIRST so the fit never bends toward the artifact.
        const fitPoints = clampPoints(s.points)
            .filter((p): p is { x: number; y: number } => p.y != null)
            .map((p) => ({ x: p.x, y: p.y }));
        const t = useTrendline(fitPoints, s.trend);
        const trend = {
            type: "line" as const,
            name: `${s.label} trend`,
            data: t.series.map((p) => [p.x, p.y] as [number, number]),
            showSymbol: false,
            silent: true,
            lineStyle: {
                color: s.color,
                width: 1.5,
                type: "dashed" as const,
                opacity: 0.7,
            },
            tooltip: { show: false },
        };
        return [line, trend];
    });

    // THE CROWN MARGIN (E15a) — the lifted-top register from lib/grid.ts (the K-F grid-standard
    // source). A direct-labelling consumer widens the right gutter via `gridRight` (containLabel
    // reserves AXIS labels only, never series end labels — the default holds for every existing
    // consumer); `containLabel` reserves the wide y-value ticks (the CROWN geometry left:64).
    // A-04 — below the plot-track floor the declared gutter COLLAPSES to the crown's own inset (the
    // terminal labels have moved onto the lines above), so the plot keeps a legible track.
    const grid = {
        ...VIZ_GRID_CROWN,
        right: gutterCollapsed ? VIZ_GRID_CROWN.right : declaredRight,
        containLabel: true,
    };

    return {
        // THE UPDATE TWEEN (FIX-3 · the hard-cut fix). The line is a DATA/FILTER chart: a year-scope
        // re-slice or a feed change re-feeds `series[].data` and `useEChart.paint()` issues a
        // `notMerge:true` setOption. With `animation:false` that replaced the line geometry in ONE
        // frame — a hard cut. We re-enable a tuned ENTER + UPDATE tween so a data/filter re-scope
        // EASES the line to its new geometry instead of snapping.
        //
        // THE TWO CLOCKS STAY UNCROSSED. This tween clocks ONLY the DATA/FILTER path:
        //   • The SCROLL reveal is the PLATE-LEVEL CSS `view()` fade+lift (`data-reveal-fan`,
        //     TimeSeries.vue) — it never touches `series[].data`, so it cannot double-clock here.
        //   • The line `series[].data` is NEVER scrubbed per scroll frame (no `bindScrollYear`
        //     consumer feeds a per-frame year into the points), so there is no scrub re-feed for
        //     this ECharts tween to fight. The `markPoint` rivet rides the DISCRETE `activeYear`
        //     (the scrubber / scene-apply), so its tween reads as a smooth rivet slide on a
        //     discrete year step — not a per-frame double-clock.
        //   • THE THEME RETINT stays an ATOMIC hard swap: `useEChart.applyRetintOption` merges the
        //     dark palette with `animation:false` in its own payload (the E9b no-colour-tween law),
        //     so a flip prints the new pigment in one frame regardless of this base `animation:true`.
        // PRM is honoured by ECharts itself (it disables animation under `prefers-reduced-motion`)
        // and the plate reveal is already PRM-fenced — the terminal geometry renders either way.
        animation: true,
        animationDuration: 600,
        animationEasing: "cubicOut",
        animationDurationUpdate: 450,
        animationEasingUpdate: "cubicOut",
        backgroundColor: "transparent",
        grid,
        tooltip: { show: false },
        xAxis: {
            type: "value",
            // THE EXPLICIT-TICK PIN (I15 · the scissors two-endpoint axis) — when the consumer hands
            // an evenly-spaced `xTicks` set, the axis pins min/max/interval to it so ECharts emits
            // ticks ONLY at those positions (no fractional 0.2/0.4/0.6/0.8 auto-fit between a sparse
            // two-point domain). Otherwise the legacy union-x domain (the axis stays `type:"value"`,
            // so the line geometry interpolates identically either way).
            ...(() => {
                const pin = pinnedTickSpec(dials.xTicks);
                return pin
                    ? { min: pin.min, max: pin.max, interval: pin.interval }
                    : {
                          min: xAxisValues[0],
                          max: xAxisValues[xAxisValues.length - 1],
                      };
            })(),
            // K-PAPER-CHART: the recessed ruled baseline (`palette.grid` AS-IS) when the dial is on;
            // else BYTE-UNCHANGED. `recessedBaseline` reads the SAME resolved rgb — the recipe NAMES
            // the recession, it does not re-attenuate (the single-attenuation fence).
            axisLine: dials.directLabels
                ? recessedBaseline(palette)
                : { lineStyle: { color: palette.grid } },
            axisTick: { show: false },
            axisLabel: {
                ...BOUNDARY_AXIS.label(
                    palette.muted,
                    palette.fontMono,
                    palette.figureAxisPx,
                ),
                // THE AXIS NUMERAL FACE — the route's tabular face (VFT's "IBM Plex Mono") replaces
                // the "Fira Code" default so the ticks read in the journal's technical register.
                ...(dials.axisFontFamily ? { fontFamily: dials.axisFontFamily } : {}),
                ...(dials.xFormat
                    ? { formatter: (v: number) => dials.xFormat!(v) }
                    : {}),
            },
        },
        yAxis: {
            type: "value",
            // THE FW-III-FLOOR (fw-sci · M8/C6): the shared primitive floors at 0 — UNLESS a
            // band-focus consumer hands an explicit `yMin` (the crossing-legibility override),
            // in which case the axis starts at that tightened floor.
            min: dials.yMin ?? 0,
            // THE CEILING RESERVE (E15a) — `max` = nice-round of dataMax × 1.08 (stack-aware) —
            // UNLESS an explicit `yMax` band-cap is handed (the crossing-legibility override wins).
            ...(dials.yMax != null
                ? { max: dials.yMax }
                : yCeiling > 0
                  ? { max: yCeiling }
                  : {}),
            // K-PAPER-CHART: the dashed `width:1` Y-hairline (`palette.grid` AS-IS) when the dial is
            // on; else BYTE-UNCHANGED. The X-grid stays absent — the dashed register is the
            // horizontal ruling.
            splitLine: dials.directLabels
                ? dashedHairline(palette)
                : { lineStyle: { color: palette.grid } },
            axisLabel: {
                ...BOUNDARY_AXIS.label(
                    palette.muted,
                    palette.fontMono,
                    palette.figureAxisPx,
                ),
                ...(dials.axisFontFamily ? { fontFamily: dials.axisFontFamily } : {}),
                ...(dials.yFormat
                    ? { formatter: (v: number) => dials.yFormat!(v) }
                    : {}),
            },
        },
        // The flatMap union (line ± trend, each with optional endLabel/markLine spreads) widens past
        // what ECharts' loose SeriesOption[] structurally accepts; the option is well-formed at run
        // time (the byte-identical parity proof holds), so it casts to the declared series shape.
        series: built as EChartsOption["series"],
    };
}
