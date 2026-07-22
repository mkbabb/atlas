<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { Download } from "@lucide/vue";
import { DockControl } from "@mkbabb/glass-ui/dock";
import StickyScene from "./StickyScene.vue";
import FootAnatomy from "../frame/FootAnatomy.vue";
import VizAppendixDock from "../../platform/provenance/VizAppendixDock.vue";
import { useMembraneProvenanceSource } from "../../platform/provenance/useMembraneProvenance.js";
import {
    createStageMorphDriver,
    STAGE_MORPH_KEY,
} from "./stage-morph.js";
import { createStageScrollRestore } from "./stage-scroll-restore.js";
import {
    resolveSceneAnchor,
    useViewParams,
} from "../../platform/stores/useViewParams.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { useVirtualSectionWindow } from "../../filter/composables/useVirtualSectionWindow.js";
import type {
    ChapterScene,
    ChapterStage as ChapterStageContract,
} from "../contract/scene-contract.js";
import type { SourcePanelProps } from "../contract/viz-contract.js";
import {
    STAGE_EVENTS_KEY,
    STAGE_EVENT_HUB_KEY,
    STAGE_ANATOMY_KEY,
    stageEventsFromHub,
} from "../contract/scene-contract.js";
import type { AppendixDetent } from "../../platform/provenance/appendix.js";
import { useVizRegistry, type VizToken } from "../composables/useVizRegistry.js";
import { stageControlsOf } from "./stage-viz-adapter.js";

const props = defineProps<{
    stage: ChapterStageContract;
    index?: number;
    beatId?: string;
}>();
const reduced = useReducedMotion();

const morph = createStageMorphDriver({
    initialSceneId: props.stage.scenes[0]?.id ?? props.stage.id,
    identity: props.stage.identity,
    transition: props.stage.transition,
    reducedMotion: reduced,
});
provide(STAGE_MORPH_KEY, morph);

// Stage declarations are static for a mounted story. Preserve the authored option objects while
// bridging the stage's scenes onto StickyScene's ordered steps.
const scene: Readonly<ChapterScene> = Object.freeze({
    kind: "scene",
    graphic: props.stage.instance,
    steps: props.stage.scenes,
    focal: props.stage.focal,
    anchor: props.stage.anchor,
    // These steps are the stage's SceneOption objects; ChapterScene accepts a wider callback
    // type for standalone consumers, so this is a safe narrowing at the one bridge.
    apply: props.stage.apply as ChapterScene["apply"],
});

const view = useViewParams();
view.registerKeys(["browse", "drawer", "grain"]);
const initialSceneId = view.sceneId;
const initialAnchor = view.narrativeAt;
const sceneAnchor = resolveSceneAnchor(
    props.beatId,
    initialSceneId,
    props.stage.scenes.map((scene) => scene.id),
    initialAnchor,
);
if (sceneAnchor && sceneAnchor !== initialAnchor)
    view.setNarrativeAt(sceneAnchor.beatId, sceneAnchor.stepId);
const events = props.stage.events;
const stageEvents = stageEventsFromHub(events, props.stage.id);
const scope = { grain: "stage" as const, stageId: props.stage.id };
const activeSceneIndex = ref(0);
const linkedDrawer = view.param("drawer");
const appendixDetent = ref<AppendixDetent>(
    linkedDrawer === "peek" || linkedDrawer === "full"
        ? linkedDrawer
        : (props.stage.anatomy.provenance.detent ?? "shut"),
);
provide(STAGE_EVENTS_KEY, stageEvents);
provide(STAGE_EVENT_HUB_KEY, { hub: events, scope });
provide(STAGE_ANATOMY_KEY, true);
watch(
    () => view.param("drawer"),
    (detent) => {
        appendixDetent.value = detent === "peek" || detent === "full" ? detent : "shut";
    },
);
const sourcePanelProps = {
    eventHub: events,
    eventScope: scope,
    vizId: props.stage.id,
} satisfies SourcePanelProps;

// ── S-20 — THE ChapterStage ANATOMY ADAPTER (spec-chrome §e.3) ───────────────────────────────────
// A composed stage does NOT render through VizPlate, so it never self-registers — under the A-39 fold
// the facet-5 zone (which projects the active viz's controls off the registry) would have no source
// for THIS stage's scene-aware gear controls. The adapter registers the stage's `anatomy.gear.controls`
// into the DEDICATED stage-anatomy seam (token-guarded, deregister on leave) so the fold projects the
// stage's controls WITHOUT rendering ChapterStage through VizPlate. It never touches the graphic's own
// plate entry under the same id (that stays the graphic's), so the fold-1 tree renders byte-faithful.
const vizRegistry = useVizRegistry();
let stageControlsToken: VizToken | null = null;
onMounted(() => {
    const controls = stageControlsOf(props.stage);
    if (controls)
        stageControlsToken = vizRegistry.registerStageControls(props.stage.id, controls);
});
onUnmounted(() => {
    if (stageControlsToken)
        vizRegistry.deregisterStageControls(props.stage.id, stageControlsToken);
});

