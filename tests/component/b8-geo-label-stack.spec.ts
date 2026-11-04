import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";
import { labelStack } from "../../src/charts/geo/useChoroplethShapes.js";

// U/B8 N-2 (REPORT-B7E §6): on /ecf the bold county name and its value word were both seated at the
// county's centroid, so PITT printed over $14.66 (63 name/value overlaps at 1440). The two words now
// form one stack, name above and value below, and a value word keeps its seat only clear of every
// other county's name as well as every kept value. The proofs mount the real SFC through SSR.

// Two 100×100 squares in a 200×110 canvas: "01" centres at (50,60), "02" at (150,50), so "01"'s
// name and "02"'s value fall on the same line when "01"'s name is long.
const topology = {
    type: "Topology",
    arcs: [
        [[0, 10], [0, 110], [100, 110], [100, 10], [0, 10]],
        [[100, 0], [100, 100], [200, 100], [200, 0], [100, 0]],
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

async function render(place: Record<string, string>): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: [200, 110],
                redundantChannel: "value-label",
                fill: () => "#ffffff",
                valueLabel: (k: string) => (k === "01" ? "$14.66" : "$17.21"),
                placeLabel: (k: string) => place[k] ?? "",
            }),
    });
    return renderToString(createSSRApp(App));
}
/** The y a word is seated at, read off the emitted `<text>`. */
function yOf(html: string, cls: string, word: string): number {
    const m = html.match(new RegExp(`<text[^>]*y="([-\\d.]+)"[^>]*class="${cls}[^"]*"[^>]*>\\s*${word.replace("$", "\\$")}\\s*</text>`));
    if (!m) throw new Error(`no ${cls} for ${word}`);
    return Number(m[1]);
}

describe("U/B8 N-2 — a region's name and value never share a seat", () => {
    it("stacks the name above the value, each clear of the other", async () => {
        const html = await render({ "01": "PITT", "02": "ANSON" });
        const nameY = yOf(html, "geo-place-label", "PITT");
        const valueY = yOf(html, "geo-value-label", "$14.66");
        expect(nameY).toBeLessThan(60);
        expect(valueY).toBeGreaterThan(60);
        // The name's line box sits on or above the value's (11 and 12 user units, 1.32 em lines).
        expect(nameY + (11 * 1.32) / 2).toBeLessThanOrEqual(valueY - (12 * 1.32) / 2 + 1e-9);
    });

    it("drops a value word whose block would touch a neighbour's name (the texture carries it)", async () => {
        // "01"'s name is long enough to reach into "02"'s block. It also crosses "02"'s name, which
        // gives way (U/B8r I-4), and "02"'s value goes with its name.
        const html = await render({ "01": "ALPHAALPHAALPHAALPHAALPHAALPHA", "02": "ANSON" });
        const failed = (word: string) =>
            new RegExp(`class="[^"]*geo-value-label--gate-fail[^"]*"[^>]*>\\s*${word.replace(/[$.]/g, "\\$&")}`).test(html);
        expect(failed("$17.21")).toBe(true);
        expect(failed("$14.66")).toBe(false);
    });

    it("sizes the block from the faces the CSS paints", () => {
        const k = labelStack({ cx: 0, cy: 0, place: "PITT", label: "$14.66" });
        expect(k.placeH + k.valueH).toBeCloseTo(23 * 1.32);
        expect(k.valueW).toBeCloseTo(6 * 12 * 0.6);
        expect(k.placeW).toBeCloseTo(4 * 11 * 0.6);
        expect(k.placeY).toBeCloseTo(-7.92);
        expect(k.valueY).toBeCloseTo(7.26);
    });
});
