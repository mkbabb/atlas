// tests/unit/ex44-d21-rider.spec.ts — EX-44 · the 3 D21 LIBRARY-BOUND residues (O-D21's
// PARTIAL-lawful verdict flagged these as atlas-root gaps, not route bugs — see the O-EXEC-PROGRESS
// EX-43/EX-44 cursor rows). All three are ADDITIVE: no breaking prop change, no route behaviour
// change; an existing consumer that opts into nothing stays byte-identical.
//
//   1. DashboardHero.vue gains a `#provenance` slot — a route cover can now emit inline exact-source
//      provenance without hand-mounting outside this component's contract.
//   2. DashboardHero.vue gains an `eyebrow?` prop — a route can pass a kicker DISTINCT from its <h1>
//      title instead of duplicating the title as both eyebrow and h1 (the D21 `display:none`
//      workaround this closes). Omit ⇒ the title itself renders as the eyebrow (unchanged default).
//   3. DashboardEssay.vue's cover figure-label stops rendering the dangling "Chapter , " (figure:0,
//      `toRoman(0)===""`) — a named-cover label ("<title> — cover") renders instead. Extracted as
//      `figureLabelFor` (useBeatLayout.ts) — PURE + TOTAL, unit-tested directly (the
//      resolveLayout/beatPhases precedent, not a live-source scan) — plus a live-source check that
//      DashboardEssay actually wires the extracted function.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { figureLabelFor } from "@/editorial/useBeatLayout";
import type { EditorialChapter } from "@/editorial/editorial-contract";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const HERO = read("../../src/editorial/DashboardHero.vue");
const ESSAY = read("../../src/editorial/DashboardEssay.vue");

describe("EX-44 · DashboardHero.vue — the #provenance seat (D21 residue 1)", () => {
    it("declares an OPTIONAL, unfilled-safe #provenance slot", () => {
        expect(HERO).toContain('<slot name="provenance" />');
    });

    it("seats the slot INSIDE the cover <header> (the same landmark as the figures)", () => {
        const header = HERO.slice(HERO.indexOf("<header"), HERO.indexOf("</header>"));
        expect(header).toContain('<slot name="provenance" />');
    });
});

describe("EX-44 · DashboardHero.vue — the eyebrow prop (D21 residue 2)", () => {
    it("declares an OPTIONAL `eyebrow` prop (no default entry ⇒ undefined, additive)", () => {
        expect(HERO).toMatch(/eyebrow\?:\s*string;/);
    });

    it("the eyebrow paragraph falls back to `title` when `eyebrow` is omitted (byte-identical default)", () => {
        expect(HERO).toContain("{{ eyebrow ?? title }}");
        // the title itself is UNTOUCHED — still the page's one <h1>, never suppressed.
        expect(HERO).toContain('<h1 class="dashboard-hero__title text-page-title">{{ title');
    });
});

describe("EX-44 · figureLabelFor — the cover figure-label (D21 residue 3, pure + total)", () => {
    const icon = { name: "Stub" } as never; // the oa15-beat-template precedent — a non-sentinel icon placeholder

    const coverWithHero: EditorialChapter = {
        id: "cover",
        figure: 0,
        eyebrow: "",
        icon,
        title: "unused",
        dek: "unused",
        viz: "hero",
        hero: { title: "USF Dashboard", dek: "d", figures: [] },
    };

    const coverNoFacetWithEyebrow: EditorialChapter = {
        ...coverWithHero,
        hero: undefined,
        eyebrow: "USFI",
    };

    const coverBare: EditorialChapter = {
        ...coverWithHero,
        hero: undefined,
        eyebrow: "",
    };

    const numberedChapter: EditorialChapter = {
        id: "overview",
        figure: 3,
        eyebrow: "Per-capita ↔ per-area",
        icon,
        title: "unused",
        dek: "unused",
        viz: { name: "PlateStub" } as never, // a non-sentinel viz component placeholder (never "hero")
    };

    it("a cover with a declared hero facet names ITSELF off the facet's own title", () => {
        expect(figureLabelFor(coverWithHero)).toBe("USF Dashboard — cover");
    });

    it("a cover with no facet falls back to the chapter's own (non-empty) eyebrow", () => {
        expect(figureLabelFor(coverNoFacetWithEyebrow)).toBe("USFI — cover");
    });

    it("a cover with NEITHER a facet title NOR an eyebrow renders the bare 'Cover' label", () => {
        expect(figureLabelFor(coverBare)).toBe("Cover");
    });

    it("NEVER renders the dangling 'Chapter , ' for any cover shape (the D21 find, direct regression check)", () => {
        for (const c of [coverWithHero, coverNoFacetWithEyebrow, coverBare]) {
            expect(figureLabelFor(c)).not.toContain("Chapter ,");
            expect(figureLabelFor(c)).not.toMatch(/^Chapter\s*,/);
        }
    });

    it("a numbered chapter is BYTE-IDENTICAL to the pre-EX-44 formula (no regression)", () => {
        expect(figureLabelFor(numberedChapter)).toBe(
            "Chapter III, Per-capita ↔ per-area",
        );
    });
});

describe("EX-44 · DashboardEssay.vue — wires the extracted figureLabelFor (live source)", () => {
    it("imports figureLabelFor off useBeatLayout (the resolveLayout/beatPhases precedent)", () => {
        expect(ESSAY).toMatch(
            /import\s*\{[^}]*figureLabelFor[^}]*\}\s*from\s*["']\.\/useBeatLayout["']/,
        );
    });

    it("binds :figure-label to figureLabelFor(chapter) — no inline dangling-comma template literal", () => {
        expect(ESSAY).toContain(':figure-label="figureLabelFor(chapter)"');
        expect(ESSAY).not.toMatch(/figure-label="`Chapter/);
    });
});
