// platform/charts/aggregate.ts — THE HONEST RATIO-AGGREGATION SEAM (E4 · F10b ·
// f-granularity §"the honest-aggregate proof"). The atlas-platform domain math the
// granularity dial's `grouped` grain condenses through.
//
// THE LAW IT ENCODES (f-granularity, verbatim): "the aggregate is the group MEDIAN,
// banded by min–max, dollar-POOLED on hover — NEVER a sum." A net-retention RATIO
// CANNOT SUM: ten 1.07× states are not "10.7×" of anything (the naive Σ-of-ratios the
// audit's proof exists to REJECT). Three statistics are honest, ONE is statistical
// nonsense:
//   · median       — the typical state in the band (an order statistic; the per-state MARK)
//   · min / max    — the whisker, the band's spread (15.68→109.54 wide, 1.06→1.10 tight)
//   · pooled Σ/Σ   — Σnumerator/Σdenominator, the dollar-weighted "merged super-state"
//                    (the ONLY legal sum — you sum the DOLLARS, then take the RATIO of the
//                    sums; never the sum of the ratios) — surfaced in the chunk's hover.
//
// FORBIDDEN: a `sum`/`total`/Σ(ratio) field on the band. The canary (aggregate-honesty.gate.ts):
// ten 1.07× states aggregate to ~1.07 (median & pooled), NEVER 10.7 (Σ). This module is the
// product seam that gate resolves dynamically (`@/platform/charts/aggregate`); the moment it
// lands, the frozen law table runs against THIS helper — and a Σ-pooling implementation FAILS.
//
// ROOT-REPO note: this is ATLAS-platform domain math (net-retention banding), shared across
// dashboards (the USF strip's `grouped` grain today, any future SCI/ECF ratio-banding) — NOT a
// `@mkbabb/*` republishable library defect, so it lands in-repo at the platform layer
// (`platform/charts/`), the correct root for cross-dashboard atlas math (f-granularity §root-repo).

/** One member of a ratio chunk — a state's net-retention ratio AND its raw dollar parts
    (so the pooled Σ/Σ can be recomputed; a ratio alone cannot be pooled). */
export interface RatioMember {
    /** the member's ratio (e.g. net retention 1.07×). */
    ratio: number;
    /** the member's numerator (Σ disbursements — the dollars OUT). */
    numerator: number;
    /** the member's denominator (contributions — the dollars IN). */
    denominator: number;
}

/** The honest aggregate band — median + whisker + pooled, and a member count. NO `sum`/`total`
    field rides this shape (a ratio cannot sum); the gate's structural assertion forbids it. */
export interface RatioBand {
    /** the group MEDIAN ratio (the order statistic — the per-state typical, the lollipop dot). */
    median: number;
    /** the whisker min (the band floor). */
    min: number;
    /** the whisker max (the band ceiling). */
    max: number;
    /** the pooled Σnumerator/Σdenominator (the dollar-weighted "merged super-state" — the hover). */
    pooled: number;
    /** the member count. */
    n: number;
}

/** The order-statistic median of a numeric array (the two-mid MEAN for an even count — never
    the arithmetic mean of the whole set: {1,2,3,4,100} → 3, not 22). NaN on an empty set. */
export function medianOf(values: readonly number[]): number {
    if (values.length === 0) return NaN;
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Aggregate a chunk of ratio members into the honest band — median + min/max whisker + pooled
 * Σnum/Σden, NEVER Σ(ratio). The aggregate MARK is the median (the per-state typical, drawn as
 * the whisker-lollipop dot); the whisker is min→max (the band's spread); the POOLED ratio (the
 * only legal sum — sum the DOLLARS, then ratio the sums) is the dollar-weighted truth surfaced in
 * the chunk's hover detail. An empty chunk → an all-NaN band with n=0. A zero-denominator pool →
 * NaN pooled (a ratio with no dollars in cannot be pooled).
 */
export function aggregateRatioBand(members: readonly RatioMember[]): RatioBand {
    if (members.length === 0) {
        return { median: NaN, min: NaN, max: NaN, pooled: NaN, n: 0 };
    }
    const ratios = members.map((m) => m.ratio);
    let sumNum = 0;
    let sumDen = 0;
    for (const m of members) {
        sumNum += m.numerator;
        sumDen += m.denominator;
    }
    return {
        median: medianOf(ratios),
        min: Math.min(...ratios),
        max: Math.max(...ratios),
        // Σnum/Σden — the ONLY legal sum (the dollars pool, then the ratio of the sums). Never
        // Σ(ratio): a chunk of ten 1.07× states pools to 1.07, the merged-super-state truth.
        pooled: sumDen !== 0 ? sumNum / sumDen : NaN,
        n: members.length,
    };
}

/**
 * Partition an ALREADY-SORTED list into contiguous groups of `size` (the tail group carries the
 * remainder). The granularity dial's `grouped` grain bins the rank-sorted roster this way — each
 * group is one aggregate whisker-lollipop. The input order IS the rank order (the caller sorts);
 * this never re-sorts (it would break the rank semantics). `size ≤ 0` → one group of everything
 * (a degenerate dial value collapses to the whole field rather than dividing by zero).
 */
export function chunkByRank<T>(sorted: readonly T[], size: number): T[][] {
    if (size <= 0) return sorted.length ? [[...sorted]] : [];
    const out: T[][] = [];
    for (let i = 0; i < sorted.length; i += size) {
        out.push(sorted.slice(i, i + size));
    }
    return out;
}
