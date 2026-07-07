// platform/stores/useSelectionStat.ts — the CONTEXTUAL-STAT registry (I5 §5 · §N2).
//
// K-H-ARCH relocated this file `platform/composables/` → `platform/stores/`: it is a
// `defineStore("platform:selection-stat", …)` app-singleton (a Pinia STORE, not a composable),
// so it belongs beside its store peers (`useActiveBeat`/`useHoverReadout`), which it imports from
// `@/platform/stores/`. A pure relocation — zero behaviour change.
//
// THE PROBLEM. The SelectionPreview card shows a contextual stat for the staged selection — but the
// stat must TRACK THE SCROLLED VIZ (the active beat): scroll past the map that selected a county to
// the next chart and the card's stat should switch to the NEW beat's terms (the map's quantity → the
// scatter's question). The card cannot KNOW any dashboard's data, and it must NOT re-walk scroll
// geometry (the single-scroll-scalar discipline — it reads `useActiveBeat`, never a second observer).
//
// THE SEAM. A registry keyed by BEAT id: each beat that wants a contextual stat REGISTERS a resolver
// `(sel, grain) => { label, facts } | null`. The card calls `statFor(key, grain)`: it reads the
// ACTIVE beat off `useActiveBeat`, looks up that beat's resolver, and runs it for the staged key — so
// the stat is FACTUAL (the resolver reads the beat's own reducers) AND per-viz-correct (it tracks the
// scroll). When NO resolver is registered for the active beat (or the resolver returns null), the card
// FALLS BACK to the pinned readout's own `facts[]` (the per-entity payload the producer already
// stamped) — so a card always shows a stat, registered beat or not.
//
// THE OWNERSHIP. The per-route waves (I11/I12/I13/I14) REGISTER their beats' resolvers as part of
// their own re-invention; THIS wave ships the registry + the fallback contract. It is an app-singleton
// (one registry the whole app shares — the card is the one reader, the beats the writers), so it is a
// Pinia store: a `provide`/`inject` would re-scope per-subtree and the card (teleported to body, I5.b)
// sits OUTSIDE any beat's subtree. A beat registers on mount + UNregisters on unmount (the disposer),
// so a stale /usf resolver never answers a /sci beat.

import { defineStore } from "pinia";
import { ref } from "vue";
import type { Fact } from "@/interaction/HoverCard.vue";
import type { SelectionKey } from "@/charts/contract/selection-contract";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import { useHoverReadout } from "@/platform/stores/useHoverReadout";

/** The contextual stat a beat resolver returns — a labelled band of fact rows the card renders
    through the shared `<ReadoutFacts>` grammar. `null` ⇒ this beat has no stat for this key (the
    card falls back to the pinned readout's own `facts[]`). */
export interface SelectionStat {
    /** The band header the card shows above the facts (e.g. "In this view" / "Net retention"). */
    label: string;
    /** The fact rows — the SAME grammar HoverCard renders (`<ReadoutFacts>`), so the card and the
        hover card read one fact language. */
    facts: Fact[];
}

/**
 * A beat's contextual-stat resolver: given the PARSED staged selection (kind + id) and the grain the
 * card is dispatching, return the beat's stat for that entity — or `null` when the beat has nothing
 * for it (a foreign grain, an entity outside the beat's frame). The resolver reads the beat's own
 * store reducers (the FACTUAL contract), never an invented figure.
 */
export type SelectionStatResolver = (
    sel: SelectionKey,
    grain: SelectionKey["kind"],
) => SelectionStat | null;

/**
 * O-A11 — a beat's AGGREGATE resolver: given the selected items OF ONE GRAIN (the `SelectionDrilldownPanel`
 * pre-groups by kind) and that grain, return the beat's WHOLE-SELECTION aggregate stat — or `null` when
 * the beat has no summable facts for the grain (a firm with no public totals, an un-registered grain).
 * The resolver reduces the beat's OWN store extensives/intensives through the AGGREGATE LAW compute
 * (`charts/contract/aggregate.ts` — `Σ` for extensives, `pooled`+`median` for intensives, [ANSWERS Q-38]
 * both reported), returning the SAME `{ label, facts }` grammar `statFor` does so the panel renders it
 * through one `<ReadoutFacts>`. This is the MULTI-only twin of `statFor` (single-item) — the two share
 * the beat-tracked registry discipline, never a plain mean of a ratio (the Simpson trap is unreachable).
 */
export type AggregateResolver = (
    items: readonly SelectionKey[],
    grain: SelectionKey["kind"],
) => SelectionStat | null;

