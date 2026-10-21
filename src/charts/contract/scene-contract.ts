// charts/contract/scene-contract.ts — the scene and stage contracts.
//
// A `ChapterScene` is one in-flow figure (a type-free graphic: a Component or a VizContract) with an
// optional period control in its head and one data line under it. A `ChapterStage` is one persistent
// figure with ordered scenes the reader chooses on a segmented control. Scrolling only scrolls: no
// scene or period follows the scroll position (U/B7 O-12, PLAN §5.1).

import {
    inject,
    type Component,
    type ComputedRef,
    type InjectionKey,
    type VNodeChild,
} from "vue";
import type { SourcePanelProps, VizContract } from "./viz-contract.js";
import type { LegendSpec } from "./viz-contract.js";
import type { SceneSequenceContract } from "../viz-set.js";
import type { MorphTransition } from "../viz-set.js";
import type { useViewParams } from "../../platform/stores/useViewParams.js";
import type { useActiveDashboard } from "../../platform/stores/useActiveDashboard.js";
import type { AtlasEventContract } from "../../events/index.js";
import type { FootAnatomyContract } from "../frame/foot-anatomy.js";
import type { AppendixDetent } from "../../platform/provenance/appendix.js";

/** A scene step's NARRATION carrier — a plain string OR a render-slot factory carrying a live VNode
    (a picked-out figure, a `<HandMark>`). DISTINCT from the title register (`ChapterTitle`, the
    A-15 keystone that closes to `string | TitleFacet`): a step narrates over the pinned graphic, it
    is not a titled beat, so it keeps its own render-slot carrier rather than riding the title type. */
export type SceneProse = string | (() => VNodeChild);

/** The named graphic STATE a step drives to — an OPAQUE payload the `apply` effect interprets. For
    the /sci floor map this is `{ year: 2014 }`. Type-free: the scene NEVER names a picture (D5). */
export type SceneState = Record<string, unknown>;

/** One narrated step over the pinned graphic. */
export interface SceneStep {
    /** Stable id: the `?scene=` value and the control's option value. */
    id: string;
    /** The reader-facing name on the figure's scene control (R-LABELS §3). */
    label: string;
    /** The step's narration — a plain string OR a render-slot factory (`SceneProse`), so a step can
        carry a live VNode (a picked-out figure, a `<HandMark>`). */
    prose: SceneProse;
    /** The named graphic STATE this step drives to. */
    state: SceneState;
}

/** An open entity grain. The type parameter is compile-time shape provenance, not a runtime codec. */
export type Grain = string;

/** One dimension at grain G. The namespace prevents a foreign-grain encode entering a stage. */
export type DimId<G extends Grain> = `${G}:${string}`;

export interface SceneEncode<G extends Grain> {
    readonly x: DimId<G>;
    readonly y: DimId<G>;
    readonly color?: DimId<G>;
}

export type SceneMorphMode = "shared" | "crossfade";

/** One ordered option on a persistent chapter stage. State retains the proven discrete runtime;
    encode carries the same-grain compile-time morph boundary required by W-STAGE. */
export interface SceneOption<G extends Grain = Grain> extends SceneStep {
    readonly encode: SceneEncode<G>;
    readonly legend?: Partial<LegendSpec>;
    readonly morph?: SceneMorphMode;
}

export interface StageSceneChange {
    readonly from: string;
    readonly to: string;
    readonly dir: "forward" | "back";
}

export interface StageSelection {
    readonly primaryKey: string | null;
    readonly selectedKeys: ReadonlySet<string>;
}

export type StageOff = () => void;

/** The four consumer-backed watch facades frozen by W-STAGE. */
export interface StageEvents {
    onSceneChange(cb: (event: StageSceneChange) => void): StageOff;
    onActiveChange(cb: (active: boolean) => void): StageOff;
    onSelection(cb: (selection: StageSelection) => void): StageOff;
    onProvenanceOpen(cb: (detent: AppendixDetent) => void): StageOff;
}

/** The stage's commands (U-F60 cl. 4 · RULINGS §K K-2). `openProvenance` moves the stage's
    provenance appendix to a detent; the stage itself calls it once on load to honour `?drawer`, which
    is read-only and never written. Each move is announced through `onProvenanceOpen`. */
