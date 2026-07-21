import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";

// A-28 (dial 5 — bold state letters AUGMENT, never replace) — the atlas place-label augment arm.
// These bind the SHIPPED GeoChoropleth render path + the `useChoroplethShapes` centroid gate: a route
// wiring `placeLabel` gets bold PLACE letters seated at each feature's centroid, ON TOP of (never in
// place of) the value-label channel; a route that does NOT declare it renders byte-identically. The
// proofs mount the REAL SFC through SSR and read the emitted SVG — deleting the render block, the
// prop, or the centroid-gate extension turns one of these RED.

// Two 10×10 squares in a 30×10 canvas: id "01" centres at (5,5), id "02" at (25,5). The default
// keyField zero-pads the topology id, so the join keys are "01"/"02" — the place-label lookup keys.
const topology = {
    type: "Topology",
    arcs: [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]],
    ],
    objects: {
        states: {
            type: "GeometryCollection",
            geometries: [
                { type: "Polygon", id: 1, arcs: [[0]], properties: { name: "Alpha" } },
                { type: "Polygon", id: 2, arcs: [[1]], properties: { name: "Bravo" } },
            ],
        },
    },
} as unknown as Topology;

const LETTERS: Record<string, string> = { "01": "NC", "02": "TX" };

async function render(props: Record<string, unknown>): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: [30, 10],
                // colour-only: no redundant channel, no value words — isolates the place letters.
                redundantChannel: "none",
                fill: () => "#888",
                ...props,
            }),
    });
    return renderToString(createSSRApp(App));
}

const countPlaceLabels = (html: string): number =>
    (html.match(/class="geo-place-label"/g) ?? []).length;

describe("A-28 — the GeoChoropleth place-label augment channel (dial 5)", () => {
    it("renders bold PLACE letters seated at each declaring feature's centroid", async () => {
        const html = await render({ placeLabel: (k: string) => LETTERS[k] ?? "" });
        expect(html).toContain('data-testid="geo-place-labels"');
        expect(countPlaceLabels(html)).toBe(2);
        expect(html).toContain(">NC</text>");
        expect(html).toContain(">TX</text>");
    });

    it("seats the letters off-origin via the centroid gate (a place-only route, no value source)", async () => {
        // With ONLY `placeLabel` wired, the centroid is computed only because the gate now includes
        // `placeLabel`. Were the gate un-extended, cx/cy would collapse to (0,0) — the signature this
        // asserts against — and both letters would stack at the origin.
        const html = await render({ placeLabel: (k: string) => LETTERS[k] ?? "" });
        expect(html).toContain('x="5" y="5" class="geo-place-label"');
        expect(html).toContain('x="25" y="5" class="geo-place-label"');
        expect(html).not.toContain('x="0" y="0" class="geo-place-label"');
    });

    it("omits a feature whose placeLabel returns the empty string", async () => {
        const html = await render({ placeLabel: (k: string) => (k === "01" ? "NC" : "") });
        expect(countPlaceLabels(html)).toBe(1);
        expect(html).toContain(">NC</text>");
        expect(html).not.toContain(">TX</text>");
    });

    it("is a byte-no-op for a route that does not declare placeLabel (no layer, no class)", async () => {
        const html = await render({});
        expect(html).not.toContain("geo-place-labels");
        expect(html).not.toContain("geo-place-label");
    });
});
