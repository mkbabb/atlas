<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch, type VNodeChild } from "vue";
import { SegmentedTabs } from "@mkbabb/glass-ui/tabs";
import StickyScene from "./StickyScene.vue";
import FootAnatomy from "../frame/FootAnatomy.vue";
import PlateAct from "../frame/PlateAct.vue";
import VizAppendixDock from "../../platform/provenance/VizAppendixDock.vue";
import {
    createStageMorphDriver,
    STAGE_MORPH_KEY,
} from "./stage-morph.js";
import { createStageScrollRestore } from "./stage-scroll-restore.js";
import { useActiveDashboard } from "../../platform/stores/useActiveDashboard.js";
import {
    resolveSceneAnchor,
    useViewParams,
} from "../../platform/stores/useViewParams.js";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { useVirtualSectionWindow } from "../../filter/composables/useVirtualSectionWindow.js";
import {
    SCENE_KEY,
    type ChapterScene,
    type ChapterStage as ChapterStageContract,
    type SceneRuntime,
} from "../contract/scene-contract.js";
import type { SourcePanelProps } from "../contract/viz-contract.js";
import {
    STAGE_COMMANDS_KEY,
    STAGE_EVENTS_KEY,
    STAGE_EVENT_HUB_KEY,
    STAGE_ANATOMY_KEY,
    stageEventsFromHub,
} from "../contract/scene-contract.js";
import type { AppendixDetent } from "../../platform/provenance/appendix.js";
import { stageControlsOf } from "./stage-viz-adapter.js";
import { createStageProvenance } from "./stage-provenance.js";

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

// The stage's figure: in flow, its scene control in the head (O-12 S-2). Scrolling changes nothing.
const scene: Readonly<ChapterScene> = Object.freeze({
    kind: "scene",
    graphic: props.stage.instance,
    focal: props.stage.focal,
});

const view = useViewParams();
view.registerKeys(["browse", "grain"]);
const initialSceneId = view.sceneId;
const initialAnchor = view.narrativeAt;
const sceneAnchor = resolveSceneAnchor(
    props.beatId,
    initialSceneId,
    props.stage.scenes.map((scene) => scene.id),
    initialAnchor,
);
// §K K-3: a promoted `?scene` link is held as the restore anchor, never written on load.
if (sceneAnchor && sceneAnchor !== initialAnchor) view.linkSceneAnchor(sceneAnchor);
const events = props.stage.events;
const stageEvents = stageEventsFromHub(events, props.stage.id);
const scope = { grain: "stage" as const, stageId: props.stage.id };
const initialIndex = Math.max(
    0,
    props.stage.scenes.findIndex((option) => option.id === initialSceneId),
);
const activeSceneIndex = ref(initialIndex);
const activeOption = computed(() => props.stage.scenes[activeSceneIndex.value]!);
provide(SCENE_KEY, {
    activeIndex: computed(() => activeSceneIndex.value),
    activeStep: activeOption,
    count: props.stage.scenes.length,
    progress: computed(() =>
        props.stage.scenes.length > 1 ? activeSceneIndex.value / (props.stage.scenes.length - 1) : 1,
    ),
});
const runtime: SceneRuntime = { view, active: useActiveDashboard() };
const sceneOptions = props.stage.scenes.map((option) => ({ label: option.label, value: option.id }));
// The appendix detent and its open command (U-F60 cl. 4): `?drawer` is read once, here, and honoured
// through the command; nothing writes it.
const provenance = createStageProvenance({
    hub: events,
    scope,
    authored: props.stage.anatomy.provenance.detent,
    linked: view.param("drawer"),
});
const appendixDetent = provenance.detent;
provide(STAGE_EVENTS_KEY, stageEvents);
provide(STAGE_COMMANDS_KEY, { openProvenance: provenance.openProvenance });
provide(STAGE_EVENT_HUB_KEY, { hub: events, scope });
provide(STAGE_ANATOMY_KEY, true);
const sourcePanelProps = {
    eventHub: events,
    eventScope: scope,
    vizId: props.stage.id,
} satisfies SourcePanelProps;

// ── THE STAGE'S OWN ACTS (A-39, the plate · RULINGS §I) ─────────────────────────────────────────
// A composed stage does not render through VizPlate (its graphic's VizPlate suppresses its foot under
// `STAGE_ANATOMY_KEY`), so the STAGE owns the figure's act row: its scene-aware controls are its
// options, its declared source pane is its download, and Enlarge opens its graphic's frame. Nothing is
// registered for page chrome to project; the dock carries none of these acts.
const stageControls = stageControlsOf(props.stage);
/** Enlarge the stage's graphic: its frame is addressed by the stage id (the graphic's contract id). */
function enlargeStage(): void {
    view.openFig(props.stage.id);
}

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

