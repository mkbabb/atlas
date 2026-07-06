// platform/data/useYearScope.ts — the URL-synced year-scope selector (INV-9, the
// time dimension as a cross-cutting platform feature). It holds the one `YearScope`
// state every dashboard, saved-view, and deep-link inherits, and turns a loaded
// `Feed` into the scoped rows the vizes bind to. The year-scrubber UI (B4) consumes
// this; no viz manages its own year state.
//
// MODE NAMING (the adjudicated grammar, G7 §16 — binding for this wave): the enum is
// `single | range | aggregate`. P4's spelling wins because it ships the URL contract
// (`?yearMode=…`); G7's "compare" is demoted to the human name for what range mode
// *renders* (small-multiples / overlay), not a fourth enum value. So range keeps the
// years distinct (`many` frames); aggregate collapses them (`agg`); single is one slice.
//
// STATE SHAPE (the reconciled union, G7 §17): one discriminated union, smaller than
// either a bare scalar or a `Set + flag`, so the mode and the period-list cannot drift.
//
// ONE URL-STATE SOURCE (B4 scrubber fix): the year-scope does NOT mint its own
// `useUrlSearchParams` instance — it reads/writes the SAME reactive bag the view-params
// store already owns (`useUrlState`). Two independent VueUse instances each rebuild the
// query from only their own keys per write and only resync state←URL on `popstate`
// (which `replaceState` never fires), so a year write through a second instance never
// re-runs the first instance's computeds — the scrubber wrote the URL but the active year
// stayed frozen. Sharing the one bag makes `?year=` a live, reactive read for every
// consumer (the thumb, the freshness chip, the barometer, the morph trigger).
import { computed, shallowRef, type ComputedRef, type Ref } from "vue";
import type { UseUrlState } from "@/platform/composables/useUrlState";
import type { Feed, FeedRow } from "./contract";
import {
    aggregateRows,
    compareYears,
    sliceYear,
    type TrajectoryPoint,
} from "./multiYear";

/** The three year-scope query keys the scrubber owns on the shared URL bag. */
type YearScopeKey = "yearMode" | "year" | "years";

/** The three viewing modes (G7 §16, adjudicated). */
export type YearMode = "single" | "range" | "aggregate";

/** The selection: a scalar year for `single`, a year list for the multi modes. */
export type YearScope =
    | { mode: "single"; year: number }
    | { mode: "range"; years: number[] }
    | { mode: "aggregate"; years: number[] };

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

/** Parse the `?years=` token: contiguous runs as `a-b`, gaps comma-separated. */
function parseYears(raw: string | undefined): number[] {
    if (!raw) return [];
    const out = new Set<number>();
    for (const part of raw.split(",")) {
        const span = part.split("-").map((s) => Number(s.trim()));
        if (span.length === 2 && Number.isFinite(span[0]) && Number.isFinite(span[1])) {
            const [lo, hi] = span[0] <= span[1] ? span : [span[1], span[0]];
            for (let y = lo; y <= hi; y++) out.add(y);
        } else if (span.length === 1 && Number.isFinite(span[0])) {
            out.add(span[0]);
        }
    }
    return [...out].sort((a, b) => a - b);
}

/** Serialize a year list, packing contiguous runs as `a-b` (the inverse of parse). */
function serializeYears(years: number[]): string {
    const sorted = [...new Set(years)].sort((a, b) => a - b);
    const parts: string[] = [];
    let i = 0;
    while (i < sorted.length) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
        parts.push(i === j ? `${sorted[i]}` : `${sorted[i]}-${sorted[j]}`);
        i = j + 1;
    }
    return parts.join(",");
}

/** The composable's reactive surface. */
export interface UseYearScope {
    /** The current discriminated scope (reactive read). */
    scope: ComputedRef<YearScope>;
    /** The active mode (`?yearMode=`). */
    mode: ComputedRef<YearMode>;
    /** The feed's full sorted year list — the scrubber's track domain. */
    years: number[];
    /** The newest year — the scrubber's default thumb position. */
    latestYear: number;
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
    /** Switch to single-year mode at `year`. */
    setSingle: (year: number) => void;
    /** Switch to range (compare) mode over `years`. */
    setRange: (years: number[]) => void;
    /** Switch to aggregate mode over `years`. */
    setAggregate: (years: number[]) => void;
    /**
     * THE SCROLL FACE OF THE CLOCK (H.W11.a — one clock, many faces; the CUT-2 lesson).
     * Register a temporal viz's scroll-year source as a SECOND READER of THIS one scope —
     * NOT a second year store. The source is a reactive `number | null`: a whole year while
     * the viz is being scrubbed (the scroll-timeline's year facet resolved a year), or `null`
     * when the viz is not the active scroll subject (then `activeYear` falls back to the
     * URL-derived year — the dock's "Compare years" face). The binding REPLACES any prior
     * source (one scroll face at a time — the active temporal viz), so this stays a single
     * input to the one `activeYear` computed, never an N-clock fan. Returns an `unbind` to
     * release the face on the viz's unmount (the year falls back to the URL face).
     */
    bindScrollYear: (source: Ref<number | null>) => () => void;
}

