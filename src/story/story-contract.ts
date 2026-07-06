// platform/story/story-contract.ts — THE T1 STORY PRIMITIVES (N.WB1 · N.md §4.B1).
//
// The spine primitives the charter's story facility is built from (C6): the transition EDGE
// (`BeatTransitionSpec`/`EdgeSpec`), the beat's declarative FOCUS (`FocusEffect`), the figure's
// morph-participation seam (`MarkStageHandle`), and the two optional chapter facets
// (`ChapterChoreography`) `DashboardEssay` renders UNCHANGED. These attach DIRECTLY to the existing
// `Chapter[]` spine — a route adopts ONE edge at a time (`Chapter.transition` names the edge arriving
// FROM the previous beat; `Chapter.focus` names the beat's focus effects), zero new authoring
// vocabulary beyond the two optional facets. Transcribed from the proven prototype NP1 +
// `docs/tranches/N/proto-seeds/story/story-template.ts`, re-homed as production source.
//
// MarkKey REUSES the selection `{kind}:{id}` codec (selection-contract) — ONE identity system for
// selection, focus, and object constancy; NO new codec (a mark that morphs A→B is the same mark the
// cross-viz highlight lifts).

import type { Chapter } from "@/contract";
import type { SceneContext } from "@/charts/contract/scene-contract";
import {
    encodeSelKey,
    parseSelKey,
    type SelectionKind,
} from "@/charts/contract/selection-contract";

// ── The mark identity — the object-constancy key (REUSED, never re-minted) ────────────────────────

/** A stable mark identity — the object-constancy key. REUSES the selection-contract codec
    (`{kind}:{id}`, e.g. `"district:920"`), so the morph keys ARE the selection keys: a mark that
    morphs A→B is the same mark the cross-viz highlight lifts. One identity system. */
export type MarkKey = string;

/** Mint a `MarkKey` from a feed's `meta.keyField` grain + its raw id — the SAME producer-edge codec
    the selection set mints (`encodeSelKey`). A figure derives its handle keys from `meta.keyField`
    (the selection codec), so the shared-element morph and the cross-viz highlight speak one wire form. */
export function markKeyFor(kind: SelectionKind, id: string): MarkKey {
    return encodeSelKey(kind, id);
}

/** Parse a `MarkKey` back to its `{kind,id}` — the migration guard (a legacy bare key ⇒ null), so a
    handle that re-reads a foreign-grain key drops it rather than mis-grain a raw id. */
export const parseMarkKey = parseSelKey;

// ── The transition MECHANISMS (a closed union; a route declares WHICH, never HOW) ─────────────────

/** The transition MECHANISMS — a closed union, each owned by the director. Every mechanism is
    scrub-driven (bidirectional, PRM-snappable):
      · shared-element — keyed FLIP morph through a document-space clone overlay: marks with matching
        keys travel/re-shape from A's geometry to B's (object constancy). Requires BOTH figures to
        expose a `MarkStageHandle`; falls back to crossfade when either side lacks one (declared
        intent degrades, never breaks).
      · crossfade      — A's stage recedes as B's arrives on the same scrub.
      · wipe           — a directional reveal (axis-aware; the D2 scroll-in vocabulary reused).
      · scrub-handoff  — A's exit clock FEEDS a named entry stage of B's reveal register, so B's
        draw-in begins exactly as A releases (`stage` is the named reveal segment id). */
export type BeatTransitionSpec =
    | { kind: "shared-element"; marks?: "all" | MarkKey[] }
    | { kind: "crossfade" }
    | { kind: "wipe"; axis?: "x" | "y" }
    | { kind: "scrub-handoff"; stage?: string };

/** An edge spec + its optional corridor span (viewport units the scrub occupies; default 1). */
export type EdgeSpec = BeatTransitionSpec & { span?: number };

/** A resolved transition EDGE between two beats — the compiled form the director consumes. `span` is
    the corridor length in viewport units the scrub occupies (default 1); the director clamps the
    scrub to the corridor. */
export interface BeatTransition {
    /** The chapter id the edge leaves. */
    from: string;
    /** The chapter id the edge arrives at. */
    to: string;
    spec: BeatTransitionSpec;
    span?: number;
}

// ── The declarative FOCUS EFFECT (the Closeread-class archetype vocabulary) ───────────────────────

/** A beat's declarative FOCUS EFFECT — fired as the beat becomes active, eased on the beat's own
    entry scrub, reversed on scroll-up. Focus effects are DATA the director interprets against the
    beat's `MarkStageHandle`; a figure never hand-wires them. */
export type FocusEffect =
    | { kind: "highlight"; marks: MarkKey[] }
    | { kind: "isolate"; marks: MarkKey[]; floor?: number }
    | { kind: "zoom"; domain: { x?: [number, number]; y?: [number, number] } }
    | { kind: "annotate"; at: MarkKey; note: string };

// ── The morph-participation seam (the D5 no-overfit law at the motion grain) ──────────────────────

