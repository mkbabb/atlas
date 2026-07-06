// platform/story/story-template.ts — THE T3 TEMPLATES (named arcs as PURE EXPANDERS · N.md §4.B1).
//
// The registry tier: named narrative arcs (reveal-compare-drill-conclude, small-multiples-tour,
// sticky-scene-scrub) that expand to the T1 form via `expandStory()`. A template is a PURE EXPANDER
// over roles; its output is `{ chapters, transitions }` — byte-compatible with `DashboardEssay`'s
// existing `Chapter[]` prop plus the edge data the director consumes. The registry is SUGAR over the
// T1 primitives, NEVER a required layer: primitives-on-the-spine are the facility; templates ship as
// pure expander functions. The `satisfies` keeps each template's role ids LITERAL so `expandStory`'s
// fills are exhaustively typed against the chosen template (a missing/misspelled role fill is a
// COMPILE error — the one genuine capability the primitives alone cannot express).
//
// THE net-line-delta VERDICT (RC3-RM6 · N.md §4.B1) is MEASURED, not asserted — see the usf arc
// instantiation `usf-integrity/usf-story-arc.ts` + its readback record. If the arc does not earn its
// keep on a route, N1 fires on the T3 tier and the primitives stand alone (recorded either way).

import type {
    Chapter,
    ChapterTitle,
    ChapterViz,
    RevealSpec,
} from "@/contract";
import type { ColorKind } from "@/charts/scale/colorKind";
import type {
    BeatTransition,
    EdgeSpec,
    FocusEffect,
    StoryChapter,
} from "@/story/story-contract";

// ── The role vocabulary (the NARRATIVE kind a beat plays — never a chart kind, D5) ────────────────

/** The beat-archetype vocabulary — the ROLE a beat plays in a named arc. Archetypes carry pre-wired
    reveal registers + default focus grammar; they are NARRATIVE kinds, not chart kinds (a `compare`
    beat may be a scatter, a map, a treemap — D5 holds). */
export type BeatRoleKind =
    | "cover"
    | "reveal"
    | "compare"
    | "drill"
    | "scene"
    | "conclude"
    | "colophon";

export interface BeatRole {
    id: string;
    kind: BeatRoleKind;
    /** The role's pre-wired reveal register (a fill may override). */
    reveal?: RevealSpec;
    /** The role's default focus grammar (a fill EXTENDS, never silently replaces). */
    focus?: FocusEffect[];
    /** Repeatable role — a fill may supply 1..N beats for it (the small-multiples run). */
    repeat?: boolean;
}

export interface StoryTemplate {
    id: string;
    roles: readonly BeatRole[];
    /** Pre-wired transitions between ADJACENT roles, keyed `"fromRole->toRole"`. */
    transitions: Readonly<Record<string, EdgeSpec>>;
}

/** THE REGISTRY — the named arcs. `as const satisfies` keeps each template's role ids literal. */
export const STORY_TEMPLATES = {
    /** The canonical essay arc: establish a whole, re-arrange it, walk it through time, land the
        figure. (The usf integrity arc instantiates THIS template.) */
    "reveal-compare-drill-conclude": {
        id: "reveal-compare-drill-conclude",
        roles: [
            { id: "cover", kind: "cover" },
            { id: "reveal", kind: "reveal", reveal: { lift: false } },
            { id: "compare", kind: "compare" },
            { id: "drill", kind: "drill" },
            { id: "conclude", kind: "conclude", reveal: { tier: "tail" } },
        ],
        transitions: {
            "reveal->compare": { kind: "shared-element", marks: "all" },
            "compare->drill": { kind: "shared-element", marks: "all" },
            "drill->conclude": { kind: "crossfade" },
        },
    },
    /** The gallery walk: one establishing whole, then a repeated compare run, each hand-off a scrub
        into the next plate's draw-in. */
    "small-multiples-tour": {
        id: "small-multiples-tour",
        roles: [
            { id: "cover", kind: "cover" },
            { id: "establish", kind: "reveal", reveal: { lift: false } },
            { id: "multiple", kind: "compare", repeat: true },
            { id: "close", kind: "colophon", reveal: { tier: "tail" } },
        ],
        transitions: {
            "establish->multiple": { kind: "scrub-handoff", stage: "drawIn" },
            "multiple->multiple": { kind: "scrub-handoff", stage: "drawIn" },
            "multiple->close": { kind: "crossfade" },
        },
    },
    /** The pinned walk: one graphic, N narrated states, continuous scrub (StickyScene with
        transitionT landed — the sci map beat's shape, named). */
    "sticky-scene-scrub": {
        id: "sticky-scene-scrub",
        roles: [
            { id: "cover", kind: "cover" },
            { id: "scene", kind: "scene" },
            { id: "close", kind: "colophon", reveal: { tier: "tail" } },
        ],
        transitions: {
            "cover->scene": { kind: "crossfade" },
            "scene->close": { kind: "crossfade" },
        },
    },
} as const satisfies Record<string, StoryTemplate>;

