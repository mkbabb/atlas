// Figure-label behavior at the editorial contract boundary.
import { describe, it, expect } from "vitest";
import { figureLabelFor } from "../../src/editorial/useBeatLayout";
import type { EditorialChapter } from "../../src/editorial/editorial-contract";

describe("EX-44 · figureLabelFor — the cover figure-label (D21 residue 3, pure + total)", () => {
    const icon = { name: "Stub" } as never; // the oa15-beat-template precedent — a non-sentinel icon placeholder

    const coverWithHero: EditorialChapter = {
        id: "cover",
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
        eyebrow: "Per-capita ↔ per-area",
        icon,
        title: "unused",
        dek: "unused",
        viz: { name: "PlateStub" } as never, // a non-sentinel viz component placeholder (never "hero")
    };

    it("a cover with a declared hero facet names ITSELF off the facet's own title", () => {
        expect(figureLabelFor(coverWithHero, 0)).toBe("USF Dashboard — cover");
    });

    it("a cover with no facet falls back to the chapter's own (non-empty) eyebrow", () => {
        expect(figureLabelFor(coverNoFacetWithEyebrow, 0)).toBe("USFI — cover");
    });

    it("a cover with NEITHER a facet title NOR an eyebrow renders the bare 'Cover' label", () => {
        expect(figureLabelFor(coverBare, 0)).toBe("Cover");
    });

    it("NEVER renders the dangling 'Chapter , ' for any cover shape (the D21 find, direct regression check)", () => {
        for (const c of [coverWithHero, coverNoFacetWithEyebrow, coverBare]) {
            expect(figureLabelFor(c, 0)).not.toContain("Chapter ,");
            expect(figureLabelFor(c, 0)).not.toMatch(/^Chapter\s*,/);
        }
    });

    it("a numbered chapter is BYTE-IDENTICAL to the pre-EX-44 formula (no regression)", () => {
        expect(figureLabelFor(numberedChapter, 3)).toBe(
            "Chapter III, Per-capita ↔ per-area",
        );
    });
});
