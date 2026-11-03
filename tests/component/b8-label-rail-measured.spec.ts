import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import type { Topology } from "topojson-specification";

// U/B8 A10 — the rail's SFC wiring at a MEASURED width. The field's width comes from
// `useElementSize`; the mock hands the SSR render a fixed width so the rail lays, and the markup
// shows what the SFC did with the layout: the viewBox grows by the rail's pad (above for a top rail,
// to the right for a side rail), the side rail's narrower k feeds the cell tap floor and the hatch,
// and the label count follows the width.
const measured = vi.hoisted(() => ({ width: 0 }));
vi.mock("@vueuse/core", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@vueuse/core")>();
    const { ref } = await import("vue");
    return { ...actual, useElementSize: () => ({ width: ref(measured.width), height: ref(0) }) };
});

import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";
import { layoutLabelRail, type RailRegion } from "../../src/charts/geo/label-rail";
import { CELL_TAP_FLOOR_PX } from "../../src/charts/geo/useChoroplethShapes";

// Six congruent 10×10 cells across a 300×100 field (a binned cell field, so the A-04 floor judges it).
const NAMES = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
const CELL = 10;
const VIEW: [number, number] = [300, 100];
const xs = [5, 55, 105, 155, 205, 255];
const ys = [10, 80, 40, 20, 70, 50];
const topology = {
    type: "Topology",
    arcs: xs.map((x, i) => {
        const y = ys[i];
        return [[x, y], [x, y + CELL], [x + CELL, y + CELL], [x + CELL, y], [x, y]];
    }),
    objects: {
        states: {
            type: "GeometryCollection",
            geometries: NAMES.map((name, i) => ({ type: "Polygon", id: i + 1, arcs: [[i]], properties: { name } })),
        },
    },
} as unknown as Topology;
const KEYS = NAMES.map((_, i) => String(i + 1).padStart(2, "0"));
const WORD = "12";

async function render(widthPx: number, props: Record<string, unknown> = {}): Promise<string> {
    measured.width = widthPx;
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: VIEW,
                redundantChannel: "value-label",
                fill: () => "#888",
                valueLabel: () => WORD,
                ...props,
            }),
    });
    return renderToString(createSSRApp(App));
}

/** The layout the SFC should have laid: the same regions (the cells' centroids) at the same width. */
function expected(widthPx: number, side: "top" | "right") {
    const regions: RailRegion[] = NAMES.map((name, i) => ({
        key: KEYS[i],
        name,
        value: WORD,
        cx: xs[i] + CELL / 2,
        cy: ys[i] + CELL / 2,
    }));
    return layoutLabelRail(regions, { viewWidth: VIEW[0], viewHeight: VIEW[1], widthPx, side });
}

const viewBoxOf = (html: string) => html.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
const floorOf = (html: string) => {
    const m = html.match(/--cell-floor:\s*([\d.]+)/);
    return m ? Number(m[1]) : 1;
};
const railLabels = (html: string) => html.match(/class="geo-rail-label"/g)?.length ?? 0;
const hatchScale = (html: string) => {
    const m = html.match(/id="geo-dim-hatch"[^>]*patternTransform="scale\(([\d.]+)\) rotate\(45\)"/);
    return m ? Number(m[1]) : 1;
};

describe("U/B8 A10 — GeoChoropleth labelRail at a measured width", () => {
    it("a top rail grows the viewBox upward by its pad, the width and k unchanged", async () => {
        const html = await render(400, { labelRail: { keys: KEYS } });
        const lay = expected(400, "top");
        expect(lay.labels.length).toBeGreaterThan(0);
        const [x, y, w, hgt] = viewBoxOf(html);
        expect(x).toBe(0);
        expect(y).toBeCloseTo(-lay.pad, 9);
        expect(w).toBe(VIEW[0]);
        expect(hgt).toBeCloseTo(VIEW[1] + lay.pad, 9);
        expect(lay.k).toBeCloseTo(400 / VIEW[0], 9);
    });

    it("a right rail grows the viewBox rightward by its pad, so the map renders at the rail's k", async () => {
        const html = await render(400, { labelRail: { keys: KEYS, side: "right" } });
        const lay = expected(400, "right");
        expect(lay.labels.length).toBeGreaterThan(0);
        const [x, y, w, hgt] = viewBoxOf(html);
        expect([x, y, hgt]).toEqual([0, 0, VIEW[1]]);
        expect(w).toBeCloseTo(VIEW[0] + lay.pad, 9);
        // The rendered px per unit of the grown viewBox is the k the rail sized its marks by.
        expect(400 / w).toBeCloseTo(lay.k, 9);
    });

    it("the side rail's narrower k feeds the cell tap floor", async () => {
        // At 400px the bare field renders a 10-unit cell at 13.3px, above the 12px floor; the side
        // rail narrows the map, so the same cell would render under it and the floor arms.
        const bare = await render(400);
        expect(CELL * (400 / VIEW[0])).toBeGreaterThanOrEqual(CELL_TAP_FLOOR_PX);
        expect(floorOf(bare)).toBe(1);
        const html = await render(400, { labelRail: { keys: KEYS, side: "right" } });
        const lay = expected(400, "right");
        expect(CELL * lay.k).toBeLessThan(CELL_TAP_FLOOR_PX);
        expect(floorOf(html)).toBeCloseTo(CELL_TAP_FLOOR_PX / (CELL * lay.k), 6);
    });

    it("the hatch is drawn per screen pixel at the field's k", async () => {
        const dimmedKeys = new Set([KEYS[0]]);
        const bare = await render(400, { dimmedKeys });
        expect(hatchScale(bare)).toBeCloseTo(VIEW[0] / 400, 6);
        const side = await render(400, { dimmedKeys, labelRail: { keys: KEYS, side: "right" } });
        expect(hatchScale(side)).toBeCloseTo(1 / expected(400, "right").k, 6);
    });

    it("names fewer regions as the field narrows: 3, then 4, then 6", async () => {
        const spec = { labelRail: { keys: KEYS } };
        expect(railLabels(await render(400, spec))).toBe(3);
        expect(railLabels(await render(700, spec))).toBe(4);
        expect(railLabels(await render(1000, spec))).toBe(6);
    });

    it("the rendered threads bend at their knees and the labels do not overlap", async () => {
        const html = await render(1000, { labelRail: { keys: KEYS } });
        const ds = [...html.matchAll(/class="geo-rail-thread" d="([^"]+)"/g)].map((m) => m[1]);
        expect(ds).toHaveLength(6);
        for (const d of ds) expect(d.match(/L/g)).toHaveLength(2);
        const lay = expected(1000, "top");
        const sorted = [...lay.labels].sort((p, q) => p.x - q.x);
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].x - sorted[i - 1].x).toBeGreaterThanOrEqual((sorted[i].size + sorted[i - 1].size) / 2 - 1e-9);
        }
        const xsRendered = [...html.matchAll(/class="geo-rail-label" x="([^"]+)"/g)].map((m) => Number(m[1]));
        expect(xsRendered).toEqual(lay.labels.map((l) => l.x));
    });
});
