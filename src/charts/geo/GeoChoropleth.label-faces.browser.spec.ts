// U/B8 N-2: on /ecf at 1440 a county's bold name and a neighbour's value word still touched after the
// stack, because the declutter sized words by a fixed mono estimate and the engines' faces differ
// from it. The map now reads each face off a rendered word. Here the place face is a wide serif, far
// off the estimate: no visible name's word box may cross a visible value's, a value that would is
// dropped to its texture, and a value with room keeps its word.
//
// The boxes are the words' glyph cells (getBBox through each word's own screen CTM, so a CSS
// translate on a word counts). getBoundingClientRect is not used: Firefox includes the paper halo
// (the background-coloured stroke under each word) in it, and a region's own name and value stack
// with their line boxes adjoining, so their halos always meet.
import "./GeoChoropleth.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import { geoIdentity } from "d3-geo";
import GeoChoropleth from "./GeoChoropleth.vue";

// 50-unit squares in a 600 x 120 field, rendered 1:1 (600 px wide). A and B are neighbours, B 20
// units lower, so B's name line meets A's value line: the estimate (46 units for COUNTYB) clears A's
// value by 50 units of centre distance, the rendered serif (about 67) does not. C stands alone, so
// its value always has room.
const square = (key: string, x: number, y: number) => ({
    type: "Feature" as const,
    properties: { key, name: key },
    geometry: { type: "Polygon" as const, coordinates: [[[x, y], [x, y + 50], [x + 50, y + 50], [x + 50, y], [x, y]]] },
});
const KEYS = ["A", "B", "C"];
const features = [square("A", 0, 20), square("B", 50, 40), square("C", 400, 20)];

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});
const frames = (n: number) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });

describe("the map sizes its words by the faces it renders", () => {
    it("lets no visible name touch a visible value, with a face far wider than the estimate", async () => {
        const style = document.createElement("style");
        style.textContent = `.geo-place-label { font-family: Georgia, serif !important; letter-spacing: 0.15em; }`;
        document.head.appendChild(style);
        const el = document.createElement("div");
        el.style.width = "600px";
        document.body.appendChild(el);
        const app = createApp({
            render: () =>
                h(GeoChoropleth, {
                    features,
                    projection: geoIdentity(),
                    viewport: [600, 120],
                    keyField: (f: { properties: { key: string } }) => f.properties.key,
                    nameField: (f: { properties: { name: string } }) => f.properties.name,
                    fill: () => "#ffffff",
                    redundantChannel: "value-label",
                    valueLabel: (k: string) => `$${KEYS.indexOf(k) + 10}.25`,
                    placeLabel: (k: string) => `COUNTY${k}`,
                    ariaLabel: "squares",
                } as never),
        });
        app.mount(el);
        cleanups.push(() => {
            app.unmount();
            el.remove();
            style.remove();
        });
        await nextTick();
        await document.fonts.ready;
        await frames(4);
        // A word's glyph cell on screen: its bbox through its own CTM (which carries any CSS translate).
        const cell = (t: SVGTextElement) => {
            const b = t.getBBox();
            const m = t.getScreenCTM()!;
            const p = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(m);
            const a = p(b.x, b.y);
            const c = p(b.x + b.width, b.y + b.height);
            return { left: a.x, top: a.y, right: c.x, bottom: c.y };
        };
        const visible = (sel: string) =>
            [...el.querySelectorAll<SVGTextElement>(sel)]
                .filter((t) => getComputedStyle(t).visibility === "visible" && getComputedStyle(t).display !== "none")
                .map((t) => ({ s: t.textContent!.trim(), r: cell(t) }));
        const names = visible(".geo-place-label");
        const values = visible(".geo-value-label");
        expect(names.length).toBe(KEYS.length);
        // Adjoining line boxes (a region's own stack) meet at an edge; only a crossing counts.
        const EPS = 0.5;
        const hits: string[] = [];
        for (const n of names)
            for (const v of values)
                if (
                    Math.min(n.r.right, v.r.right) - Math.max(n.r.left, v.r.left) > EPS &&
                    Math.min(n.r.bottom, v.r.bottom) - Math.max(n.r.top, v.r.top) > EPS
                )
                    hits.push(`${n.s}/${v.s}`);
        expect(hits).toEqual([]);
        // Not by dropping every word: B and C have room and keep theirs; A's gives way to B's name.
        expect(values.map((v) => v.s).sort()).toEqual(["$11.25", "$12.25"]);
    });
});
