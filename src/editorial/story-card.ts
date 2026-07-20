import type { CardTier } from "@mkbabb/glass-ui/card";
import type { SurfaceDecoration } from "@mkbabb/glass-ui/surface";
import type { TitleAlign } from "./title-align.js";

export type StoryCardSurface = Extract<SurfaceDecoration, "veil" | "opaque">;

/** The declared, fixed-sector StoryCard register. Omitted fields retain the quiet veil default. */
export interface StoryCardFacet {
    mode?: "plate" | "stage";
    surface?: StoryCardSurface;
    tier?: CardTier;
    frame?: "none" | "keyline";
    pole?: TitleAlign;
    /** A-41 (D-2) — the figure's TRACK. `wide` (the DEFAULT when omitted) fills the built
        `--measure-figure` breakout track; `measure` is the declared exception for the
        deliberately-narrow plate, capped at the prose measure; `full` bleeds past the track for a
        map. The old `figureScale` name and its `contained`-by-default starvation are gone — the
        outer track was built and never consumed, so the DEFAULT was the defect. */
    track?: "measure" | "wide" | "full";
    seamRule?: boolean;
}

export function storyCardSurface(facet: StoryCardFacet): StoryCardSurface {
    return facet.surface ?? "veil";
}
