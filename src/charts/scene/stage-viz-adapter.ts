// charts/scene/stage-viz-adapter.ts — THE S-20 ChapterStage ANATOMY ADAPTER (spec-chrome §e.3).
//
// A composed `ChapterStage` does NOT render through `VizPlate`, so it never self-registers a plate
// facet (`ChapterStage.vue` `useVizRegistry` was 0). Yet under the A-39 membrane fold the facet-5
// viz-context zone projects the ACTIVE viz's controls off the registry — and for a composed stage
// those controls are the stage's OWN scene-aware `anatomy.gear.controls` (e.g. the /sci scatter
// `Controls.vue`), NOT the raw plate `optionsController` the stage's graphic happens to register
// under the SAME id (found this lane: `Graphic.vue :viz-id="SCI_SCATTER_STAGE_ID"` → the SciScatter
// VizPlate registers the plate facet under the stage id, and `Controls.vue` reads it back). This PURE
// mapper adapts a `ChapterStage` → the controls projection the stage registers into the DEDICATED
// stage-anatomy seam (`registerStageControls`), decoupled from that volatile plate entry so the two
// never race for one key. The fold renders the stage's controls WITHOUT rendering ChapterStage
// through VizPlate (the §e.3 ruling — the smaller, honest diff). TOTAL + fixture-testable (the
// pure-core pattern, mirroring `buildActiveVizEvent`).

import type { ChapterStage } from "../contract/scene-contract.js";
import type { RegisteredStageControls } from "../composables/useVizRegistry.js";

/** Map a stage's declared gear anatomy → the registry's controls projection, or `null` when the
    stage declares no controls (nothing to project). The `props` are the ones the controls need when
    the facet-5 zone renders them OUTSIDE ChapterStage's own template (`stageId` + `eventHub` — the
    exact pair `ChapterStage.vue` binds on the `#gear` slot today). */
export function stageControlsOf(stage: ChapterStage): RegisteredStageControls | null {
    const controls = stage.anatomy.gear.controls;
    if (!controls) return null;
    return {
        label: stage.anatomy.gear.label,
        component: controls,
        props: { stageId: stage.id, eventHub: stage.events },
    };
}
