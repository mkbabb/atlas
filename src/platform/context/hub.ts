// platform/context/hub.ts — THE VIZ-CONTEXT HUB (N.WD1 · §4.D1.1/1.2/1.3 · KS15).
//
// ONE composable — `useVizContext(vizId)` — collapses the 5-reach plate assembly (`useUsfDashboard`
// + `useVizPalette` + `useSelection` + a hand-rolled treatment fold + `useHoverReadout` + the
// EXPAND_SETTLE inject + the ORIGIN const) to a SINGLE injected object over a platform hub. The hub
// is created ONCE at `DashboardView` beside `DASHBOARD_KEY` and provided at `VIZ_HUB_KEY` — the
// two-key topology RULED CLOSED (NC4-B4): `VIZ_HUB_KEY` carries the STATEFUL platform machinery,
// `DASHBOARD_KEY` the instance-authored DECLARED contract. An instance author writing a `context.ts`
// NEVER sees the hub; a plate calls ONE composable. Three properties fall out:
//
//   1. THE INVERSION HOLDS — the hub is platform code, never imports a dashboard. The route filter
//      arrives by REGISTRATION (`bindRouteFacets`), the IDENTITY facet standing in until it does, so
//      a filterless route (vft, demand) reads an honest all-match default, never `undefined`. A route
//      that forgets the one bind line silently gets identity → dev-mode WARNS when unbound.
//   2. THE EXPAND-INJECT DIRECTION PROBLEM DISSOLVES — a plate cannot `inject` what its own descendant
//      (ChartFrame) provides; under the hub, expansion is REPORTED UP (`reportExpanded` — ONE writer)
//      and read DOWN by anyone (`isExpanded`).
//   3. ORIGIN AUTO-STAMPED — the selection + readout facets are built PER context with `origin =
//      vizId`, so the E3 ownership guard is inherited with ZERO plate-side ORIGIN constants.

import {
    computed,
    inject,
    ref,
    shallowRef,
    toValue,
    type ComputedRef,
    type InjectionKey,
    type MaybeRefOrGetter,
} from "vue";
import { AMERICA } from "../../contract/index.js";
import type { DashboardContext } from "../../contract/index.js";
import type { ColorKind } from "../../charts/scale/colorKind.js";
import type { VizPalette } from "../../charts/composables/useVizPalette.js";
import type { SelectionKind } from "../../charts/contract/selection-contract.js";
import type { SelectionTreatment } from "../../interaction/useSelectionTreatment.js";
import type { HoverReadout } from "../stores/useHoverReadout.js";
import type { RouteUniverse } from "../../charts/contract/viz-contract.js";
import type { useSelection } from "../stores/useSelection.js";
import type { useHoverReadout } from "../stores/useHoverReadout.js";
import type { useActiveBeat } from "../stores/useActiveBeat.js";
import type { useActiveDashboard } from "../stores/useActiveDashboard.js";
import { foldReadiness, type Readiness, type SourcePhase } from "./readiness.js";

/** A late-resolved computed value (the `C<T>` shorthand from the NP4 API sketch). */
export type C<T> = ComputedRef<T>;

/** A minimal atmosphere resolution (the chrome-leg-derived D6 DEFAULT — NOT the WD2 declared
    poles). WD2 inverts this to the declared-poles ladder + DELETES the Aurora slug-switch; here the
    hub only resolves the chrome legs so a plate reading `viz.atmosphere` never touches the Aurora
    seam. FLAGGED: WD2 owns the full ladder (declared → chrome leg → NEUTRAL). */
export interface ResolvedAtmosphere {
    /** The warm pole (the theme chrome's `accentWarm`, falling back to the accent). A CSS token expr. */
    warm: string;
    /** The cool pole (the theme chrome's `accentCool`, falling back to the accent). A CSS token expr. */
    cool: string;
}

