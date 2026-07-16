import { describe, expect, it } from "vitest";
import { effectScope } from "vue";
import { createAtlasEventHub } from "../../src/events";
import {
    reconcileMountedFocus,
    useSourceBrowserEvents,
} from "../../src/filter/ui/source-data-browser";
import { sourcePanelForHost } from "../../src/charts/frame/useVizPlate";
import { emitSourceFilterState } from "../../src/filter/ui/source-filter-state";

describe("SourceDataBrowser", () => {
    it("gives the source panel to exactly one host", () => {
        const panel = {} as never;
        expect(sourcePanelForHost(panel, false)).toBe(panel);
        expect(sourcePanelForHost(panel, true)).toBeNull();
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
            { predicate: "⊤", active: false },
            { predicate: "state ∈ {NC,VA}", active: true },
        ]);
    });
});
