// platform/stores/useViewParams.ts — the per-view URL-synced param bag (a Pinia
// SETUP store). It generalizes the USF god-store's view state (program · hinge ·
// scale · filter) into a dashboard-agnostic surface: a dashboard REGISTERS its own
// param keys, and the store binds them to the URL query through `useUrlState` (the
// URL-as-document floor, INV-5) and folds in B2c's `useYearScope` (the time
// dimension, INV-9). A copied URL therefore reconstructs the full view — its params
// AND its year-scope — on reload, for any dashboard.
//
// GENERIC OVER THE DASHBOARD: the store knows nothing about `program` or `hinge`; it
// only persists string-keyed params a dashboard names. The USF store (B3) builds its
// typed accessors (`program`, `hinge`, `perCapitaScale`) on top of `param('program')`
// etc., so the URL contract lives here once and the dashboards declare their vocab.
//
// The year-scope binds against the ACTIVE feed (so its `latestYear` default and the
// full-`years` fallback are the active dashboard's), and is lazily attached once that
// feed has loaded — before then `yearScope` is null and a reader shows no year UI.

import { defineStore } from "pinia";
import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from "vue";
import { useUrlState } from "@/platform/composables/useUrlState";
import { useYearScope, type UseYearScope } from "@/data/useYearScope";
import { useActiveDashboard } from "@/platform/stores/useActiveDashboard";
import {
    encodeSelKey,
    parseSelKey,
    type SelectionKey,
    type SelectionKind,
} from "@/charts/contract/selection-contract";
// The LEA→county hop reads the TOPOLOGY-FREE `leaJoin` (NOT `geometry.ts`). `geometry.ts`
// statically imports the us-atlas states topology (the `geo-*.js` chunk) + the inlined
// NC-counties arcs; importing the join from THERE would drag that topology into the chrome
// chain (`useViewParams` ← `useVizOptions` ← VizPlate → the shared `charts-host` chunk EVERY
// route pulls), so /demand (zero geo marks) + the gallery would parse-block the map topology
// they never draw (J-PERF arm d, the geo leak). `leaJoin.leaToCountyFips` matches county NAMES
// from the committed glyph registry, so the focus county-hop stays synchronous + geo-free.
import { leaToCountyFips } from "@/data/leaJoin";

// ── THE `?focus` CROSS-ROUTE CODEC (I-UX.a · UX-S3 · the entity through-line) ──────────────────
//
// The focused entity TRAVELS across routes as `?focus=<grain>:<key>` — the SAME composite
// `{kind}:{id}` wire form I5 froze (selection-contract `encodeSelKey`/`parseSelKey`), now URL-
// persisted, twinning the shipped `?year`/`?yearMode` round-trip. A reader who focuses Wake on /sci
// opens /ecf with Wake pre-focused; the gallery cards READ it (the gallery readback FOLDS into I14).
//
// THE WIRE FORM. A `SelectionKey.key` is ALREADY `"<kind>:<id>"` — so serialize is "write the
// composite `key` verbatim" and parse is "run `parseSelKey`". No second codec: the param value IS
// the Set member, so `?focus=district:370480` and the in-store key are byte-identical. The migration
// guard rides for free (a malformed `?focus` parses to null → no focus, never a mis-grained mark).
//
// THE CROSS-GRAIN RESOLVE (LEA→county→state). The four routes lens DIFFERENT grains: a focused
// `district:<lea>` is a district on /sci, its COUNTY on a county-grain map, its STATE on the national
// view. `resolveFocusToGrain` walks the shipped `geometry.ts` join (`leaToCountyFips`, consumed
// read-only — NO new data) DOWN the grain ladder (district → county → state) so a focused LEA renders
// as the right cell on every route. The walk only ever COARSENS (a county cannot resolve to a
// specific district); a same-grain focus passes through untouched; an unresolvable hop returns null.

/** The grain-coarsening ladder NC's geo join supports: school/district resolve UP to county, county
    UP to state. `cell` (the speedtest hex) is its own grain with no geo-ladder hop. The index gives
    the coarsening order — a target coarser-or-equal to the source is reachable, finer is not. */
