// The enlarged figure (U/B7 · R-REQ-CHECK F-05, RULINGS §M M-3), in a real engine with glass and
// atlas styles. glass 10.1.0's ExpandableContainer teleports the whole body to <body> while open and
// paints only a 50 % scrim, so (a) the page printed through the enlarged figure, (b) the resting box
// fell to its 200 px floor and the page behind the figure reflowed (a figure near the end of the page
// moved the page 700 px), (c) the hover card (z 60) sat under the layer (z 140), and (d) the
// presentation body (120vh) ran past the fixed layer with no way to scroll to its foot.
import "../../../tests/browser/glass-root.css";
import "../../design/foundations/base.css";
import "../../design/tokens/elevation.css";
import { describe, expect, it } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { createApp, defineComponent, h, nextTick } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import ChartFrame from "./ChartFrame.vue";
import PlateDock from "./PlateDock.vue";
import { provideDismissArbiter } from "../../platform/interaction/useDismissArbiter";
import { installDashboardRegistry } from "../../contract/registry-inject";

declare module "vitest/browser" {
    interface BrowserCommands {
        emulateMotion: (reducedMotion: "reduce" | "no-preference") => Promise<void>;
    }
}

const ID = "fig-enlarge";
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function until(pred: () => boolean, ms: number): Promise<boolean> {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        if (pred()) return true;
        await sleep(16);
    }
    return pred();
}
const fig = () => new URLSearchParams(location.search).get("fig");
/** The hover card's resolved stacking rung, read through a positioned probe. */
function hoverCardZ(): number {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;z-index:var(--z-hovercard)";
    document.body.appendChild(probe);
    const z = Number(getComputedStyle(probe).zIndex);
    probe.remove();
    return z;
}
const prose = (n: number) =>
    Array.from({ length: n }, (_, i) => `<p style="margin:0 0 16px;line-height:24px">Paragraph ${i}: the reader's text runs beside the figure.</p>`).join("");
const alpha = (color: string) => {
    const m = color.match(/rgba?\(([^)]+)\)/);
    if (!m) return color === "transparent" ? 0 : 1;
    const parts = m[1]!.split(/[ ,/]+/).filter(Boolean);
    return parts.length > 3 ? Number(parts[3]) : 1;
};

const PLACES = {
    /** The figure in running prose, centred. */
    "in prose": { html: `${prose(80)}<div id="fh"></div>${prose(80)}`, place: (d: HTMLElement) => d.scrollIntoView({ block: "center" }) },
    /** The figure near the end of the page, scrolled to the bottom. */
    "near the end": { html: `${prose(80)}<div id="fh"></div><div style="height:80px"></div>`, place: () => window.scrollTo(0, document.documentElement.scrollHeight) },
} as const;

async function mountFigure(html: string) {
    history.replaceState(null, "", "/");
    const host = document.createElement("div");
    host.style.width = "900px";
    host.innerHTML = html;
    document.body.appendChild(host);
    const app = createApp(
        defineComponent({
            setup() {
                provideDismissArbiter();
                return () =>
                    h(
                        ChartFrame,
                        { ariaLabel: "The figure", figId: ID },
                        {
                            default: () => h("div", { style: "height:900px", "data-chart": "" }, "chart"),
                            dock: ({ enlarge }: { enlarge: () => void }) => h(PlateDock, { id: ID, title: "The figure", enlarge, browse: null }),
                        },
                    );
            },
        }),
    );
    app.use(createPinia());
    app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] }));
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    app.mount(host.querySelector("#fh")!);
    await nextTick();
    await sleep(150);
    const dock = host.querySelector<HTMLElement>(`[data-plate-dock][data-subject="${ID}"]`)!;
    const handle = dock.querySelector<HTMLElement>("[aria-expanded][aria-controls]")!;
    async function enlarge(): Promise<void> {
        handle.focus({ preventScroll: true });
        await userEvent.keyboard("{Enter}");
        await until(() => {
            const b = dock.querySelector('[data-action="enlarge"]');
            return !!b?.getClientRects().length && !b.closest("[inert]");
        }, 1500);
        dock.querySelector<HTMLElement>('[data-action="enlarge"]')!.focus({ preventScroll: true });
        await userEvent.keyboard("{Enter}");
        expect(await until(() => fig() === ID, 2000)).toBe(true);
        await sleep(400);
    }
    function cleanup(): void {
        app.unmount();
        host.remove();
        history.replaceState(null, "", "/");
        window.scrollTo(0, 0);
    }
    return { host, dock, handle, enlarge, cleanup };
}

describe("enlarge covers the viewport and the page behind it never moves", () => {
    for (const motion of ["no-preference", "reduce"] as const)
        for (const [name, { html, place }] of Object.entries(PLACES))
            it(`${name}, motion ${motion}`, async () => {
                await commands.emulateMotion(motion);
                const f = await mountFigure(html);
                try {
                    place(f.dock);
                    await sleep(150);
                    const y0 = window.scrollY;
                    await f.enlarge();
                    expect(window.scrollY - y0, "the page behind the open figure").toBe(0);
                    await userEvent.keyboard("{Escape}");
                    expect(await until(() => fig() === null, 2500)).toBe(true);
                    await sleep(500);
                    expect(window.scrollY - y0, "the page after Escape").toBe(0);
                    expect(document.activeElement, "focus returns to the dock's handle").toBe(f.handle);
                } finally {
                    f.cleanup();
                }
            });

    it("the enlarged figure paints an opaque surface at 9 grid points, scrolls to its foot, and the hover card rides above it", async () => {
        await commands.emulateMotion("reduce");
        const f = await mountFigure(PLACES["in prose"].html);
        try {
            PLACES["in prose"].place(f.dock);
            await sleep(150);
            await f.enlarge();
            const body = document.querySelector<HTMLElement>("[data-frame-fullscreen]");
            expect(body, "the enlarged body marks itself").not.toBeNull();
            for (const fx of [0.1, 0.5, 0.9])
                for (const fy of [0.1, 0.5, 0.9]) {
                    const hit = document.elementFromPoint(innerWidth * fx, innerHeight * fy);
                    expect(hit && body!.contains(hit), `point ${fx},${fy} lands on the enlarged figure`).toBe(true);
                }
            expect(alpha(getComputedStyle(body!).backgroundColor), "the enlarged surface is opaque").toBe(1);
            const r = body!.getBoundingClientRect();
            expect(r.bottom).toBeLessThanOrEqual(innerHeight + 1);
            expect(["auto", "scroll"]).toContain(getComputedStyle(body!).overflowY);
            const zCard = hoverCardZ();
            const layer = body!.closest<HTMLElement>(".expandable-container")!;
            expect(zCard, "the hover card stacks above the enlarged layer").toBeGreaterThan(Number(getComputedStyle(layer).zIndex));
            await userEvent.keyboard("{Escape}");
            expect(await until(() => fig() === null, 2500)).toBe(true);
            await sleep(300);
            expect(hoverCardZ(), "the hover card returns to its resting rung").toBe(60);
        } finally {
            f.cleanup();
        }
    });
});
