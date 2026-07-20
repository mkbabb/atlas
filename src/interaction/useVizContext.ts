// platform/interaction/useVizContext.ts — THE VIZ COORDINATION HUB (O-A6 · story-sota §4.3 · the
// reserved motion-director §10 seam, landed).
//
// The director's `MotionDrivers` interface names SIX injected edges (scroll · selected · hovered ·
// active · filterEpoch · reducedMotion); before this hub every plate hand-wired them (WfaScatter
// passed `store.hoveredCrn`/`selectedCrn`; ProductMixPlate passed local demo refs; CrossoverPlate
// passed nothing, so `active`/`filter` fell to the inert `() => false`/`() => 0` defaults). This is
// the ONE composable that wires all six from the SHARED single-writer stores, so a plate declaring
// only a `MotionDeclaration` becomes interactive with NO per-plate wiring — interactivity by default.
//
// The six edges (story-sota §4.3):
//   scroll      → useCoverProgress(host).t     (the ONE page cover clock, 0.50 ≡ viewport centre)
//   selected    → useSelection.selectedKeys    (the sticky pin SET — any pin ⇒ the host is selected)
//   hovered     → useSelection.hoveredKey       (the transient pointer channel — de-stormed at source)
//   active      → useActiveBeat.activeVizId     (the centre-argmin edge — is THIS viz centred?)
//   filterEpoch → the shared filter-change epoch (a monotone counter — a tick re-arms a filter pulse)
//   reducedMotion → useReducedMotion            (PRM binds interaction edges to their live state)
//
// READ-ONLY (the k0-active-viz-single-writer + selection single-writer laws hold): the hub SUBSCRIBES
// to the stores and writes NOTHING — every mutation stays owned by its sole writer (the dock writes
// activeViz; the pointer/click seams write useSelection; the URL writes the params). A write-spy over
// the store mutators proves zero writes (the O-A6 unit witness).
//
// It is the shared substrate O-A7 (StandardVizInteraction), O-A9 (the provenance render family) +
// O-A9b (the Q-43 facility), and O-A11 (drill-down) all consume — so it ALSO exposes two read-only
// facets beyond the motion edges: `selectionScope` (the viz's live selection facet) + `provenance`
// (the reactive binding context a per-viz provenance render re-resolves on — §4.2/§4.3).
//
// HOME (C2 H-2 / [CH-A M3]): authored at the PRE-SPLIT `platform/interaction/` path; the WG-B mv
// (O-B6) re-homes this + `motion/` under `@mkbabb/atlas` `src/interaction/`. The director signature is
// UNCHANGED — it takes a `MotionDrivers`, and this hub IS a `MotionDrivers` (superset), so the seam the
// motion-director §10 comment reserved lands with no director edit.

import { computed, watch, type ComputedRef, type Ref } from "vue";
import type {
    MotionDrivers,
    MotionDriverSources,
} from "../motion/motion-director.js";
import { useCoverProgress } from "../motion/useCoverProgress.js";
import { useReducedMotion } from "../motion/useReducedMotion.js";
import { useSelection } from "../platform/stores/useSelection.js";
import { useActiveBeat } from "../platform/stores/useActiveBeat.js";
import { useViewParams } from "../platform/stores/useViewParams.js";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE READ-ONLY FACETS (the substrate O-A9 / O-A11 consume beyond the motion edges)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A viz's live SELECTION facet — the read-only projection of `useSelection` a drill-down (O-A11) or a
    provenance render (O-A9) binds to. Every field is a `ComputedRef` off the shared store (never a
    copy, never a writer) — reading it re-evaluates against the live pins. */
export interface VizSelectionScope {
    /** The focused (primary) pin — the `?fips=`/storytelling-subject scalar, or null when unpinned. */
    readonly primaryKey: ComputedRef<string | null>;
    /** The sticky pin SET (the co-filter input) — empty when nothing is selected. */
    readonly selectedKeys: ComputedRef<ReadonlySet<string>>;
    /** True when any entity is pinned (drives the framed-selection treatment). */
    readonly hasSelection: ComputedRef<boolean>;
    /** True while a pointer hover is live anywhere (the transient raise channel). */
    readonly isHovering: ComputedRef<boolean>;
    /** The transiently-hovered key, or null off the marks. */
    readonly hoveredKey: ComputedRef<string | null>;
}