export type StoryTemplateId = keyof typeof STORY_TEMPLATES;

/** A role's FILL — the route-authored content (the Chapter authoring surface minus what the template
    pre-wires: figure/reveal defaults derive; transition/focus merge). */
export interface RoleFill {
    /** The section anchor id (defaults to the role id). */
    id?: string;
    icon: Chapter["icon"];
    eyebrow: string;
    title: ChapterTitle;
    dek: string;
    viz: ChapterViz;
    colorKind?: ColorKind;
    hinge?: number;
    navLabel?: string;
    isBeat?: boolean;
    reveal?: RevealSpec;
    /** EXTENDS the role archetype's focus grammar. */
    focus?: FocusEffect[];
}

/** The fills for a template: exhaustive over the template's role ids (compile-checked); a `repeat`
    role takes an ARRAY of fills. */
export type StoryFills<T extends StoryTemplate> = {
    [R in T["roles"][number] as R["id"]]: R extends { repeat: true }
        ? RoleFill[]
        : RoleFill;
};

export interface StoryInstance<T extends StoryTemplate = StoryTemplate> {
    template: T;
    fills: StoryFills<T>;
    /** Per-edge overrides keyed `"fromId->toId"` (null ⇒ remove the pre-wired edge). */
    transitions?: Record<string, EdgeSpec | null>;
}

/** The compiled story — the T1 form. `chapters` is byte-compatible with `DashboardEssay`'s existing
    prop (the choreography facets are additive); the director consumes the edges. */
export interface StoryDefinition {
    chapters: StoryChapter[];
    transitions: BeatTransition[];
}

/**
 * THE EXPANSION — pure + total. Walks the template roles in order, zips each fill on, derives `figure`
 * from masthead position (the SAME index law the essay's Roman/seed cadence speaks), merges
 * role-archetype reveal/focus under fill overrides, and attaches each pre-wired transition to its
 * ARRIVING chapter. Output is the plain spine — the registry tier compiles AWAY.
 */
export function expandStory<T extends StoryTemplate>(
    inst: StoryInstance<T>,
): StoryDefinition {
    const chapters: StoryChapter[] = [];
    const transitions: BeatTransition[] = [];
    const fills = inst.fills as Record<string, RoleFill | RoleFill[]>;
    let figure = 0;
    let prev: { roleId: string; chapterId: string } | null = null;

    for (const role of inst.template.roles) {
        const fillOrRun = fills[role.id];
        if (fillOrRun === undefined) continue; // an optional repeat role may be unfilled
        const run = Array.isArray(fillOrRun) ? fillOrRun : [fillOrRun];
        run.forEach((fill, k) => {
            const id =
                fill.id ?? (run.length > 1 ? `${role.id}-${k + 1}` : role.id);
            const isSentinel = fill.viz === "hero" || fill.viz === "colophon";
            if (!isSentinel) figure += 1;
            const chapter: StoryChapter = {
                id,
                figure: isSentinel ? 0 : figure,
                icon: fill.icon,
                eyebrow: fill.eyebrow,
                title: fill.title,
                dek: fill.dek,
                viz: fill.viz,
                reveal: fill.reveal ?? role.reveal,
                navLabel: fill.navLabel,
                isBeat: fill.isBeat ?? !isSentinel,
                colorKind: fill.colorKind,
                hinge: fill.hinge,
                focus: [...(role.focus ?? []), ...(fill.focus ?? [])],
            };
            if (prev) {
                const edgeKey = `${prev.roleId}->${role.id}`;
                const runKey = `${prev.chapterId}->${id}`;
                const override = inst.transitions?.[runKey];
                const spec =
                    override !== undefined
                        ? override
                        : ((
                              inst.template.transitions as Record<
                                  string,
                                  EdgeSpec
                              >
                          )[edgeKey] ?? null);
                if (spec) {
                    transitions.push({
                        from: prev.chapterId,
                        to: id,
                        spec,
                        span: spec.span,
                    });
                    chapter.transition = spec;
                }
            }
            chapters.push(chapter);
            prev = { roleId: role.id, chapterId: id };
        });
    }
    return { chapters, transitions };
}
