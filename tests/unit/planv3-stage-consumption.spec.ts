import { describe, expect, it, vi } from "vitest";
import { createAtlasEventHub } from "@/events";
import {
    stageEventsFromHub,
    type ChapterStage,
    type SceneOption,
} from "@/stage";
import { resolveSceneAnchor } from "@/platform/stores/useViewParams";

vi.mock("@/charts/scene/ChapterStage.vue", () => ({ default: {} }));

describe("stageEventsFromHub", () => {
    it("ties every scene encode to the stage grain", () => {
        const scene: SceneOption<"district"> = {
            id: "district-scene",
            prose: "District",
            state: {},
            encode: { x: "district:x", y: "district:y" },
        };
        const stage: ChapterStage<"district"> = {
            kind: "stage",
            id: "district-stage",
            grain: "district",
            graphic: () => null,
            scenes: [scene],
            identity: { field: "leaNumber" },
            transition: { mode: "blend", reduced: false },
        };
        expect(stage.scenes[0]?.encode.x).toBe("district:x");

        const stateScene: SceneOption<"state"> = {
            id: "state-scene",
            prose: "State",
            state: {},
            encode: { x: "state:x", y: "state:y" },
        };
        const acceptsDistrict = (_scene: SceneOption<"district">): void => {};
        // @ts-expect-error A state-grain scene cannot enter a district-grain stage.
        acceptsDistrict(stateScene);
    });

    it("promotes only an authored scene onto its owning coarse beat anchor", () => {
        const scenes = ["utilization", "scale", "equity", "cost"];
        expect(resolveSceneAnchor("stage", "equity", scenes, null)).toEqual({
            beatId: "stage",
            stepId: "equity",
        });
        expect(
            resolveSceneAnchor("stage", "equity", scenes, { beatId: "stage" }),
        ).toEqual({ beatId: "stage", stepId: "equity" });
        expect(
            resolveSceneAnchor("stage", "unknown", scenes, { beatId: "stage" }),
        ).toEqual({ beatId: "stage" });
        expect(
            resolveSceneAnchor("stage", "equity", scenes, { beatId: "later" }),
        ).toEqual({ beatId: "later" });
    });

    it("adapts the shared hub into the exact four-event stage facade", () => {
        const hub = createAtlasEventHub();
        const events = stageEventsFromHub(hub, "stage-a");
        const received: string[] = [];
        const stops = [
            events.onSceneChange((event) => received.push(`scene:${event.to}`)),
            events.onActiveChange((active) => received.push(`active:${active}`)),
            events.onSelection((selection) =>
                received.push(`selection:${selection.selectedKeys.size}`),
            ),
            events.onProvenanceOpen((detent) => received.push(`drawer:${detent}`)),
        ];
        const scope = { grain: "stage" as const, stageId: "stage-a" };
        hub.emit({
            type: "stage-active",
            scope: { grain: "stage", stageId: "stage-b" },
            active: true,
        });
        hub.emit({
            type: "scene-change",
            scope,
            from: "one",
            to: "two",
            dir: "forward",
            sceneIndex: 1,
            sceneCount: 2,
        });
        hub.emit({ type: "stage-active", scope, active: true });
        hub.emit({
            type: "selected-viz",
            scope,
            vizId: "stage-a",
            primaryKey: "district:1",
            selectedKeys: ["district:1", "district:2"],
        });
        hub.emit({ type: "provenance-drawer", scope, detent: "full" });
        expect(received).toEqual([
            "scene:two",
            "active:true",
            "selection:2",
            "drawer:full",
        ]);
        stops.forEach((stop) => stop());
        hub.emit({ type: "stage-active", scope, active: false });
        expect(received).toHaveLength(4);
    });
});