/** The route FILTER facet — the shape a route store's `filterSurface` adapts to (`bindRouteFacets`).
    The IDENTITY facet (all-match) stands in until a route binds one, so a filterless route reads an
    honest all-match, never `undefined`. */
export interface FilterFacet {
    /** True when ≥1 route filter dial is active. */
    filterActive: boolean;
    /** Does this entity key survive the active filter? Identity ⇒ always true. */
    isMatch(key: string): boolean;
    /** The matched-key set when active (for a bulk dim pass), or null when the filter is inert. */
    dimMap: ReadonlySet<string> | null;
    /** The count of rows surviving the filter (0 on the identity facet — a filterless route dims
        nothing, so the count is unused). */
    visibleCount: number;
}

/** The IDENTITY filter facet — an all-match, inert default (the inversion-holds property). */
export const IDENTITY_FILTER: FilterFacet = {
    filterActive: false,
    isMatch: () => true,
    dimMap: null,
    visibleCount: 0,
};

/** The per-context SELECTION facet — origin auto-stamped with the `vizId` (the E3 ownership guard
    inherited with ZERO plate-side ORIGIN constants). `idsOf` is universe-scoped; `treatmentMap`
    hoists the 16-line per-mark fold every plate re-wrote. */
export interface SelectionFacet {
    /** The selected ids of a grain, universe-scoped (the SCI↔ECF district collision guard automatic). */
    idsOf(kind: SelectionKind): Set<string>;
    /** The per-mark `{selected, dimmed, isPrimary}` treatment over a key set — hoists the plate fold. */
    treatmentMap(keys: Iterable<string>): Record<string, SelectionTreatment>;
    /** Pin an entity (the store's sole-same-clears algebra turns tap-same into unpin — never re-implemented). */
    select(kind: SelectionKind, id: string, opts?: { additive?: boolean }): void;
    /** Raise the transient hover for a key (origin auto = vizId); null clears the raise. */
    hover(key: string | null): void;
    /** Drop the pinned selection (the field-scoped global clear). */
    clear(): void;
}

/** The per-context READOUT facet — publish/pin/clear with origin auto-stamped to the `vizId`. */
export interface ReadoutFacet {
    /** Publish this viz's rich card payload (origin auto = vizId; the store's owner-guard applies). */
    publish(payload: Omit<HoverReadout, "origin">): void;
    /** Deposit this viz's payload into the PIN tier under a selection `key` (origin auto = vizId). */
    pin(key: string, payload: Omit<HoverReadout, "origin">): void;
    /** Clear this viz's readout (origin = vizId). */
    clear(): void;
}

/** THE VIZ CONTEXT — the ONE injected object a plate reads (NP4 §1, typechecked strict). */
export interface VizContext {
    vizId: string;
    /** The instance-authored declared contract (DASHBOARD_KEY), or undefined outside a route. */
    route: DashboardContext | undefined;
    /** The chrome accent (the route theme's chrome → the token default). */
    accent: C<string>;
    /** The call-site-declared color kind (NOT chapter-derived — the deliberate pass-2 fence). */
    colorKind: C<ColorKind>;
    /** The chrome-leg-derived atmosphere poles (the D6 default; WD2 owns the full ladder). */
    atmosphere: ResolvedAtmosphere;
    /** The live (theme-aware) viz palette. */
    palette: C<VizPalette>;
    /** The DATA phase — a pure fold over this context's source (the primary, or a declared sourceId). */
    readiness: C<Readiness>;
    /** Retry the failed load (the primary reload, or the declared source's retry). */
    retry(): void;
    /** The bound route filter facet (identity until `bindRouteFacets`). */
    filter: C<FilterFacet>;
    /** The origin-stamped selection facet. */
    selection: SelectionFacet;
    /** True when this viz is the centre-grain active viz. */
    isActive: C<boolean>;
    /** True when this viz is mid-transit in the viewport (the panel union). */
    isInViewport: C<boolean>;
    /** True when this viz is the `?fig=` fullscreen plate (read DOWN; ChartFrame reports UP). */
    isExpanded: C<boolean>;
    /** REPORT this viz's `?fig=` fullscreen state UP to the hub — the SOLE expansion writer, bound to
        this context's vizId (read DOWN by anyone via `isExpanded`; the expand-inject inversion). */
    reportExpanded(fullscreen: boolean): void;
    /** The origin-stamped readout facet. */
    readout: ReadoutFacet;
}

