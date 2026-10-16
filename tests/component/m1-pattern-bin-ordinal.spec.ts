import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { afterEach, describe, expect, it } from "vitest";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "../../src/charts/geo/GeoChoropleth.vue";
import { makeDivergingScale, clearVarMemo } from "../../src/charts/scale/ColorScale";
import { cssColorToOklab } from "../../src/charts/scale/colorRamp";

// U · B3 · M-1 (RULINGS §H) — the dark /usf pattern-bin inversion. The O-A22 texture channel used to
// bin the distinct fill colours by a STRING sort and paint each bin with its first colour, so on the
// dark /usf default (diverging ramp, hinge 1.0) the strongest receivers rendered in the payer red.
// This spec reproduces that frame: 51 small states (every label fails the X10 size gate, so every
// region routes to the texture), net-retention values shaped like the served /usf rows (AK 24.34×),
// and the DARK diverging tokens. It asserts (a) every region shows its OWN ramp colour, (b) no
// receiver shows a payer-side colour, and (c) the texture tier is monotone in the data value.

// The dark-theme diverging stops, verbatim from design/tokens/color.css (the `.dark` block).
const DARK: Record<string, string> = {
    "--viz-diverging-low": "oklch(0.68 0.18 28)",
    "--viz-diverging-mid": "oklch(0.42 0.02 78)",
    "--viz-diverging-high": "oklch(0.68 0.14 245)",
    "--viz-no-data": "oklch(0.3 0.01 78)",
};

/** Build the diverging scale exactly as /usf does, against the DARK token cascade. The poles are
    read once at construction, so the DOM stubs are removed before the SSR render. */
function darkDivergingScale(domain: [number, number], hinge: number) {
    const g = globalThis as Record<string, unknown>;
    g.window = {};
    g.document = { documentElement: { classList: { contains: (c: string) => c === "dark" } } };
    g.getComputedStyle = () => ({ getPropertyValue: (n: string) => DARK[n] ?? "" });
    try {
        clearVarMemo();
        return makeDivergingScale({ domain, hinge });
    } finally {
        delete g.window;
        delete g.document;
        delete g.getComputedStyle;
        clearVarMemo();
    }
}

afterEach(() => clearVarMemo());

// 51 net-retention values: 30 payers (0.30 … 0.99) and 21 receivers (1.05 … AK 24.34).
const VALUES: number[] = [
    ...Array.from({ length: 30 }, (_, i) => 0.3 + (0.69 * i) / 29),
    ...Array.from({ length: 20 }, (_, i) => 1.05 + (8 * i) / 19),
    24.34,
];
const KEYS = VALUES.map((_, i) => String(i + 1).padStart(2, "0"));
const VALUE_BY_KEY = new Map(KEYS.map((k, i) => [k, VALUES[i]]));
const HINGE = 1.0;

// 51 5×5 squares on a 17×3 grid (minor axis 5 < the 48px label floor, so every word fails the gate).
const topology = {
    type: "Topology",
    arcs: KEYS.map((_, i) => {
        const x = (i % 17) * 6;
        const y = Math.floor(i / 17) * 6;
        return [[x, y], [x, y + 5], [x + 5, y + 5], [x + 5, y], [x, y]];
    }),
    objects: {
        states: {
            type: "GeometryCollection",
            geometries: KEYS.map((k, i) => ({
                type: "Polygon",
                id: Number(k),
                arcs: [[i]],
                properties: { name: `S${k}` },
            })),
        },
    },
} as unknown as Topology;