/** The reactive provenance CONTEXT a per-viz provenance render (O-A9's `ProvenanceBar`/`ProvenanceChip`)
    re-binds on. This is NOT the provenance CONTENT (what data / from where / how filtered — that rides
    the plate's `VizContract.provenance` facet + the coordinator's leave-one-out algebra); it is the
    reactive KEY the render re-resolves off, exactly the §4.3 subscriber trigger: the active-viz edge +
    the filter epoch. A ProvenanceChip reads `provenance.isActive`/`filterEpoch` to know WHEN to re-bind. */
export interface VizProvenance {
    /** This plate's viz id (the argmin/registry key). */
    readonly vizId: string;
    /** Is THIS viz the centre-argmin active viz (the §4.3 vizId edge)? */
    readonly isActive: boolean;
    /** The live filter-change epoch (the §4.3 filter-change trigger — a monotone counter). */
    readonly filterEpoch: number;
    /** Is any entity pinned (the selection-driven activation half, §4.4)? */
    readonly hasSelection: boolean;
}

/** The hub's named return surface (the `UseXReturn` floor) — the six director edges (`MotionDrivers`)
    PLUS the two read-only facets the provenance/drill-down families consume. Because it EXTENDS
    `MotionDrivers`, it feeds `useMotionDirector(host, decl, ctx)` directly (the director takes a
    `MotionDrivers`; this is a superset). */