/** The stateful hub — provided at `VIZ_HUB_KEY`, created once per route view. */
export interface VizContextHub {
    /** Build (or re-read) the per-viz context. `opts.colorKind` declares the kind (default diverging);
        `opts.sourceId` names a secondary loadDocument source (default = the primary feed). */
    context(vizId: string, opts?: { colorKind?: ColorKind; sourceId?: string }): VizContext;
    /** The ONE component-side route bind — the route store's filter surface + its selection universe.
        A route that forgets this gets the identity facet (dev-mode warns on first unbound read). */
    bindRouteFacets(facets: {
        filter?: MaybeRefOrGetter<FilterFacet>;
        universe?: RouteUniverse;
    }): void;
    /** Register a secondary loadDocument source's phase + retry (`sci-schools`, `usf-integrity-figures`).
        Returns the deregister thunk (the loader disposes it on unmount). */
    registerSource(id: string, phase: MaybeRefOrGetter<SourcePhase>, retry: () => void): () => void;
    /** The DATA phase of a named source (default = the primary feed) — the pure readiness fold. */
    readinessOf(sourceId?: string): C<Readiness>;
    /** The SOLE expansion writer (ChartFrame reports its `?fig=` fullscreen up here; read via `isExpanded`). */
    reportExpanded(vizId: string, fullscreen: boolean): void;
    /** The route's bound selection universe (`bindRouteFacets({ universe })`), or null when unbound —
        the ONE home that replaces the 3 hardcoded `DEFAULT_FILTER_UNIVERSE` constants (D1.3). */
    universe: C<RouteUniverse | null>;
    /** True once `bindRouteFacets` has bound a route filter (the dev-warning + identity-fallback seam). */
    isBound: C<boolean>;
}

/** The provide/inject token — the STATEFUL platform machinery, beside `DASHBOARD_KEY` (RULED CLOSED). */
export const VIZ_HUB_KEY: InjectionKey<VizContextHub> = Symbol("platform:viz-hub");

/** The stores the hub reads (passed at `DashboardView` — the app-level injection context). */
export interface VizContextHubDeps {
    primary: ReturnType<typeof useActiveDashboard>;
    selection: ReturnType<typeof useSelection>;
    readout: ReturnType<typeof useHoverReadout>;
    attention: ReturnType<typeof useActiveBeat>;
    palette: ComputedRef<VizPalette>;
}

/** One registered secondary source. */
interface RegisteredSource {
    phase: MaybeRefOrGetter<SourcePhase>;
    retry: () => void;
}

/**
 * `createVizContextHub` — build the platform hub over the route's stores + declared context. The hub
 * is PURE PLATFORM code: it never imports a dashboard, and the route contributes only by REGISTRATION
 * (`bindRouteFacets` / `registerSource`). Reactive state lives in Vue refs the caller need not touch.
 */
