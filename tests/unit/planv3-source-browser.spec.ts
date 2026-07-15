import { describe, expect, it } from "vitest";
import { effectScope } from "vue";
import { createAtlasEventHub } from "@/events";
import {
    reconcileMountedFocus,
    useSourceBrowserEvents,
} from "@/filter/ui/source-data-browser";

describe("SourceDataBrowser", () => {
    it("restores one tab stop when pointer scrolling recycles the focused row", () => {
        expect(reconcileMountedFocus("row-1", ["row-20", "row-21"])).toBe("row-20");
        expect(reconcileMountedFocus("row-20", ["row-20", "row-21"])).toBe("row-20");
        expect(reconcileMountedFocus("row-1", [])).toBe("row-1");
    });

    it("projects the five browser events by active viz and resets viz-local state", () => {
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
});
