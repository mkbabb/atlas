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

// ── THE SELECTION-AGGREGATE COMPUTE (O-A11 · the drill-down's honest reduce) ─────────────────────
//
// [CH-A H5] The reduce-op VOCABULARY (`ReduceOp`/`MeasureKind`/`AggregateResult`) is owned by the
// shared `platform/provenance/aggregate-contract.ts` (O-B7 — the cycle-breaker so O-A9b's label and
// this compute both read one enum). THIS is O-A11's COMPUTE against that contract: the pure folds the
// `SelectionDrilldownPanel` aggregate block runs over a selected grain's members. A route's registered
// `AggregateResolver` (in `useSelectionStat`) reduces its OWN store's extensives/intensives through
// these — so the math is authored ONCE, honest by construction, and the Simpson trap is unrepresentable
// (there is no `mean-of-ratios` fold to call).

import type {
    AggregateResult,
    MeasureKind,
    ReduceOp,
} from "../../platform/provenance/aggregate-contract.js";

/**
 * THE LAW's pure op selection (the fence): an EXTENSIVE measure folds via `Σ`; an INTENSIVE measure
 * folds via `pooled` (`Σnum/Σden`) — NEVER a plain mean of a ratio. No data needed — the measure's
 * physical KIND dictates the op. This is the `AggregateResolver.reduceOpFor` shape (O-B7 contract).
 */
export function reduceOpForKind(kind: MeasureKind): ReduceOp {
    return kind === "extensive" ? "Σ" : "pooled";
}

/**
 * Reduce an EXTENSIVE measure (dollars, counts, enrollment) — the ONLY honest fold is the SUM. No
 * median rides an extensive (`median: null` — a Σ has no "typical member" the way a rate does); the
 * count is the folded cardinality. An empty set → `{ value: 0, n: 0 }` (a Σ of nothing is zero).
 */
export function reduceExtensive(values: readonly number[]): AggregateResult {
    let sum = 0;
    for (const v of values) sum += v;
    return { op: "Σ", value: sum, median: null, n: values.length };
}

/**
 * Reduce an INTENSIVE measure (a ratio / rate / per-capita) the honest way — the POOLED `Σnum/Σden`
 * (the dollar-/enrollment-weighted "merged super-entity", the ONLY legal ratio-aggregate) WITH the
 * order-statistic MEDIAN of the member ratios reported ALONGSIDE ([ANSWERS Q-38]: the fleet's rate vs
 * the typical member's rate answer different questions — the median rides beside the pool, NEVER
 * instead of it). Reuses `aggregateRatioBand` (the shipped Σnum/Σden + median band), so the Simpson
 * trap (`mean(ratios)`) is unrepresentable — there is no arithmetic-mean fold to reach for. An empty
 * set → `{ value: NaN, median: NaN, n: 0 }`; a zero-denominator pool → `value: NaN` (a ratio with no
 * denominator cannot pool).
 */
export function reduceIntensive(
    members: readonly RatioMember[],
): AggregateResult {
    const band = aggregateRatioBand(members);
    return { op: "pooled", value: band.pooled, median: band.median, n: band.n };
}