function emitActiveViz(index = activeSceneIndex.value): void {
    const option = props.stage.scenes[index];
    if (!option) return;
    events.emit({
        type: "active-viz",
        scope,
        vizId: props.stage.id,
        beat: {
            id: option.id,
            label: props.stage.anatomy.foot.title,
        },
    });
}

function onSceneChange(event: {
    from: string;
    to: string;
    dir: "forward" | "back";
    index: number;
}): void {
    activeSceneIndex.value = event.index;
    const option = props.stage.scenes[event.index];
    if (option) morph.applyScene(option, { dir: event.dir });
    view.setSceneId(event.to);
    events.emit({
        type: "scene-change",
        scope,
        from: event.from,
        to: event.to,
        dir: event.dir,
        sceneIndex: event.index,
        sceneCount: props.stage.scenes.length,
    });
    emitActiveViz(event.index);
}

function onActiveChange(active: boolean): void {
    if (
        !active &&
        props.stage.scenes.some((scene) => scene.id === view.sceneId)
    )
        view.setSceneId(undefined);
    events.emit({
        type: "stage-active",
        scope,
        active,
    });
    if (active) emitActiveViz();
}

function onProvenanceOpen(detent: "shut" | "peek" | "full"): void {
    appendixDetent.value = detent;
    events.emit({
        type: "provenance-drawer",
        scope,
        detent,
    });
}

const sceneReadout = computed(
    () => `Scene ${activeSceneIndex.value + 1} of ${props.stage.scenes.length}`,
);

function openSourceData(): void {
    props.stage.anatomy.export.open(scope);
}

// W-MEMBRANE (A-39 · STRAND A) — the stage's source-data BROWSE re-homes into the membrane's facet-6
// provenance detent, the ChapterStage analog of VizPlate's export teleport. The stage does NOT render
// through VizPlate (no header export seat), so once its per-plate `VizGearDock` is deleted the browse
// would strand — this teleport gives it the SAME facet-6 home, firing only when the stage is the dial
// viz (`useMembraneProvenanceSource`, the ONE dial-viz truth).
const { teleport: stageChromeTeleport, targetSelector: membraneProvenanceSlot } =
    useMembraneProvenanceSource(() => props.stage.id);

function closeSourceData(): void {
    if (view.param("browse") === props.stage.id) view.setParam("browse", undefined);
    view.setParam("grain", undefined);
}

const sourceDataOpen = computed(
    () => view.param("browse") === props.stage.id,
);
const stageRoot = ref<HTMLElement | null>(null);
const { materialized, placeholderStyle } = useVirtualSectionWindow(stageRoot, {
    keepAlive: () =>
        sourceDataOpen.value || view.narrativeAt?.beatId === props.beatId,
});

// ── OF-19.1 — THE TRUTHFUL STAGE YIELD (the void collapse + its scroll restoration) ────────────────
// When the source panel owns the stage, the steps' track COLLAPSES (`display:none` in the scoped CSS
// below) — it stops reserving its N-viewport scroll height, so there is no invisible void beneath the
// panel. That collapse shrinks the document, so the state transition is deliberate on BOTH edges:
//   · on OPEN we snapshot the reader's scroll offset, then frame the (now viewport-tall) stage — else
//     the content that shifts up would slide into the reader's offset and the panel would be off-screen;
//   · on CLOSE we restore the snapshotted offset — but ONLY when an OPEN edge actually captured one.
// CHALLENGE-2 P2 — an INITIALLY-open panel (deep link / reload with `?browse=`) never crosses an open
// edge (this `watch` is non-immediate), so it holds NO snapshot; closing it must NOT teleport the page
// to `scrollTo(0)` (the reader never opened it from anywhere — there is nothing to return to). The
// scroll-restore latch's null sentinel enforces exactly that: `release()` is null on the un-captured
// path, so the initially-open close leaves the page where the reader stands.
const scrollRestore = createStageScrollRestore();
watch(sourceDataOpen, (open) => {
    if (typeof window === "undefined") return;
    if (open) {
        scrollRestore.capture(window.scrollY);
        void nextTick(() =>
            stageRoot.value?.scrollIntoView({ behavior: "auto", block: "start" }),
        );
    } else {
        const target = scrollRestore.release();
        if (target !== null)
            void nextTick(() => window.scrollTo({ top: target, behavior: "auto" }));
    }
});
</script>

