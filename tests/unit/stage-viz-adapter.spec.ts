// The ChapterStage controls adapter. Under A-39 (the plate) a composed stage's bespoke gear controls are
// its own per-figure options and render in the stage's act row; the page-chrome registry seam they used
// to project through is deleted. These specs bind the shipped `stageControlsOf` mapper and the absence
// of that seam.
import { describe, expect, it } from "vitest";
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

describe("the stage's controls have no page seam (A-39, the plate)", () => {
    it("the registry exposes no stage-controls projection for page chrome to read", () => {
        const registry = useVizRegistry() as unknown as Record<string, unknown>;
        expect(registry.registerStageControls).toBeUndefined();
        expect(registry.stageControlsFor).toBeUndefined();
        expect(registry.deregisterStageControls).toBeUndefined();
    });
});
