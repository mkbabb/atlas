// src/platform/editorial/useBeatLayout.ts — the PURE TOTAL placement resolver (K-EXPRESS D2).
//
// The auto-zebra placement grammar: a beat's masthead furniture hugs the LEFT margin on even beats
// and the RIGHT on odd; the dock swings to the opposite corner; the beat slides in horizontally on
// reveal — while the data plate stays full-measure CENTRED (the stable anchor). The visual side-flip
// NEVER touches DOM order (the host stamps the resolved sides as `data-*` registers the CSS keys
// `grid-template-areas`/`justify-self`/`grid-column` off, never `order`), so the reading order stays
// drop-cap→eyebrow→h2→dek→plate (the a11y keystone, k-placement-no-reorder.gate).
//
// PURE + TOTAL by construction: every input yields a concrete ResolvedLayout (never `auto`),
// unit-testable WITHOUT mounting. LIFTED (N.WB3) into `platform/editorial/` beside its ONE consumer —
// the publishable `DashboardEssay` assembler — so the essay host + its placement resolver are ONE
// core-clean editorial unit (the type dep now points at the core contract, not `@/dashboards`).

import type { BeatLayout, Chapter, TitlePole } from "@/contract";
import { toRoman } from "@/platform/composables/useRomanNumeral";
import type { EditorialChapter } from "./editorial-contract";

export type ResolvedLayout = {
    /** The resolved title pole — `left|center|right` (the O-A15 `center` third pole, spent
        sparingly; a `center` masthead centres its block and rises vertically on reveal). */
    title: TitlePole;
    numbers: "top" | "bottom";
    dock: "left" | "right";
    scrollIn: "left" | "right" | "up";
};

/** Whether a chapter carries the editorial masthead (eyebrow · h2 · dek · drop-cap) — i.e. it
    PARTICIPATES in the zebra. The two page-level sentinels (`"hero"` / `"colophon"`) do NOT (they
    render their own internal header), so they neither stamp a placement register NOR consume a zebra
    phase. This is the SINGLE predicate both the phase counter AND the host stamp read — IDENTICAL to
    the existing `#header` v-if (`chapter.viz !== 'hero' && chapter.viz !== 'colophon'`), so the
    counter and the stamp can never drift. NOT `isBeat` (which conflates dock-projection). */
export function hasMasthead(c: Chapter): boolean {
    return c.viz !== "hero" && c.viz !== "colophon";
}

/** The dock COUNTERWEIGHT — opposite the title margin. A `center` title has no opposite side, so the
    dock rests at its default RIGHT corner (the balance is symmetric; the corner is a stable default). */
const counterweight = (s: TitlePole): "left" | "right" =>
    s === "left" ? "right" : s === "right" ? "left" : "right";

/** First concrete (non-`auto`, defined) candidate wins — the override-beats-default precedent. */
function pick<T extends string>(...candidates: (T | "auto" | undefined)[]): T | undefined {
    for (const c of candidates) if (c != null && c !== "auto") return c as T;
    return undefined;
}

/** Resolve a chapter's placement from its declared `layout`, the retained `aside` alias, and the
    auto-zebra by MASTHEAD PHASE. PURE + TOTAL. `phase` is the masthead-only running index (the
    sentinels never consume a zebra slot and skew the alternation). */
export function resolveLayout(chapter: Chapter, phase: number): ResolvedLayout {
    const L: BeatLayout = chapter.reveal?.layout ?? {};
    // `aside:true` folds to title:'right' (the cap-right pole it already was); an explicit `L.title`
    // still wins (the override-beats-alias order in `pick`).
    const asideTitle: "right" | undefined = chapter.reveal?.aside ? "right" : undefined;
    const even = phase % 2 === 0;

    // The title pole admits the O-A15 `center` third pole (via `L.title`) — an explicit `center`
    // flows through `pick` first (override-beats-zebra); the zebra default stays L/R alternation
    // (center is AUTHORED, never auto-picked — it is spent sparingly by the E3 tables/policy).
    const title = pick<TitlePole>(
        L.title,
        asideTitle,
        even ? "left" : "right",
    ) as TitlePole;
    const numbers = pick<"top" | "bottom">(L.numbers, even ? "top" : "bottom") as "top" | "bottom";
    const dock = pick<"left" | "right">(L.dock, counterweight(title)) as "left" | "right";
    // The reveal-in axis FOLLOWS the title pole (K-EXPRESS D2 · O-A15 ANSWERS Q-21): left slides
    // from left, right from right, and a `center` title RISES vertically (no margin to slide from).
    const scrollIn = pick<"left" | "right" | "up">(
        L.scrollIn,
        title === "center" ? "up" : title === "right" ? "right" : "left",
    ) as "left" | "right" | "up";

    return { title, numbers, dock, scrollIn };
}

/** The masthead-phase index for a chapter array — counts MASTHEAD-bearing beats ONLY, so the `hero`
    cover + `colophon` never consume a zebra slot. The first real narrative beat is phase 0
    (title=left) deterministically, regardless of how many sentinels precede it. */
export function beatPhases(chapters: readonly Chapter[]): number[] {
    let p = 0;
    return chapters.map((c) => (hasMasthead(c) ? p++ : p));
}

/** THE FIGURE-LABEL (the EX-44 D21 rider) — the accessible chapter label `<FigureInitial>`
    announces. A numbered chapter reads `"Chapter <roman>, <eyebrow>"`. The ordinal is derived from
    the chapter's manifest position by the essay host; it is never authored on the chapter. A cover
    is not numbered, and an unmigrated cover may carry no eyebrow — so it names
    ITSELF, not an ordinal: the declared `hero` facet's own title (the most authoritative name for
    the page this cover fronts), falling back to the chapter's own `eyebrow` for a route that has
    not adopted the facet yet, reads as `"<name> — cover"`. PURE + TOTAL, unit-testable without
    mounting (the `resolveLayout`/`beatPhases` precedent above). */
export function figureLabelFor(chapter: EditorialChapter, figure: number): string {
    if (chapter.viz === "hero") {
        const name = chapter.hero?.title || chapter.eyebrow;
        return name ? `${name} — cover` : "Cover";
    }
    return `Chapter ${toRoman(figure)}, ${chapter.eyebrow}`;
}
