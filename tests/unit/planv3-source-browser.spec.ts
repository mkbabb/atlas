import { describe, expect, it } from "vitest";
import { effectScope } from "vue";
import { createAtlasEventHub } from "../../src/events";
import {
    reconcileMountedFocus,
    useSourceBrowserEvents,
} from "../../src/filter/ui/source-data-browser";
import { createBrowserFromScope } from "../../src/filter/engine/browser-from-scope";
import { emitSourceFilterState } from "../../src/filter/ui/source-filter-state";
import type { DataScope } from "../../src/platform/provenance/data-scope";

interface Row {
    lea: string;
    year: number;
    cost: number;
}

/** One declared scope — the A-33 arm the browser now binds from. The dataset carries a district
    TWICE (two years), the shape every real feed has: the entity key repeats, the row identity
    does not, and the browser must key each consumer by the right one. */
const scope: DataScope<Row, string> = {
    source: "sci-districts",
    encoding: { x: "lea", y: "cost" },
    grainNoun: "districts",
    dataset: () => [
        { lea: "010", year: 2023, cost: 4 },
        { lea: "010", year: 2024, cost: 5 },
        { lea: "020", year: 2024, cost: 6 },
    ],
    filterPredicate: () => ({ op: "any" }),
    selectionKey: (row) => `district:${row.lea}`,
    browseKey: (row) => `${row.lea}-${row.year}`,
    routeUniverse: () => "sci-lea",
    grains: [
        {
            scope: "state",
            by: () => "NC",
            create: (_key, representative) => representative,
        },
    ],
    columns: [
        { key: "lea", label: "District", value: (row) => row.lea },
        {
            key: "cost",
            label: "Cost",
            value: (row) => row.cost,
            measure: { kind: "extensive" },
        },
    ],
};

describe("SourceDataBrowser", () => {
    it("folds a declared scope into the one generic browser's props", () => {
        const bound = createBrowserFromScope(scope);
        expect(bound.columns.map((c) => c.key)).toEqual(["lea", "cost"]);
        expect(bound.availableGrains).toEqual([
            { kind: "dataset" },
            { kind: "aggregation", scope: "state" },
            { kind: "selection" },
        ]);

        // The two keys fan out to their two consumers: the entity key repeats across the years the
        // reader intersects on; the table's identities are one per row, so nothing collides.
        expect(scope.dataset().map(scope.selectionKey)).toEqual([
            "district:010",
            "district:010",
            "district:020",
        ]);
        expect(new Set(scope.dataset().map(bound.rowKey)).size).toBe(3);

        const projection = bound.rowsReader.project({ kind: "dataset" }, []);
        expect(projection.rows).toHaveLength(3);

        const payload = bound.exportPayload(projection, "districts");
        expect(payload.rows).toHaveLength(3);
        expect(payload.meta.source.label).toBe("sci-districts");
        expect(payload.meta.filterExplain).toBe("All rows — no filter active");
    });

    it("restores one tab stop when pointer scrolling recycles the focused row", () => {
        expect(reconcileMountedFocus("row-1", ["row-20", "row-21"])).toBe("row-20");
        expect(reconcileMountedFocus("row-20", ["row-20", "row-21"])).toBe("row-20");
        expect(reconcileMountedFocus("row-1", [])).toBe("row-1");
    });

    it("projects the five live browser events by active viz and resets viz-local state", () => {
        const hub = createAtlasEventHub();
        const scope = effectScope();
        const state = scope.run(() => useSourceBrowserEvents(hub, "initial"))!;
        const vizScope = { grain: "viz" as const, vizId: "districts" };

        hub.emit({
            type: "active-viz",
            scope: vizScope,
            vizId: "districts",
            beat: { id: "cost", label: "Cost" },
        });
        hub.emit({
            type: "selected-viz",
            scope: vizScope,
            vizId: "districts",
            primaryKey: "district:1",
            selectedKeys: ["district:1"],
        });
        hub.emit({
            type: "selected-viz",
            scope: { grain: "viz", vizId: "foreign" },
            vizId: "foreign",
            primaryKey: "foreign:1",
            selectedKeys: ["foreign:1"],
        });
        hub.emit({
            type: "granularity",
            scope: vizScope,
            vizId: "districts",
            grain: "selection",
        });
        hub.emit({
            type: "provenance",
            scope: vizScope,
            vizId: "districts",
            fields: ["leaNumber", "cost"],
            filterExplain: "state = NC",
        });
        hub.emit({
            type: "filter-state",
            scope: vizScope,
            predicate: "state = NC",
            active: true,
        });
        expect(state.activeVizId.value).toBe("districts");
        expect(state.selectedKeys.value).toEqual(["district:1"]);
        expect(state.grain.value).toBe("selection");
        expect(state.fields.value).toEqual(["leaNumber", "cost"]);
        expect(state.filter.value).toEqual({ predicate: "state = NC", active: true });

        hub.emit({
            type: "active-viz",
            scope: { grain: "viz", vizId: "schools" },
            vizId: "schools",
            beat: { id: "map", label: "Map" },
        });
        expect(state.activeVizId.value).toBe("schools");
        expect(state.selectedKeys.value).toEqual([]);
        expect(state.grain.value).toBeNull();
        expect(state.fields.value).toEqual([]);

        scope.stop();
    });

    it("publishes canonical filter state from the reader predicate", () => {
        const hub = createAtlasEventHub();
        const seen: Array<{ predicate: string; active: boolean }> = [];
        hub.on("filter-state", ({ predicate, active }) =>
            seen.push({ predicate, active }),
        );
        const scope = { grain: "viz" as const, vizId: "districts" };

        emitSourceFilterState(hub, scope, { op: "any" });
        emitSourceFilterState(hub, scope, {
            op: "oneOf",
            key: "state",
            field: () => "NC",
            values: new Set(["VA", "NC"]),
        });

        expect(seen).toEqual([
            { predicate: "All rows — no filter active", active: false },
            { predicate: "state ∈ {NC,VA}", active: true },
        ]);
    });
});
