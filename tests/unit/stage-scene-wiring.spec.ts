// Stage/scene wiring behavior, rehomed from the retired `planv3-stage-consumption` spec. That spec
// existed to consume the now-deleted `src/stage` barrel; its barrel-shape restatement (a scene-encode
// readback + a compile-time grain-guard @ts-expect-error) carried no runtime assertion and was dropped
// under test-parsimony. The two genuine behavioral assertions survive here, imported from their real
// producers: scene-anchor promotion (`useViewParams`) and the hub → four-event stage facade
// (`scene-contract`).
import { describe, expect, it } from "vitest";
import { createAtlasEventHub } from "../../src/events";
import { stageEventsFromHub } from "../../src/charts/contract/scene-contract";
import { resolveSceneAnchor } from "../../src/platform/stores/useViewParams";

describe("resolveSceneAnchor", () => {
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
});

describe("stageEventsFromHub", () => {
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