/** The reader chose a scene on the control: the one write of `?scene=` (O-12 S-2). */
function chooseScene(id: string): void {
    const to = props.stage.scenes.findIndex((option) => option.id === id);
    const from = activeSceneIndex.value;
    if (to < 0 || to === from) return;
    const dir = to > from ? "forward" : "back";
    activeSceneIndex.value = to;
    const option = props.stage.scenes[to]!;
    morph.applyScene(option, { dir });
    props.stage.apply?.(option, runtime);
    view.setSceneId(option.id);
    events.emit({
        type: "scene-change",
        scope,
        from: props.stage.scenes[from]!.id,
        to: option.id,
        dir,
        sceneIndex: to,
        sceneCount: props.stage.scenes.length,
    });
    emitActiveViz(to);
}

/** The active scene's one line under the figure. */
function ActiveCaption(): VNodeChild {
    const prose = activeOption.value.prose;
    return typeof prose === "function" ? prose() : prose;
}

onMounted(() => {
    // The scene the page opened on (the first, or a `?scene=` link) drives the figure; nothing is written.
    if (initialIndex > 0) morph.applyScene(activeOption.value, { dir: "forward" });
    props.stage.apply?.(activeOption.value, runtime);
});

function onActiveChange(active: boolean): void {
    events.emit({
        type: "stage-active",
        scope,
        active,
    });
    if (active) emitActiveViz();
}

function onProvenanceOpen(detent: AppendixDetent): void {
    provenance.openProvenance(detent);
}

function openSourceData(): void {
    props.stage.anatomy.export.open(scope);
}

function closeSourceData(): void {
    // The viewer was opened with the push verb, so Back closes it (U-F60 cl. 4); a viewer opened by a
    // deep link clears in place.
    if (view.popParam("browse", props.stage.id) === "cleared") view.setParam("grain", undefined);
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
            :beat-id="beatId"
            @active-change="onActiveChange"
        >
            <template #control>
                <SegmentedTabs
                    :model-value="activeOption.id"
                    :options="sceneOptions"
                    :aria-label="`${stage.anatomy.foot.title}: view`"
                    semantics="toggle"
                    data-testid="scene-control"
                    @update:model-value="chooseScene"
                />
            </template>
            <template #caption>
                <ActiveCaption />
            </template>
            <template #anatomy>
                <FootAnatomy :contract="stage.anatomy.foot">
                    <template #legend>
                        <component
                            :is="stage.anatomy.legend"
                            v-if="stage.anatomy.legend"
                        />
                    </template>
                    <template #readout>
                        <component
                            :is="stage.anatomy.readout"
                            v-if="stage.anatomy.readout"
                        />
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
                <!-- THE STAGE'S ACT ROW (A-39, the plate): options, source data and
                     Enlarge, all of this stage. In a focal scene it is placed in the scene's
                     act seat, above the narrated chips. -->
                <div
                        class="chapter-stage__act"
                        data-plate-act
                        :data-subject="stage.id"
                    >
                        <PlateAct
                            :id="stage.id"
                            :title="stage.anatomy.foot.title"
                            :enlarge="enlargeStage"
                            :browse="openSourceData"
                        >
                            <template v-if="stageControls" #options>
                                <component
                                    :is="stageControls.component"
                                    v-bind="stageControls.props"
                                />
                            </template>
                        </PlateAct>
                </div>
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

.chapter-stage__source-data {
    position: absolute;
    z-index: 4;
    inset: 0;
    overflow: auto;
    padding: clamp(0.75rem, 2vw, 1.25rem);
    border-block: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: var(--background);
}

/* The stage's act row: the graphic's foot, closed off by the plate's engraved hairline. Placed in a
   focal scene's act seat, the seat wears the hairline and the paper instead. */
.chapter-stage__act {
    inline-size: 100%;
    margin-block-start: 0.75rem;
    padding-block-start: 0.5rem;
    border-block-start: 1px solid color-mix(in oklab, var(--engrave), transparent 40%);
}

.chapter-stage__source-close {
    display: block;
    margin-inline-start: auto;
    margin-block-end: 0.75rem;
}
</style>
