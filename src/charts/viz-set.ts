import type { VizOptionSpec } from "./composables/useVizOptions.js";
import type { VizView } from "./contract/viz-contract.js";

export interface MarkIdentity {
    /** Data field that carries the stable mark key across views and scene encodes. */
    field: string;
}

export interface MorphTransition {
    mode: "blend" | "staged";
    reduced: boolean;
}

export interface VizSetContract {
    views: readonly [VizView, ...VizView[]];
    identity: MarkIdentity;
    transition: MorphTransition;
}

/** An ordered scroll narrative over one persistent render instance. */
export interface SceneSequenceContract<
    Scene extends { readonly id: string } = VizView,
    Instance = VizView,
    Transition = MorphTransition,
> {
    readonly instance: Instance;
    readonly scenes: readonly [Scene, ...Scene[]];
    readonly identity: MarkIdentity;
    readonly transition: Transition;
}

export function morphTransition(
    reduced: boolean,
    mode: MorphTransition["mode"] = "blend",
): MorphTransition {
    return { mode, reduced };
}

export function resolveVizSurface(set: VizSetContract, id?: string): VizView {
    return set.views.find((view) => view.id === id) ?? set.views[0];
}

export function optionsLiveInView(view: VizView): VizOptionSpec[] {
    return view.options ?? [];
}

export function viewsToOptionSpec(set: VizSetContract): VizOptionSpec {
    return {
        kind: "segmented",
        key: "view",
        label: "View",
        choices: set.views.map(({ id, label }) => ({ value: id, label })),
        default: set.views[0].id,
    };
}
