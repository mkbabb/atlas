import type { SelectionKey, SelectionKind } from "@/charts/contract/selection-contract";

export type DrilldownProjection<Item, Aggregate> =
    | { mode: "hidden" }
    | { mode: "single"; item: Item }
    | { mode: "multi"; groups: Array<{ kind: SelectionKind; items: Item[] }>; aggregates: Aggregate[] };

/** Project only the selected keys; no rows/rankings input exists, so stale entities are unrepresentable. */
export function projectDrilldown<Item, Aggregate>(
    selected: readonly SelectionKey[],
    itemFor: (key: SelectionKey) => Item,
    aggregateFor: (keys: readonly SelectionKey[], kind: SelectionKind) => Aggregate | null,
): DrilldownProjection<Item, Aggregate> {
    if (!selected.length) return { mode: "hidden" };
    if (selected.length === 1) return { mode: "single", item: itemFor(selected[0]) };
    const byKind = new Map<SelectionKind, SelectionKey[]>();
    for (const key of selected) byKind.set(key.kind, [...(byKind.get(key.kind) ?? []), key]);
    const groups = [...byKind].map(([kind, keys]) => ({ kind, items: keys.map(itemFor) }));
    return {
        mode: "multi",
        groups,
        aggregates: [...byKind].flatMap(([kind, keys]) => {
            const aggregate = aggregateFor(keys, kind);
            return aggregate == null ? [] : [aggregate];
        }),
    };
}
