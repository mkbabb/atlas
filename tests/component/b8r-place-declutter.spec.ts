import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";
import {
    PLACE_LABEL_CLEARANCE,
    estimatedLabelFaces,
    labelStack,
    placeNamesSuppressed,
} from "../../src/charts/geo/useChoroplethShapes.js";
import { resolveLabelCollisions } from "../../src/charts/geo/redundant-channel.js";

// U/B8r I-4 (REPORT-B8 §6.1): on /ecf at 390 the bold county names crossed each other (34 to 40
// glyph-cell crossings per engine; 2 to 5 at 1440), because a place name always drew (A-28) and only
// value words gave way. A name with no room now gives way, in priority order (the larger region
// first), and its value goes with it: a name and its value are one lockup.

// "01" is a 120x100 rectangle, "02" a 100x100 square beside it, and "03" a 60x60 square far
// off. "01" and "02" centre 110 units apart on one line, so two long names cross.
const topology = {
    type: "Topology",
    arcs: [
        [[0, 0], [0, 100], [120, 100], [120, 0], [0, 0]],
        [[120, 0], [120, 100], [220, 100], [220, 0], [120, 0]],
        [[380, 20], [380, 80], [440, 80], [440, 20], [380, 20]],
    ],
    objects: {
        states: {
            type: "GeometryCollection",
            geometries: [
                { type: "Polygon", id: 1, arcs: [[0]], properties: { name: "Alpha" } },
                { type: "Polygon", id: 2, arcs: [[1]], properties: { name: "Bravo" } },
                { type: "Polygon", id: 3, arcs: [[2]], properties: { name: "Charlie" } },
            ],
        },
    },
} as unknown as Topology;

async function render(place: Record<string, string>): Promise<string> {
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: [460, 100],
                redundantChannel: "value-label",
                fill: () => "#ffffff",
                valueLabel: (k: string) => ({ "01": "$14.66", "02": "$17.21", "03": "$3.10" })[k] ?? "",
                placeLabel: (k: string) => place[k] ?? "",
            }),
    });
    return renderToString(createSSRApp(App));
}
const names = (html: string) =>
    [...html.matchAll(/<text[^>]*class="geo-place-label"[^>]*>\s*([^<\s]+)\s*<\/text>/g)].map((m) => m[1]);
const shownValues = (html: string) =>
    [...html.matchAll(/<text[^>]*class="geo-value-label"[^>]*>\s*([^<\s]+)\s*<\/text>/g)].map((m) => m[1]);

describe("U/B8r I-4 — a place name with no room gives way", () => {
    it("draws both names when they have room", async () => {
        const html = await render({ "01": "PITT", "02": "HYDE", "03": "DARE" });
        expect(names(html).sort()).toEqual(["DARE", "HYDE", "PITT"]);
        expect(shownValues(html).sort()).toEqual(["$14.66", "$17.21", "$3.10"]);
    });

    it("keeps the larger region's name and drops the crossing one, with its value", async () => {
        // 18 characters at 6.6 units each is 119 units: the two names would overlap by 9 units.
        const html = await render({ "01": "ROCKINGHAMROCKINGH", "02": "NORTHAMPTONNORTHAM", "03": "DARE" });
        expect(names(html).sort()).toEqual(["DARE", "ROCKINGHAMROCKINGH"]);
        // "02"'s value would sit unnamed under its neighbour's name: it gives way to the texture.
        expect(shownValues(html).sort()).toEqual(["$14.66", "$3.10"]);
    });
});

describe("placeNamesSuppressed", () => {
    const faces = estimatedLabelFaces();
    const at = (key: string, cx: number, place: string, minorAxis = 100) => ({ key, cx, cy: 50, label: "$1.00", place, minorAxis });

    it("lets no two seated names come within the clearance", () => {
        // A row of 30 regions 40 units apart, each with a 9-character name (59.4 units wide).
        const row = Array.from({ length: 30 }, (_, i) => at(`k${String(i).padStart(2, "0")}`, i * 40, "WASHINGTN"));
        const out = placeNamesSuppressed(row, faces);
        const kept = row.filter((s) => !out.has(s.key)).map((s) => s.cx);
        expect(kept.length).toBeGreaterThan(5);
        for (let i = 1; i < kept.length; i++)
            expect(kept[i] - kept[i - 1]).toBeGreaterThanOrEqual(9 * faces.place.advance + PLACE_LABEL_CLEARANCE);
    });

    it("seats fewer names as the faces grow (the phone counter-scale)", () => {
        const row = Array.from({ length: 30 }, (_, i) => at(`k${String(i).padStart(2, "0")}`, i * 40, "WAKE"));
        const desk = placeNamesSuppressed(row, estimatedLabelFaces(1)).size;
        const phone = placeNamesSuppressed(row, estimatedLabelFaces(2)).size;
        expect(desk).toBe(0);
        expect(phone).toBeGreaterThan(desk);
    });

    it("gives the seat to the larger region, whatever the key order", () => {
        const small = at("a", 0, "NORTHAMPTON", 40);
        const large = at("b", 30, "NORTHAMPTON", 90);
        expect([...placeNamesSuppressed([small, large], faces)]).toEqual(["a"]);
    });

    it("stacks the name above the value only while the value is mounted", () => {
        const s = at("a", 0, "PITT");
        const up = labelStack(s, faces).placeY;
        const alone = labelStack({ ...s, label: "" }, faces).placeY;
        expect(up).toBeLessThan(alone);
    });
});

describe("resolveLabelCollisions clearance", () => {
    it("keeps two adjoining boxes at 0 and parts them at a positive clearance", () => {
        const a = { key: "a", cx: 0, cy: 0, w: 10, h: 10 };
        const b = { key: "b", cx: 10, cy: 0, w: 10, h: 10 };
        expect(resolveLabelCollisions([a, b]).size).toBe(0);
        expect([...resolveLabelCollisions([a, b], [], 2.5)]).toEqual(["b"]);
    });
});
