// U/B7 O-19 (PLAN §5.4): the per-measure source record. The contract resolves a column key to its
// entry, vintage and coverage; the provenance render names a figure's columns from the dictionary;
// a served record links to the data viewer as "Data file (view)".
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter } from "vue-router";
import {
    columnHeading,
    coverageText,
    resolveColumn,
    sourcesLine,
    unresolvedColumns,
} from "../../src/platform/provenance/feed-dictionary";
import { resolveProvenance } from "../../src/platform/provenance/useProvenance";
import SourceLink from "../../src/platform/provenance/SourceLink.vue";
import { FIXTURE_DICTIONARY as D } from "../fixtures/feed-dictionary";

describe("the feed dictionary", () => {
    it("resolves a column to its entry, its vintage and its coverage", () => {
        const c = resolveColumn(D, "bandwidth")!;
        expect(c.label).toBe("Contracted bandwidth");
        expect(c.source?.publisher).toBe("MCNC");
        expect(coverageText(c.coverage!)).toBe("117 of 120 rows");
        expect(columnHeading(c)).toBe("Contracted bandwidth (Mbps)");
        expect(resolveColumn(D, "lea")).toBeNull();
        expect(unresolvedColumns(D, ["lea", "name", "bandwidth"])).toEqual(["lea"]);
    });

    it("names the sources a set of columns reads, once each, with a preliminary source marked", () => {
        expect(sourcesLine(D, ["name", "year", "bandwidth"])).toBe("NC SVF, FY2025; MCNC, June 2026 (preliminary)");
        expect(sourcesLine(D, ["name"])).toBe("NC SVF, FY2025");
        expect(sourcesLine(null, ["name"])).toBeNull();
    });

    it("names a figure's attributes from the dictionary, not their keys", () => {
        const p = resolveProvenance({ dataset: "SCI", attributes: ["bandwidth", "year"] }, null, {
            predicate: null,
            labels: { dims: {}, values: {} } as never,
            filteredCount: null,
            grainNoun: "districts",
            aggregationLevel: null,
            dictionary: D,
        });
        expect(p.attributes).toEqual(["Contracted bandwidth", "School year"]);
        expect(p.sources).toBe("MCNC, June 2026 (preliminary); NC SVF, FY2025");
    });
});

describe("SourceLink: a served record opens the data viewer", () => {
    it('renders "Data file (view)" linking to /data/<id>', async () => {
        const app = createSSRApp({
            render: () => h(SourceLink, { source: { id: "sci", kind: "exact", label: "SCI district feed", snapshot: "data/sci.json" } }),
        });
        const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:p(.*)*", component: { render: () => null } }] });
        app.use(router);
        await router.push("/");
        const html = await renderToString(app);
        expect(html).toContain("Data file (view)");
        expect(html).toContain('href="/data/sci"');
        expect(html).not.toContain("served here");
    });
});