const GRAIN_LADDER: readonly SelectionKind[] = [
    "school",
    "district",
    "county",
    "state",
];

/** NC's single state FIPS — every county/LEA resolves UP to it on the national/state view (the
    county→state hop is the constant "37" since the atlas is NC-only; geometry.ts pins the same
    `NC_FIPS_PREFIX`). Named here so the state resolve reads ONE constant, not a scattered literal. */
const NC_STATE_FIPS = "37";

/**
 * Resolve a focused `SelectionKey` UP to a TARGET grain, walking the shipped `geometry.ts` join.
 * Returns the resolved composite key (`encodeSelKey(target, id)`) or null when the hop is
 * unreachable (a finer target than the source, or an LEA with no county signal). A same-grain
 * target passes the source through verbatim (round-trip identity). The walk is COARSEN-ONLY:
 *   school/district → county   via `leaToCountyFips` (the LEA→county join, consumed read-only)
 *   county/district/school → state   → the constant NC state FIPS
 * `cell` (and any kind off the geo ladder) only resolves to its OWN grain (no geo hop exists).
 */
export function resolveFocusToGrain(
    source: SelectionKey,
    target: SelectionKind,
): SelectionKey | null {
    // Same grain — pass through verbatim (the round-trip identity case).
    if (source.kind === target) return source;

    const srcRung = GRAIN_LADDER.indexOf(source.kind);
    const tgtRung = GRAIN_LADDER.indexOf(target);
    // Off the geo ladder (a `cell`, or an unknown), or a FINER target than the source: unreachable.
    if (srcRung === -1 || tgtRung === -1 || tgtRung < srcRung) return null;

    // The STATE rung — every county/district/school coarsens to the one NC state FIPS.
    if (target === "state") {
        return {
            kind: "state",
            id: NC_STATE_FIPS,
            key: encodeSelKey("state", NC_STATE_FIPS),
        };
    }
    // The COUNTY rung — a school/district resolves through the shipped LEA→county join
    // (`leaJoin`, topology-free — see the import note above).
    if (target === "county") {
        const fips = leaToCountyFips(source.id);
        if (!fips) return null;
        return { kind: "county", id: fips, key: encodeSelKey("county", fips) };
    }
    return null;
}

// ── THE `?at` NARRATIVE-ANCHOR CODEC (K-ANIM A1 · the shareable reading position) ───────────────
//
// The reader's narrative position TRAVELS as `?at=<beatId>[.<stepId>]` — a COARSE, layout-INDEPENDENT
// semantic waypoint (the chapter/section DOM id the dock already observes), the `?focus` line-mirror.
// The DECLARED-vs-DERIVED law (A1·§4): URL-back what the reader DECLARED (the beat they read to);
// RE-DERIVE what scroll computes (`activeVizId`, the rim, the scene-step) — NEVER URL-back the
// per-frame argmin (the `k0-url-declared-only` seal). The `?at.stepId` is a one-shot RESTORE seed a
// K-SCENE host consumes, NOT a standing back (a scrolled-past step re-derives, the same churn law).

/** A parsed narrative anchor — the coarse beat the reader is at, + an optional scene-step seed. */
export interface NarrativeAnchor {
    beatId: string;
    stepId?: string;
}

/** Parse `?at=<beatId>[.<stepId>]` — the FIRST dot splits beat/step (a step id may itself carry no
    dot). An empty/absent beat → null (the migration guard, twinning `focusKey`'s null guard: a
    garbled value parses to null, never a crash). */
export function parseAt(raw: string | undefined): NarrativeAnchor | null {
    if (!raw) return null;
    const dot = raw.indexOf(".");
    const beatId = dot === -1 ? raw : raw.slice(0, dot);
    if (!beatId) return null;
    const stepId = dot === -1 ? undefined : raw.slice(dot + 1) || undefined;
    return stepId ? { beatId, stepId } : { beatId };
}

