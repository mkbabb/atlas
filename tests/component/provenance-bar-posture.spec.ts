import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import type { ProvenanceFacet } from "../../src/platform/provenance/provenance-contract";

// The bar reads the route's live feed vintage through the dashboard store; this lane is testing
// POSTURE, not vintage, so the freshness seam is stubbed to a fixed stamp and the render stays
// store-free. Everything asserted below is the component's own markup.
vi.mock("../../src/platform/chrome/freshness.js", async () => {
    const { computed } = await import("vue");
    return {
        useFreshness: () => ({
            label: computed(() => "2026-07-05"),
            generatedAt: computed(() => "2026-07-05T16:30:10Z"),
            isStale: computed(() => false),
        }),
    };
});

const { default: ProvenanceBar } = await import(
    "../../src/platform/provenance/ProvenanceBar.vue"
);
const { default: VizAppendixDock } = await import(
    "../../src/platform/provenance/VizAppendixDock.vue"
);

// W-23 / W-38 — the reversed posture, rendered. The record is the plate's REFERENCE and is shut at
// rest behind a whisper that names the source; a bar whose host already supplies the disclosure
// (the plate-foot appendix dock) opens with it and grows no second handle. These render the real
// component, so the posture is read off shipped markup rather than restated.

const SERVED: ProvenanceFacet = {
    dataset: "SCI utilization feed",
    attributes: ["contracted bandwidth (Mbps)"],
    analysis: "contracted capacity by district",
    encoding: { x: "district", y: "contracted bandwidth" },
};

const ILLUSTRATIVE: ProvenanceFacet = {
    dataset: "Ellis, Directions for Bringing over Seeds and Plants (1770)",
    attributes: ["hand-coloured engraving"],
    illustrative: true,
};

const render = (props: {
    facet: ProvenanceFacet;
    vizId: string;
    hosted?: boolean;
    appendix?: boolean;
}) => renderToString(createSSRApp({ render: () => h(ProvenanceBar, props) }));

const renderDock = (props: { browse?: () => void }) =>
    renderToString(
        createSSRApp({
            render: () =>
                h(VizAppendixDock, { peekLabel: "Source", label: SERVED.dataset, ...props }),
        }),
    );

describe("W-23 · the record is hidden by default", () => {
    it("ships the record in the DOM but shut, behind a whisper", async () => {
        const html = await render({ facet: SERVED, vizId: "sci-cover" });

        expect(html).toContain('data-detent="shut"');
        // in the DOM — the reference is present for print, find-in-page and assistive tech …
        expect(html).toContain('data-testid="provenance-bar-record"');
        expect(html).toContain("contracted capacity by district");
        // … and hidden, which is the whole reversal.
        expect(html).toMatch(/class="provenance-bar__record"[^>]*hidden/);
        expect(html).toContain('aria-expanded="false"');
    });

    it("names the source in the whisper, so nothing must be opened to learn whose data it is", async () => {
        const html = await render({ facet: SERVED, vizId: "sci-cover" });
        expect(html).toContain("SCI utilization feed");
        expect(html).toContain('data-testid="provenance-bar-handle"');
    });

    it("grows no handle when its host IS the disclosure, and opens with it", async () => {
        const html = await render({ facet: SERVED, vizId: "sci-cover", hosted: true });

        expect(html).toContain('data-detent="open"');
        expect(html).not.toContain('data-testid="provenance-bar-handle"');
        expect(html).not.toMatch(/class="provenance-bar__record"[^>]*hidden/);
    });
});

describe("dial 11 · the handle carries words, and only words it can keep", () => {
    // W-56 — this bar's handle opens the RECORD. It says so. The dial-11 words ride the control
    // that opens the browsable table (`VizAppendixDock`'s browse handle, asserted below); a handle
    // that promised a table here and yielded five rungs IS the info-scent defect W-56 was raised
    // over, so the bar must never carry them.
    it("names the record its own handle opens, and promises no table it has not got", async () => {
        const html = await render({ facet: SERVED, vizId: "sci-cover" });
        expect(html).toContain("source &amp; method");
        expect(html).not.toContain("browse &amp; export");
    });

    it("carries the ruled words on the control that opens the viewer", async () => {
        const browsable = await renderDock({ browse: () => {} });
        expect(browsable).toContain("browse &amp; export");
        expect(browsable).toContain('data-testid="appendix-dock-browse"');
        // and its own control still names what IT opens
        expect(browsable).toContain("source &amp; method");
    });

    // Guard-3 is ABSENCE: a plate that declares no `DataScope` passes no `browse`, so no browse
    // handle exists to make the promise. There is no disabled control and no dead affordance.
    it("grows no browse handle where no scope is declared", async () => {
        const plain = await renderDock({});
        expect(plain).not.toContain("browse &amp; export");
        expect(plain).not.toContain('data-testid="appendix-dock-browse"');
    });
});

// W-63 — ATTRIBUTION-ONLY. An illustrative figure has no rows, no vintage and no viewer, so the
// five-rung apparatus is a citation in the costume of an audit trail. It states its credit, links
// its appendix row, and stops.
describe("W-63 · the illustrative figure is attribution-only", () => {
    it("renders the credit and the appendix row, and no record at all", async () => {
        const html = await render({
            facet: ILLUSTRATIVE,
            vizId: "vft-specimen-sheet",
            appendix: true,
        });

        expect(html).toContain('data-testid="provenance-bar-attribution"');
        expect(html).toContain("Ellis, Directions for Bringing over Seeds and Plants (1770)");
        expect(html).toContain("#provenance-appendix-vft-specimen-sheet");
        // the record, the handle, and any promise of rows are all gone
        expect(html).not.toContain('data-testid="provenance-bar-record"');
        expect(html).not.toContain('data-testid="provenance-bar-handle"');
        expect(html).not.toContain("browse &amp; export");
    });
});
