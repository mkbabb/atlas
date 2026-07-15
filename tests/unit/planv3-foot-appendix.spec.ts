import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FOOT_ANATOMY_SEATS } from "@/charts/frame/foot-anatomy";
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
} from "@/platform/provenance/appendix";
import type { ResolvedProvenance } from "@/platform/provenance/provenance-contract";

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

function entry(vizId: string, sourceIds: readonly string[] = ["primary"]): AppendixEntry {
    return { vizId, title: `Figure ${vizId}`, provenance, sourceIds };
}

function validRoster(): AppendixRoster {
    return {
        entries: [entry("retention")],
        sources: [
            {
                id: "primary",
                label: "Primary open data",
                href: "https://example.test/data",
                path: "sources.primary",
            },
        ],
        cites: [{ entryId: "retention", path: "story/beats.ts:18" }],
    };
}

describe("FootAnatomy", () => {
    it("publishes one fixed title/key/record band contract", () => {
        expect(FOOT_ANATOMY_SEATS).toEqual([
            "title",
            "legend",
            "gear",
            "readout",
            "provenance",
        ]);

        const source = readFileSync(
            new URL("../../src/charts/frame/FootAnatomy.vue", import.meta.url),
            "utf8",
        );
        for (const seat of FOOT_ANATOMY_SEATS) {
            expect(source).toContain(`data-seat="${seat}"`);
        }
        expect(source).toContain("container: plate-foot / inline-size");
        expect(source).toContain("overflow: clip");
        expect(source).toContain("contain-intrinsic-size:");
        expect(source).toContain('<slot name="colophon" />');
    });
});

describe("VizAppendixDock state law", () => {
    it("moves through SHUT, PEEK and FULL without a late peek collapsing full", () => {
        expect(resolveAppendixDetent("shut", "peek")).toBe("peek");
        expect(resolveAppendixDetent("peek", "expand")).toBe("full");
        expect(resolveAppendixDetent("full", "peek")).toBe("full");
        expect(resolveAppendixDetent("full", "toggle")).toBe("shut");
        expect(resolveAppendixDetent("peek", "close")).toBe("shut");
    });

    it("ships a collapsed expandable control and a print-visible pane", () => {
        const source = readFileSync(
            new URL("../../src/platform/provenance/VizAppendixDock.vue", import.meta.url),
            "utf8",
        );
        expect(source).toContain("data-appendix-dock");
        expect(source).toContain(':aria-expanded="state === \'full\'"');
        expect(source).toContain(':aria-controls="paneId"');
        expect(source).toMatch(/@media print[\s\S]*\.appendix-dock__pane\[hidden\][\s\S]*display: block/);
    });
});

describe("appendix identity and links", () => {
    it("keeps declared ordinals and bidirectional anchors independent of mount order", () => {
        const declared = ["overview", "detail", "outlook"];
        const mounted = ["outlook", "overview", "detail"];

        expect(mounted.map((id) => declared.indexOf(id)).map(appendixOrdinal)).toEqual([
            "A.3",
            "A.1",
            "A.2",
        ]);
        expect(appendixAnchorId("detail")).toBe("provenance-appendix-detail");
        expect(plateAnchorId("detail")).toBe("figure-detail");
        expect(figureOrdinalFor({ overview: 1, detail: 2, outlook: 3 }, "detail")).toBe(2);
        expect(() => figureOrdinalFor({ overview: 1 }, "detail")).toThrow(
            'No figure ordinal is declared for "detail".',
        );
    });

    it("accepts a fully linked roster", () => {
        expect(auditAppendixLinks(validRoster())).toEqual([]);
        expect(() => assertAppendixLinks(validRoster())).not.toThrow();
    });

    it("reports dangling cites, URL-less links and orphan sources with authoring paths", () => {
        const roster: AppendixRoster = {
            entries: [entry("retention", ["missing-url"])],
            sources: [
                { id: "missing-url", label: "Unlinked", href: "" },
                {
                    id: "orphan",
                    label: "Unused",
                    href: "https://example.test/orphan",
                    path: "sources.orphan",
                },
            ],
            cites: [{ entryId: "retentoin", path: "story/beats.ts:18" }],
        };

        expect(auditAppendixLinks(roster).map(({ code, path }) => ({ code, path }))).toEqual([
            { code: "UNLINKED_SOURCE", path: "entries.retention.sourceIds" },
            { code: "DANGLING_CITE", path: "story/beats.ts:18" },
            { code: "ORPHAN_SOURCE", path: "sources.orphan" },
        ]);
        expect(() => assertAppendixLinks(roster)).toThrow(/story\/beats\.ts:18/);
    });

    it("keeps every provenance font size on the shared type register", () => {
        const files = [
            "ProvenanceBar.vue",
            "ProvenanceChip.vue",
            "ProvenanceAppendix.vue",
            "VizAppendixDock.vue",
            "SourceLink.vue",
        ];
        for (const file of files) {
            const source = readFileSync(
                new URL(`../../src/platform/provenance/${file}`, import.meta.url),
                "utf8",
            ).replace(/\/\*[\s\S]*?\*\//g, "");
            expect(source, file).not.toMatch(/font-size:\s*[0-9.]+(?:rem|px|em)/);
        }
    });
});
