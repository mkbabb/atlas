// editorial/evidence-floor.ts — THE EVIDENCE FLOOR (U-F25; sci-report RULINGS §A, amended §E and §H M-5).
//
// A rank, crown, superlative or "median" is shown only for an aggregate whose n is at or above the
// floor. The floor licenses that WORDING and nothing else: it never licenses a flag or a claim by
// itself. Below it, a cell renders its value together with its n, without the word "median" and
// without any rank. Every figure names what its n counts (filers, tests, schools, states), so the
// count line is built from a `CountNoun`, never from a bare number.
//
// One constant for every route; a feed may carry its own floor (the SCI edition's `evidenceFloor`
// meta), so every predicate takes the floor as an optional argument. PURE: no DOM, no Vue.

/** Rank and superlative language needs n ≥ this. */
export const EVIDENCE_FLOOR = 5;

/** What n counts, in its two grammatical numbers ("filer" / "filers", "test" / "tests"). */
export interface CountNoun {
    one: string;
    many: string;
}

/** A regular count noun: `countNoun("filer")` → { one: "filer", many: "filers" }. Pass `many` for an
    irregular plural (`countNoun("county", "counties")`). */
export function countNoun(one: string, many: string = `${one}s`): CountNoun {
    return { one, many };
}

/** Rank and superlative words are licensed only at or above the evidence floor. A non-finite n
    (missing data) never meets it. */
export function floorMet(n: number, floor: number = EVIDENCE_FLOOR): boolean {
    return Number.isFinite(n) && n >= floor;
}

/** The noun for n: "1 filer", "0 filers", "6 filers" (only exactly 1 is singular). */
export function nounFor(n: number, noun: CountNoun): string {
    return n === 1 ? noun.one : noun.many;
}

/** The count line every sub-floor cell carries beside its value: "n = 1 filer", "n = 3 tests". */
export function nCount(n: number, noun: CountNoun): string {
    return `n = ${n} ${nounFor(n, noun)}`;
}

/** A sub-floor aggregate's value: the values themselves, never an order statistic. One value prints
    as itself; several print as their span ("0.12–0.40"), which ranks nothing. Non-finite values are
    dropped; an empty set prints "—". */
export function valueSpan(values: readonly number[], fmt: (v: number) => string): string {
    const finite = values.filter((v) => Number.isFinite(v));
    if (!finite.length) return "—";
    const lo = Math.min(...finite);
    const hi = Math.max(...finite);
    return lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
}

export interface SubFloorNoteOptions {
    /** The sample size. */
    n: number;
    /** What n counts. */
    noun: CountNoun;
    /** The withheld construct, as a sentence subject ("A peer band", "A peer-relative score"). */
    withheld: string;
    /** What is drawn instead, as a plural noun phrase (default "values"; "counts" when the cells
        are counts). */
    shown?: string;
    floor?: number;
}

/** Why a peer-relative construct is withheld below the floor, and what is drawn instead:
    "A peer band needs at least 5 filers, so each filer's own counts are shown without one." */
export function subFloorReason({
    noun,
    withheld,
    shown = "values",
    floor = EVIDENCE_FLOOR,
}: Omit<SubFloorNoteOptions, "n">): string {
    return `${withheld} needs at least ${floor} ${noun.many}, so each ${noun.one}'s own ${shown} are shown without one.`;
}

/** The whole note a peer-relative figure carries below the floor: the count line, then the reason.
    A count and a method clause, never an entity or a verdict:
    "n = 1 filer. A peer band needs at least 5 filers, so each filer's own counts are shown without one." */
export function subFloorNote(opts: SubFloorNoteOptions): string {
    return `${nCount(opts.n, opts.noun)}. ${subFloorReason(opts)}`;
}
