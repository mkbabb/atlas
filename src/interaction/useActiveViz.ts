// interaction/useActiveViz.ts — THE ACTIVE-VIZ HOOK: the scrolled-to/selected viz as a NAMED READ-ONLY
// event source (provenance-surface §4; the O-A9 render family, former O-A10 fused in [C4 MERGE-2]).
//
// THE LAW (O charter §2): "the scrolled-to OR selected viz is a HOOK emitting events (filtering /
// animation / provenance updates) — subscribers trigger filter/animation/provenance updates."
//
// KEY FINDING (provenance-surface §4): the hook needs NO new global. The active-viz singleton is
// `useActiveBeat.activeVizId` (the `activeViz.ts` rAF reader's argmin — the single-writer law). This
// composable is a THIN NAMED subscription façade over the signals that ALREADY exist:
//   `useActiveBeat` (the active viz + beat) ⊕ the route coordinator's `resolved(vizId)` (the leave-
//   one-out algebra) ⊕ `useSelection` (the pins). It WRITES NOTHING — exactly like `useFilterPanel`'s
//   existing `watch(activeVizIds)`. It UNIFIES the three ad-hoc subscriptions (the panel's
//   `watch(activeVizIds)`, the rim argmin, the future chip binding) under ONE surface [§4.3].
//
// SELECTION-DRIVEN ACTIVATION (the "OR selected" half, §4.4): when a pin is live, the viz that owns
// that selection becomes the active-for-hook viz — a `max(scrollActive, selectionOwner)` READ-side
// precedence (NOT a write to `activeVizId`; the scroll writer stays sovereign — the rim is a scroll
// medal, the hook an attention signal, and they may differ).
//
// THE PURE-CORE PATTERN (mirrors `createVizContext`): `resolveActiveVizId` + `buildActiveVizEvent` are
// pure/TOTAL (fixture-testable off plain getters — the write-spy witness reads them and asserts zero
// store mutation); `onActiveViz` is the thin Vue `watch` shell.

import { watch, type WatchStopHandle } from "vue";
import type { Predicate } from "../filter/engine/predicate.js";
import { useActiveBeat } from "../platform/stores/useActiveBeat.js";
import { useSelection } from "../platform/stores/useSelection.js";

/** The event a subscriber receives on each active-viz transition (provenance-surface §4.1). */
export interface ActiveVizEvent {
    /** The active viz id — `max(scrollActive, selectionOwner)`: the centre-argmin viz, OR the viz that
        owns a live pin (§4.4). `""` when nothing is centred and nothing pinned. */
    vizId: string;
    /** The active BEAT (chapter) id + label the dock's observer wrote. */
    beat: { id: string; label: string };
    /** The live filter algebra as THIS viz sees it (the coordinator's leave-one-out DATA, pre-compile);
        `null` when the route wires no coordinator or the predicate is at rest. */
    filters: Predicate<unknown> | null;
    /** The live selection facet for the active viz's universe. */
    selection: { primaryKey: string | null; selectedKeys: ReadonlySet<string> };
}

/** The resolved reactive SOURCES the pure core maps — every field a getter over live state (a store
    ref in production; a plain getter in a spec). The core READS + projects; it never mutates a source
    (the write-spy witness). */
export interface ActiveVizSources {
    /** the centre-argmin active viz id (`useActiveBeat.activeVizId`; `""` when none centred). */
    scrollActiveVizId: () => string;
    /** the active beat id + label (`useActiveBeat.activeBeatId`/`activeBeatLabel`). */
    beat: () => { id: string; label: string };
    /** the focused/primary pin (`useSelection.primaryKey`; `null` when unpinned). */
    primaryKey: () => string | null;
    /** the sticky pin SET (`useSelection.selectedKeys`). */
    selectedKeys: () => ReadonlySet<string>;
    /** the route coordinator's leave-one-out resolved predicate for a viz (`selection.resolved(vizId)()`);
        default supplied by the route — `() => null` when no coordinator is wired. */
    resolvedFor: (vizId: string) => Predicate<unknown> | null;
    /** the viz that OWNS the live pin (§4.4 selection-driven activation); `""` when a pin maps to no
        viz or the route supplies no owner map. */
    selectionOwner: () => string;
}

/** PURE — the `max(scrollActive, selectionOwner)` fold (§4.4): the selection OWNER wins WHEN a pin is
    live (a non-empty `selectedKeys` AND a non-empty owner); otherwise the scroll-argmin viz. */
export function resolveActiveVizId(src: ActiveVizSources): string {
    const owner = src.selectionOwner();
    if (owner && src.selectedKeys().size > 0) return owner;
    return src.scrollActiveVizId();
}

/** PURE — build the event for the currently-resolved active viz. TOTAL (no store, no DOM); the
    write-spy witness calls it and asserts zero mutation on the underlying sources. */
export function buildActiveVizEvent(src: ActiveVizSources): ActiveVizEvent {
    const vizId = resolveActiveVizId(src);
    return {
        vizId,
        beat: src.beat(),
        filters: vizId ? src.resolvedFor(vizId) : null,
        selection: { primaryKey: src.primaryKey(), selectedKeys: src.selectedKeys() },
    };
}

/** Opt-in EDGES beyond the `vizId` change the hook always fires on (provenance-surface §4.1). */
export interface OnActiveVizOptions {
    /** the route seams (the coordinator leave-one-out + the selection-owner map). Omitted legs default
        to inert (`resolvedFor: () => null`, `selectionOwner: () => ""`) — a filterless route still
        emits the `vizId`/`beat`/`selection` edges. */
    sources?: Partial<Pick<ActiveVizSources, "resolvedFor" | "selectionOwner">>;
    /** also fire when the filter algebra changes while the SAME viz is active (default `false`). */
    onFilterChange?: boolean;
    /** also fire when the selection changes while the SAME viz is active (default `false`). */
    onSelectionChange?: boolean;
}

/**
 * `onActiveViz(cb, opts?)` — subscribe to active-viz transitions; returns an unsubscribe. The callback
 * fires on the EDGE: the `vizId` change always, plus — opt-in — a filter/selection change while the
 * same viz is active. PURE READ over `useActiveBeat` + the route coordinator + `useSelection` — writes
 * NOTHING (every single-writer gate holds). Must be called in a component setup (it opens a `watch`).
 */
export function onActiveViz(
    cb: (e: ActiveVizEvent) => void,
    opts: OnActiveVizOptions = {},
): () => void {
    const beat = useActiveBeat();
    const sel = useSelection();
    const src: ActiveVizSources = {
        scrollActiveVizId: () => beat.activeVizId,
        beat: () => ({ id: beat.activeBeatId, label: beat.activeBeatLabel }),
        primaryKey: () => sel.primaryKey,
        selectedKeys: () => sel.selectedKeys,
        resolvedFor: opts.sources?.resolvedFor ?? (() => null),
        selectionOwner: opts.sources?.selectionOwner ?? (() => ""),
    };

    // The watch KEY: the resolved active vizId always; the filter/selection legs only when opted in, so
    // an un-opted subscriber wakes ONLY on the viz edge (no needless fires).
    const stop: WatchStopHandle = watch(
        () => [
            resolveActiveVizId(src),
            opts.onFilterChange ? src.resolvedFor(resolveActiveVizId(src)) : undefined,
            opts.onSelectionChange ? src.selectedKeys() : undefined,
        ],
        () => cb(buildActiveVizEvent(src)),
    );
    return stop;
}