export interface StageCommands {
    openProvenance(detent: AppendixDetent): void;
}

/** Adapt the shared typed hub into the exact stage event surface without adding a writer. */
export function stageEventsFromHub(
    hub: AtlasEventContract,
    stageId: string,
): StageEvents {
    const atStage = (scope: import("../../events/index.js").EventScope): boolean =>
        scope.grain === "stage" && scope.stageId === stageId;
    return {
        onSceneChange: (cb) =>
            hub.on(
                "scene-change",
                (event) => {
                    if (atStage(event.scope))
                        cb({ from: event.from, to: event.to, dir: event.dir });
                },
                { immediate: true },
            ),
        onActiveChange: (cb) =>
            hub.on(
                "stage-active",
                (event) => {
                    if (atStage(event.scope)) cb(event.active);
                },
                { immediate: true },
            ),
        onSelection: (cb) =>
            hub.on(
                "selected-viz",
                (event) => {
                    if (atStage(event.scope))
                        cb({
                            primaryKey: event.primaryKey,
                            selectedKeys: new Set(event.selectedKeys),
                        });
                },
                { immediate: true },
            ),
        onProvenanceOpen: (cb) =>
            hub.on(
                "provenance-drawer",
                (event) => {
                    if (atStage(event.scope)) cb(event.detent);
                },
                { immediate: true },
            ),
    };
}

/** The stage's source-data seat. `open` is the delegating seat (URL-backed — ChapterStage writes
    `?browse=<stageId>` and mounts the pane); `panel` is the additive companion the route declares.
    Since A-32 (B4) that panel is the platform `SourceDataBrowser` fed by the route's declared
    `DataScope` (`createBrowserFromScope`) — the per-route hand-rolled `SciScatterSourceBrowser`
    reader was retired at that swap (−284), so no seat mounts a bespoke browser any longer. */
export interface StageExport {
    open(scope: { readonly grain: "stage"; readonly stageId: string }): void;
    readonly panel: Component<SourcePanelProps>;
    readonly ariaLabel?: string;
}

/** Declarable content for the chapter-grade fixed anatomy. Components are mounted exactly once. */
export interface StageAnatomy {
    readonly foot: FootAnatomyContract;
    readonly legend?: Component;
    readonly readout?: Component;
    readonly gear: { readonly label: string; readonly controls?: Component };
    readonly provenance: {
        readonly label?: string;
        readonly peekLabel: string;
        readonly peek?: Component;
        readonly full?: Component;
        readonly detent?: AppendixDetent;
    };
    readonly export: StageExport;
}

export type StageTransition = Pick<MorphTransition, "mode">;

/** The runtime the host hands a scene's `apply` effect — the platform stores the scene drives. */
export interface SceneRuntime {
    /** The view-params store (the escape hatch for a scene that drives a non-year dim). */
    view: ReturnType<typeof useViewParams>;
    /** The active dashboard (feed access for a scene that drives a feed-scoped state). */
    active: ReturnType<typeof useActiveDashboard>;
}

/** A STICKY SCENE — the pinned-graphic stepped-narrative beat (the NYT/Pudding primitive L-S3 names).
    The `graphic` PINS (plain `position:sticky`) while the `steps` scroll past as discrete narrated
    blocks; the ACTIVE step is the one whose block crosses the viewport centre band, and the per-step
    `apply` effect drives the graphic's STATE at the boundary (DISCRETE). A NEW `ChapterViz` ARCHETYPE
    (alongside `Component | VizContract | "hero" | "colophon"`), NOT a chart-type. */
export interface ChapterScene {
    /** The discriminant the host and DashboardEssay route on. */
    readonly kind: "scene";
    /** The figure: a feature-plate Component or a declared `VizContract`. */
    graphic: Component | VizContract;
    /** `"year"` seats the period control in the figure's head (O-12 S-1): a glass Select of every
        period the feed carries, ‹ › steppers and a one-pass ▶. The control writes the period on a
        reader act only; scrolling changes nothing. */
    period?: "year";
    /** One data line under the figure, bound to the selected period. */
    caption?: SceneProse;
    /** The figure takes the full stage width. */
    focal?: boolean;
}

/** A canonical persistent chapter stage. Unlike `ChapterScene`, a stage has its own
    stable identity and names its ordered states as `scenes`; the renderer adapts those states to the
    existing StickyScene host so the instance mounts once and no second clock is introduced. */
