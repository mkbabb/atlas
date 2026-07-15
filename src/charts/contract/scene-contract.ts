// platform/charts/scene-contract.ts — THE StickyScene ARCHETYPE (K-SCENE · K-EXPRESS L-S3).
//
// A NEW compositional `ChapterViz` member in its OWN contract module (the `selection-contract.ts`
// precedent). A `ChapterScene` PINS one graphic (plain `position:sticky` — the host owns the CSS,
// no JS pin) while N narrated `steps` scroll past; the ACTIVE step is the one whose block crosses a
// viewport-CENTRE band, and the per-step `apply` effect drives the graphic's STATE at the boundary
// (DISCRETE — KISS). It is the smallest NEW composition the K-EXPRESS set adds: a scene COMPOSES an
// existing viz, it NEVER names a picture (the D5 no-overfit keystone — the `graphic` is TYPE-FREE).
//
// THE SCRUBBED CONTINUOUS `t` IS DEFERRED (the YAGNI fence — Open Q5). The MVP transition is a
// DISCRETE CSS re-tint at the boundary; the `SceneContext` is FORWARD-EXTENSIBLE, so the opt-in
// `transitionT` lands HERE when a graphic consumer reads it — an optional field never breaks readers.

import { inject, type Component, type ComputedRef, type InjectionKey } from "vue";
import type { ChapterTitle } from "@/contract";
import type { VizContract } from "@/charts/contract/viz-contract";
import type { useViewParams } from "@/platform/stores/useViewParams";
import type { useActiveDashboard } from "@/platform/stores/useActiveDashboard";

/** Re-export the prose carrier so the host + consumers read it from ONE place (the host imports
    `ChapterTitle` FROM here — scene-contract is the archetype's single barrel). */
export type { ChapterTitle } from "@/contract";

/** Which side the pinned graphic sits (D2 alternation). 'auto' ⇒ zebra by the chapter index. */
export type SceneSide = "left" | "right" | "auto";

/** The trigger-line register (L4). 'centre' flips the active step as its block crosses the viewport
    centre band (the canonical scrollytelling timing); 'entry' settles on entry. Default 'centre'. */
export type SceneAnchor = "centre" | "entry";

/** The named graphic STATE a step drives to — an OPAQUE payload the `apply` effect interprets. For
    the /sci floor map this is `{ year: 2014 }`. Type-free: the scene NEVER names a picture (D5). */
export type SceneState = Record<string, unknown>;

/** One narrated step over the pinned graphic. */
export interface SceneStep {
    /** Stable id — the active-step `v-for :key` AND the `appliedIndex` boundary key (the §3.1 law). */
    id: string;
    /** The step's narration — a plain string OR a render-slot factory (the `ChapterTitle` carrier,
        REUSED), so a step can carry a live VNode (a picked-out figure, a `<HandMark>`). */
    prose: ChapterTitle;
    /** The named graphic STATE this step drives to. */
    state: SceneState;
}

/** One ordered option on a persistent chapter stage. The persistent-stage vocabulary deliberately
    reuses the proven discrete scene step carrier: narration and state remain one authored unit. */
export type SceneOption = SceneStep;

/** The runtime the host hands a scene's `apply` effect — the platform stores the scene drives. */
export interface SceneRuntime {
    /** Drive the GLOBAL year scope (the map's choropleth re-slices off `?year`). A no-op before the
        active feed has loaded (`yearScope` is null then — the optional-chain is the guard). */
    setYear: (year: number) => void;
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
    /** The discriminant — the host + DashboardEssay route on this, no structural sniff. */
    readonly kind: "scene";
    /** The PINNED graphic — a feature-plate Component (the `SchoolMap` form) OR a declared
        `VizContract`. TYPE-FREE (the D5 keystone: a scene composes existing vizzes; no `MapScene`). */
    graphic: Component | VizContract;
    /** The narrated STEPS — the discrete text blocks that scroll past the pinned graphic. */
    steps: SceneStep[];
    /** Which side the graphic pins (D2). Omit ⇒ 'auto' (zebra by the chapter index). IGNORED when
        `focal` is set (the focal path retires the side register — the map owns the full stage). */
    side?: SceneSide;
    /** THE MAP-PRIMACY FOCAL STAGE (O-A17 · the owner Map-primacy law). When set, the graphic takes
        the FULL stage (a single track, no 50/50 split-pane) and the `steps` STEP OVER it as floating
        scrim-chips (Q-29: one at a time, hugging the map's dead-space corner — never a reserved side
        column). The `side` register retires. Omit ⇒ the two-column split-pane scene (byte-identical
        default — the existing sticky-scene geometry). */
    focal?: boolean;
    /** The trigger-line register (L4). Omit ⇒ 'centre'. */
    anchor?: SceneAnchor;
    /** The DISCRETE step → world effect (KISS). The host runs this whenever the ACTIVE STEP changes
        on a GENUINE crossing (NEVER on mount), handing the runtime stores; the graphic stays
        type-free, the coupling lives in the CONSUMER's declaration. Omit ⇒ the graphic reads
        `SCENE_KEY` itself (no global effect). */
    apply?: (step: SceneStep, rt: SceneRuntime) => void;
}

/** A canonical persistent chapter stage. Unlike the legacy `ChapterScene`, a stage has its own
    stable identity and names its ordered states as `scenes`; the renderer adapts those states to the
    existing StickyScene host so the graphic mounts once and no second clock is introduced. */
export interface ChapterStage {
    readonly kind: "stage";
    readonly id: string;
    graphic: Component | VizContract;
    scenes: SceneOption[];
    focal?: boolean;
    anchor?: SceneAnchor;
    apply?: (scene: SceneOption, rt: SceneRuntime) => void;
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

/** Read the active scene context, or `null` outside a providing `<StickyScene>` (a graphic
    mounted standalone sees no provider and behaves exactly as before — the documented
    `null`-default convention above, preserved rather than widened to `undefined`). Never
    throws — this context's entire purpose is a befitting-silent default. */
export function useOptionalSceneContext(): SceneContext | null {
    return inject(SCENE_KEY, null);
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
