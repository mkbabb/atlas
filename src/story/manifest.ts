import { defineAsyncComponent, type Component } from "vue";
import type { ChapterTitle, RevealSpec, TitlePole } from "../contract/index.js";
import type { VizContract } from "../charts/contract/viz-contract.js";
import type { ChapterStage } from "../charts/contract/scene-contract.js";
import type { ColorKind } from "../charts/scale/colorKind.js";
import type { HeroFacet } from "../editorial/editorial-contract.js";
import type { EditorialChapter } from "../editorial/editorial-contract.js";
import type { StoryCardFacet } from "../editorial/story-card.js";
import type { Colophon } from "../platform/chrome/masthead/SiteColophon.vue";
import type { RuleVariant } from "../editorial/rule-register.js";
import type { Rank } from "../motion/variant-bounds.js";
import type { SkinId } from "../skin/index.js";
import type { FigureLadder } from "./beat-template.js";
import type { Superlative } from "./superlative.js";
import type { EdgeSpec, FocusEffect, StoryChapter } from "./story-contract.js";

/** A point's kind. `"appendix"` (A-16) is the folded movement — a propaedeutic/reference point that
    carries its own nested `points`, projecting through the SAME machinery as any other point. */
export type PointKind = "cover" | "beat" | "colophon" | "appendix";
export type SkinRef = SkinId;

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
    /** A-16 · the S5 recursion — ANY point may nest sub-points (arbitrary sub-sectioning). A
        point's DEPTH is its path length in this tree: derived from POSITION, never declared, so a
        depth field cannot disagree with the actual nesting. The projections below flatten the
        tree in DOM order, annotating each chapter with its ancestor nav-label chain. */
    readonly points?: readonly StoryPoint<Stage>[];
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
    /** A-16 · the ancestor nav-label chain this chapter hangs under (outermost first) — empty for a
        top-level point. Its LENGTH is the point's depth; the chain itself is the breadcrumb source
        (never the editorial title). */
    readonly path?: readonly string[];
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

/** A point's fallback label from its title — a plain-string title verbatim, a `TitleFacet`'s whole
    `text`, else the slug (a legacy render-slot factory, runtime-only until its site remaps to a
    `TitleFacet` at the touches, exposes no readable text). */
function titleLabel<Stage extends ChapterStage>(point: StoryPoint<Stage>): string {
    const t = point.title;
    if (typeof t === "string") return t;
    if (typeof t === "object" && t !== null) return t.text;
    return point.slug;
}

function pointLabel<Stage extends ChapterStage>(point: StoryPoint<Stage>): string {
    return point.navLabel ?? point.eyebrow ?? titleLabel(point);
}

/** A-16 · THE ONE RECURSION every projection rides — the manifest tree flattened to DOM order,
    each point paired with the ancestor nav-label chain it hangs under. Depth is that chain's
    length, so sub-sectioning scales arbitrarily with no second declaration. */
function flatten<Stage extends ChapterStage>(
    points: readonly StoryPoint<Stage>[],
    path: readonly string[] = [],
): readonly { point: StoryPoint<Stage>; path: readonly string[] }[] {
    return points.flatMap((point) => [
        { point, path },
        ...flatten(point.points ?? [], [...path, pointLabel(point)]),
    ]);
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
 * Stage points project directly onto the persistent-stage renderer seam. Nested points (A-16)
 * flatten into the same list, each carrying its ancestor `path`.
 */
export function chaptersOf<Stage extends ChapterStage>(
    story: StoryManifest<Stage>,
): readonly ManifestChapter[] {
    return flatten(story.points).map(({ point, path }): ManifestChapter => {
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
            path: path.length ? path : undefined,
        };
    });
}

export function isBeat<Stage extends ChapterStage>(
    point: StoryPoint<Stage>,
): point is BeatPoint<Stage> {
    return point.kind === "beat";
}

/** Every beat in the manifest, nested beats included — the recursion flattened once (A-16), so the
    nav, the figure rank, and the pole cadence all read one order. */
export function beatsOf<Stage extends ChapterStage>(
    manifest: StoryManifest<Stage>,
): readonly BeatPoint<Stage>[] {
    return flatten(manifest.points)
        .map(({ point }) => point)
        .filter(isBeat);
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
        label: pointLabel(point),
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
        slides: flatten(manifest.points).map(({ point }) => ({
            component: point.slug,
            label: pointLabel(point),
        })),
    };
}

/** The second projection tier for a persistent stage nested inside one top-level point. */
export function scenesOf<Stage extends ChapterStage>(
    point: StoryPoint<Stage>,
): Stage["scenes"] | readonly [] {
    return point.viz.kind === "stage" ? point.viz.stage.scenes : [];
}
