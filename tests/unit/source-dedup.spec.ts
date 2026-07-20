import { describe, expect, it } from "vitest";
import { dedupeSources } from "../../src/platform/provenance/aggregation";
import { isHomepageRoot } from "../../src/platform/provenance/source-registry";
import type { AppendixEntry } from "../../src/platform/provenance/appendix";
import type { DataSource } from "../../src/platform/provenance/source-registry";
import type { ResolvedProvenance } from "../../src/platform/provenance/provenance-contract";

const provenance = { dataset: "feed" } as ResolvedProvenance;

const entry = (vizId: string, title: string, sourceIds: string[]): AppendixEntry => ({
    vizId,
    title,
    provenance,
    sourceIds,
});

const SOURCES: DataSource[] = [
    { id: "feed", kind: "exact", label: "The served feed", snapshot: "data/x.json" },
    { id: "usac", kind: "reference", label: "USAC", href: "https://example.org/dataset/1" },
    { id: "nces", kind: "reference", label: "NCES", href: "https://example.org/dataset/2" },
];

describe("A-31 · dedupeSources — the ONE dedup home", () => {
    // The disease, at its own shape: many figures, one feed. Before the fold this printed a link
    // per figure per source; the fold must leave one record per source, whatever the fan-out.
    it("collapses a source cited by nine figures to ONE record", () => {
        const entries = Array.from({ length: 9 }, (_, i) =>
            entry(`viz-${i}`, `Figure ${i}`, ["feed", "usac"]),
        );

        const folded = dedupeSources(entries, SOURCES);

        expect(folded).toHaveLength(2);
        expect(folded.map((f) => f.source.id)).toEqual(["feed", "usac"]);
        // 9 figures × 2 cites = 18 cites in, 2 records out — and no attribution lost.
        expect(entries.flatMap((e) => e.sourceIds ?? [])).toHaveLength(18);
        expect(folded[0].citedBy).toHaveLength(9);
        expect(folded[0].citedBy.map((c) => c.title)).toContain("Figure 8");
    });

    it("carries the UNION of citing figures, not the first or the last", () => {
        const folded = dedupeSources(
            [entry("a", "A", ["usac"]), entry("b", "B", ["nces"]), entry("c", "C", ["usac"])],
            SOURCES,
        );

        expect(folded.map((f) => f.source.id)).toEqual(["usac", "nces"]);
        expect(folded[0].citedBy.map((c) => c.vizId)).toEqual(["a", "c"]);
        expect(folded[1].citedBy.map((c) => c.vizId)).toEqual(["b"]);
    });

    it("orders by FIRST CITE — the appendix's reading order, not the registry's", () => {
        const folded = dedupeSources([entry("a", "A", ["nces", "feed"])], SOURCES);
        expect(folded.map((f) => f.source.id)).toEqual(["nces", "feed"]);
    });

    it("credits an entry once even when it cites the same record twice", () => {
        const folded = dedupeSources([entry("a", "A", ["usac", "usac"])], SOURCES);
        expect(folded[0].citedBy).toHaveLength(1);
    });

    it("drops a cite naming no registered record, rather than emitting a hole", () => {
        const folded = dedupeSources([entry("a", "A", ["usac", "ghost"])], SOURCES);
        expect(folded.map((f) => f.source.id)).toEqual(["usac"]);
    });

    it("is empty for entries that cite nothing", () => {
        expect(dedupeSources([entry("a", "A", [])], SOURCES)).toEqual([]);
    });
});

describe("W-21 · isHomepageRoot — the REFERENCE-tier invariant", () => {
    it("refuses an org homepage root, with or without the trailing slash", () => {
        expect(isHomepageRoot("https://www.mcnc.org/")).toBe(true);
        expect(isHomepageRoot("https://opendata.usac.org")).toBe(true);
        expect(isHomepageRoot("https://www.census.gov/")).toBe(true);
    });

    it("admits a citation that addresses an extract or a document", () => {
        expect(isHomepageRoot("https://nces.ed.gov/ccd/elsi/")).toBe(false);
        expect(isHomepageRoot("https://docs.fcc.gov/public/attachments/DOC-418505A1.pdf")).toBe(
            false,
        );
        expect(isHomepageRoot("https://example.org/?dataset=471")).toBe(false);
    });

    it("refuses text nobody can follow", () => {
        expect(isHomepageRoot("not a url")).toBe(true);
        expect(isHomepageRoot("")).toBe(true);
    });
});