type Tag = Record<string, string>;
function tags(html: string, name: string): Tag[] {
    const out: Tag[] = [];
    for (const m of html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))) {
        const attrs: Tag = {};
        for (const a of m[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
        out.push(attrs);
    }
    return out;
}

async function renderDarkUsf(withValue = true) {
    const scale = darkDivergingScale([Math.min(...VALUES), 2.2], HINGE);
    const fill = (k: string) => scale(VALUE_BY_KEY.get(k) ?? null);
    const App = defineComponent({
        setup: () => () =>
            h(GeoChoropleth, {
                topology,
                viewport: [102, 17],
                fill,
                ...(withValue ? { value: (k: string) => VALUE_BY_KEY.get(k) ?? null } : {}),
                valueFormat: (k: string) => `${VALUE_BY_KEY.get(k)?.toFixed(2)}×`,
            }),
    });
    const html = await renderToString(createSSRApp(App));
    // The colour each region SHOWS: its plain fill, or (a fill that is a texture reference) the
    // background rect of the referenced <pattern>.
    const patternBg = new Map<string, string>();
    for (const m of html.matchAll(/<pattern\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/pattern>/g)) {
        const rect = tags(m[2], "rect")[0];
        if (rect?.fill) patternBg.set(m[1], rect.fill);
    }
    const urlId = (f: string | undefined) => f?.match(/^url\(#(.+)\)$/)?.[1];
    const paths = tags(html, "path");
    const shown = new Map<string, string>();
    const texture = new Map<string, string>();
    for (const p of paths) {
        const key = p["data-key"];
        if (key) {
            const id = urlId(p.fill);
            shown.set(key, id ? (patternBg.get(id) ?? "") : p.fill);
            if (id) texture.set(key, id);
        }
        const over = p["data-texture-key"];
        if (over) texture.set(over, urlId(p.fill) ?? "");
    }
    return { scale, fill, shown, texture };
}

describe("M-1 · the dark /usf pattern-bin inversion (atlas redundant channel)", () => {
    it("every textured region shows its OWN ramp colour (no bin representative)", async () => {
        const { fill, shown, texture } = await renderDarkUsf();
        expect(texture.size).toBe(KEYS.length); // the frame really routes to the texture channel
        const wrong = KEYS.filter((k) => shown.get(k) !== fill(k));
        expect(wrong).toEqual([]);
    });

    it("no receiver (value > hinge) shows a payer-side colour", async () => {
        const { scale, shown } = await renderDarkUsf();
        const ref = { L: 0, a: 0, b: 0 };
        const low = cssColorToOklab(scale(0.3), ref);
        const high = cssColorToOklab(scale(24.34), ref);
        // the payer↔receiver axis in the a/b plane (the poles differ in hue, not lightness)
        const ax = { a: high.a - low.a, b: high.b - low.b };
        const mid = { a: (high.a + low.a) / 2, b: (high.b + low.b) / 2 };
        const side = (c: string) => {
            const o = cssColorToOklab(c, ref);
            return (o.a - mid.a) * ax.a + (o.b - mid.b) * ax.b;
        };
        const strong = KEYS.filter((k) => (VALUE_BY_KEY.get(k) ?? 0) >= 1.5);
        const inverted = strong.filter((k) => side(shown.get(k) ?? "") <= 0);
        expect(inverted).toEqual([]);
    });

    it("orders the texture tiers by the data value, not by the colour string", async () => {
        const { texture } = await renderDarkUsf();
        const tier = (k: string) => Number(texture.get(k)?.match(/(\d+)$/)?.[1] ?? NaN);
        const byValue = [...KEYS].sort(
            (a, b) => (VALUE_BY_KEY.get(a) ?? 0) - (VALUE_BY_KEY.get(b) ?? 0),
        );
        const tiers = byValue.map(tier);
        for (let i = 1; i < tiers.length; i++) expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
        expect(tiers[0]).toBe(0);
        expect(tiers[tiers.length - 1]).toBe(7);
    });

    it("without a declared ordinal, every region still shows its own colour", async () => {
        const { fill, shown, texture } = await renderDarkUsf(false);
        expect(texture.size).toBe(KEYS.length);
        expect(KEYS.filter((k) => shown.get(k) !== fill(k))).toEqual([]);
    });
});
