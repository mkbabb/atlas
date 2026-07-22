// The S-20 ChapterStage anatomy adapter (spec-chrome §e.3) — the A-39 fold premise. A composed stage
// projects its bespoke gear controls through a DEDICATED registry seam, decoupled from the graphic's
// plate facet under the same id, so the two never collide. These specs bind the shipped `stageControlsOf`
// mapper + the registry seam and FAIL if either is removed (R-1 hollow-test).
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, type Component } from "vue";
import { useVizRegistry } from "../../src/charts/composables/useVizRegistry";
import { stageControlsOf } from "../../src/charts/scene/stage-viz-adapter";
import { createAtlasEventHub } from "../../src/events";
import type { ChapterStage } from "../../src/charts/contract/scene-contract";

const DummyControls = defineComponent({ name: "DummyControls", render: () => null });

function fixtureStage(controls: Component | undefined): ChapterStage {
    return {
        id: "test-stage",
        events: createAtlasEventHub(),
        anatomy: { gear: { label: "Test controls", controls } },
    } as unknown as ChapterStage;
}

describe("stageControlsOf (the S-20 ChapterStage anatomy adapter)", () => {
    it("maps a stage's gear anatomy to the registry controls projection", () => {
        const stage = fixtureStage(DummyControls);
        const projection = stageControlsOf(stage);
        expect(projection).toMatchObject({
            label: "Test controls",
            component: DummyControls,
        });
        // the props are the exact pair ChapterStage binds on the #gear slot today.
        expect(projection?.props.stageId).toBe("test-stage");
        expect(projection?.props.eventHub).toBe(stage.events);
    });

    it("returns null when the stage declares no gear controls (nothing to project)", () => {
        expect(stageControlsOf(fixtureStage(undefined))).toBeNull();
    });
});

describe("the stage-anatomy registry seam", () => {
    const registry = useVizRegistry();
    beforeEach(() => registry.__resetRegistry());

    it("registers, projects, and deregisters a stage's controls under its id", () => {
        const controls = stageControlsOf(fixtureStage(DummyControls))!;
        expect(registry.stageControlsFor("test-stage")).toBeUndefined();
        const token = registry.registerStageControls("test-stage", controls);
        expect(registry.stageControlsFor("test-stage")).toBe(controls);
        registry.deregisterStageControls("test-stage", token);
        expect(registry.stageControlsFor("test-stage")).toBeUndefined();
    });

    it("guards a stale unmount so a re-registered stage survives (the double-mount guard)", () => {
        registry.registerStageControls("test-stage", stageControlsOf(fixtureStage(DummyControls))!);
        const live = stageControlsOf(fixtureStage(DummyControls))!;
        registry.registerStageControls("test-stage", live); // HMR / keep-alive re-register
        registry.deregisterStageControls("test-stage", Symbol("stale")); // superseded token — inert
        expect(registry.stageControlsFor("test-stage")).toBe(live);
    });

    it("coexists with the graphic's plate facet under the same id (the byte-faithful crux)", () => {
        // The /sci scatter graphic registers a plate facet under the stage id; the anatomy seam must
        // NOT clobber it, nor be clobbered by it — both project independently under one id.
        registry.register({ vizId: "test-stage", dims: [], filterResponse: "responsive" });
        registry.registerStageControls("test-stage", stageControlsOf(fixtureStage(DummyControls))!);
        expect(registry.facetsFor(["test-stage"])).toHaveLength(1);
        expect(registry.stageControlsFor("test-stage")).toBeDefined();
    });
});