export interface ChapterStage<G extends Grain = Grain>
    extends SceneSequenceContract<
        SceneOption<G>,
        Component | VizContract,
        StageTransition
    > {
    readonly kind: "stage";
    readonly id: string;
    /** The one instance host and its ordered options share this grain. */
    readonly grain: G;
    focal?: boolean;
    /** The scene's effect, run when the reader chooses it on the scene control (O-12 S-2). */
    apply?(scene: SceneOption<G>, rt: SceneRuntime): void;
    /** The fixed foot is declared once at stage grain, never repeated per scene. */
    readonly anatomy: StageAnatomy;
    /** The one required event authority; StageEvents is derived from this hub. */
    readonly events: AtlasEventContract;
}

/** The injected scene runtime — a graphic (or a scene-aware sibling) reads the active step THROUGH
    here (optional; outside a scene the inject default is null, so a graphic is byte-unchanged
    standalone). FORWARD-EXTENSIBLE: the scrubbed continuous `transitionT` (the opt-in richer path,
    Open Q5) is added HERE when a graphic consumer reads it — an optional field never breaks readers. */
export interface SceneContext {
    /** The active step's index (the rim + wayfinding). */
    activeIndex: ComputedRef<number>;
    /** The active step (the graphic's current narrated state). */
    activeStep: ComputedRef<SceneStep>;
    /** The step count (a constant — for an "N of M" readout). */
    count: number;
    /** A DISCRETE 0..1 wayfinding scalar (`activeIndex/(N-1)`) — the rail's deck position. The scene
        has NO continuous clock in the MVP (the step → state effect is discrete by design). */
    progress: ComputedRef<number>;
}
export const SCENE_KEY: InjectionKey<SceneContext | null> = Symbol("sticky-scene");
export const STAGE_EVENTS_KEY: InjectionKey<StageEvents | null> =
    Symbol("stage-events");
export const STAGE_COMMANDS_KEY: InjectionKey<StageCommands | null> =
    Symbol("stage-commands");
export interface StageEventContext {
    readonly hub: AtlasEventContract;
    readonly scope: { readonly grain: "stage"; readonly stageId: string };
}
export const STAGE_EVENT_HUB_KEY: InjectionKey<StageEventContext | null> =
    Symbol("stage-event-hub");
export const STAGE_ANATOMY_KEY: InjectionKey<boolean> = Symbol("stage-anatomy");

/** Read the active scene context, or `null` outside a providing `<StickyScene>` (a graphic
    mounted standalone sees no provider and behaves exactly as before — the documented
    `null`-default convention above, preserved rather than widened to `undefined`). Never
    throws — this context's entire purpose is a befitting-silent default. */
export function useOptionalSceneContext(): SceneContext | null {
    return inject(SCENE_KEY, null);
}

/** Read the stage's four-event consumer surface from persistent anatomy descendants. */
export function useOptionalStageEvents(): StageEvents | null {
    return inject(STAGE_EVENTS_KEY, null);
}

/** Read the stage's commands from a stage descendant, or `null` outside a stage. */
export function useOptionalStageCommands(): StageCommands | null {
    return inject(STAGE_COMMANDS_KEY, null);
}

/** Read the one per-instance event context from an always-mounted stage graphic. */
export function useOptionalStageEventHub(): StageEventContext | null {
    return inject(STAGE_EVENT_HUB_KEY, null);
}

/** The type guard the host + DashboardEssay route on (a `ChapterScene` vs a Component/VizContract).
    The discriminant is a LITERAL `kind:"scene"` — a `VizContract` keys on `id/description/export`
    (no `kind`) and a Vue component object never carries `kind:"scene"`, so no false positive. */
export function isChapterScene(v: unknown): v is ChapterScene {
    return (
        typeof v === "object" &&
        v !== null &&
        (v as { kind?: string }).kind === "scene"
    );
}

/** The canonical persistent-stage guard. Its literal discriminant is disjoint from both
    `ChapterScene` (`kind:"scene"`) and `VizContract`/Vue component values. */
export function isChapterStage(v: unknown): v is ChapterStage {
    return (
        typeof v === "object" &&
        v !== null &&
        (v as { kind?: string }).kind === "stage"
    );
}