/**
 * The year-scope composable. Binds `{mode, year, years[]}` to the URL query
 * (`?yearMode=&year=&years=`) through the SHARED `useUrlState` bag the view-params store
 * owns — NOT a freshly-minted `useUrlSearchParams` instance — so a scrub re-runs every
 * reader's computeds off the one reactive query (the B4 scrubber fix). Defaults to single
 * mode at `latestYear` so any reader shows the newest year (the rung-2 v1 guard, G6 §9
 * R1). The default year list, when a mode needs one and none is in the URL, is the feed's
 * full `meta.years`.
 *
 * The caller passes the store's shared url-state in (the view-params store builds it once
 * via `useUrlState` and folds the year-scope onto it); the codec keys (`yearMode/year/
 * years`) ride that same bag alongside the dashboard's other params.
 */
export function useYearScope(feed: Feed, url: UseUrlState<YearScopeKey>): UseYearScope {
    const params = url.params;

    const latestYear = feed.meta.latestYear;
    const allYears = feed.meta.years;

    const mode = computed<YearMode>(() => {
        const m = params.yearMode;
        return m === "range" || m === "aggregate" ? m : "single";
    });

    const scope = computed<YearScope>(() => {
        if (mode.value === "single") {
            const year = Number(params.year);
            return { mode: "single", year: Number.isFinite(year) ? year : latestYear };
        }
        const years = parseYears(params.years);
        const selected = years.length > 0 ? years : allYears;
        return { mode: mode.value, years: selected };
    });

    // ── THE SCROLL FACE (H.W11.a) ─────────────────────────────────────────────────────────
    // ONE optional reader-source: a temporal viz's scroll-resolved year (or null when no viz
    // is being scrubbed). The scope holds a GETTER (`() => number | null`), NOT the bound
    // `Ref` itself — a function is never auto-unwrapped by Vue's reactive typing, and calling
    // it inside the `scrollYear` computed establishes the dependency THROUGH the source ref
    // (reactive without storing a ref-of-ref). It is a single source — NOT a second year
    // store; binding a viz REPLACES it (one active scroll face), so `activeYear` always has
    // exactly one scroll input alongside the URL face.
    const scrollYearGetter = shallowRef<(() => number | null) | null>(null);
    const scrollYear = computed<number | null>(
        () => scrollYearGetter.value?.() ?? null,
    );

    // The single representative active year (the scrubber thumb + the barometer/
    // freshness re-weight): the SCROLL face when a viz is actively scrubbing, else the URL
    // face — the chosen year in single mode, else the latest of the selected years (the same
    // collapse the single-value vizes take, store.ts). The scroll face is clamped to the
    // feed's real domain so a stray source never reports a year outside the data.
    const activeYear = computed<number>(() => {
        const scrolled = scrollYear.value;
        if (scrolled != null && allYears.length > 0) {
            const first = allYears[0];
            const last = allYears[allYears.length - 1];
            return scrolled < first ? first : scrolled > last ? last : scrolled;
        }
        const s = scope.value;
        if (s.mode === "single") return s.year;
        return s.years.length > 0 ? Math.max(...s.years) : latestYear;
    });

    function bindScrollYear(source: Ref<number | null>): () => void {
        const getter = (): number | null => source.value;
        scrollYearGetter.value = getter;
        return () => {
            // Release ONLY if still the bound source (a later viz may have taken the face).
            if (scrollYearGetter.value === getter) scrollYearGetter.value = null;
        };
    }

    function setSingle(year: number): void {
        url.set("yearMode", "single");
        // Single mode writes ONLY `?year=` (the round-trip contract, FD6 §6.3);
        // the multi-mode `?years=` token is cleared so the URL carries one source.
        url.set("year", String(year));
        url.set("years", undefined);
    }
    function setRange(years: number[]): void {
        url.set("yearMode", "range");
        url.set("years", serializeYears(years));
    }
    function setAggregate(years: number[]): void {
        url.set("yearMode", "aggregate");
        url.set("years", serializeYears(years));
    }

    return {
        scope,
        mode,
        years: allYears,
        latestYear,
        activeYear,
        setSingle,
        setRange,
        setAggregate,
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
