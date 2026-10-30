// charts/composables/timeSeriesAxis.ts — the PURE axis-math + dials half of the shared
// line-primitive builder (O-B4R god-split of `useTimeSeriesOption.ts`, §A.9). The nice-tick
// rounding, the shared x-domain, the explicit-tick pin spec, and the `TimeSeriesDials` contract
// the option reads — moved verbatim, zero behaviour change. `useTimeSeriesOption` re-exports the
// public members so the family surface stays byte-stable.

import type { LineSeries } from "../marks/TimeSeries.vue";

/** Round a value UP to a "nice" round number (1·10^k, 2·10^k, 2.5·10^k, 5·10^k) — the same family
    ECharts auto-fits, applied deterministically so the ceiling reserve lands on a clean tick rather
    than an arbitrary 1.08× float (E15a). A non-finite/≤0 input yields 0 (an empty plate keeps the
    auto domain). */
export function niceCeil(v: number): number {
    if (!Number.isFinite(v) || v <= 0) return 0;
    const exp = Math.floor(Math.log10(v));
    const base = 10 ** exp;
    const frac = v / base;
    const step = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
    return step * base;
}

/** Round a value DOWN to a "nice" round number (the symmetric mirror of `niceCeil`) — the same
    1·10^k, 2·10^k, 2.5·10^k, 5·10^k family, rounded toward zero so a band FLOOR lands on a clean
    tick rather than an arbitrary float. Used by a band-focus consumer (the crossover) that tightens
    the y-domain to its active data: the padded data-min rounds DOWN here, the padded data-max rounds
    UP through `niceCeil`, so both axis bounds read as clean money ticks. A non-finite/≤0 input
    yields 0 (the floor degrades to the zero anchor). */
export function niceFloor(v: number): number {
    if (!Number.isFinite(v) || v <= 0) return 0;
    const exp = Math.floor(Math.log10(v));
    const base = 10 ** exp;
    const frac = v / base;
    const step = frac >= 5 ? 5 : frac >= 2.5 ? 2.5 : frac >= 2 ? 2 : frac >= 1 ? 1 : 0.5;
    return step * base;
}

/** The shared x-axis domain (the union of every series' x, ascending), with the partial terminal
    year dropped when gated (the partial Σ-dive never reads as a real terminal value). */
export function timeSeriesXAxisValues(
    series: LineSeries[],
    partialYearX?: number,
): number[] {
    const set = new Set<number>();
    for (const s of series) for (const p of s.points) set.add(p.x);
    const all = [...set].sort((a, b) => a - b);
    if (partialYearX != null && all[all.length - 1] === partialYearX) {
        return all.slice(0, -1);
    }
    return all;
}

/** The resolved scalar inputs the option reads — the boundary/crown x's + the formatters the SFC
    carries as props. Threaded as plain values so the core stays pure. */
