import { describe, expect, it } from "vitest";
import { createAtlasEventHub } from "../../src/events";

describe("AtlasEvent", () => {
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

    it("delivers only structurally distinct payloads per subscription", () => {
        const hub = createAtlasEventHub();
        const scope = { grain: "viz" as const, vizId: "table" };
        const event = {
            type: "selected-viz" as const,
            scope,
            vizId: "table",
            primaryKey: "row-1",
            selectedKeys: ["row-1"],
        };
        hub.emit(event);

        const replayed: string[] = [];
        const fresh: string[] = [];
        hub.on("selected-viz", (next) => replayed.push(next.primaryKey ?? ""), {
            immediate: true,
        });
        hub.on("selected-viz", (next) => fresh.push(next.primaryKey ?? ""));

        hub.emit({
            ...event,
            scope: { vizId: "table", grain: "viz" },
            selectedKeys: ["row-1"],
        });
        hub.emit({ ...event, primaryKey: "row-2", selectedKeys: ["row-2"] });

        expect(replayed).toEqual(["row-1", "row-2"]);
        expect(fresh).toEqual(["row-1", "row-2"]);
    });
});