export const useSelectionStat = defineStore("platform:selection-stat", () => {
    /** The beat-id → resolver registry. One resolver per beat; a beat may register/replace its own. */
    const resolvers = ref<Map<string, SelectionStatResolver>>(new Map());
    /** The beat-id → AGGREGATE-resolver registry (O-A11 · MULTI-mode). Twin of `resolvers`, same
        disposer discipline — a beat registers BOTH its single + aggregate resolver on mount. */
    const aggregateResolvers = ref<Map<string, AggregateResolver>>(new Map());

    const activeBeat = useActiveBeat();
    const readout = useHoverReadout();

    /**
     * REGISTER a beat's contextual-stat resolver (the per-route writer path, I11–I14). Returns a
     * DISPOSER that removes THIS resolver iff the slot still holds it (so a beat's `onScopeDispose`
     * cannot evict a resolver the next mount already replaced — the re-register handoff stays clean).
     * A re-register of the same beat id REPLACES its resolver (no duplicate slot).
     */
    function register(beatId: string, resolver: SelectionStatResolver): () => void {
        const next = new Map(resolvers.value);
        next.set(beatId, resolver);
        resolvers.value = next;
        return () => {
            if (resolvers.value.get(beatId) !== resolver) return;
            const after = new Map(resolvers.value);
            after.delete(beatId);
            resolvers.value = after;
        };
    }

    /**
     * Resolve the contextual stat for a staged selection, TRACKING THE ACTIVE BEAT. Reads the active
     * beat off `useActiveBeat`, runs its registered resolver for the parsed `sel`+`grain`, and returns
     * the stat — or FALLS BACK to the pinned readout's own `facts[]` (keyed by the selection key) when
     * no resolver is registered for the active beat / the resolver returns null. Returns `null` only
     * when neither a resolver nor a pinned-facts fallback exists (an empty card stat — the card then
     * shows the title alone). The `sel` is the PARSED key (the card parses once via `selectedItems`).
     */
    function statFor(
        sel: SelectionKey,
        grain: SelectionKey["kind"],
    ): SelectionStat | null {
        const resolver = resolvers.value.get(activeBeat.activeBeatId);
        const fromBeat = resolver?.(sel, grain) ?? null;
        if (fromBeat !== null) return fromBeat;
        // FALLBACK — the pinned readout's own per-entity facts (the producer-stamped payload). The
        // pin tier is keyed by the SELECTION key (`sel.key`), the same grain `selectedKeys` holds.
        const pinned = readout.pinnedReadouts.get(sel.key);
        if (pinned && pinned.facts.length) {
            return { label: pinned.eyebrow ?? pinned.title, facts: pinned.facts };
        }
        return null;
    }

    /**
     * REGISTER a beat's AGGREGATE resolver (O-A11 · the per-route writer, MULTI-mode). Returns a
     * DISPOSER that removes THIS resolver iff the slot still holds it (the same handoff-safe discipline
     * as `register`, so a re-mount that replaced the resolver is never evicted by the prior scope's
     * dispose). A re-register of the same beat id REPLACES its resolver.
     */
    function registerAggregate(
        beatId: string,
        resolver: AggregateResolver,
    ): () => void {
        const next = new Map(aggregateResolvers.value);
        next.set(beatId, resolver);
        aggregateResolvers.value = next;
        return () => {
            if (aggregateResolvers.value.get(beatId) !== resolver) return;
            const after = new Map(aggregateResolvers.value);
            after.delete(beatId);
            aggregateResolvers.value = after;
        };
    }

    /**
     * Resolve the WHOLE-SELECTION aggregate for one grain's items, TRACKING THE ACTIVE BEAT (the twin
     * of `statFor`). Reads the active beat off `useActiveBeat`, runs its registered `AggregateResolver`
     * for the grouped `items`+`grain`, and returns the `{ label, facts }` — or `null` when no aggregate
     * resolver is registered for the active beat / it returns null (the panel then FALLS BACK to a
     * count-only roll-up, never a blank). No pinned-facts fallback here — an aggregate has no single
     * pinned payload; the count roll-up is the panel's floor.
     */
    function aggregateFor(
        items: readonly SelectionKey[],
        grain: SelectionKey["kind"],
    ): SelectionStat | null {
        const resolver = aggregateResolvers.value.get(activeBeat.activeBeatId);
        return resolver?.(items, grain) ?? null;
    }

    return {
        resolvers,
        aggregateResolvers,
        register,
        statFor,
        registerAggregate,
        aggregateFor,
    };
});
