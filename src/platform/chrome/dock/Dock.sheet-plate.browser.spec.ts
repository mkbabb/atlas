// D-6 (U/B7b M1, PLAN §2.2 "Sheets open upward from the bar with an opaque plate"): at 390 every
// surface a bar cell opens (Dashboards, Sections, More, Filters) hides the page behind it. The
// census on the served sci build measured each one translucent (plate alpha 0.18 to 0.26 with a
// 20 px backdrop blur, /sci at 390, light and dark), so the page's figures read through the rows.
// The cure is glass's opaque rung of the surface axis: the Select sheet form wears it at the glass
// root, as does a dock menu below 30rem (the More menu), and the dock asks for it on the phone
// Filters sheet.
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createApp, defineComponent, h, provide } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter, useRoute } from "vue-router";
import { page } from "vitest/browser";
import { makeRegistry, mountSite, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";
import SiteShell from "../shell/SiteShell.vue";
import PlatformShell from "../shell/PlatformShell.vue";
import FilterPanel from "../../../filter/ui/FilterPanel.vue";
import { useFilterPane } from "../../../filter/composables/useFilterPane.js";
import { DASHBOARD_KEY, installDashboardRegistry, type DashboardContext } from "../../../contract/index.js";

let site: MountedSite | null = null;
afterEach(async () => {
    await userEvent.keyboard("{Escape}");
    site?.unmount();
    site = null;
});

/** The alpha of a computed colour (rgb(), rgba() or color(… / a)). */
function alpha(color: string): number {
    if (!color || color === "transparent") return 0;
    const rgb = color.match(/rgba?\(([^)]+)\)/);
    if (rgb) {
        const p = rgb[1].split(/[ ,/]+/).filter(Boolean);
        return p.length > 3 ? Number(p[3]) : 1;
    }
    const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)$/);
    if (slash) return slash[2] ? Number(slash[1]) / 100 : Number(slash[1]);
    return 1;
}

/** The plate's paint: the open surface's own background alpha and its backdrop filter. */
function plate(sel: string) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { alpha: alpha(cs.backgroundColor), backdrop: cs.backdropFilter || "none" };
}

/** /sci with the filter drawer in PlatformShell's `filter` slot, as sci's DashboardView mounts it. */
async function mountWithFilter(width: number): Promise<() => void> {
    await page.viewport(width, width < 768 ? 844 : 900);
    const tokens = document.createElement("style");
    tokens.textContent = ":root{--z-content:10;--card:#fffdf8;--background:#faf7f0;--foreground:#1b1b1b}";
    document.head.appendChild(tokens);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const ctx = {
        id: "sci",
        title: "School Connectivity Initiative",
        brand: "SCI",
        flagshipRoute: "/sci",
        filterBody: { render: () => h("button", { type: "button" }, "Region") },
        nav: ["one", "two"].map((id) => ({ kind: "beat", id, label: id, icon: { render: () => null } })),
    } as unknown as DashboardContext;
    const Route = defineComponent({
        setup() {
            useRoute();
            provide(DASHBOARD_KEY, ctx);
            return () =>
                h(PlatformShell, null, {
                    default: () => ["one", "two"].map((id) => h("section", { id, style: "min-height:1400px" }, [h("h2", null, id)])),
                    filter: () => h(FilterPanel, { body: ctx.filterBody }),
                });
        },
    });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug", name: "dashboard", component: Route }] });
    const app = createApp(defineComponent({ setup: () => () => h(SiteShell) }));
    installDashboardRegistry(app, makeRegistry().registry);
    app.use(createPinia()).use(router);
    await router.push("/sci");
    await router.isReady();
    app.mount(host);
    await settle(600);
    return () => {
        app.unmount();
        host.remove();
        tokens.remove();
        history.replaceState(history.state, "", location.pathname);
    };
}

const CELLS: [string, string, string][] = [
    ["Sections", "[data-testid='dock-section-select']", "[data-slot='select-content']"],
    ["Dashboards", "[data-dock-cell='dashboards'] button, [data-testid='dock-dashboards']", "[data-slot='select-content']"],
    ["More", "[data-dock-cell='more'] button, [data-testid='dock-gear']", "[data-slot='menu-content']"],
];

describe("D-6: every bar surface at 390 has an opaque plate", () => {
    for (const [name, trigger, surface] of CELLS) {
        it(`${name} opens on an opaque plate`, async () => {
            site = await mountSite("/sci", 390);
            window.scrollTo(0, 400);
            await settle(200);
            await userEvent.click(document.querySelector<HTMLElement>(trigger)!);
            await settle(500);
            const p = plate(surface);
            expect(p, `${name}: no open surface`).not.toBeNull();
            expect(p!.alpha).toBe(1);
            expect(p!.backdrop).toBe("none");
        });
    }

    // Search is a palette over a dark scrim at every width. On glass it took the scrim's colour, so
    // in the light scheme its dark ink sat on a near-black plate (census, /c/funding at 390).
    for (const width of [390, 1440]) {
        it(`Search opens on an opaque plate at ${width}`, async () => {
            site = await mountSite("/c/funding", width);
            if (width >= 768) {
                await userEvent.hover(document.querySelector<HTMLElement>("[data-testid='dock-brand']")!);
                await settle(900);
            }
            await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-search']")!);
            await settle(500);
            const p = plate("[data-slot='dialog-content'], [role='dialog'][data-state='open']");
            expect(p).not.toBeNull();
            expect(p!.alpha).toBe(1);
            expect(p!.backdrop).toBe("none");
        });
    }

    // sci's DashboardView mounts the filter drawer in PlatformShell's `filter` slot; the site harness
    // does not, so this case mounts the same shape around SiteShell.
    for (const width of [390, 1440]) {
        it(`Filters opens on ${width < 768 ? "an opaque plate (phone sheet)" : "the glass drawer (≥ 768)"} at ${width}`, async () => {
            const unmount = await mountWithFilter(width);
            try {
                if (width >= 768) {
                    await userEvent.hover(document.querySelector<HTMLElement>("[data-testid='dock-brand']")!);
                    await settle(900);
                }
                await userEvent.click(document.querySelector<HTMLElement>("[data-testid='dock-filter-trigger']")!);
                await settle(700);
                const p = plate("[data-testid='filter-panel']");
                expect(p).not.toBeNull();
                if (width < 768) {
                    expect(p!.alpha).toBe(1);
                    expect(p!.backdrop).toBe("none");
                } else {
                    expect(p!.alpha).toBeLessThan(1);
                }
            } finally {
                useFilterPane().open.value = false;
                unmount();
            }
        });
    }
});
