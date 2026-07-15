import { describe, expect, it } from "vitest";
import {
    assertAtlasEventExhaustive,
    createAtlasEventHub,
    type AtlasEvent,
    type AtlasEventOf,
} from "@/events";

describe("AtlasEvent", () => {
    it("covers the exact eight discrete classes", () => {
        const scope = { grain: "document" } as const;
        const events: AtlasEvent[] = [
            {
                type: "active-viz",
                scope,
                vizId: "district:1",
                beat: { id: "a", label: "A" },
            },
            {
                type: "scene-change",
                scope,
                from: "a",
                to: "b",
                dir: "forward",
                sceneIndex: 1,
                sceneCount: 2,
            },
            { type: "stage-active", scope, active: true },
            {
                type: "selected-viz",
                scope,
                vizId: "district:1",
                primaryKey: "district:1",
                selectedKeys: ["district:1"],
            },
            { type: "granularity", scope, vizId: "district:1", grain: "selection" },
            {
                type: "provenance",
                scope,
                vizId: "district:1",
                fields: ["lea"],
                filterExplain: "state = NC",
            },
            { type: "provenance-drawer", scope, detent: "peek" },
            { type: "filter-state", scope, predicate: "state = NC", active: true },
        ];

        expect(events.map(assertAtlasEventExhaustive)).toEqual([
            "active-viz",
            "scene-change",
            "stage-active",
            "selected-viz",
            "granularity",
            "provenance",
            "provenance-drawer",
            "filter-state",
        ]);

        const scene: AtlasEventOf<"scene-change"> =
            events[1] as AtlasEventOf<"scene-change">;
        expect(scene.sceneIndex).toBe(1);
        expect("progress" in scene).toBe(false);
    });

    it("keeps each hub isolated, scoped, replayable, and snapshot-backed", () => {
        const hub = createAtlasEventHub();
        const other = createAtlasEventHub();
        const seen: string[] = [];
        const stop = hub.on("granularity", (event) => seen.push(event.grain), {
            scope: "viz",
        });

        hub.emit({
            type: "granularity",
            scope: { grain: "document" },
            vizId: "table",
            grain: "dataset",
        });
        hub.emit({
            type: "granularity",
            scope: { grain: "viz", vizId: "table" },
            vizId: "table",
            grain: "selection",
        });
        hub.on("granularity", (event) => seen.push(`now:${event.grain}`), {
            immediate: true,
        });
        stop();
        hub.emit({
            type: "granularity",
            scope: { grain: "viz", vizId: "table" },
            vizId: "table",
            grain: "aggregation",
        });

        hub.emit({
            type: "active-viz",
            scope: { grain: "document" },
            vizId: "table",
            beat: { id: "sources", label: "Sources" },
        });
        hub.emit({
            type: "selected-viz",
            scope: { grain: "viz", vizId: "table" },
            vizId: "table",
            primaryKey: "row-2",
            selectedKeys: ["row-2"],
        });

        expect(seen).toEqual(["selection", "now:selection", "now:aggregation"]);
        expect(hub.snapshot()).toMatchObject({
            activeVizId: "table",
            selection: { primaryKey: "row-2", selectedKeys: ["row-2"] },
        });
        expect(other.snapshot().activeVizId).toBe("");
    });
});