<template>
    <section
        ref="stageRoot"
        class="chapter-stage"
        :data-stage-id="stage.id"
        :data-source-open="sourceDataOpen || undefined"
        :style="placeholderStyle"
    >
        <StickyScene
            v-if="materialized"
            :key="stage.id"
            :scene="scene"
            :index="index"
            :stage-id="stage.id"
            :beat-id="beatId"
            @scene-change="onSceneChange"
            @active-change="onActiveChange"
        >
            <template #anatomy>
                <FootAnatomy :contract="stage.anatomy.foot">
                    <template #legend>
                        <component
                            :is="stage.anatomy.legend"
                            v-if="stage.anatomy.legend"
                        />
                    </template>
                    <template #gear>
                        <!-- W-MEMBRANE (A-39) — the stage's scene-aware controls project into the
                             membrane's facet-5 zone via the S-20 adapter (`registerStageControls`),
                             so they no longer render in this foot seat (the fold's de-duplication).
                             Only the source-data BROWSE survives, and only as a TELEPORT into facet-6
                             when the stage is the dial viz — nothing strands when the per-plate
                             `VizGearDock` is deleted. -->
                        <Teleport
                            v-if="stageChromeTeleport"
                            :to="membraneProvenanceSlot"
                        >
                            <DockControl
                                compact
                                :aria-label="`Browse source data — ${stage.anatomy.gear.label}`"
                                :aria-expanded="sourceDataOpen"
                                :title="`Source data · ${stage.anatomy.foot.title}`"
                                :data-testid="`stage-source-data-${stage.id}`"
                                data-viz-dock-download
                                @click="openSourceData"
                            >
                                <Download aria-hidden="true" />
                            </DockControl>
                        </Teleport>
                    </template>
                    <template #readout>
                        <component
                            :is="stage.anatomy.readout"
                            v-if="stage.anatomy.readout"
                        />
                        <span v-else>{{ sceneReadout }}</span>
                    </template>
                    <template #provenance>
                        <VizAppendixDock
                            :label="stage.anatomy.provenance.label"
                            :peek-label="stage.anatomy.provenance.peekLabel"
                            :detent="appendixDetent"
                            @detent-change="onProvenanceOpen"
                        >
                            <template #peek>
                                <component
                                    :is="stage.anatomy.provenance.peek"
                                    v-if="stage.anatomy.provenance.peek"
                                />
                            </template>
                            <component
                                :is="stage.anatomy.provenance.full"
                                v-if="stage.anatomy.provenance.full"
                            />
                        </VizAppendixDock>
                    </template>
                </FootAnatomy>
                <aside
                    v-if="sourceDataOpen"
                    class="chapter-stage__source-data"
                    :aria-label="
                        stage.anatomy.export.ariaLabel ?? 'Source data browser'
                    "
                >
                    <button
                        type="button"
                        class="chapter-stage__source-close"
                        @click="closeSourceData"
                    >
                        Close source data
                    </button>
                    <component
                        :is="stage.anatomy.export.panel"
                        v-bind="sourcePanelProps"
                        @close="closeSourceData"
                    />
                </aside>
            </template>
        </StickyScene>
    </section>
</template>

<style scoped>
.chapter-stage {
    overflow: clip;
}

/* When the source panel owns the stage, the prose story card yields: the pinned graphic (which
   hosts the source panel) spans the whole stage and the narrated steps yield, so there is no
   viewport-tall empty gold frame beside four lines of text, and the live-behind figure is fully
   covered (no floating readout can occlude the data table). */
.chapter-stage[data-source-open] :deep(.sticky-scene__graphic) {
    grid-column: 1 / -1;
}

/* OF-19.1 — the steps' track COLLAPSES (not merely `visibility:hidden`): `display:none` stops it
   reserving its N-viewport scroll height, so the stage shrinks to the panel's own viewport height
   and the invisible void beneath the panel is gone. The script above snapshots + restores the
   reader's scroll offset across the collapse, so re-opening a closed panel returns them to their step. */
.chapter-stage[data-source-open] :deep(.sticky-scene__steps) {
    display: none;
}

.chapter-stage__source-data {
    position: absolute;
    z-index: 4;
    inset: 0;
    overflow: auto;
    padding: clamp(0.75rem, 2vw, 1.25rem);
    border-block: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: var(--background);
}

.chapter-stage__source-close {
    display: block;
    margin-inline-start: auto;
    margin-block-end: 0.75rem;
}
</style>
