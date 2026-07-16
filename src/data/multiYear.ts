// platform/data/multiYear.ts — the cross-year AGGREGATE REDUCER (INV-4). It collapses
// the year dimension for a set of selected years, folding each measure by the rule the
// pipeline declared in `meta.aggregable`. No viz computes its own aggregate; they all
// read one row per key from here, blind to whether it's a year-slice or a reduction
// (G6 §3.1/§3.2).
//
// The taxonomy (the contract's `AggregateRule`, INV-4's four-type spec):
//   - `sum`      — magnitude: add the values across years (dollars, counts).
//   - `latest`   — carry the newest selected year's value (vintage-y stocks).
//   - `mean`     — simple average (a rate with uniform weight).
//   - `{weightedAvg}` — Σ(vᵢ·wᵢ)/Σwᵢ, the rate weighted by another measure.
//   - `{ratio}`  — recompute from the summed [numerator, denominator] measures.
//
// REFUSE TO DEFAULT (G6 §9 R5): a measure absent from `meta.aggregable` is EXCLUDED
// from the reduced row, never silently summed. Summing a rate across years is wrong;
// only `aggregable` makes the fold right, so an undeclared column is dropped fail-loud
// rather than guessed.
import type { AggregateRule, Feed, FeedMeta, FeedRow } from "./contract.js";

/** Coerce a row cell to a finite number, or `null` for missing / non-numeric. */
function num(v: string | number | null | undefined): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The latest-year value for a measure across a key's rows (the newest non-null). */
function latest(rows: FeedRow[], measure: string): number | null {
    let best: { year: number; value: number } | null = null;
    for (const r of rows) {
        const v = num(r[measure]);
        if (v == null) continue;
        if (best == null || r.year > best.year) best = { year: r.year, value: v };
    }
    return best?.value ?? null;
}

/** Σ of a measure across a key's rows (nulls contribute nothing). */
function sum(rows: FeedRow[], measure: string): number | null {
    let acc = 0;
    let seen = false;
    for (const r of rows) {
        const v = num(r[measure]);
        if (v == null) continue;
        acc += v;
        seen = true;
    }
    return seen ? acc : null;
}

/** Simple mean of a measure across a key's rows (over the non-null values). */
function mean(rows: FeedRow[], measure: string): number | null {
    let acc = 0;
    let count = 0;
    for (const r of rows) {
        const v = num(r[measure]);
        if (v == null) continue;
        acc += v;
        count += 1;
    }
    return count > 0 ? acc / count : null;
}

/** Σ(vᵢ·wᵢ)/Σwᵢ — the weighted average of `measure` by the `weight` column. */
function weightedAvg(rows: FeedRow[], measure: string, weight: string): number | null {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const r of rows) {
        const v = num(r[measure]);
        const w = num(r[weight]);
        if (v == null || w == null) continue;
        weightedSum += v * w;
        weightTotal += w;
    }
    return weightTotal !== 0 ? weightedSum / weightTotal : null;
}

/** Σnumerator / Σdenominator — recompute a ratio from its summed component measures. */
function ratio(rows: FeedRow[], numerator: string, denominator: string): number | null {
    const n = sum(rows, numerator);
    const d = sum(rows, denominator);
    if (n == null || d == null || d === 0) return null;
    return n / d;
}

/** Fold one measure over a key's rows per its declared `AggregateRule`. */
function foldMeasure(
    rows: FeedRow[],
    measure: string,
    rule: AggregateRule,
): number | null {
    if (rule === "sum") return sum(rows, measure);
    if (rule === "latest") return latest(rows, measure);
    if (rule === "mean") return mean(rows, measure);
    if ("weightedAvg" in rule) return weightedAvg(rows, measure, rule.weightedAvg);
    return ratio(rows, rule.ratio[0], rule.ratio[1]);
}

/** Group rows by the feed's key column. */
function groupByKey(rows: FeedRow[], keyField: string): Map<string, FeedRow[]> {
    const groups = new Map<string, FeedRow[]>();
    for (const r of rows) {
        const key = String(r[keyField] ?? "");
        const bucket = groups.get(key);
        if (bucket) bucket.push(r);
        else groups.set(key, [r]);
    }
    return groups;
}

/**
 * The AGGREGATE REDUCER. Given a feed, a set of selected years, and the feed's
 * `aggregable` spec, return one reduced row per key — the year dimension collapsed,
 * each measure folded by its rule. Only measures present in `aggregable` survive
 * (the refuse-to-default rule); the key column and `year` (set to the latest selected)
 * are carried so the reduced row stays a valid `FeedRow`.
 */
