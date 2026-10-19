// platform/data/useYearScope.ts — the URL-synced year-scope selector (INV-9, the
// time dimension as a cross-cutting platform feature). It holds the one `YearScope`
// state every dashboard, saved-view, and deep-link inherits, and turns a loaded
// `Feed` into the scoped rows the vizes bind to. The year-scrubber UI (B4) consumes
// this; no viz manages its own year state.
//
// MODE NAMING (the adjudicated grammar, G7 §16 — binding for this wave): the enum is
// `single | range | aggregate`. G7's "compare" is the human name for what range mode
// *renders* (small-multiples / overlay), not a fourth enum value. So range keeps the
// years distinct (`many` frames); aggregate collapses them (`agg`); single is one slice.
//
// STATE SHAPE (the reconciled union, G7 §17): one discriminated union, smaller than
// either a bare scalar or a `Set + flag`, so the mode and the period-list cannot drift.
//
// ONE KEY, SET-VALUED (U · §L 6(f), X-5′): the mode and the set ride one URL key through the one
// codec in `period.ts` (`?sy=2014-15..2025-26` pools; `?sy=range:…` compares; gaps are kept).
// The atlas 7 keys `yearMode`/`years` (and `year` on a school-year feed) are legacy: read once
// on load with a notice, never written.
//
// ONE URL-STATE SOURCE (B4 scrubber fix): the year-scope does NOT mint its own
// `useUrlSearchParams` instance — it reads/writes the SAME reactive bag the view-params
// store already owns (`useUrlState`). Two independent VueUse instances each rebuild the
// query from only their own keys per write and only resync state←URL on `popstate`
// (which `replaceState` never fires), so a year write through a second instance never
// re-runs the first instance's computeds — the scrubber wrote the URL but the active year
// stayed frozen. Sharing the one bag makes the period key a live, reactive read for every
// consumer (the thumb, the freshness chip, the barometer, the morph trigger).
import { computed, shallowRef, type ComputedRef, type Ref } from "vue";
import type { UseUrlState } from "../platform/composables/useUrlState.js";
import type { Feed, FeedRow } from "./contract.js";
import {
    aggregateRows,
    compareYears,
    sliceYear,
    type TrajectoryPoint,
} from "./multiYear.js";
import {
    periodCodecFor,
    periodKeys,
    restatePeriod,
    scopeText,
    type PeriodCodec,
    type PeriodNoun,
    type PeriodNotice,
    type PeriodScope,
} from "./period.js";

/** The three viewing modes (G7 §16, adjudicated). */
export type YearMode = "single" | "range" | "aggregate";

/** The selection: a scalar year for `single`, a set of years for the multi modes (gaps kept). */
export type YearScope = PeriodScope;

/**
 * The scoped result the vizes branch on by `kind` (never by `mode`, G7 §17):
 *   - `one` — a single year-slice, bind directly.
 *   - `many` — N year-frames, the small-multiple grid iterates.
 *   - `agg` — the reduced row-set, bind like a slice.
 * Both `one` and `agg` carry one `Map<key,row>`; only `many` carries the per-year map.
 */
export type YearScopeResult =
    | { kind: "one"; frame: Map<string, FeedRow> }
    | { kind: "many"; frames: Map<number, Map<string, FeedRow>> }
    | { kind: "agg"; frame: Map<string, FeedRow> };

