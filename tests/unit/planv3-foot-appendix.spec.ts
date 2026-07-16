import { describe, expect, it } from "vitest";
import { FOOT_ANATOMY_SEATS } from "../../src/charts/frame/foot-anatomy";
import {
    appendixAnchorId,
    appendixOrdinal,
    assertAppendixLinks,
    auditAppendixLinks,
    figureOrdinalFor,
    plateAnchorId,
    resolveAppendixDetent,
    type AppendixEntry,
    type AppendixRoster,
} from "../../src/platform/provenance/appendix";
import type { ResolvedProvenance } from "../../src/platform/provenance/provenance-contract";

const provenance: ResolvedProvenance = {
    dataset: "Open data",
    sections: ["Outcomes"],
    attributes: ["year", "count"],
    analysis: "annual total",
    yearRange: "2020–2025",
    encoding: { x: "year", y: "count" },
    vintage: null,
    filterActive: false,
    filterPhrases: [],
    filteredCount: null,
    grainNoun: "records",
    aggregationLevel: null,
};

const entry = (vizId: string, sourceIds: readonly string[] = ["primary"]): AppendixEntry => ({
    vizId,
    title: "Figure " + vizId,
    provenance,
    sourceIds,
});

const validRoster = (): AppendixRoster => ({
    entries: [entry("retention")],
    sources: [{ id: "primary", label: "Primary open data", href: "https://example.test/data" }],
    cites: [{ entryId: "retention", path: "story/beats.ts:18" }],
});

describe("provenance foot contracts", () => {
    it("publishes the fixed title/key/record anatomy", () => {
        expect(FOOT_ANATOMY_SEATS).toEqual(["title", "legend", "gear", "readout", "provenance"]);
    });

    it("moves through shut, peek, and full without a late peek collapsing full", () => {
        expect(resolveAppendixDetent("shut", "peek")).toBe("peek");
        expect(resolveAppendixDetent("peek", "expand")).toBe("full");
        expect(resolveAppendixDetent("full", "peek")).toBe("full");
        expect(resolveAppendixDetent("full", "toggle")).toBe("shut");
    });

    it("keeps declared ordinals and anchors independent of mount order", () => {
        expect(["outlook", "overview", "detail"].map((id) => ["overview", "detail", "outlook"].indexOf(id)).map(appendixOrdinal)).toEqual(["A.3", "A.1", "A.2"]);
        expect(appendixAnchorId("detail")).toBe("provenance-appendix-detail");
        expect(plateAnchorId("detail")).toBe("figure-detail");
        expect(figureOrdinalFor({ overview: 1, detail: 2 }, "detail")).toBe(2);
    });

    it("accepts complete rosters and reports broken links with authoring paths", () => {
        expect(auditAppendixLinks(validRoster())).toEqual([]);
        expect(() => assertAppendixLinks(validRoster())).not.toThrow();
        const broken: AppendixRoster = {
            entries: [entry("retention", ["missing-url"])],
            sources: [{ id: "missing-url", label: "Unlinked", href: "" }],
            cites: [{ entryId: "retentoin", path: "story/beats.ts:18" }],
        };
        expect(auditAppendixLinks(broken).map(({ code, path }) => ({ code, path }))).toEqual([
            { code: "UNLINKED_SOURCE", path: "entries.retention.sourceIds" },
            { code: "DANGLING_CITE", path: "story/beats.ts:18" },
        ]);
    });
});
