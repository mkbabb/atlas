import { computed, type ComputedRef } from "vue";
import {
    useFilterDimensions,
    type DimDeclaration,
    type RouteUniverse,
} from "./useFilterDimensions";
import { useFilterPanel } from "./useFilterPanel";
import { useSelection } from "@/platform/stores/useSelection";

export interface FilterLedgerChip {
    key: string;
    label: string;
}

export interface UseFilterLedgerReturn {
    chips: ComputedRef<FilterLedgerChip[]>;
    appliedCount: ComputedRef<number>;
    selectionCount: ComputedRef<number>;
}

/** A read-only projection of the existing panel cells; it never parses or writes the URL. */
export function useFilterLedger(): UseFilterLedgerReturn {
    const { projectedDims } = useFilterPanel();
    const declarations = computed<DimDeclaration[]>(() =>
        projectedDims.value.map((dim) => ({
            key: dim.key,
            arity: dim.arity,
            label: dim.label,
            selectionKind: dim.selectionKind,
            universe: (dim.universe as RouteUniverse | undefined) ?? "sci-lea",
        })),
    );
    const { cellFor } = useFilterDimensions(declarations);
    const selection = useSelection();

    const chips = computed<FilterLedgerChip[]>(() =>
        projectedDims.value.flatMap((dim) => {
            const cell = cellFor(dim.key);
            if (!cell) return [];
            const active =
                cell.arity === "set"
                    ? cell.value.size > 0
                    : cell.arity === "multi"
                      ? cell.value.length > 0
                      : cell.value != null;
            return active ? [{ key: dim.key, label: dim.label }] : [];
        }),
    );

    return {
        chips,
        appliedCount: computed(() => chips.value.length),
        selectionCount: computed(() => selection.selectedKeys.size),
    };
}
