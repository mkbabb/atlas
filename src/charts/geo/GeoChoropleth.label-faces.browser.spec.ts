// U/B8 N-2: on /ecf at 1440 a county's bold name and a neighbour's value word still touched after the
// stack (7 box overlaps in Chromium, 14 in Firefox), because the declutter sized words by a fixed
// mono estimate and the engines' faces differ from it. The map now reads each face off a rendered
// word. Here the place face is a wide serif, far off the estimate: no visible name may touch a
// visible value, and a value that would is dropped to its texture.
import "./GeoChoropleth.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import { geoIdentity } from "d3-geo";
import GeoChoropleth from "./GeoChoropleth.vue";

// A row of 60-unit squares in a 600 x 120 field, rendered 1:1 (600 px wide).
const square = (key: string, x: number, y: number) => ({
    type: "Feature" as const,
    properties: { key, name: key },
    geometry: { type: "Polygon" as const, coordinates: [[[x, y], [x, y + 60], [x + 60, y + 60], [x + 60, y], [x, y]]] },
});
const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
// Odd squares sit 20 units lower, so a name's line meets its neighbour's value line.
const features = KEYS.map((k, i) => square(k, i * 60, i % 2 ? 40 : 20));

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
        const visible = (sel: string) =>
            [...el.querySelectorAll<SVGTextElement>(sel)]
                .filter((t) => getComputedStyle(t).visibility === "visible")
                .map((t) => ({ s: t.textContent!.trim(), r: t.getBoundingClientRect() }));
        const names = visible(".geo-place-label");
        const values = visible(".geo-value-label");
        expect(names.length).toBe(KEYS.length);
        const hits: string[] = [];
        for (const n of names)
            for (const v of values)
                if (n.r.left < v.r.right && v.r.left < n.r.right && n.r.top < v.r.bottom && v.r.top < n.r.bottom)
                    hits.push(`${n.s}/${v.s}`);
        expect(hits).toEqual([]);
    });
});