/** The composable's reactive surface. */
export interface UseYearScope {
    /** The current discriminated scope (reactive read). */
    scope: ComputedRef<YearScope>;
    /** The active mode. */
    mode: ComputedRef<YearMode>;
    /** The feed's full sorted year list — the scrubber's track domain. */
    years: number[];
    /** The newest year — the scrubber's default thumb position. */
    latestYear: number;
    /** The ONE period noun of this feed's axis (X-11′): "school year" + "2024–25", or "year". */
    noun: PeriodNoun;
    /** The ONE codec of this feed's axis: its URL key (`sy` / `year`), parse and format. */
    codec: PeriodCodec;
    /** The reader-facing text of the scope: "2024–25", "2014–15 to 2025–26", "2014–15, 2025–26". */
    text: ComputedRef<string>;
    /**
     * The load-time restatement's disclosure (a legacy `?year=`/`?years=` link, a period the feed
     * does not carry, a clipped set, an unreadable value), or `null`. It belongs to the load and
     * closes on the reader's first period write; nothing else closes or reopens it.
     */
    notice: ComputedRef<PeriodNotice | null>;
    /**
     * The single most-representative active year — the scrubber thumb + the
     * value the dock barometer and the freshness chip re-weight to. In `single`
     * mode it is the chosen year; in `range`/`aggregate` it is the latest of the
     * selected years (the same year the single-value vizes collapse to).
     *
     * THE SCROLL FACE (H.W11.a) reads THROUGH here: when a temporal viz binds a
     * scroll-year source (`bindScrollYear`) and that source is engaged, `activeYear`
     * REPORTS the scroll year — so the dock's "Compare years" and the per-viz scroll
     * are the SAME `activeYear` signal (one clock, two faces), never a second store.
     */
    activeYear: ComputedRef<number>;
    /**
     * THE READER'S WRITE (§L 6(f), §K K-3): the one write path. Writes the scope through the
     * codec to the axis key and deletes the legacy keys in the same act. Call it only in answer
     * to a reader act. Throws on a key the feed does not carry (the controls offer only carried
     * keys, so that is a consumer defect, never a silent refusal). Releases any program hold.
     */
    setPeriod: (scope: YearScope) => void;
    /** `setPeriod({ mode: "single", year })`. */
    setSingle: (year: number) => void;
    /** `setPeriod({ mode: "range", years })`. */
    setRange: (years: number[]) => void;
    /** `setPeriod({ mode: "aggregate", years })`. */
    setAggregate: (years: number[]) => void;
    /**
     * A PROGRAM's period (a scene step): held in memory over the reader's period, never written
     * to the URL (§L 6(f): the scroll write is deleted). A new hold replaces the last; the
     * returned release hands the period back to the reader. A reader write releases it too.
     */
    hold: (scope: YearScope) => () => void;
    /**
     * THE SCROLL FACE OF THE CLOCK (H.W11.a — one clock, many faces; the CUT-2 lesson).
     * Register a temporal viz's scroll-year source as a SECOND READER of THIS one scope —
     * NOT a second year store. The source is a reactive `number | null`: a whole year while
     * the viz is being scrubbed (the scroll-timeline's year facet resolved a year), or `null`
     * when the viz is not the active scroll subject (then `activeYear` falls back to the
     * scope's year — the dock's "Compare years" face). The binding REPLACES any prior
     * source (one scroll face at a time — the active temporal viz), so this stays a single
     * input to the one `activeYear` computed, never an N-clock fan. Returns an `unbind` to
     * release the face on the viz's unmount (the year falls back to the scope face).
     */
    bindScrollYear: (source: Ref<number | null>) => () => void;
}

/**
 * The year-scope composable (U · §L 6(f), X-5′). Binds the feed's period to ONE URL key, the
 * axis key of `periodCodecFor(feed.meta)` (`?sy=` on a school-year feed, else `?year=`), through
 * the SHARED `useUrlState` bag the view-params store owns, so every reader's computeds re-run off
 * the one reactive query (the B4 scrubber fix).
 *
 * READ. The axis key is read live (Back and Forward re-read it) and restated against the feed's
 * carried years by `restatePeriod`. The legacy integer keys (`yearMode`, `years`, and `year` on a
 * school-year feed) are read ONCE, here at construction, restated element-wise with a notice, and
 * never written. With neither, the scope is the latest year.
 *
 * WRITE. Nothing is written on load. `setPeriod` (and its three mode verbs) is the reader's write;
 * `hold` is a program's in-memory period; neither writes anything else.
 */
