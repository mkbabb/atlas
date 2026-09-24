import type { Surface, SurfaceTier } from "@mkbabb/glass-ui/axes";
import type { TitleAlign } from "./title-align";

export type StoryCardSurface = Extract<Surface, "veil" | "opaque">;

/** The declared, fixed-sector StoryCard register. Omitted fields retain the quiet veil default. */
export interface StoryCardFacet {
    mode?: "plate" | "stage";
    surface?: StoryCardSurface;
    tier?: SurfaceTier;
    frame?: "none" | "keyline";
    pole?: TitleAlign;
    figureScale?: "contained" | "breakout";
    numeral?: number;
    seamRule?: boolean;
}

export function storyCardSurface(facet: StoryCardFacet): StoryCardSurface {
    return facet.surface ?? "veil";
}
