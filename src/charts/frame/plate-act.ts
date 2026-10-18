// charts/frame/plate-act.ts — THE PLATE'S ACT CONTRACT (A-39, the plate · U/B4 atlas-plate).
//
// A-39 (RULINGS §I): a figure's own actions (Enlarge, export, options) live AT the figure, in its act
// row, and page chrome carries none of them. This leaf holds the two facts the act row and its frame
// share, so they are unit-testable without a DOM:
//
//   · the act vocabulary every act-row control is stamped with (`data-action`), so a probe or a test
//     reads WHICH act a control performs and ON WHICH figure (`data-subject`) from the markup alone;
//   · the enlarged figure's claim on Escape. While a figure is enlarged it is the topmost surface, so
//     it outranks every page claim on the dismiss arbiter (selection 0, hover card 10, filter drawer
//     30, dock sheet 40): one Escape closes the figure and nothing else (S2-1, the composition defect
//     P2 located in atlas: the expanded figure never joined the page's arbiter).
import type { InjectionKey } from "vue";
import type { DismissClaim } from "../../platform/interaction/dismiss-arbiter.js";

/** Every act a plate's act row can perform. `take` opens the phone sheet that holds the others. */
export const PLATE_ACTS = ["options", "download", "csv", "image", "source", "enlarge", "take"] as const;
export type PlateActKind = (typeof PLATE_ACTS)[number];

/** The enlarged figure's dismiss priority: above every page claim (the highest today is 40). */
export const FIGURE_ESCAPE_PRIORITY = 100;

/** A plate layer's dismiss priority (the act row's Options popover, Download menu and phone sheet).
    A layer opens from the act row, which an enlarged figure also shows, so a layer outranks the
    figure: one Escape closes the topmost layer and leaves the figure open (U RULINGS §K K-1). */
export const PLATE_LAYER_PRIORITY = 110;

/** The act row's layers. */
export type PlateLayer = "options" | "download" | "sheet";

/** The attribute every plate layer's surface carries (`<subject>:<layer>`). */
export const PLATE_LAYER_ATTR = "data-plate-layer";

/** The dismiss claim an enlarged figure holds: Escape only (an outside pointer on a fullscreen
    surface is the surface itself), at {@link FIGURE_ESCAPE_PRIORITY}. */
export function figureEscapeClaim(subject: string, close: () => void): DismissClaim {
    return {
        id: `figure:${subject}`,
        priority: FIGURE_ESCAPE_PRIORITY,
        escape: true,
        onDismiss: close,
    };
}

/** The dismiss claim an open plate layer holds (K-1): Escape and an outside pointer, at
    {@link PLATE_LAYER_PRIORITY}. A pointer inside the layer's surface or on its trigger is not
    outside, for this claim or any lower one, so a click in an open popover never closes the filter
    drawer beneath it. */
export function plateLayerClaim(subject: string, layer: PlateLayer, close: () => void): DismissClaim {
    const own = `${subject}:${layer}`;
    const trigger = layer === "sheet" ? "take" : layer;
    return {
        id: `plate:${own}`,
        priority: PLATE_LAYER_PRIORITY,
        escape: true,
        outsidePointer: true,
        within: (path) =>
            path.some(
                (node) =>
                    node instanceof Element &&
                    (node.getAttribute(PLATE_LAYER_ATTR) === own ||
                        (node.getAttribute("data-subject") === subject &&
                            node.getAttribute("data-action") === trigger)),
            ),
        onDismiss: close,
    };
}

/** The CSS selector of the enclosing focal scene's act seat. A focal scene stacks its narrated step
    chips over its pinned graphic, so the graphic's act row is placed in the scene's own seat, a layer
    above the chips; outside a focal scene the key is absent and the row renders in place. */
export const SCENE_ACT_SEAT: InjectionKey<string> = Symbol("atlas:scene-act-seat");