export interface TimeSeriesDials {
    xFormat?: (x: number) => string;
    yFormat?: (y: number) => string;
    partialYearX?: number;
    overSubscriptionX?: number;
    /** THE CROSSING'S OWN WORDS (A-03) — the eyebrow run the crossing rule carries. The mark had it
        hardwired to SCI's capacity semantics, so every other route's crossing narrated the wrong
        story. Omit ⇒ `over ceiling` (SCI's default, byte-compatible). */
    overSubscriptionLabel?: string;
    markPoint?: Record<string, unknown>;
    markArea?: Record<string, unknown>;
    forecastBoundaryX?: number;
    /**
     * THE BAND-FOCUS Y-DOMAIN OVERRIDE (the crossover-legibility dial). By default the primitive
     * floors at 0 (the FW-III floor) and reserves the ceiling at `dataMax × 1.08` — the honest
     * full-scale read for a magnitude line. But a CROSSING claim (two near-parallel lines whose
     * meaning IS the moment one passes the other) drowns in the zero-anchored full scale: the
     * crossing gap collapses to a hairline against the empty floor. A consumer whose subject is the
     * crossing (NOT the absolute magnitudes) hands an explicit `[yMin, yMax]` band tightened to the
     * active data so the crossing reads UNMISTAKABLY. `yMin` overrides the 0 floor; `yMax` overrides
     * the ceiling reserve. Omit BOTH ⇒ the zero-anchored default (every existing consumer unchanged).
     * A band must NOT clip the data: the caller derives it from the series min/max with padding.
     */
    yMin?: number;
    yMax?: number;
    /** Explicit, evenly-spaced x-axis tick positions (I15 · the scissors two-endpoint axis). When
        present, the x-axis pins `interval`/`min`/`max` to these so ECharts emits ticks ONLY here —
        no fractional auto-fit (0.2/0.4/0.6/0.8) between a sparse two-point domain. Falls back to the
        union x's when the set is < 2 or irregularly spaced. The line GEOMETRY axis stays
        `type:"value"`, so the real crossing interpolation is untouched — only the tick LABELS change. */
    xTicks?: number[];
    /** THE END-LABEL GUTTER — the right-grid px reserving direct end-of-line labels (`endLabel`).
        `containLabel` reserves AXIS labels only, so a direct-labelling consumer hands the gutter
        here. Omit ⇒ 24 (every existing consumer unchanged). OVERRIDDEN BELOW THE FLOOR — see
        `hostWidth`: a fixed reserve is a desktop declaration, and the mark owns the phone. */
    gridRight?: number;
    /** THE MEASURED HOST WIDTH (px) — the mark's own box, not the viewport. The END-LABEL GUTTER
        FLOOR reads it: when the reserved gutter would leave the plot below its legible track, the
        gutter COLLAPSES and the terminal labels move ONTO the lines. 0/omitted (SSR, jsdom, the
        pre-measure frame) ⇒ no floor, the declared gutter verbatim. */
    hostWidth?: number;
    /** THE AXIS NUMERAL FACE — overrides the `BOUNDARY_AXIS` "Fira Code" tick face with the route's
        own tabular numeral family (the VFT journal's "IBM Plex Mono"). Omit ⇒ "Fira Code". */
    axisFontFamily?: string;
    /** A READY ECharts `markLine` FRAGMENT (the sibling of `markPoint`/`markArea`) — merged with any
        internal boundary rule and attached to the FIRST drawn series. The VFT survival overlay (the
        T50 calipers + the "delay, not death" bracket) rides here. Omit ⇒ no extra markLine. */
    markLine?: Record<string, unknown>;
    /** THE NYT DIRECT-LABEL REGISTER (K-PAPER-CHART · P3 · the `chartRecipe` opt-in). When `true`,
        the chart reads in the editorial register: each drawn line carries a terminal DIRECT label in
        its OWN `s.color` (`chartRecipe.directEndLabel`) so the eye decodes identity IN PLACE, the
        Y-grid dashes to a `width:1` recessive hairline (`chartRecipe.dashedHairline`) + the baseline
        recesses (`chartRecipe.recessedBaseline`), all `palette.grid` AS-IS. **Defaults FALSE (opt-in)**
        — every existing consumer reads BYTE-UNCHANGED (every recipe compose is gated on
        `dials.directLabels === true`). The host BLOCK-WRAPS the `<ChartLegend>` `sr-only` so the AT
        key stays mounted (the canvas labels are `role="img"`-opaque). Omit ⇒ the prior register. */
    directLabels?: boolean;
    /** THE CURVE-LATCH VISUAL (W-VFT · the CurvePersist hallmark — "click on the curves… persist
        that"). The KEY of the currently latched curve (the one a reader clicked), or null/omitted
        when nothing is latched. The matching real line renders as the PERSISTENT read a click leaves
        behind — it thickens (2 → 3) to full opacity. Driven off the option (NOT ECharts' `select`
        state — a line-series select does not restyle the whole stroke), so the latch re-paints
        deterministically (the SFC folds this key into the re-paint fingerprint). A band / hidden-base
        never latches. Omit/null ⇒ the option is BYTE-IDENTICAL (no line thickens), so every consumer
        that never latches is unmoved. The `selectableCurves` PROP on the SFC gates whether the click
        seam is wired at all; this dial is what the SFC feeds once a curve is picked. */
    latchedKey?: string | null;
}

/** The pinned x-axis tick spec (min/max/interval) for an EVENLY-spaced explicit tick set — the two
    cycle endpoints `[0, 1]` yield `{ min:0, max:1, interval:1 }`, so ECharts draws ticks only at 0
    and 1 (no 0.2/0.4/0.6/0.8 leak). Returns null for a degenerate (< 2) or irregular set so the
    caller keeps the auto-fit union domain. Exported for the option-parity unit arms. */
export function pinnedTickSpec(
    ticks: number[] | undefined,
): { min: number; max: number; interval: number } | null {
    if (!ticks || ticks.length < 2) return null;
    const sorted = [...ticks].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const interval = (max - min) / (sorted.length - 1);
    if (!(interval > 0)) return null;
    // Require even spacing (the cycle index is 0,1,…): every gap must equal `interval` (within a
    // float epsilon). An irregular set cannot ride one `interval`, so it falls back to auto-fit.
    const EPS = 1e-9;
    for (let i = 1; i < sorted.length; i++) {
        if (Math.abs(sorted[i] - sorted[i - 1] - interval) > EPS) return null;
    }
    return { min, max, interval };
}
