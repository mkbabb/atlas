// platform/motion/rankMotionBand.ts — THE RANK → MOTION-BAND GEOMETRY (K-ANIM A5 · proto/A5-afford.md §2.2).
//
// The ONE pure authority for the two geometry consumptions A5 owns: ORDER (the entrance beat) + DURATION
// (the band-width scale). NO amplitude (that is A3's `RANK_INTENSITY` — ONE home, no drift), NO CSS token
// (the PASS-1 `--rank-motion-*` token carried an undefined `--lift` + the 0.66/0.7 drift, RETIRED). PURE
// — a lookup + an arithmetic band reshape.

/** The K-C rank tier (INBOUND from K-C-HIER — A5 consumes; the literal union is re-declared here as the
    consume contract, identical members, NOT re-minted). */
export type RankTier = "lede" | "support" | "ancillary";

/** One tier's BAND budget — the two geometry consumptions A5 owns (NO amplitude). */
export interface RankBandBudget {
    /** The entrance ORDER as a reveal-BEAT delay (lede 0, support 1, ancillary 2) — shifts the band
        `from` by `orderBeat * REVEAL_BEAT` so the lede's reveal opens first. 0 ⇒ no shift (identity). */
    readonly orderBeat: number;
    /** The band-WIDTH scale (0,1] — the lede's reveal window is longest (durationScale 1, the staging
        figure); the ancillary's is shortest. 1 ⇒ full span (identity). */
    readonly durationScale: number;
}

/** THE AUTHORITY — the one table for the rank→band geometry. lede is the IDENTITY budget (no shift, full
    span): the crown reveals on the canonical K-B band, untouched. support/ancillary trail + compress. */
export const RANK_BAND = {
    lede: { orderBeat: 0, durationScale: 1 },
    support: { orderBeat: 1, durationScale: 0.8 },
    ancillary: { orderBeat: 2, durationScale: 0.6 },
} as const satisfies Record<RankTier, RankBandBudget>;

/** THE IDENTITY budget — the default for a viz that declares NO rank. The default is IDENTITY (orderBeat
    0, durationScale 1), NOT `support` (the PASS-1 default would have SHIFTED + SHORTENED every un-ranked
    viz the instant the host wired `useRankMotion` — a silent cadence regression). An un-ranked viz MUST
    reveal on the un-reshaped band; only a DECLARED rank reshapes. (The "present, not the crown" intent
    for an un-ranked viz lives in A3's intensity default `RANK_INTENSITY.support = 0.7` — AMPLITUDE.) */
export const RANK_BAND_IDENTITY: RankBandBudget = { orderBeat: 0, durationScale: 1 };

/** Resolve a (maybe-absent) rank to its band budget. Un-ranked ⇒ IDENTITY (no reshape). Total. */
export function resolveRankBand(rank: RankTier | undefined): RankBandBudget {
    return rank ? RANK_BAND[rank] : RANK_BAND_IDENTITY;
}

/** One reveal BEAT as a fraction of the entry band — the order-shift quantum (~0.1 of the [0,1] entry
    scalar, matching the REVEAL_BANDS overlap grain) so an order shift reads as a relay step, not a jump. */
export const REVEAL_BEAT = 0.1;

const BAND_EPS = 0.01;

/** THE BAND RESHAPER (pure) — shift `from` forward by the entrance-order beats, scale the span by
    durationScale, NEVER invert (clamp `from` to `to - EPS`). Identity for the lede / un-ranked. The
    reshaped `[from,to]` is symmetric in `t`, so the reveal-stage scrub runs both directions. */
export function reparameterizeBand(
    budget: RankBandBudget,
    from: number,
    to: number,
): readonly [number, number] {
    if (budget.orderBeat === 0 && budget.durationScale === 1) return [from, to]; // identity fast-path
    const f = Math.min(from + budget.orderBeat * REVEAL_BEAT, to - BAND_EPS); // never invert
    const span = (to - f) * budget.durationScale; // the lede longest, ancillary shortest
    return [f, f + span] as const;
}
