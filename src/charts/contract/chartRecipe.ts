// platform/charts/chartRecipe.ts — THE NYT CANVAS TIME-SERIES RECIPE (K-PAPER-CHART · P3, the
// K-C-HIER one-row extension). A thin PURE option-FRAGMENT module — no Vue refs, no side-effects,
// the same inputs always yield the same fragment (the `useTimeSeriesOption` pure-derivation idiom).
// It is NOT a new SFC, NOT a ChartFrame seam, NOT a `TimeSeries` fork: a set of
// `(palette | series) → EChartsOption-fragment` functions the shipped `buildTimeSeriesOption`
// COMPOSES behind the opt-in `directLabels` dial. It MINTS no primitive/store/clock/palette/token —
// it CONSUMES the shipped authorities (`useVizPalette` the T-4 canvas-colour bridge → `palette.grid`,
// `BOUNDARY_AXIS` the Fira-Code tick voice, `echarts ^6` native `endLabel`/`labelLayout`) + the
// SHIPPED `--attn-*`/`--viz-grid` tokens K-C-HIER owns.
//
// THE EDITORIAL MOVE (K-PAPER §4 · the reference IMG_1882.PNG): the data reads through DIRECT
// TERMINAL LABELS riding each line's OWN colour — the eye decodes series identity IN PLACE, no
// detached legend lookup — over a near-invisible recessive ruled grid. The recipe owns FOUR
// co-located fragments:
//   · ATTN              — the frozen typed editorial-ink ladder MIRROR of tokens.css:781-791 (the
//                         canvas-side compile-time scalar; an ECharts canvas is NOT in the CSS
//                         cascade — it cannot read a `:root` var, so the seven rungs are mirrored as
//                         a parity-gated CONSTANT, NEVER a `getComputedStyle` DOM-probe. `resolveAttn`
//                         is NEVER born — the write→recalc law: the canvas reads the constant).
//   · dashedHairline    — the Y-grid `splitLine` fragment: `palette.grid` AS-IS, dashed, width 1.
//   · recessedBaseline  — the `xAxis.axisLine` fragment: the SAME `palette.grid` AS-IS.
//   · directEndLabel    — the per-series terminal label in the series' OWN `s.color`, receding to
//                         rung-③ `ATTN.legend`; ECharts' OWN `labelLayout` declutters the N>1 collision.
//
// THE SINGLE-ATTENUATION FENCE (k-paper-grid-single-attn): `--viz-grid` ALREADY bakes the 0.5 alpha
// (`tokens.css:300/:339` — `oklch(… / 0.5)`), resolved to a concrete rgb by the T-4 bridge. The grid
// fragments read it AS-IS — NO second `opacity: var(--attn-legend)` layered on top (a second multiply
// would double-attenuate the grid to a ghost). ONE attenuation, baked in the token.

import type { VizPalette } from "@/charts/composables/useVizPalette";
import type { LineSeries } from "@/charts/marks/TimeSeries.vue";

/** The seven editorial-ink rungs — the typed exhaustive proof for the frozen `ATTN` mirror. A
    missing/typo'd rung fails `tsc` (the `satisfies Record<AttnRung, number>` below) BEFORE the
    parity gate runs. */
export type AttnRung =
    | "hero"
    | "thesis"
    | "data"
    | "pull"
    | "legend"
    | "chrome"
    | "atmosphere";

/** THE FROZEN ATTN LADDER MIRROR — the canvas-side compile-time editorial-ink scalar, mirroring the
    seven LIVE `--attn-*` rungs (`tokens.css:781-791`, VERIFIED): hero 1 · thesis 1 · data 0.92 ·
    pull 0.8 · legend 0.64 · chrome 0.46 · atmosphere 0.06. Parity-gated against the source ladder
    (`k-paper-chart-attn-parity`); a drift here is RED. The canvas marks bind THIS constant — the
    recessive direct-label register recedes to rung-③ `ATTN.legend` (the editorial-ink law K-C-HIER
    owns); NO runtime `getComputedStyle` probe of `--attn-*` is ever born. */
export const ATTN = Object.freeze({
    hero: 1,
    thesis: 1,
    data: 0.92,
    pull: 0.8,
    legend: 0.64,
    chrome: 0.46,
    atmosphere: 0.06,
} as const) satisfies Record<AttnRung, number>;

/** THE DASHED Y-HAIRLINE (move 3) — the `yAxis.splitLine` fragment. Reads `palette.grid` AS-IS (the
    `--viz-grid` token already bakes the 0.5 alpha — NO second opacity; the single-attenuation fence),
    dashed at width 1: the NYT recessive horizontal ruling. */
export function dashedHairline(palette: VizPalette) {
    return { lineStyle: { color: palette.grid, type: "dashed" as const, width: 1 } };
}

/** THE RECESSED BASELINE (move 3) — the `xAxis.axisLine` fragment. The SAME `palette.grid` AS-IS
    (the recessed ruled baseline; one attenuation, baked in the token). */
export function recessedBaseline(palette: VizPalette) {
    return { lineStyle: { color: palette.grid } };
}

/** THE PER-SERIES DIRECT TERMINAL LABEL (move 4) — each drawn line names itself at its terminal
    datum in its OWN `s.color` (NEVER the mono `palette.signal`, unmappable at N>1 — every line would
    print the same ink), receding to rung-③ `ATTN.legend` (the recessive direct-label register). The
    Fira voice reuses the `BOUNDARY_AXIS` register; ECharts' OWN `labelLayout{hideOverlap,
    moveOverlap:"shiftY"}` (echarts ^6 native) declutters the N>1 terminal collision — never a
    hand-rolled solver.
      THE TERMINAL TAG (N5 consult) — a series' explicit `endLabel` string, when declared, IS the
    terminal name (the SHORT in-place tag: "equipment", not "Category 2 — internal connections");
    the full `s.label` stays the legend/tooltip/a11y name. A long label printed at the terminal
    clips against the end-label gutter (the /demand "Categ…" stubs) — the tag is the direct-labelling
    idiom's own vocabulary, not a second naming system. Absent ⇒ `s.label` verbatim (unchanged). */
export function directEndLabel(s: LineSeries, fontMono: string) {
    return {
        endLabel: {
            show: true,
            formatter: () => s.endLabel ?? s.label,
            color: s.color,
            opacity: ATTN.legend,
            fontFamily: fontMono,
            fontSize: 12,
            fontWeight: 600,
            distance: 8,
        },
        labelLayout: { hideOverlap: true, moveOverlap: "shiftY" as const },
    };
}