export function createVizContextHub(
    ctx: DashboardContext | undefined,
    deps: VizContextHubDeps,
): VizContextHub {
    // Reactive registries (Vue refs — the hub is created once per route view). `sources` is a
    // shallowRef reassigned on every mutation so the readiness computeds re-derive.
    // Normalized to a plain getter at bind time (never a raw Ref inside the ref — that collapses the
    // ShallowRef value type). `null` = unbound → the identity facet.
    const boundFilter = shallowRef<(() => FilterFacet) | null>(null);
    const boundUniverse = ref<RouteUniverse | null>(null);
    const expandedVizId = ref<string | null>(null);
    const bound = ref(false);
    const sources = shallowRef<Map<string, RegisteredSource>>(new Map());

    let warnedUnbound = false;
    const warnUnbound = (vizId: string): void => {
        if (warnedUnbound || !import.meta.env.DEV) return;
        warnedUnbound = true;
        // eslint-disable-next-line no-console
        console.warn(
            `[viz-hub] "${vizId}" read the route filter before bindRouteFacets({ filter }) ran — ` +
                `the route is reading the IDENTITY (all-match) facet. Add the one bind line at the ` +
                `route body setup, or this is intentional (a filterless route).`,
        );
    };

    const isBound = computed<boolean>(() => bound.value);

    // The PRIMARY source phase — the feed has RESOLVED iff `feed` is non-null (NOT a row count).
    const primaryPhase = computed<SourcePhase>(() => ({
        loading: deps.primary.loading,
        error: deps.primary.error,
        resolved: deps.primary.feed != null,
    }));
    const primaryReadiness = computed<Readiness>(() => foldReadiness(primaryPhase.value));

    function readinessOf(sourceId?: string): C<Readiness> {
        return computed<Readiness>(() => {
            if (!sourceId) return primaryReadiness.value;
            const src = sources.value.get(sourceId);
            if (!src) return "loading"; // the source has not reported yet — the seam will register
            return foldReadiness(toValue(src.phase));
        });
    }

    function bindRouteFacets(facets: {
        filter?: MaybeRefOrGetter<FilterFacet>;
        universe?: RouteUniverse;
    }): void {
        if (facets.filter !== undefined) {
            const f = facets.filter;
            boundFilter.value = () => toValue(f);
        }
        if (facets.universe !== undefined) boundUniverse.value = facets.universe;
        bound.value = true;
    }

    function registerSource(
        id: string,
        phase: MaybeRefOrGetter<SourcePhase>,
        retry: () => void,
    ): () => void {
        sources.value = new Map(sources.value).set(id, { phase, retry });
        return () => {
            const next = new Map(sources.value);
            next.delete(id);
            sources.value = next;
        };
    }

    function reportExpanded(vizId: string, fullscreen: boolean): void {
        if (fullscreen) expandedVizId.value = vizId;
        else if (expandedVizId.value === vizId) expandedVizId.value = null;
    }

    // THE ROUTE THEME — the named default where a route context exists, and NOTHING where none
    // does: a ctx-less read (the gallery/about, a story harness) never folds to AMERICA, so the
    // `:root` token fallthrough below stays reachable and the outside-route rest is unchanged.
    const theme = ctx ? (ctx.theme ?? AMERICA) : undefined;

    // The chrome accent (N.WG1 arm F — the theme's chrome is the ONE JS accent authority; the
    // retired `ctx.accent` dock-local pole is gone → the theme → the token default).
    const accent = computed<string>(() => theme?.chrome.accent ?? "var(--route-accent)");

    // The chrome-derived atmosphere poles (the D6 default — WD2 owns the declared ladder).
    const atmosphere: ResolvedAtmosphere = {
        warm: theme?.chrome.accentWarm ?? theme?.chrome.accent ?? "var(--route-accent-warm)",
        cool: theme?.chrome.accentCool ?? theme?.chrome.accent ?? "var(--route-accent-cool)",
    };

    function context(
        vizId: string,
        opts: { colorKind?: ColorKind; sourceId?: string } = {},
    ): VizContext {
        const filter = computed<FilterFacet>(() => {
            const bound = boundFilter.value;
            if (bound === null) {
                warnUnbound(vizId);
                return IDENTITY_FILTER;
            }
            return bound();
        });

        const selection: SelectionFacet = {
            idsOf: (kind) => deps.selection.selectedIdsOf(kind),
            treatmentMap: (keys) => {
                const set = deps.selection.selectedKeys;
                const primary = deps.selection.primaryKey;
                const out: Record<string, SelectionTreatment> = {};
                for (const key of keys) {
                    const selected = set.has(key);
                    out[key] = {
                        selected,
                        // THE DIM LAW: a mark recedes ONLY when something is selected and this is not it.
                        dimmed: set.size > 0 && !selected,
                        isPrimary: key === primary,
                    };
                }
                return out;
            },
            select: (kind, id, o) => deps.selection.selectEntity(kind, id, o),
            hover: (key) => deps.selection.hover(key, key ? vizId : null),
            clear: () => deps.selection.clearSelection(),
        };

        const readout: ReadoutFacet = {
            publish: (payload) => deps.readout.publish({ ...payload, origin: vizId }),
            pin: (key, payload) => deps.readout.pin(key, { ...payload, origin: vizId }),
            clear: () => deps.readout.clear(vizId),
        };

        return {
            vizId,
            route: ctx,
            accent,
            colorKind: computed<ColorKind>(() => opts.colorKind ?? "diverging"),
            atmosphere,
            palette: deps.palette,
            readiness: readinessOf(opts.sourceId),
            retry: () => {
                if (opts.sourceId) {
                    const src = sources.value.get(opts.sourceId);
                    if (src) return void src.retry();
                }
                void deps.primary.reload();
            },
            filter,
            selection,
            isActive: computed<boolean>(() => deps.attention.activeVizId === vizId),
            isInViewport: computed<boolean>(() => deps.attention.activeVizIds.has(vizId)),
            isExpanded: computed<boolean>(() => expandedVizId.value === vizId),
            reportExpanded: (fullscreen: boolean) => reportExpanded(vizId, fullscreen),
            readout,
        };
    }

    const universe = computed<RouteUniverse | null>(() => boundUniverse.value);

    return {
        context,
        bindRouteFacets,
        registerSource,
        readinessOf,
        reportExpanded,
        universe,
        isBound,
    };
}

