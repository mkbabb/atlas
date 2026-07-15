import { defineAsyncComponent, type Component } from "vue";
import type { ChapterTitle, RevealSpec, TitlePole } from "@/contract";
import type { VizContract } from "@/charts/contract/viz-contract";
import type { ChapterStage } from "@/charts/contract/scene-contract";
import type { ColorKind } from "@/charts/scale/colorKind";
import type { HeroFacet } from "@/editorial/editorial-contract";
import type { EditorialChapter } from "@/editorial/editorial-contract";
import type { StoryCardFacet } from "@/editorial/story-card";
import type { Colophon } from "@/platform/chrome/masthead/SiteColophon.vue";
import type { RuleVariant } from "@/editorial/rule-register";
import type { Rank } from "@/motion/variant-bounds";
import type { SkinId } from "@/skin";
import type { FigureLadder } from "./beat-template";
import type { Superlative } from "./superlative";
import type { EdgeSpec, FocusEffect, StoryChapter } from "./story-contract";

export type PointKind = "cover" | "beat" | "colophon";
export type SkinRef = SkinId;

/** Compatibility name for early manifest authors; the canonical persistent-stage contract now owns
    the shape directly. */
export type StoryStage = ChapterStage;

/** A point owns its figure binding. The closed union prevents parallel per-route viz maps. */
export type PointViz<Stage extends ChapterStage = ChapterStage> =
    | { readonly kind: "component"; readonly load: () => Promise<{ default: Component }> }
    | { readonly kind: "contract"; readonly contract: VizContract }
    | { readonly kind: "stage"; readonly stage: Stage }
    | { readonly kind: "hero"; readonly hero: HeroFacet }
    | { readonly kind: "colophon"; readonly colophon?: Colophon };

/** One fully-authored point. Array position, rather than a second ordinal, owns its rank. */
export interface StoryPoint<Stage extends ChapterStage = ChapterStage> {
    readonly slug: string;
    readonly kind: PointKind;
    readonly icon?: Component;
    readonly eyebrow?: string;
    readonly navLabel?: string;
    readonly title: ChapterTitle;
    readonly dek?: string;
    readonly pole?: TitlePole;
    readonly reveal?: RevealSpec;
    readonly rule?: RuleVariant;
    readonly superlative?: Superlative;
    readonly figure?: FigureLadder;
    readonly rank?: Rank;
    readonly signature?: boolean;
    readonly marquee?: boolean;
    readonly colorKind?: ColorKind;
    readonly hinge?: number;
    readonly viz: PointViz<Stage>;
    readonly transition?: EdgeSpec;
    readonly focus?: readonly FocusEffect[];
    readonly card?: StoryCardFacet;
    /** Optional route-authored marginal device rendered at this point's maturity stage. */
    readonly ornament?: Component;
}

export interface StoryManifest<Stage extends ChapterStage = ChapterStage> {
    readonly id: string;
    readonly skin?: SkinRef;
    readonly colorKind?: ColorKind;
    /** Default card treatment for beat points; a point declaration may override it. */
    readonly card?: StoryCardFacet;
    /** The sole story order: DOM order, beat ordinal, navigation rank, and deck order derive here. */
    readonly points: readonly StoryPoint<Stage>[];
    readonly seed?: number;
}

export type BeatPoint<Stage extends ChapterStage = ChapterStage> = StoryPoint<Stage> & {
    readonly kind: "beat";
};

export interface StoryNavItem {
    readonly kind: "beat";
    readonly id: string;
    readonly label: string;
    readonly icon: Component;
}

export interface StoryEdge {
    readonly from: string;
    readonly to: string;
    readonly spec: EdgeSpec;
}

export interface StoryDeck {
    readonly slides: readonly { readonly component: string; readonly label: string }[];
}

/** Point and story authorship retained on the essay-host projection. */
export interface ManifestChapterFacets {
    readonly superlative?: Superlative;
    readonly figure?: FigureLadder;
    readonly rank?: Rank;
    readonly signature?: boolean;
    readonly marquee?: boolean;
}

/** The current essay-host chapter surface produced from one canonical story point. */
export type ManifestChapter = EditorialChapter & StoryChapter & ManifestChapterFacets;

const EmptyChapterIcon: Component = () => null;
const AsyncPointComponents = new Map<string, Component>();

function asyncPointComponent(
    storyId: string,
    pointSlug: string,
    load: () => Promise<{ default: Component }>,
): Component {
    const key = `${storyId}\u0000${pointSlug}`;
    const cached = AsyncPointComponents.get(key);
    if (cached) return cached;
    const component = defineAsyncComponent(load);
    AsyncPointComponents.set(key, component);
    return component;
}