/** The visual endpoint a morph clone interpolates toward — a CSS fill (interpolated in OKLab) + the
    corner radius (`rx`: a bar is rx≈2, a dot is rx=r, so the rect↔circle morph is a pure rx/w/h lerp).

    THE FLIGHT-INK FIDELITY FIELDS (N5 consult · the pole hand-off law). A settled canvas mark is
    typically painted at partial `opacity` with a hairline `stroke` rim; a clone that flies OPAQUE and
    UNRIMMED steps the whole cloud's ink-weight in ONE frame at both poles — a visible "changing
    clothes" blink on the very object whose constancy the morph exists to hold. A handle that reports
    its RENDERED ink (the same values its option builder paints) makes the hand-off invisible on the
    object itself. All three are optional — omitted ⇒ the prior opaque/rimless clone, byte-identical. */
export interface MarkStyle {
    fill: string;
    rx: number;
    /** The mark's rim ink (a CONCRETE color — the canvas-colour law). Omit ⇒ no rim. */
    stroke?: string;
    /** The rim width in px. Omit ⇒ 0. */
    strokeWidth?: number;
    /** The mark's rendered opacity (0..1). Omit ⇒ 1 (opaque). */
    opacity?: number;
}

/** THE MORPH-PARTICIPATION SEAM — what a figure exposes so shared-element edges and focus effects
    reach its marks WITHOUT the director knowing the chart type (the D5 no-overfit law). A figure
    registers its handle with the director on mount; SVG plates implement it over their elements,
    canvas plates over their mark models (`convertToPixel` + per-mark hide). */
export interface MarkStageHandle {
    /** Document-space geometry per mark key, measured at the SETTLED state (a layout-time snapshot;
        the director caches it once per beat and re-asks on resize + the expand-settle tick — per-frame
        recompute is BANNED). Positions are document coordinates so one measure survives the transit. */
    markRects(): Map<MarkKey, DOMRect>;
    /** The visual endpoint the morph clone interpolates toward (fill + corner radius). */
    markStyle(key: MarkKey): MarkStyle;
    /** Hide/show the original marks while the overlay owns their identity (the constancy hand-off: at
        0<t<1 the CLONES are the marks; at the poles the stages own them). `keys` omitted ⇒ all marks
        (a CSS toggle on the chart host, ~0ms); a subset ⇒ per-key hide, once-per-edge, off the tick. */
    setMarksHidden(hidden: boolean, keys?: readonly MarkKey[]): void;
    /** Apply a focus treatment (attn recession / gilt highlight) at scrub `t` — the FocusEffect target. */
    applyFocus?(effects: readonly FocusEffect[], t: number): void;
}

// ── The chapter facets (the T1 adoption seam — the ONLY contract delta the primitives need) ───────

/** THE CHAPTER FACETS. A route adds `transition`/`focus` to a chapter literal exactly as it adds
    `reveal` today. `transition` names the edge arriving from the PREVIOUS beat (edges are
    between-beats, so the arriving beat owns the declaration — the same directional convention as
    `reveal`). Omit both ⇒ today's independent per-beat reveal (byte-identical default). */
export interface ChapterChoreography {
    /** The edge FROM the previous beat INTO this one. Omit ⇒ no choreographed transition. */
    transition?: EdgeSpec;
    /** The beat's declarative focus effects. Omit ⇒ none. */
    focus?: FocusEffect[];
}

/** The spine-carried form: today's `Chapter` + the two optional choreography facets. This is what
    `expandStory()` COMPILES TO and what the director CONSUMES — a plain `Chapter[]` with edges
    attached, so `DashboardEssay` renders it unchanged (it ignores the facets) and the director reads
    them. */
export type StoryChapter = Chapter & ChapterChoreography;

/** Read a chapter's arriving edge facet (type-narrowing helper — a plain `Chapter` returns
    `undefined`, a `StoryChapter` returns its declared edge). */
export function chapterTransition(c: StoryChapter): EdgeSpec | undefined {
    return c.transition;
}

/** A chapter declares a shared-element arrival iff its transition facet names it — the ONE predicate
    the corridor band + the recede engage on (D7: the corridor is DERIVED, zero new authored state). */
export function declaresSharedElement(c: StoryChapter): boolean {
    return c.transition?.kind === "shared-element";
}

// ── SceneContext.transitionT — Open Q5 LANDS (the scene-contract forward extension) ───────────────

/** The CONTINUOUS scene context — the forward-extensible fields `scene-contract.ts` reserved.
    `transitionT` is derived from the SAME geometry the IntersectionObserver band discretizes (the
    step blocks' centre positions), read continuously off the one clock (0 ⇒ settled on the active
    step, →1 ⇒ arriving at the next). Under PRM it pins to 0 (the discrete `apply()` boundary
    behaviour is UNCHANGED — information parity; the scrub is the enhancement, never the information). */
export interface SceneContextV2 extends SceneContext {
    /** Continuous 0..1 scrub between the active step and the next (PRM ⇒ 0). */
    transitionT: import("vue").ComputedRef<number>;
    /** The story-grain continuous position `(activeIndex + transitionT) / (N−1)` — supersedes the
        discrete `progress` for consumers that scrub (the rail keeps `progress`). */
    scrubT: import("vue").ComputedRef<number>;
}
