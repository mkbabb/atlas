import type { TitlePole } from "@/contract";
import "./title-align.css";

export type TitleAlign = TitlePole | "auto";

const TITLE_POLES = new Set<TitlePole>(["left", "center", "right"]);

/**
 * Resolve the bounded title-pole grammar. `auto` and invalid runtime input fall
 * through to the caller's concrete pole, so every consumer stamps one of three
 * stable values and never authors a local alignment branch.
 */
export function resolveTitleAlign(
    align: TitleAlign | null | undefined,
    fallback: TitlePole = "left",
): TitlePole {
    if (align != null && align !== "auto" && TITLE_POLES.has(align)) return align;
    return TITLE_POLES.has(fallback) ? fallback : "left";
}