function pointLabel<Stage extends ChapterStage>(point: StoryPoint<Stage>): string {
    return (
        point.navLabel ??
        point.eyebrow ??
        (typeof point.title === "string" ? point.title : point.slug)
    );
}

function revealOf<Stage extends ChapterStage>(
    point: StoryPoint<Stage>,
): RevealSpec | undefined {
    if (!point.pole) return point.reveal;
    return {
        ...point.reveal,
        layout: {
            title: point.pole,
            scrollIn: point.pole === "center" ? "up" : point.pole,
            ...point.reveal?.layout,
        },
    };
}

/**
 * Project the canonical manifest directly into the chapter contract consumed by DashboardEssay.
 * Stage points are deliberately not adapted to the legacy ChapterScene arm: ChapterStage will own
 * that renderer seam in the following lane.
 */
export function chaptersOf<Stage extends ChapterStage>(
    story: StoryManifest<Stage>,
): readonly ManifestChapter[] {
    return story.points.map((point): ManifestChapter => {
        let figure: Pick<ManifestChapter, "viz"> &
            Partial<Pick<ManifestChapter, "hero" | "colophon">>;
        switch (point.viz.kind) {
            case "component":
                figure = {
                    viz: asyncPointComponent(story.id, point.slug, point.viz.load),
                };
                break;
            case "contract":
                figure = { viz: point.viz.contract as VizContract };
                break;
            case "hero":
                figure = { viz: "hero", hero: point.viz.hero };
                break;
            case "colophon":
                figure = { viz: "colophon", colophon: point.viz.colophon };
                break;
            case "stage":
                figure = { viz: point.viz.stage };
                break;
        }

        return {
            id: point.slug,
            icon: point.icon ?? EmptyChapterIcon,
            eyebrow: point.eyebrow ?? pointLabel(point),
            navLabel: point.navLabel,
            title: point.title,
            dek: point.dek ?? "",
            ...figure,
            reveal: revealOf(point),
            rule: point.rule,
            superlative: point.superlative,
            figure: point.figure,
            rank: point.rank,
            signature: point.signature,
            marquee: point.marquee,
            isBeat: point.kind === "beat",
            colorKind: point.colorKind ?? story.colorKind,
            hinge: point.hinge,
            transition: point.transition,
            focus: point.focus ? [...point.focus] : undefined,
            card: point.card ?? (point.kind === "beat" ? story.card : undefined),
            ornament: point.ornament,
        };
    });
}

export function isBeat<Stage extends ChapterStage>(
    point: StoryPoint<Stage>,
): point is BeatPoint<Stage> {
    return point.kind === "beat";
}

export function beatsOf<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
): readonly BeatPoint<Stage>[] {
    return manifest.points.filter(isBeat);
}

/** The 1-based Roman/figure rank, derived from beat order. */
export function figureOf<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
    slug: string,
): number | undefined {
    const index = beatsOf(manifest).findIndex((point) => point.slug === slug);
    return index < 0 ? undefined : index + 1;
}

export function navOf<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
): StoryNavItem[] {
    return beatsOf(manifest).map((point) => ({
        kind: "beat",
        id: point.slug,
        label:
            point.navLabel ??
            point.eyebrow ??
            (typeof point.title === "string" ? point.title : point.slug),
        icon: point.icon ?? EmptyChapterIcon,
    }));
}

/** Explicit pole wins; otherwise beat order supplies the restrained left/right cadence. */
export function poleOf<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
    slug: string,
): TitlePole | undefined {
    const beats = beatsOf(manifest);
    const index = beats.findIndex((point) => point.slug === slug);
    return index < 0 ? undefined : (beats[index].pole ?? (index % 2 === 0 ? "left" : "right"));
}

export function edgesOf<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
): readonly StoryEdge[] {
    return manifest.points.flatMap((point, index) =>
        point.transition && index > 0
            ? [
                  {
                      from: manifest.points[index - 1].slug,
                      to: point.slug,
                      spec: point.transition,
                  },
              ]
            : [],
    );
}

/** Forward deck projection: same order, no navigation runtime or second manifest. */
export function toDeck<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
): StoryDeck {
    return {
        slides: manifest.points.map((point) => ({
            component: point.slug,
            label:
                point.navLabel ??
                point.eyebrow ??
                (typeof point.title === "string" ? point.title : point.slug),
        })),
    };
}

/** The second projection tier for a persistent stage nested inside one top-level point. */
export function scenesOf<Stage extends ChapterStage>(
    point: StoryPoint<Stage>,
): Stage["scenes"] | readonly [] {
    return point.viz.kind === "stage" ? point.viz.stage.scenes : [];
}
