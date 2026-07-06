// platform/provenance/aggregate-contract.ts — THE SHARED REDUCE-OP CONTRACT (the Phase-3 cycle-breaker).
//
// [CH-A H5] O-A9's aggregation-level LABEL and O-A11's aggregate COMPUTE both need the reduce-op
// vocabulary: O-A11 IMPLEMENTS `AggregateResolver` (the number), O-A9b READS its resolved `op` to
// print the honest "pooled ×" string. If O-A11 owned the enum, O-A9 would import O-A11 while O-A11
// imports O-A9 (`useActiveViz`) — a Phase-3 import cycle. So the shared TYPE-CONTRACT is birthed
// HERE, at the earliest structural point (O-B7, alongside `provenance-contract.ts`), owned by
// NEITHER the computer NOR the labeller. B7 births ONLY the interface; the compute (O-A11) and the
// label (O-A9b) are downstream [REF-AF · HARDEN-4b · D-3; WAVES-A-F O-A11 WORK].
//
// THE AGGREGATE LAW it types (O-A11 WORK · f-granularity §"the honest-aggregate proof"): an
// EXTENSIVE measure (dollars, counts) SUMS (`Σ`); an INTENSIVE measure (a ratio / rate) must NOT be
// plain-averaged (the Simpson trap) — it POOLS (`Σnum/Σden`, the dollar-weighted "merged super-state")
// with the order-statistic `median` reported ALONGSIDE, never instead of ([ANSWERS Q-38]). This
// module names the vocabulary ONLY; the math lives in the compute (`charts/contract/aggregate.ts` +
// O-A11's resolver implementation).

/** The four legal reduce-ops (the AGGREGATE LAW's honest folds). `Σ` sums an EXTENSIVE measure;
    `pooled`/`weighted` fold an INTENSIVE ratio as `Σnum/Σden` (the ONLY legal ratio-aggregate);
    `median` is the order-statistic reported alongside a pool. A plain `mean` of a ratio is ABSENT
    by construction — it is the Simpson-trap nonsense the law rejects. */
export type ReduceOp = "pooled" | "weighted" | "median" | "Σ";

/** Whether a measure is EXTENSIVE (additive — dollars, counts; folds via `Σ`) or INTENSIVE (a
    ratio / rate that cannot sum; folds via `pooled`/`weighted`). The kind SELECTS the legal
    reduce-op — the fence that keeps a ratio from being summed. */
export type MeasureKind = "extensive" | "intensive";

/** The resolved aggregate — the value AND the op that produced it (so a reader label reads
    "pooled ×" honestly, never a bare number of unknown provenance). `median` rides ALONGSIDE a
    pooled/weighted value ([ANSWERS Q-38] — the fleet's rate vs the typical member's rate answer
    different questions); it is `null` for a plain `Σ` where a median is not meaningful. */
export interface AggregateResult {
    /** the reduce-op that produced `value` — the honest label token. */
    op: ReduceOp;
    /** the aggregated value under `op`. */
    value: number;
    /** the order-statistic median, reported ALONGSIDE a pooled/weighted value; `null` for a plain Σ. */
    median: number | null;
    /** the member count folded into the aggregate. */
    n: number;
}

/** THE SHARED RESOLVER CONTRACT — the beat-registered fold that tracks the scrolled viz's current
    grain and resolves the active reduce. B7 births ONLY this INTERFACE (the cycle-breaker); O-A11
    IMPLEMENTS the compute against it, O-A9b's aggregation-level readout CONSUMES its resolved `op`
    for the label. This wave owns NEITHER the compute NOR the label — only the shared shape. */
export interface AggregateResolver {
    /** the reduce-op the resolver applies to a measure of the given KIND (the LAW: extensive → `Σ`,
        intensive → `pooled`/`weighted`) — the pure selection, no data needed. */
    reduceOpFor(kind: MeasureKind): ReduceOp;
    /** resolve the aggregate for the currently-active viz / grain; `null` when nothing is reduced
        (a single-item selection or an un-registered grain shows no aggregate). */
    resolve(vizId: string): AggregateResult | null;
}