export function useYearScope(feed: Feed, url: UseUrlState<string>): UseYearScope {
    const params = url.params;
    const latestYear = feed.meta.latestYear;
    const allYears = feed.meta.years;
    const codec = periodCodecFor(feed.meta);
    const noun = codec.noun;

    // The load-time query, read ONCE: the legacy keys and the load notice belong to it.
    const load = Object.fromEntries(periodKeys(codec).map((k) => [k, params[k]]));
    const atLoad = restatePeriod(load, allYears, codec);

    // The reader has written a period since load (closes the notice, retires the legacy read).
    const written = shallowRef(false);
    const held = shallowRef<YearScope | null>(null);

    const readerScope = computed<YearScope>(() => {
        if (!written.value && params[codec.param] == null) return atLoad.scope;
        return restatePeriod({ [codec.param]: params[codec.param] }, allYears, codec).scope;
    });
    const scope = computed<YearScope>(() => held.value ?? readerScope.value);
    const mode = computed<YearMode>(() => scope.value.mode);
    const text = computed(() => scopeText(scope.value, noun));
    const notice = computed<PeriodNotice | null>(() => (written.value ? null : atLoad.notice));

    // ── THE SCROLL FACE (H.W11.a) ─────────────────────────────────────────────────────────
    // ONE optional reader-source: a temporal viz's scroll-resolved year (or null when no viz
    // is being scrubbed). The scope holds a GETTER (`() => number | null`), NOT the bound
    // `Ref` itself — a function is never auto-unwrapped by Vue's reactive typing, and calling
    // it inside the `scrollYear` computed establishes the dependency THROUGH the source ref
    // (reactive without storing a ref-of-ref). It is a single source — NOT a second year
    // store; binding a viz REPLACES it (one active scroll face), so `activeYear` always has
    // exactly one scroll input alongside the scope face.
    const scrollYearGetter = shallowRef<(() => number | null) | null>(null);
    const scrollYear = computed<number | null>(() => scrollYearGetter.value?.() ?? null);

    const activeYear = computed<number>(() => {
        const scrolled = scrollYear.value;
        if (scrolled != null && allYears.length > 0) {
            const first = allYears[0]!;
            const last = allYears[allYears.length - 1]!;
            return scrolled < first ? first : scrolled > last ? last : scrolled;
        }
        const s = scope.value;
        return s.mode === "single" ? s.year : Math.max(...s.years);
    });

    function bindScrollYear(source: Ref<number | null>): () => void {
        const getter = (): number | null => source.value;
        scrollYearGetter.value = getter;
        return () => {
            // Release ONLY if still the bound source (a later viz may have taken the face).
            if (scrollYearGetter.value === getter) scrollYearGetter.value = null;
        };
    }

    function carriedOrThrow(s: YearScope): void {
        const keys = s.mode === "single" ? [s.year] : s.years;
        const foreign = keys.filter((k) => !allYears.includes(k));
        if (keys.length === 0 || foreign.length > 0) {
            throw new Error(
                `useYearScope(${feed.meta.dataset}): ${noun.plural} ${foreign.join(", ") || "(none)"} are not carried by this feed`,
            );
        }
    }

    function setPeriod(next: YearScope): void {
        carriedOrThrow(next);
        held.value = null;
        written.value = true;
        url.set(codec.param, codec.format(next));
        for (const key of codec.legacyParams) url.set(key, undefined);
    }

    function hold(next: YearScope): () => void {
        carriedOrThrow(next);
        held.value = next;
        return () => {
            if (held.value === next) held.value = null;
        };
    }

    return {
        scope,
        mode,
        years: allYears,
        latestYear,
        noun,
        codec,
        text,
        notice,
        activeYear,
        setPeriod,
        setSingle: (year) => setPeriod({ mode: "single", year }),
        setRange: (years) => setPeriod({ mode: "range", years }),
        setAggregate: (years) => setPeriod({ mode: "aggregate", years }),
        hold,
        bindScrollYear,
    };
}

/**
 * The pure selector: resolve a `YearScope` against a feed into the scoped rows. Kept
 * separate from the composable so it is testable without a reactive/URL harness and so
 * a non-Vue caller can fold the same way (single → one slice; range → N frames;
 * aggregate → the multiYear reduction). This is the "one selector returning
 * `Map<key,row>` blind to year-vs-aggregate" the wave gate names (G6 §3.2).
 */
export function resolveScope(feed: Feed, scope: YearScope): YearScopeResult {
    if (scope.mode === "single") {
        return { kind: "one", frame: sliceYear(feed, scope.year) };
    }
    if (scope.mode === "range") {
        return { kind: "many", frames: compareYears(feed, scope.years) };
    }
    return { kind: "agg", frame: aggregateRows(feed, scope.years) };
}

/** The active-year RIVET coordinate — the linked-clock seam (the scrubber thumb AND the
    crown's teal `markPoint` are the SAME `activeYear` signal, never two clocks). Given a
    trajectory and the `activeYear`, resolve the rivet's `(x, y)` for a lead measure: the
    rivet sits at `activeYear` on the lead measure's value. When that year is a designed void
    (the value is `null`), the rivet SNAPS to the nearest real year ≤ activeYear (so the rivet
    never floats off the line into the void) — and reports the year it landed on. Returns
    `null` when the trajectory carries no real point for the measure at all (an empty crown).

    PURE — no Vue. The crown reads `activeYear` off the store's `useYearScope` and feeds it
    here to place the rivet reactively: scrub the year → the rivet slides to the new year. */
export interface TrajectoryRivet {
    /** the x the rivet sits at (the active year, or the nearest real year ≤ it). */
    x: number;
    /** the lead measure's value at that year (never null — the snap guarantees a real point). */
    y: number;
}
export function trajectoryRivet(
    points: TrajectoryPoint[],
    measure: string,
    activeYear: number,
): TrajectoryRivet | null {
    // Exact hit: the active year carries a real value for the lead measure.
    const exact = points.find((p) => p.year === activeYear);
    if (exact && exact.values[measure] != null) {
        return { x: exact.year, y: exact.values[measure] as number };
    }
    // The active year is a void (or past the real run) — snap to the nearest real year ≤ it.
    let best: TrajectoryRivet | null = null;
    for (const p of points) {
        const v = p.values[measure];
        if (v == null || p.year > activeYear) continue;
        if (best == null || p.year > best.x) best = { x: p.year, y: v };
    }
    // If nothing ≤ activeYear is real (the active year precedes the run), fall to the earliest
    // real point (the rivet still lands on the line, never in the void).
    if (best == null) {
        for (const p of points) {
            const v = p.values[measure];
            if (v == null) continue;
            if (best == null || p.year < best.x) best = { x: p.year, y: v };
        }
    }
    return best;
}
