// PV-04 (U/B7d M3): the appendix linked to nothing, because its return link waited on a figure-number
// roster no route supplies, and no figure carried the anchor the link names.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import ProvenanceAppendix from "../../src/platform/provenance/ProvenanceAppendix.vue";
import { plateAnchorId, FIGURE_HASH_PREFIX } from "../../src/platform/provenance/appendix";

const entry = (vizId: string) => ({
    vizId,
    title: vizId,
    provenance: { dataset: "D", sections: [], measures: [], method: {}, scope: {}, filter: null } as never,
});

describe("the appendix's way back", () => {
    it("every row links to its figure", async () => {
        const html = await renderToString(createSSRApp({ render: () => h(ProvenanceAppendix, { entries: [entry("a"), entry("b")] }) }));
        for (const id of ["a", "b"]) expect(html).toContain(`href="#${plateAnchorId(id)}"`);
    });

    it("a row for a figure with no anchor of its own links to the beat that holds it", async () => {
        const html = await renderToString(createSSRApp({ render: () => h(ProvenanceAppendix, { entries: [{ ...entry("cover-figure"), figureAnchor: "cover" }] }) }));
        expect(html).toContain('href="#cover"');
    });

    it("the figure hash prefix is the anchor's own", () => {
        expect(`#${plateAnchorId("a")}`.startsWith(FIGURE_HASH_PREFIX)).toBe(true);
    });

    it("a plate carries the anchor on its root and a plateless bar carries its own", () => {
        const plate = readFileSync("src/charts/frame/VizPlate.vue", "utf8");
        const bar = readFileSync("src/platform/provenance/ProvenanceBar.vue", "utf8");
        expect(plate).toMatch(/:id="plateAnchorId\(contract\.id\)"/);
        expect(bar).toMatch(/:id="hosted \? undefined : plateAnchorId\(vizId\)"/);
    });
});