/** Encode a narrative anchor to its `?at` wire form (the `parseAt` inverse — round-trip identity). */
export function encodeAt(a: NarrativeAnchor): string {
    return a.stepId ? `${a.beatId}.${a.stepId}` : a.beatId;
}

/** Promote a direct authored `?scene` onto its owning beat's existing narrative anchor. An explicit
    different beat or step wins; an invalid scene leaves the current anchor untouched. */
export function resolveSceneAnchor(
    beatId: string | undefined,
    sceneId: string | undefined,
    authoredScenes: readonly string[],
    current: NarrativeAnchor | null,
): NarrativeAnchor | null {
    if (!beatId || !sceneId || !authoredScenes.includes(sceneId)) return current;
    if (current && (current.beatId !== beatId || current.stepId)) return current;
    return { beatId, stepId: sceneId };
}

export const useViewParams = defineStore("platform:viewParams", () => {
    const active = useActiveDashboard();

    // The generic URL param bag. Keys are advisory strings (a dashboard's own vocab);
    // `useUrlState` narrows the reads (string / number / list) at the access site.
    const url = useUrlState<string>();

    /** The param keys a dashboard has declared it owns (for introspection / a reset). */
    const registeredKeys = ref<Set<string>>(new Set());

    /**
     * Register the param keys a dashboard reads/writes. Idempotent — re-registering a
     * key is a no-op — so a dashboard can declare its vocab at setup without guarding.
     */
    function registerKeys(keys: readonly string[]): void {
        const next = new Set(registeredKeys.value);
        for (const k of keys) next.add(k);
        registeredKeys.value = next;
    }

    /** Read a string param (the raw query value), or `fallback` when absent. */
    function param(key: string, fallback?: string): string | undefined {
        return url.get(key, fallback);
    }
    /** Write a string param; `undefined`/`""` clears it from the URL. */
    function setParam(key: string, value: string | undefined): void {
        url.set(key, value);
    }
    /** Read a numeric param, or `fallback` when absent / non-finite. */
    function numberParam(key: string, fallback?: number): number | undefined {
        return url.getNumber(key, fallback);
    }
    /** Write a numeric param (serialized to its decimal string). */
    function setNumberParam(key: string, value: number | undefined): void {
        url.setNumber(key, value);
    }
    /** Read a comma-separated list param as trimmed, non-empty tokens. */
    function listParam(key: string): string[] {
        return url.getList(key);
    }
    /**
     * Write a list param as a comma-joined token string (empty clears it). This is the ONE
     * list codec — the USF `regions` round-trip AND the C.W4.2 `?sel=` selection-set
     * round-trip ride it (no new codec; the selection set is just another registered list).
     */
    function setListParam(key: string, values: readonly string[]): void {
        url.setList(key, values);
    }

    /** Clear every registered param from the URL (a view reset; year-scope untouched). */
    function resetParams(): void {
        for (const k of registeredKeys.value) url.set(k, undefined);
    }

    // ── THE `?focus` ROUND-TRIP (UX-S3 · twins `?year`/`?yearMode`) ─────────────────────────────
    // The focused entity, URL-persisted as `?focus=<grain>:<key>`. Like the year-scope, it rides the
    // SAME shared `url` bag but owns its own key (not in `registeredKeys` — a platform through-line,
    // not a dashboard's vocab), so a copied URL reconstructs the focused subject across routes.
    const FOCUS_KEY = "focus";

    /** The PARSED focused key off `?focus`, or null when absent / malformed (the migration guard —
        a garbled `?focus` parses to null, never a mis-grained focus). Reactive: it re-reads the one
        URL bag, so a route change / reload re-resolves the focused subject. */
    const focusKey: ComputedRef<SelectionKey | null> = computed(() => {
        const raw = url.get(FOCUS_KEY);
        return raw ? parseSelKey(raw) : null;
    });

    /**
     * Serialize a focused key to `?focus` — write the composite `key` verbatim (it IS the wire
     * form). `null` clears the param (the focus through-line ends). A `SelectionKey` or a bare
     * composite string are both accepted (the producer may pass either the parsed item or its key).
     */
    function setFocus(key: SelectionKey | string | null): void {
        const wire = key === null ? undefined : typeof key === "string" ? key : key.key;
        url.set(FOCUS_KEY, wire);
    }

    /**
     * The focused key RESOLVED to a target grain (UX-S3 cross-grain) — a focused LEA resolved to
     * its county for a county-grain route, its state for the national view, walking the shipped
     * `geometry.ts` join. Null when nothing is focused or the hop is unreachable.
     */
    function focusForGrain(target: SelectionKind): SelectionKey | null {
        const f = focusKey.value;
        return f ? resolveFocusToGrain(f, target) : null;
    }

    // ── THE `?sel` SELECTION-SET ROUND-TRIP (O-A11 · C.W4.2 · the drill-down deep link) ──────────────
    // The sticky selection SET, URL-persisted as `?sel=<k1>,<k2>,…` — the comma-joined composite
    // `{kind}:{id}` keys the store already holds. Like `?focus`, it rides the SAME shared `url` bag but
    // owns its own key (a platform through-line, not a dashboard's vocab), reusing the ONE list codec
    // (`getList`/`setList` — the USF `regions` round-trip's codec). The READ drops legacy-bare / foreign
    // keys via `parseSelKey` (the migration guard), so a stale token never mis-grains a mark. The store's
    // URL bridge (`useSelection`) is the SOLE writer (single-writer preserved).
    const SEL_KEY = "sel";

    /** The PARSED selection set off `?sel` — every token resolved to `{kind,id,key}`, legacy-bare /
        foreign keys DROPPED (`parseSelKey` returns null). The single/multi determination is post-drop:
        `?sel=state:48,37,cell:x` parses to `[state:48, cell:x]` (the bare `37` gone). Reactive. */
    const selKeys: ComputedRef<SelectionKey[]> = computed(() =>
        url
            .getList(SEL_KEY)
            .map(parseSelKey)
            .filter((s): s is SelectionKey => s !== null),
    );

    /** Write the selection set to `?sel` (comma-joined composite keys); an empty set CLEARS the param.
        The list codec left VERBATIM — each token is already the Set member (`SelectionKey.key`). */
    function setSel(keys: Iterable<string>): void {
        url.setList(SEL_KEY, [...keys]);
    }

    // ── THE DRILL-AND-FILTER PROMOTION (O-A11 · [ANSWERS Q-45] · the un-filter seam) ──────────────────
    // The drill panel's `[Filter to these ▸]` promotes the selection into the route's PERSISTENT filter
    // state, URL-persisted as `?filto=<k1>,<k2>,…` — the promoted set of composite `{kind}:{id}` keys.
    // DISTINCT from `?sel` by design: `?sel` is the TRANSIENT selection that drives the drill panel and
    // clears on dismiss/Esc; `?filto` is the co-filter the promote verb LIFTS OUT of it — it PERSISTS
    // across a selection clear, round-trips (shareable / reload-stable), and is reversed ONLY by the
    // explicit `[✕ un-filter]` affordance, so the filter is never a one-way trap. It is the FIRST-CLASS
    // home the route folds into its `matchByKey` co-filter (`promotedIdsOf(grain)`) — NOT an overload of
    // an unrelated param (`?fig` is the plate-expand home; the promotion owns its OWN key). Rides the SAME
    // `url` bag + the ONE list codec (a platform through-line, not a dashboard's vocab); the READ drops
    // legacy-bare / foreign keys via `parseSelKey` (the migration guard, twinning `selKeys`).
    const FILTO_KEY = "filto";

    /** The PARSED promoted co-filter set off `?filto` — every token resolved to `{kind,id,key}`,
        legacy-bare / foreign keys DROPPED (`parseSelKey` returns null). Reactive: a reload / route change
        re-reads the one URL bag (the `?sel` twin). */
    const promotedFilterKeys: ComputedRef<SelectionKey[]> = computed(() =>
        url
            .getList(FILTO_KEY)
            .map(parseSelKey)
            .filter((s): s is SelectionKey => s !== null),
    );

    /** True when a DRILL-AND-FILTER co-filter is LIVE — drives the `SelectionDrilldownPanel` `filtered`
        prop (hence the persistent `[✕ un-filter]` affordance). The post-drop count, so a `?filto` of only
        legacy-bare / foreign tokens reads false (no phantom filter). */
    const filterPromoted: ComputedRef<boolean> = computed(
        () => promotedFilterKeys.value.length > 0,
    );

    /**
     * The promoted co-filter's NATIVE-grain ids the route folds into `matchByKey` (mirrors
     * `useSelection.selectedIdsOf` · I5 §10): a route lensing `grain` reads ONLY its own grain's ids, so a
     * foreign-grain promoted key (a `state:37` carried into /sci) is INVISIBLE — never in
     * `promotedIdsOf("school")`. The returned ids are the RAW grain ids (the kind stripped), exactly what
     * the route's membership test compares against.
     */
    function promotedIdsOf(kind: SelectionKind): Set<string> {
        const out = new Set<string>();
        for (const item of promotedFilterKeys.value) {
            if (item.kind === kind) out.add(item.id);
        }
        return out;
    }

    /**
     * PROMOTE the drill selection of `grain` to the persistent co-filter (`[Filter to these ▸]`) — the
     * producer path: encode each native id to its `{grain}:{id}` composite then write the set to `?filto`
     * (the SAME wire form `?sel` speaks, so a promoted key and a selection key are byte-identical). An
     * empty `ids` CLEARS the param (promoting nothing is the un-filter by construction). The route then
     * folds `promotedIdsOf(grain)` as one more `matchByKey` AND-clause; the coordinator-engine route pairs
     * this with `drilldownClause(field, ids)` (the `source:"drilldown"` clause) — same set, same reverse.
     */
    function promoteFilter(grain: SelectionKind, ids: readonly string[]): void {
        url.setList(
            FILTO_KEY,
            ids.map((id) => encodeSelKey(grain, id)),
        );
    }

    /** UN-FILTER — reverse the drill co-filter (`[✕ un-filter]`), clearing `?filto`. The persistent
        reverse the promotion's one-way-trap guard requires; the transient `?sel` selection is untouched
        (the two channels are independent — un-filter drops the filter, not the drill panel). */
    function clearPromotedFilter(): void {
        url.setList(FILTO_KEY, []);
    }

    // ── THE NARRATIVE ANCHORS + THE `?fig` CODEC (K-ANIM A1) ─────────────────────────────────────────
    // Both ride the SAME shared `url` bag (NOT in `registeredKeys` — platform through-lines, so a
    // `resetParams()` KEEPS the reader's place + the open figure). The `?at` write is the dock's ONE
    // debounced caller's job (replaceState, no Back-swamp). The `?fig` codec is AUTHORED here as the
    // ONE-bag fold target — it closes the source-verified whole-query clobber (a private
    // `useUrlState<"fig">()` bag replaceStates the WHOLE query from its OWN state, reverting `?year`/
    // `?sel`/filter cells on an enlarge). The ChartFrame + VizPlate consumer re-point (A1·§3.C) CO-LANDS
    // with K-FILTER-UNIFIED's `figOpen` (A1·§3.D) so the `k0-one-url-bag` gate flips in ONE step (a
    // single surviving private `?fig` bag keeps it RED) — K-ACTIVE ships the codec, the fold co-lands.
    const AT_KEY = "at";
    const SCENE_KEY = "scene";
    const FIG_KEY = "fig";

    /** The PARSED narrative anchor off `?at`, or null when absent / malformed. Reactive — a reload /
        route change re-reads the one URL bag (the `?focus` twin). */
    const narrativeAt: ComputedRef<NarrativeAnchor | null> = computed(() =>
        parseAt(url.get(AT_KEY)),
    );

    /** Write `?at=<beatId>[.<stepId>]` (a passive replaceState). `undefined` beat clears it. The
        dock tracks the coarse beat; ChapterStage may promote that same anchor to an authored scene
        step during restore. Neither path writes the per-frame `activeVizId`. */
    function setNarrativeAt(beatId: string | undefined, stepId?: string): void {
        url.set(AT_KEY, beatId ? encodeAt({ beatId, stepId }) : undefined);
    }

    /** The authored stage-scene deep link. ChapterStage resolves it to its owning beat and promotes
        the existing `?at` anchor; scene boundaries remain its sole live writer. */
    const sceneId: ComputedRef<string | undefined> = computed(() =>
        url.get(SCENE_KEY),
    );

    function setSceneId(id: string | undefined): void {
        url.set(SCENE_KEY, id);
    }

    /** The deep-linked expanded plate id off `?fig`, or undefined. The SOLE `?fig` home — the fold
        target ChartFrame + VizPlate re-point onto when the `?fig` fold co-lands (A1·§3.C/D). Read NOW
        by the dock's restore (the co-deep-linked `?fig` defers the `?at` scroll to the fig-close edge). */
    const figId: ComputedRef<string | undefined> = computed(() => url.get(FIG_KEY));

    /** Open a plate's `?fig` expand. Idempotent — re-opening the same id is a no-op (no redundant
        replaceState). */
    function openFig(id: string): void {
        if (figId.value === id) return;
        url.set(FIG_KEY, id);
    }

    /** Close a plate's `?fig` expand — the OWN-PARAM GUARD (the `ChartFrame.vue` guard folded to ONE
        home both consumers share): only clear when THIS plate owns the param (never stomp a sibling
        that re-claimed `?fig` in the same tick). */
    function closeFig(id: string): void {
        if (figId.value !== id) return;
        url.set(FIG_KEY, undefined);
    }

    // The year-scope, attached once the active feed has loaded. Its codec keys
    // (`?yearMode=&year=&years=`) ride the SAME shared `url` bag the params do (so a scrub
    // re-runs every reader's computeds off the one reactive query, B4 scrubber fix), but
    // they do not flow through `registeredKeys` — the year-scope owns its own round-trip.
    //
    // SHALLOW by necessity: the `UseYearScope` is a bag of `ComputedRef`s (`mode`, `scope`,
    // `activeYear`). A deep `ref` would reactive-WRAP that object and auto-UNWRAP its nested
    // computeds, so a reader's `yearScope.mode.value` would read `.value` off an already-
    // unwrapped string — `undefined` — and the active year would freeze at `latestYear` (the
    // dead-scrubber failure). `shallowRef` keeps the inner computeds intact, so `.mode.value`,
    // `.activeYear.value`, and `.scope.value` stay live reactive reads (the B4 scrubber fix).
    const yearScope: Ref<UseYearScope | null> = shallowRef(null);
    watch(
        () => active.feed,
        (feed) => {
            yearScope.value = feed ? useYearScope(feed, url) : null;
        },
        { immediate: true },
    );

    return {
        params: url.params,
        registeredKeys,
        registerKeys,
        param,
        setParam,
        numberParam,
        setNumberParam,
        listParam,
        setListParam,
        resetParams,
        // UX-S3 — the `?focus` cross-route through-line (parse / serialize / cross-grain resolve).
        focusKey,
        setFocus,
        focusForGrain,
        // O-A11 — the `?sel` selection-set round-trip (parse-guarded read + the single-writer setter).
        selKeys,
        setSel,
        // O-A11 · [ANSWERS Q-45] — the DRILL-AND-FILTER promotion (`?filto`): the persistent co-filter the
        // panel's `[Filter to these ▸]` writes + the `[✕ un-filter]` reverses (the first-class un-filter seam).
        promotedFilterKeys,
        filterPromoted,
        promotedIdsOf,
        promoteFilter,
        clearPromotedFilter,
        // K-ANIM A1 / W-STAGE — narrative anchors + the `?fig` one-bag fold.
        narrativeAt,
        setNarrativeAt,
        sceneId,
        setSceneId,
        figId,
        openFig,
        closeFig,
        yearScope,
    };
});
