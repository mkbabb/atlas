// platform/composables/useChartSelection.ts — the consumer adapter for the ONE selection
// contract (S1, the wiring seam). A consumer (the USF map, the SCI map, the ECF
// choropleth, both treemaps, the keyboard region) never re-derives the modifier→store
// routing: given the platform selection store, it returns the `@select` handler the
// primitive's `@select` binds and the reactive `selectedKeys` set its `:selected-keys`
// reads. ONE seam, four surfaces.
//
// The optional `mapKey` lets a consumer translate the primitive's mark key into the
// SELECTION grain before pinning — the SCI map's dots are keyed on `schoolCode` but the
// shared selection is grained on `leaNumber`, exactly as the hover already maps
// (`SchoolMap.setHovered(d.leaNumber)`). Default = identity (the map/choropleth case where
// the mark key IS the selection key).
//
// ── THE I5 KIND-AWARE EDGE (§10 · the composite `{kind}:{id}` adoption) ───────────────────────
// The grain has no KIND in a bare `selectedKeys` set: a `"37"` cannot tell a state FIPS from an
// LEA, collides across grains, and cannot pick the right `<Glyph grain>`. So a consumer that
// names a `kind` makes this seam the PRODUCER-EDGE ENCODER: `onSelect` mints the composite
// `encodeSelKey(kind, mapKey(markKey))` into the (byte-unchanged) Set, and the returned
// `selectedKeys` is the kind's NATIVE-GRAIN back-projection (`selectedIdsOf(kind)`) — the RAW
// ids the plate's marks + `SelectionRegion` already test `:selected-keys.has(rawId)` against, so
// every existing `.has(markGrain)` consumer keeps working unchanged while the STORE set carries
// the kind. A foreign-kind key (a stale /usf `state:37` carried into /sci) is invisible to the
// back-projection (GAP-2 cured at the read). `encodeKey(rawId)` is exposed so the producer can
// pin its readout under the SAME composite key the Set holds (the pin tier keys on `selectedKeys`).
//
// OMIT the `kind` and the seam is BYTE-IDENTICAL to before (the legacy/non-geo path — a firm-keyed
// treemap, a bare-grain plate): no encode, the raw Set passes through, `encodeKey` is identity. The
// codec is OPT-IN at the producer edge — a non-codec selection coexists in the grain-agnostic Set.

import { computed, type ComputedRef } from "vue";
import {
    encodeSelKey,
    type SelectEvent,
    type SelectionKind,
} from "@/charts/contract/selection-contract";
import { useSelection } from "@/platform/stores/useSelection";

/** The mark-key → selection-grain translator (default identity); a null return drops the gesture. */
export type MapKeyFn = (markKey: string) => string | null;

export interface UseChartSelection {
    /** The live selected SET — bind to the primitive's `:selected-keys` (the frame channel). When a
        `kind` is named this is the NATIVE-GRAIN back-projection (`selectedIdsOf(kind)`, raw ids); a
        foreign-kind key is invisible. Without a `kind` it is the raw Set (legacy/non-codec). */
    selectedKeys: ComputedRef<ReadonlySet<string>>;
    /** The `@select` handler — routes the modifier→store (plain replaces, cmd toggles). When a `kind`
        is named it ENCODES `{kind}:{id}` into the Set at the producer edge. */
    onSelect: (ev: SelectEvent) => void;
    /** Encode a raw selection-grain id to the COMPOSITE Set member (`{kind}:{id}`) — identity when
        no `kind` is named. The producer pins its readout under this so the pin tier (keyed on the
        Set member) stays in lockstep with the selection. */
    encodeKey: (rawId: string) => string;
}

/**
 * Wire a chart primitive's `@select` to the platform selection store. The overload split keeps the
 * legacy positional `mapKey` signature working while adding the kind-aware edge:
 *   • `useChartSelection()` / `useChartSelection(mapKey)` — the LEGACY path (no kind): the Set holds
 *     the bare mark/selection key exactly as before (a non-codec / firm-keyed plate).
 *   • `useChartSelection(kind)` / `useChartSelection(kind, mapKey)` — the KIND-AWARE path: `onSelect`
 *     encodes `{kind}:{id}` and `selectedKeys` back-projects to the kind's native grain.
 * An empty key clears the selection (the keyboard Escape idiom — `SelectionRegion` emits `key: ""`).
 */
export function useChartSelection(mapKey?: MapKeyFn): UseChartSelection;
export function useChartSelection(
    kind: SelectionKind,
    mapKey?: MapKeyFn,
): UseChartSelection;
export function useChartSelection(
    kindOrMapKey?: SelectionKind | MapKeyFn,
    maybeMapKey?: MapKeyFn,
): UseChartSelection {
    // Disambiguate the overload: a string first arg is the `kind`, a function first arg the legacy
    // `mapKey`. The kind-aware path encodes + back-projects; the legacy path is byte-identical.
    const kind: SelectionKind | null =
        typeof kindOrMapKey === "string" ? kindOrMapKey : null;
    const mapKey: MapKeyFn =
        typeof kindOrMapKey === "function"
            ? kindOrMapKey
            : (maybeMapKey ?? ((k) => k));

    const sel = useSelection();

    // The frame channel the plate binds to `:selected-keys`. With a kind it is the native-grain
    // back-projection (raw ids of that kind only); without, the raw Set (the legacy passthrough).
    const selectedKeys = computed<ReadonlySet<string>>(() =>
        kind ? sel.selectedIdsOf(kind) : sel.selectedKeys,
    );

    function encodeKey(rawId: string): string {
        return kind ? encodeSelKey(kind, rawId) : rawId;
    }

    function onSelect(ev: SelectEvent): void {
        if (ev.key === "") {
            sel.clearSelection();
            return;
        }
        const id = mapKey(ev.key);
        if (id == null) return;
        // The kind-aware edge mints the composite key here (the Set still only stores + equates the
        // resulting string); the legacy path selects the bare id exactly as before.
        sel.select(encodeKey(id), { additive: ev.multi });
    }

    return { selectedKeys, onSelect, encodeKey };
}
