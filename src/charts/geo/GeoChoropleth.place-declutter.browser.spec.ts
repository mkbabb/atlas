// U/B8r I-4: on /ecf at 390 the bold county names crossed each other (34 to 40 glyph-cell crossings
// per engine; 2 to 5 at 1440), because a place name always drew and only values gave way. A name
// with no room now gives way, the larger region first, and its value goes with it.
//
// The field is 105 rectangles of mixed width under NC county names, in a 975 x 610 viewBox, rendered
// at the two widths the /ecf map takes: 254 px (a 390 px phone) and 1192 px (a 1440 px desktop).
// The boxes are glyph cells (getBBox through each word's own screen CTM). getBoundingClientRect is
// not used: Firefox and WebKit include the paper halo in it (U/B8 B8-ATLAS-FIX §2).
import "./GeoChoropleth.css";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import { geoIdentity } from "d3-geo";
import GeoChoropleth from "./GeoChoropleth.vue";

const NAMES = (
    "ALAMANCE ALEXANDER ALLEGHANY ANSON ASHE AVERY BEAUFORT BERTIE BLADEN BRUNSWICK BUNCOMBE BURKE " +
    "CABARRUS CALDWELL CAMDEN CARTERET CASWELL CATAWBA CHATHAM CHEROKEE CHOWAN CLAY CLEVELAND COLUMBUS " +
    "CRAVEN CUMBERLAND CURRITUCK DARE DAVIDSON DAVIE DUPLIN DURHAM EDGECOMBE FORSYTH FRANKLIN GASTON " +
    "GATES GRAHAM GRANVILLE GREENE GUILFORD HALIFAX HARNETT HAYWOOD HENDERSON HERTFORD HOKE HYDE " +
    "IREDELL JACKSON JOHNSTON JONES LEE LENOIR LINCOLN MACON MADISON MARTIN MCDOWELL MECKLENBURG " +
    "MITCHELL MONTGOMERY MOORE NASH NEWHANOVER NORTHAMPTON ONSLOW ORANGE PAMLICO PASQUOTANK PENDER " +
    "PERQUIMANS PERSON PITT POLK RANDOLPH RICHMOND ROBESON ROCKINGHAM ROWAN RUTHERFORD SAMPSON " +
    "SCOTLAND STANLY STOKES SURRY SWAIN TRANSYLVANIA TYRRELL UNION VANCE WAKE WARREN WASHINGTON " +
    "WATAUGA WAYNE WILKES WILSON YADKIN YANCEY ALPHA BRAVO CHARLIE DELTA ECHO"
).split(" ");
// 15 columns by 7 rows; column widths cycle 78, 52, 65 units, rows are 87 units tall.
const COLS = 15;
const widths = Array.from({ length: COLS }, (_, i) => [78, 52, 65][i % 3]);
const xs = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
const features = NAMES.map((name, i) => {
    const c = i % COLS;
    const r = Math.floor(i / COLS);
    const [x, y, w, hgt] = [xs[c], r * 87, widths[c], 87];
    return {
        type: "Feature" as const,
        properties: { key: `k${String(i).padStart(3, "0")}`, name },
        geometry: {
            type: "Polygon" as const,
            coordinates: [[[x, y], [x, y + hgt], [x + w, y + hgt], [x + w, y], [x, y]]],
        },
    };
});
const nameOf = new Map(features.map((f) => [f.properties.key, f.properties.name]));

const cleanups: Array<() => void> = [];
afterEach(() => {
    while (cleanups.length) cleanups.pop()!();
});
const frames = (n: number) =>
    new Promise<void>((resolve) => {
        const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : resolve());
        step(n);
    });

type Cell = { s: string; x: number; left: number; top: number; right: number; bottom: number };
const cellOf = (t: SVGTextElement): Cell => {
    const b = t.getBBox();
    const m = t.getScreenCTM()!;
    const p = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(m);
    const a = p(b.x, b.y);
    const c = p(b.x + b.width, b.y + b.height);
    return { s: t.textContent!.trim(), x: Number(t.getAttribute("x")), left: a.x, top: a.y, right: c.x, bottom: c.y };
};
// A crossing is more than 0.5 px on both axes; adjoining edges (a region's own stack) do not count.
const crosses = (a: Cell, b: Cell) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
function pairs(A: Cell[], B: Cell[], same: boolean): string[] {
    const out: string[] = [];
    for (let i = 0; i < A.length; i++)
        for (let j = same ? i + 1 : 0; j < B.length; j++) if (crosses(A[i], B[j])) out.push(`${A[i].s}/${B[j].s}`);
    return out;
}

async function mount(widthPx: number) {
    const host = document.createElement("div");
    host.style.width = `${widthPx}px`;
    document.body.appendChild(host);
    const app = createApp({
        render: () =>
            h(GeoChoropleth, {
                features,
                projection: geoIdentity(),
                viewport: [975, 610],
                keyField: (f: { properties: { key: string } }) => f.properties.key,
                nameField: (f: { properties: { name: string } }) => f.properties.name,
                fill: () => "#ffffff",
                redundantChannel: "value-label",
                valueLabel: (k: string) => `$${(Number(k.slice(1)) * 1.37 + 3).toFixed(2)}`,
                placeLabel: (k: string) => nameOf.get(k) ?? "",
                ariaLabel: "counties",
            } as never),
    });
    app.mount(host);
    cleanups.push(() => {
        app.unmount();
        host.parentNode?.removeChild(host);
    });
    await nextTick();
    await document.fonts.ready;
    await frames(6);
    const visible = (sel: string) =>
        [...host.querySelectorAll<SVGTextElement>(sel)]
            .filter((t) => {
                const cs = getComputedStyle(t);
                return (
                    cs.visibility === "visible" &&
                    cs.display !== "none" &&
                    Number(cs.opacity) > 0.01 &&
                    !t.classList.contains("geo-value-label--gate-fail")
                );
            })
            .map(cellOf);
    return { names: visible(".geo-place-label"), values: visible(".geo-value-label") };
}

describe("a place name with no room gives way", () => {
    for (const [label, widthPx] of [
        ["390 (a 254 px map)", 254],
        ["1440 (a 1192 px map)", 1192],
    ] as const) {
        it(`at ${label}, no two words cross and every value keeps its name`, async () => {
            const { names, values } = await mount(widthPx);
            expect({
                nameName: pairs(names, names, true),
                nameValue: pairs(names, values, false),
                valueValue: pairs(values, values, true),
            }).toEqual({ nameName: [], nameValue: [], valueValue: [] });
            // Not by dropping every name: the map still names a good share of its regions.
            expect(names.length).toBeGreaterThanOrEqual(widthPx > 1000 ? 50 : 15);
            // The lockup: a value draws only directly under its own name (the same seat x, the two
            // line boxes adjoining).
            const underItsName = (v: Cell) => names.some((n) => n.x === v.x && Math.abs(n.bottom - v.top) < 1);
            expect(values.filter((v) => !underItsName(v)).map((v) => v.s)).toEqual([]);
        });
    }

    it("names fewer regions on the phone map than on the desktop map", async () => {
        const desk = (await mount(1192)).names.length;
        const phone = (await mount(254)).names.length;
        expect(phone).toBeLessThan(desk);
    });
});
