import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";

// U/B8 A10 — the rail is opt-in and composes with the value-label gate. Before the field is
// measured (SSR, first paint) a declared rail lays nothing and the map renders as it would without
// it; the on-mark words keep their own layer either way.
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

async function render(props: Record<string, unknown>): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: [30, 10],
                redundantChannel: "value-label",
                fill: () => "#888",
                valueLabel: (k: string) => (k === "01" ? "12" : "3"),
                ...props,
            }),
    });
    return renderToString(createSSRApp(App));
}

describe("U/B8 A10 — GeoChoropleth labelRail", () => {
    it("an unmeasured rail lays nothing and leaves the viewBox and value labels as they were", async () => {
        const without = await render({});
        const withRail = await render({ labelRail: { keys: ["01", "02"] } });
        expect(withRail).not.toContain('data-testid="geo-label-rail"');
        expect(withRail).toContain('viewBox="0 0 30 10"');
        expect(withRail).toBe(without);
        expect(withRail).toContain('class="geo-value-labels');
    });
});