export function aggregateRows(
    feed: Feed,
    years: Iterable<number>,
    aggregable: Record<string, AggregateRule> = feed.meta.aggregable,
): Map<string, FeedRow> {
    const yearSet = new Set(years);
    const inScope = feed.rows.filter((r) => yearSet.has(r.year));
    const latestSelected = inScope.reduce((m, r) => Math.max(m, r.year), -Infinity);
    const keyField = feed.meta.keyField;
    const groups = groupByKey(inScope, keyField);

    const reduced = new Map<string, FeedRow>();
    for (const [key, rows] of groups) {
        const row: FeedRow = {
            [keyField]: key,
            year: Number.isFinite(latestSelected) ? latestSelected : 0,
        };
        for (const measure of Object.keys(aggregable)) {
            row[measure] = foldMeasure(rows, measure, aggregable[measure]);
        }
        reduced.set(key, row);
    }
    return reduced;
}

/**
 * The single-year slice: one row per key for exactly the given year — the trivial
 * "collapse" that the `single` year-scope binds to. Returns a `Map<key,row>` so the
 * caller branches uniformly with the aggregate (G6 §3.2 "both are `Map<key,row>`").
 */
export function sliceYear(feed: Feed, year: number): Map<string, FeedRow> {
    const keyField = feed.meta.keyField;
    const out = new Map<string, FeedRow>();
    for (const r of feed.rows) {
        if (r.year === year) out.set(String(r[keyField] ?? ""), r);
    }
    return out;
}

/**
 * The COMPARE helper: rows kept distinct per year for the range/compare mode — a map
 * of `year → Map<key,row>` the small-multiple grid iterates. Unlike the aggregate it
 * collapses nothing; the years stay side by side (G7 §17 the `range` result `many`).
 */