export interface UseVizContextReturn extends MotionDrivers {
    /** The reactive provenance binding context (O-A9). */
    readonly provenance: ComputedRef<VizProvenance>;
    /** The viz's live selection facet (O-A11). */
    readonly selectionScope: VizSelectionScope;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE PURE CORE — the vizId ↦ edge/facet mapping, framework-store-free (fixture-testable)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The resolved reactive SOURCES the pure core maps — every field a getter over live state (a store
    ref in production; a plain `ref` in a spec). The core equates + projects; it never mutates a source. */
export interface VizContextSources {
    /** The cover scalar [0,1] — `useCoverProgress(host).t`. */
    readonly scroll: () => number;
    /** The pinned stage's composed step clock [0,1] — `usePinProgress(deck).pinT`; 1 off a stage. */
    readonly pin: () => number;
    /** The transiently-hovered key (or null). */
    readonly hoveredKey: () => string | null;
    /** The sticky pin SET. */
    readonly selectedKeys: () => ReadonlySet<string>;
    /** The focused/primary pin (or null). */
    readonly primaryKey: () => string | null;
    /** The centre-argmin active viz id (`""` when none centred). */
    readonly activeVizId: () => string;
    /** The monotone filter-change epoch. */
    readonly filterEpoch: () => number;
    /** The reduced-motion preference. */
    readonly reducedMotion: () => boolean;
}

/**
 * Build the viz context for `vizId` off resolved reactive `src` getters. PURE + TOTAL — no store, no
 * DOM, no rAF (the `computed`s are the only Vue dep, so a node spec drives it off plain `ref`s). The
 * six director edges collapse the shared facet to the `MotionDrivers` shape: `selected` = "any pin",
 * `hovered` = "any raise", `active` = "this viz is the argmin". `selectionScope`/`provenance` are the
 * additive read-only facets. Writes NOTHING (there is no writer to call — every field is a read).
 */
export function createVizContext(
    vizId: string,
    src: VizContextSources,
): UseVizContextReturn {
    const scroll = (): number => src.scroll();
    const pin = (): number => src.pin();
    const selected = (): boolean => src.selectedKeys().size > 0;
    const hovered = (): boolean => src.hoveredKey() !== null;
    const active = (): boolean => src.activeVizId() === vizId;
    const filterEpoch = (): number => src.filterEpoch();
    const reducedMotion = (): boolean => src.reducedMotion();

    const selectionScope: VizSelectionScope = {
        primaryKey: computed(() => src.primaryKey()),
        selectedKeys: computed(() => src.selectedKeys()),
        hasSelection: computed(() => src.selectedKeys().size > 0),
        isHovering: computed(() => src.hoveredKey() !== null),
        hoveredKey: computed(() => src.hoveredKey()),
    };

    const provenance = computed<VizProvenance>(() => ({
        vizId,
        isActive: src.activeVizId() === vizId,
        filterEpoch: src.filterEpoch(),
        hasSelection: src.selectedKeys().size > 0,
    }));

    return { scroll, pin, selected, hovered, active, filterEpoch, reducedMotion, selectionScope, provenance };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SHARED FILTER EPOCH — the platform-level filter-change counter
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The DEFAULT filter epoch: a monotone counter off the shared URL param bag (`useViewParams`), the
    platform-level surface EVERY route's filter (+ year scope + dials) round-trips through (INV-5). A
    route with a native crossfilter coordinator can inject its OWN filter-active/epoch signal via the
    hub's `sources.filterEpoch` override — the coordinator is per-route (createCoordinator) and exposes
    no shared singleton, so this URL-derived counter is the honest platform default the hub owns. Pure
    READ (a `watch` over the params bag → a local counter; it never writes the URL). */
function useSharedFilterEpoch(): () => number {
    const view = useViewParams();
    let epoch = 0;
    // A deep watch of the reactive params bag: any filter cell / dial / year write bumps the counter.
    // `flush: "sync"` so a read on the same tick as a write sees the new epoch (the pulse re-arms).
    watch(
        () => view.params,
        () => {
            epoch += 1;
        },
        { deep: true, flush: "sync" },
    );
    return () => epoch;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE VUE SHELL — wire the shared stores into the pure core (the one call every plate makes)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * `useVizContext(vizId, host)` — the coordination hub. Wires all seven director edges from the shared
 * single-writer stores + the cover clock ONCE, so `useMotionDirector(host, decl, ctx)` receives a full
 * `MotionDrivers` with NO per-plate driver wiring. Returns the two read-only facets (`selectionScope`,
 * `provenance`) the provenance/drill-down families consume too.
 *
 * `sources` is the SAME optional per-edge override seam `useMotionDrivers` documents (the superseder
 * keeps the escape hatch): a plate whose interaction rides LOCAL or ROUTE state — ProductMixPlate's
 * pointer/click demo refs, WfaScatter's `store.hoveredCrn`/`selectedCrn` (themselves useSelection
 * projections) — passes those edges; the un-passed edges default to the shared stores. `selectionScope`
 * + `provenance` ALWAYS read the real shared store (honest provenance, independent of a demo override).
 */
export function useVizContext(
    vizId: string,
    host: Ref<HTMLElement | null>,
    sources: MotionDriverSources = {},
): UseVizContextReturn {
    const sel = useSelection();
    const beat = useActiveBeat();
    const cover = useCoverProgress(host);
    const reduced = useReducedMotion();
    const filterEpoch = sources.filterEpoch ?? useSharedFilterEpoch();

    const ctx = createVizContext(vizId, {
        scroll: sources.scroll ?? ((): number => cover.t.value),
        pin: sources.pin ?? ((): number => 1),
        hoveredKey: (): string | null => sel.hoveredKey,
        selectedKeys: (): ReadonlySet<string> => sel.selectedKeys,
        primaryKey: (): string | null => sel.primaryKey,
        activeVizId: (): string => beat.activeVizId,
        filterEpoch,
        reducedMotion: (): boolean => reduced.value,
    });

    // Apply the per-edge overrides (the useMotionDrivers seam) over the shared defaults. Only the motion
    // EDGES take an override; `selectionScope`/`provenance` stay bound to the real shared store.
    return {
        ...ctx,
        selected: sources.selected ?? ctx.selected,
        hovered: sources.hovered ?? ctx.hovered,
        active: sources.active ?? ctx.active,
    };
}
