// charts/scene/stage-viz-adapter.ts — THE ChapterStage CONTROLS ADAPTER (S-20, re-homed by A-39).
//
// A composed `ChapterStage` does not render through `VizPlate`, and its controls are its OWN
// scene-aware `anatomy.gear.controls` (the /sci scatter `Controls.vue`), not the raw options the
// stage's graphic registers under the same id. Under A-39 (the plate, RULINGS §I) those controls are
// the stage's per-figure options, so they render in the stage's own act row (ChapterStage), never in
// page chrome: the facet-5 projection seam they used to register into is deleted. This pure mapper
// stays the one place the stage's declared gear becomes the act row's options component + props.

import type { Component } from "vue";
import type { ChapterStage } from "../contract/scene-contract.js";

/** A stage's options as its act row renders them: the controls component and the props it needs. */
export interface StageControls {
    /** The gear cluster's label (`stage.anatomy.gear.label`). */
    readonly label: string;
    /** The stage's bespoke controls Component (`stage.anatomy.gear.controls`). */
    readonly component: Component;
    /** The props the controls need (`stageId` + `eventHub`). */
    readonly props: Record<string, unknown>;
}

/** Map a stage's declared gear anatomy to its act-row options, or `null` when it declares none. */
export function stageControlsOf(stage: ChapterStage): StageControls | null {
    const controls = stage.anatomy.gear.controls;
    if (!controls) return null;
    return {
        label: stage.anatomy.gear.label,
        component: controls,
        props: { stageId: stage.id, eventHub: stage.events },
    };
}