export function compareYears(
    feed: Feed,
    years: Iterable<number>,
): Map<number, Map<string, FeedRow>> {
    const frames = new Map<number, Map<string, FeedRow>>();
    const sorted = [...new Set(years)].sort((a, b) => a - b);
    for (const year of sorted) frames.set(year, sliceYear(feed, year));
    return frames;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE FOURTH SELECTOR — `trajectory()` (the per-year FOLDED SERIES, un-orphaning
// the engine for the H.W2 multi-year crown). single→slice, range→compare,
// aggregate→reduce, trajectory→one point PER YEAR over the feed's full span.
// ─────────────────────────────────────────────────────────────────────────────

/** One year on a trajectory — the year's fold of each requested measure. */
export interface TrajectoryPoint {
    year: number;
    /** measure → folded value for that year (`null` = honest gap, never 0). */
    values: Record<string, number | null>;
}

/**
 * THE TRAJECTORY REDUCER. Walk the feed's FULL year span (`feed.meta.years`,
 * sorted) and emit one `TrajectoryPoint` per year — each measure folded by the
 * SAME `AggregateRule` the aggregate uses (one taxonomy, INV-4). It generalizes
 * the hand-rolled `sci/store.ts` `utilizationSeries` per-year Σ loop to N measures,
 * each by its declared rule, with the engine's three laws intact:
 *
 *   · GAP / SOFT-START — a year with NO rows (or all-null cells for a measure)
 *     yields `null` for that measure (the fold over an empty/all-null group). The
 *     `null` flows to the chart un-interpolated (`connectNulls:false`) — the
 *     designed void (SYS-3). A year ABSENT from `meta.years` is never invented; a
 *     year present-but-empty is a `null` point (the span still hosts it).
 *   · REFUSE-TO-DEFAULT (G6 §9 R5) — a measure NOT in `aggregable` is rejected
 *     FAIL-LOUD (throws, naming the measure), never folded as a silent `sum`. This
 *     is the discriminator from the store template, which summed by default.
 *   · PURE — no Vue, headless-testable (mirrors `resolveScope`/`aggregateRows`).
 *
 * The crown reads `trajectory(feed, measures)` directly off the feed (the whole-
 * span read is orthogonal to single/range/aggregate — `resolveScope` gains no
 * branch); the active-year rivet is layered on at the render seam, not here.
 */
export function trajectory(
    feed: Feed,
    measures: string[],
    aggregable: Record<string, AggregateRule> = feed.meta.aggregable,
): TrajectoryPoint[] {
    // REFUSE-TO-DEFAULT: every requested measure MUST declare a fold rule. An
    // undeclared measure is rejected loud (its fold across years would otherwise be
    // a silent guess — summing a rate is the exact error the engine forbids).
    for (const m of measures) {
        if (!(m in aggregable)) {
            throw new Error(
                `trajectory(): measure "${m}" is absent from meta.aggregable — refuse to ` +
                    `default to a sum (G6 §9 R5). Declare its AggregateRule or drop it.`,
            );
        }
    }

    const keyField = feed.meta.keyField;
    void keyField; // the fold groups by year, not key (the per-year cross-entity fold).

    // Group the feed's rows by year so each year folds over its own rows.
    const byYear = new Map<number, FeedRow[]>();
    for (const r of feed.rows) {
        const bucket = byYear.get(r.year);
        if (bucket) bucket.push(r);
        else byYear.set(r.year, [r]);
    }

    // SPAN = the feed's full sorted year list — EVERY year is a point, even one with
    // no rows (an all-null point, the designed void; the axis spans ≥2 years).
    const span = [...feed.meta.years].sort((a, b) => a - b);
    return span.map((year) => {
        const rows = byYear.get(year) ?? [];
        const values: Record<string, number | null> = {};
        for (const m of measures) {
            // foldMeasure over an empty/all-null group → null (the soft-start gap).
            values[m] = foldMeasure(rows, m, aggregable[m]);
        }
        return { year, values };
    });
}

/**
 * THE `years≥6 ∧ continues` DISCRIMINATOR — the M-family's "is this a real
 * trajectory worth a window-arc?" predicate. A WINDOW (M2 WindowArcPlate) earns
 * the cycle-bracket + forecast drop-rule iff the measure's REAL (non-null) span is
 * ≥6 years AND CONTINUES — the latest real year reaches the feed's latest year (no
 * stale tail). A shorter / stale span degrades to the bare TrajectoryPlate (M1) —
 * still honest, never bespoke. This is the ONE convention the family shares (no
 * per-route crown logic): the same predicate selects the crown shape at all depths.
 */
export function isTrajectoryWindow(
    points: TrajectoryPoint[],
    measure: string,
): boolean {
    if (points.length === 0) return false;
    const realYears = points
        .filter((p) => p.values[measure] != null)
        .map((p) => p.year);
    if (realYears.length < 6) return false;
    const latestReal = Math.max(...realYears);
    const latestSpan = Math.max(...points.map((p) => p.year));
    // CONTINUES: the real run reaches the feed's latest year (not a stale tail).
    return latestReal === latestSpan;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE SYNTHETIC TRAJECTORY FEED — the bridge a route's bespoke per-year series
// crosses to reach the M-family crown (H.W2 chapter integration).
// ─────────────────────────────────────────────────────────────────────────────

/** One pre-derived year on a route's trajectory: the year + its measure→value map
    (`null` = the designed void, never 0). The SAME shape the chapter stores already
    fold (`importExportTrajectory`, `utilizationSeries`, `windowArcTrajectory`). */
export interface TrajectoryFeedPoint {
    year: number;
    /** measure → its pre-derived value for that year (`null` = an honest gap). */
    values: Record<string, number | null>;
}

/**
 * Wrap a route's PRE-DERIVED per-year series in a `Feed` envelope the M-family crown
 * (MultiYearFigure / TrajectoryPlate / WindowArcPlate) consumes. The family folds every
 * crown off `trajectory(feed, measures)`, which groups by year — so a feed of ONE synthetic
 * entity-row PER YEAR makes the per-year fold an IDENTITY (a singleton group folds to its own
 * cell under any rule), reproducing the chapter's exact bespoke series without the family
 * re-deriving it. The store keeps owning the reduction (the Σ-over-fips wedge, the Σ-fleet
 * headroom, the Σ-window cliff); this only re-houses it in the shape the one crown reads.
 *
 * The measures are declared `latest` in `aggregable` — the identity fold for a singleton group
 * (never a re-sum), so a route whose bespoke fold is itself a Σ is not summed a second time. A
 * `null` cell flows through as the designed void (`connectNulls:false` breaks the line at it).
 *
 * `span` lets a route widen the feed's year axis past its own data to host a REAL internal gap as
 * a designed void — the USF decade splices the structurally-absent 2021 (the program-skip; the
 * feed's `meta.years` genuinely omit it) as a `null`-valued void year so the crown DRAWS the break
 * + stamps `data-void-year`, the gap-is-a-designed-void idiom (SYS-3). This capability is for a
 * GENUINE hole ONLY (INV-H4: a void must trace to a real absence in the feed): SCI (continuous
 * 2014..2025) and ECF (the closed 3-window arc 2021..2023) have NO internal gap, so they pass NO
 * `span` and splice NO void — a fabricated void on continuous/complete data is a lie, not a design.
 * When omitted the span is exactly the points' own years.
 */
export function trajectoryFeed(
    dataset: string,
    keyField: string,
    points: TrajectoryFeedPoint[],
    measures: string[],
    span?: number[],
): Feed {
    const byYear = new Map<number, TrajectoryFeedPoint>();
    for (const p of points) byYear.set(p.year, p);
    const years = [...new Set(span ?? points.map((p) => p.year))].sort((a, b) => a - b);
    const latestYear = years.length > 0 ? years[years.length - 1] : 0;

    // One row per year (the synthetic single entity) — a year with no point (a spliced void
    // year) carries all-`null` cells so the crown breaks the line + honours the void.
    const rows: FeedRow[] = years.map((year) => {
        const pt = byYear.get(year);
        const row: FeedRow = { [keyField]: dataset, year };
        for (const m of measures) row[m] = pt ? (pt.values[m] ?? null) : null;
        return row;
    });

    const aggregable: Record<string, AggregateRule> = {};
    for (const m of measures) aggregable[m] = "latest";

    return {
        meta: {
            schemaVersion: 2,
            dataset,
            keyField,
            entityGrain: "state",
            years,
            latestYear,
            generatedAt: new Date(0).toISOString(),
            measures,
            aggregable,
        },
        rows,
    };
}

/** Convenience re-export of the meta type a reducer caller commonly threads. */
export type { FeedMeta };
