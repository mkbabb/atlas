// platform/composables/useTrendline.ts — the least-squares trend fit the SCI scatters
// and the Utilization time-series draw their guide curve from (SCI-PAGES §2, the
// `<trendline fit='log'|'linear'>` the workbook puts on every scatter, absent from the
// built `SciScatter`). Two fits, one seam:
//
//   linear — y = a + b·x. The ordinary regression, for the equity / cost scatters and
//            the contracted-vs-actual headroom line.
//   log    — y = a + b·ln(x). Fit y against ln(x) instead of x, so the curve "falls
//            fast then flattens" — the literal shape of the economies-of-scale argument
//            (avg-util-per-student vs enrollment). Points with x ≤ 0 carry no logarithm,
//            so they drop from the fit (and the curve isn't drawn left of x = 0).
//
// Pure: no Vue reactivity, no DOM. A function over `{x, y}[]` → the fitted series, the
// coefficients, and R². Unit-tested against closed-form expectations.

/** One observation to fit against. */
export interface Point {
    x: number;
    y: number;
}

/** Which curve to fit. */
export type TrendFit = "linear" | "log";

/** The fitted trend: its coefficients, the sampled curve, and the goodness-of-fit. */
export interface Trendline {
    fit: TrendFit;
    /** The intercept `a` in `y = a + b·u` (u = x for linear, ln(x) for log). */
    intercept: number;
    /** The slope `b`. */
    slope: number;
    /** Coefficient of determination over the fitted points (1 = perfect, 0 = no signal). */
    r2: number;
    /** Evaluate the fitted curve at an x (null when x ≤ 0 under a log fit). */
    predict: (x: number) => number | null;
    /**
     * The curve sampled as an ordered `{x, y}` series across the fitted x-range — drop
     * straight into a TimeSeries / scatter overlay. `samples` points (default 64); a
     * linear fit needs only its two endpoints, a log fit wants the curve.
     */
    series: Point[];
}

/** Sum helper kept local so the regression reads as the normal equations, not a reduce soup. */
function sum(xs: number[]): number {
    let s = 0;
    for (const x of xs) s += x;
    return s;
}

/**
 * Fit a linear OR log trendline to `points` by ordinary least squares. The log fit
 * regresses y on ln(x) (so x ≤ 0 points are excluded from the fit and the drawn curve).
 * Returns the coefficients, an R², a `predict(x)`, and the sampled `series` for an overlay.
 * Fewer than two usable points yields a flat zero-slope line through the mean (no signal).
 */
export function useTrendline(
    points: readonly Point[],
    fit: TrendFit = "linear",
    samples = 64,
): Trendline {
    // The design variable: x for linear, ln(x) for log. A log fit drops x ≤ 0.
    const usable = points.filter(
        (p) =>
            Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            (fit === "linear" || p.x > 0),
    );

    const u = usable.map((p) => (fit === "log" ? Math.log(p.x) : p.x));
    const y = usable.map((p) => p.y);
    const n = usable.length;

    // Degenerate: no usable points, or all x identical (no horizontal spread to fit a
    // slope against). Carry a flat line through the mean — an honest "no trend".
    const meanY = n > 0 ? sum(y) / n : 0;
    const flat: Omit<Trendline, "series"> = {
        fit,
        intercept: meanY,
        slope: 0,
        r2: 0,
        predict: () => meanY,
    };

    if (n < 2) return { ...flat, series: sampleSeries(flat, usable, fit, samples) };

    const meanU = sum(u) / n;
    let sUU = 0;
    let sUY = 0;
    let sYY = 0;
    for (let i = 0; i < n; i++) {
        const du = u[i] - meanU;
        const dy = y[i] - meanY;
        sUU += du * du;
        sUY += du * dy;
        sYY += dy * dy;
    }

    if (sUU === 0) return { ...flat, series: sampleSeries(flat, usable, fit, samples) };

    const slope = sUY / sUU;
    const intercept = meanY - slope * meanU;
    // R² = (explained / total). When y is constant (sYY = 0) the fit is trivially exact.
    const r2 = sYY === 0 ? 1 : (slope * sUY) / sYY;

    const predict = (x: number): number | null => {
        if (fit === "log") {
            if (!(x > 0)) return null;
            return intercept + slope * Math.log(x);
        }
        return intercept + slope * x;
    };

    const core: Omit<Trendline, "series"> = { fit, intercept, slope, r2, predict };
    return { ...core, series: sampleSeries(core, usable, fit, samples) };
}

/** Sample the fitted curve across the usable x-range as an ordered overlay series. */
function sampleSeries(
    line: Pick<Trendline, "predict">,
    usable: readonly Point[],
    fit: TrendFit,
    samples: number,
): Point[] {
    if (usable.length === 0) return [];
    const xs = usable.map((p) => p.x);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    // A linear fit is two endpoints; a log curve wants the bend resolved, so sample dense.
    const n = fit === "linear" ? 2 : Math.max(2, samples);
    const out: Point[] = [];
    for (let i = 0; i < n; i++) {
        const x = lo + ((hi - lo) * i) / (n - 1);
        const yhat = line.predict(x);
        if (yhat == null) continue;
        out.push({ x, y: yhat });
    }
    return out;
}
