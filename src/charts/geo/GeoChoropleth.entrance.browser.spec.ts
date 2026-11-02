// The opt-in map entrance in a real engine (U/B8 A1 review). Three witnesses the node suite cannot
// give: the shape's 200 ms opacity transition must not race the entrance's `fill: backwards` hold (a
// CSS transition outranks a script animation in the cascade, so a transition started when the hold
// clears paints the shape over its first frame); a dimmed shape lands on its resting dim opacity, not
// on 1 and then a snap down; and the dim hatch lands with its shape instead of sitting over the hold.
// The no-JS witness renders the served markup in a scripting-disabled context: the map must show.
import "../../../tests/browser/utilities.css";
import "./GeoChoropleth.css";
import { afterEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";
import { createApp, h, type App } from "vue";
import type { Topology } from "topojson-specification";
import GeoChoropleth from "./GeoChoropleth.vue";

declare module "vitest/browser" {
    interface BrowserCommands {
        noScriptOpacity: (html: string, selector: string) => Promise<number[]>;
    }
}

// Three 10×10 squares: "01" (the origin), "02" (dimmed), "03".
const topology = {
    type: "Topology",
    arcs: [
        [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]],
        [[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]],
        [[40, 0], [40, 10], [50, 10], [50, 0], [40, 0]],
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

let app: App | null = null;
let host: HTMLElement | null = null;
afterEach(() => {
    app?.unmount();
    host?.remove();
    app = host = null;
});

function mount(): SVGSVGElement {
    host = document.createElement("div");
    host.style.width = "400px";
    document.body.appendChild(host);
    app = createApp({
        render: () =>
            h(GeoChoropleth, {
                topology,
                viewport: [50, 10],
                redundantChannel: "none",
                fill: () => "#888",
                valueFormat: () => "1",
                dimmedKeys: new Set(["02"]),
                entrance: { origin: "01", kind: "ripple" },
            }),
    });
    app.mount(host);
    return host.querySelector("svg")!;
}

const frame = () => new Promise<number>((r) => requestAnimationFrame(r));

interface Sample {
    dimmed: number;
    hatch: number;
    transitions: number;
}

/** Sample every frame until the entrance's flights have finished (and a few frames past). */
async function sampleEntrance(svg: SVGSVGElement): Promise<Sample[]> {
    const dimmed = svg.querySelector<SVGPathElement>('.geo-shape[data-key="02"]')!;
    const hatch = svg.querySelector<SVGPathElement>('[fill="url(#geo-dim-hatch)"]')!;
    const out: Sample[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) {
        await frame();
        const shapes = [...svg.querySelectorAll(".geo-shape")];
        out.push({
            dimmed: Number(getComputedStyle(dimmed).opacity),
            hatch: Number(getComputedStyle(hatch).opacity),
            transitions: shapes
                .flatMap((s) => s.getAnimations())
                .filter((a) => a instanceof CSSTransition && a.transitionProperty === "opacity").length,
        });
        const live = shapes.flatMap((s) => s.getAnimations()).filter((a) => !(a instanceof CSSTransition));
        if (out.length > 5 && !svg.hasAttribute("data-entrance-pending") && live.length === 0) break;
    }
    return out;
}

describe("the map entrance in an engine", () => {
    it("starts no opacity transition on the shapes when the hold clears", async () => {
        const samples = await sampleEntrance(mount());
        expect(samples.some((s) => s.transitions > 0)).toBe(false);
    });

    it("lands a dimmed shape on its resting dim opacity, with no snap at the end", async () => {
        const samples = await sampleEntrance(mount());
        const rest = samples.at(-1)!.dimmed;
        expect(rest).toBeCloseTo(0.7, 2);
        // The soft spring overshoots its rest a little (about 8% of the run); it never climbs to 1
        // and it never drops from one frame to the next by more than the spring settles.
        const seen = samples.map((s) => s.dimmed);
        expect(Math.max(...seen)).toBeLessThan(0.8);
        for (let i = 1; i < seen.length; i++) expect(seen[i - 1]! - seen[i]!).toBeLessThan(0.1);
    });

    it("holds the dim hatch with its shape, then lands it", async () => {
        const svg = mount();
        const hatch = svg.querySelector<SVGPathElement>('[fill="url(#geo-dim-hatch)"]')!;
        // Held (or on its first frame) at mount, before the first view plays it.
        const cs = getComputedStyle(hatch);
        expect(cs.visibility === "hidden" || Number(cs.opacity) === 0).toBe(true);
        const samples = await sampleEntrance(svg);
        expect(samples[0]!.hatch).toBeLessThan(0.5);
        expect(samples.at(-1)!.hatch).toBe(1);
    });

    it("shows the served map when the page runs no script", async () => {
        const svg = mount();
        // The markup as served: still held (the entrance has not played), with its stylesheet.
        const html = svg.outerHTML.replace(/data-entrance-pending="[^"]*"/, 'data-entrance-pending="true"');
        const sheets = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
        const opacity = await commands.noScriptOpacity(
            `<style>${sheets}</style><div style="width:400px">${html}</div>`,
            ".geo-shape",
        );
        expect(opacity.length).toBe(3);
        expect(opacity.every((o) => o > 0)).toBe(true);
    });
});