/**
 * `useVizContext(vizId, opts)` — the ONE composable a plate calls. THROWS when no hub is provided
 * (fail-explicit — a plate mounted inside a dashboard route always has one). The Law-2 pair's
 * throwing half.
 */
export function useVizContext(
    vizId: string,
    opts?: { colorKind?: ColorKind; sourceId?: string },
): VizContext {
    const hub = inject(VIZ_HUB_KEY);
    if (!hub) {
        throw new Error(
            `useVizContext("${vizId}"): no VIZ_HUB_KEY provided — this plate must mount inside a route ` +
                `that provides the hub (see views/DashboardView.vue). Use useOptionalVizContext for a ` +
                `gallery / story-harness / SSR-safe read.`,
        );
    }
    return hub.context(vizId, opts);
}

/**
 * `useOptionalVizContext(vizId, opts)` — the Law-2 pair's SILENT half: returns the context, or
 * `undefined` outside a providing route (the gallery preview, a story harness, SSR). Never throws.
 */
export function useOptionalVizContext(
    vizId: string,
    opts?: { colorKind?: ColorKind; sourceId?: string },
): VizContext | undefined {
    const hub = inject(VIZ_HUB_KEY, undefined);
    return hub ? hub.context(vizId, opts) : undefined;
}

/**
 * `useVizHub()` — the ROUTE-BODY accessor for the hub itself (NOT a per-viz context): the one
 * component-side seam a route body calls `bindRouteFacets` / `registerSource` on. THROWS outside a
 * providing route. A plate wanting per-viz reads calls `useVizContext`, not this.
 */
export function useVizHub(): VizContextHub {
    const hub = inject(VIZ_HUB_KEY);
    if (!hub) {
        throw new Error(
            "useVizHub(): no VIZ_HUB_KEY provided — the route body must mount inside a route that " +
                "provides the hub (see views/DashboardView.vue).",
        );
    }
    return hub;
}

/** `useOptionalVizHub()` — the SSR/harness-safe accessor for the hub (undefined when unprovided). */
export function useOptionalVizHub(): VizContextHub | undefined {
    return inject(VIZ_HUB_KEY, undefined);
}
