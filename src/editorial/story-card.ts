import type { CardSurface, CardTier } from "@mkbabb/glass-ui/card";
import type { TitleAlign } from "./title-align.js";

export type StoryCardSurface = Extract<CardSurface, "veil" | "opaque">;

/** The declared, fixed-sector StoryCard register. Omitted fields retain the quiet veil default. */
export interface StoryCardFacet {
    mode?: "plate" | "stage";
    surface?: StoryCardSurface;
    tier?: CardTier;
    frame?: "none" | "keyline";
    pole?: TitleAlign;
    figureScale?: "contained" | "breakout";
    seamRule?: boolean;
}

export function storyCardSurface(facet: StoryCardFacet): StoryCardSurface {
    return facet.surface ?? "veil";
}
