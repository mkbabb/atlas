// mount-site.ts — the engine lane's site harness (U/B7 §2.4). It mounts `SiteShell` over a memory
// router with the instance's route shapes (the homepage, a subject page, `/data/*`, a dashboard at
// `/:slug/:view?`, a 404) and a registry of ranked dashboards whose contexts load lazily, as sci's do.
// A dashboard route renders `PlatformShell` with one tall section per beat, so the dock's stepper,
// pager and bar have real sections to read.
import { createApp, defineComponent, h, inject, provide, type App } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter, useRoute, type Router } from "vue-router";
import { page } from "vitest/browser";
import SiteShell from "../../src/platform/chrome/shell/SiteShell.vue";
import PlatformShell from "../../src/platform/chrome/shell/PlatformShell.vue";
import {
    createDashboardRegistry,
    DASHBOARD_KEY,
    installDashboardRegistry,
    type DashboardContext,
    type DashboardMeta,
    type DashboardRegistry,
} from "../../src/contract/index.js";
// glass-ui's styles, as a consumer root loads them: the dock reads glass tokens (`--radius-circle`,
// `--radius-bar`) that atlas does not define.
import "./glass-root.css";
import "../../src/design/tokens/elevation.css";
import "../../src/design/tokens/space.css";

export const BEATS = ["one", "two", "three", "four"];
const LABELS = ["Bandwidth by unit", "Trend", "Equity", "Sources"];

/** The roster: six ranked dashboards, one held, one companion (sci's shape, U/B7 §3.3). */
export const ROSTER: Pick<DashboardMeta, "slug" | "title" | "rank" | "headline">[] = [
    { slug: "usf", title: "Universal Service Fund", rank: 2, headline: { value: "$83.5B", label: "disbursed", period: "FY2015–25" } },
    { slug: "sci", title: "School Connectivity Initiative", rank: 1, headline: { value: "743.6 Gbps", label: "contracted", period: "2025–26" } },
    { slug: "ecf", title: "Emergency Connectivity Fund", rank: 3 },
    { slug: "demand", title: "E-Rate demand", rank: 4, headline: { value: "$3.59B", label: "requested", period: "FY2026" } },
    { slug: "bead", title: "BEAD awards", rank: 5 },
    { slug: "speedtest", title: "Measured speeds", rank: 6 },
    { slug: "usf-integrity", title: "USF integrity", rank: "held" },
    { slug: "vft-germination", title: "Venus flytrap germination", rank: "companion" },
];
export const ROUTES = [
    "/",
    ...ROSTER.map((d) => `/${d.slug}`),
    "/c/funding",
    "/no-such-page/at-all",
    "/data",
    "/data/sci",
    "/data/sci/inputs/sci-2026.csv",
];

function contextFor(slug: string, title: string): DashboardContext {
    return {
        id: slug,
        title,
        brand: title,
        flagshipRoute: `/${slug}`,
        filterBody: slug === "speedtest" ? undefined : { render: () => null },
        nav: BEATS.map((id, i) => ({ kind: "beat", id, label: LABELS[i], icon: { render: () => null } })),
    } as unknown as DashboardContext;
}

export function makeRegistry(): { registry: DashboardRegistry; loads: Map<string, number> } {
    const loads = new Map<string, number>();
    const metaModules: Record<string, { meta: DashboardMeta }> = {};
    const bodyLoaders: Record<string, () => Promise<{ default: object }>> = {};
    const contextModules: Record<string, () => Promise<Record<string, DashboardContext>>> = {};
    for (const d of ROSTER) {
        metaModules[`./${d.slug}/meta.ts`] = { meta: { ...d } as DashboardMeta };
        bodyLoaders[`./${d.slug}/DashboardBody.vue`] = async () => ({ default: {} });
        contextModules[`./${d.slug}/context.ts`] = async () => {
            loads.set(d.slug, (loads.get(d.slug) ?? 0) + 1);
            return { [`${d.slug}Context`]: contextFor(d.slug, d.title) };
        };
    }
    return {
        registry: createDashboardRegistry(() => ({ metaModules, bodyLoaders, contextModules }) as never),
        loads,
    };
}

/** A dashboard route view: provides the context and renders the beats in PlatformShell. */
const DashboardRoute = defineComponent({
    setup() {
        const route = useRoute();
        const registry = inject<DashboardRegistry>("test-registry")!;
        const entry = registry.findDashboard(String(route.params.slug));
        const ctx = entry ? contextFor(entry.slug, entry.title) : undefined;
        if (ctx) provide(DASHBOARD_KEY, ctx);
        return () =>
            h(PlatformShell, null, {
                default: () =>
                    ctx
                        ? BEATS.map((id, i) =>
                              h("section", { id, class: "essay-beat", style: "min-height:1400px" }, [
                                  h("h2", { style: "margin:0;font-size:28px;line-height:36px" }, LABELS[i]),
                                  h("p", null, `Body of ${LABELS[i]}.`),
                              ]),
                          )
                        : h("p", null, "Not found"),
            });
    },
});
const Plain = (name: string) =>
    defineComponent({
        setup: () => () =>
            h("main", { id: "main-content", style: "min-height:2400px;padding:120px 24px" }, [h("h1", null, name)]),
    });

export interface MountedSite {
    app: App;
    router: Router;
    loads: Map<string, number>;
    unmount: () => void;
}

/** Mount the site at `path` in a viewport `width` px wide. */
export async function mountSite(path: string, width: number, height = 844): Promise<MountedSite> {
    await page.viewport(width, height);
    const tokens = document.createElement("style");
    // The glass-ui tokens the dock and the route frame read (the consumer's root compiles them):
    // the stage rung and the plate inks.
    tokens.textContent = ":root{--z-content:10;--card:#fffdf8;--background:#faf7f0;--foreground:#1b1b1b}";
    document.head.appendChild(tokens);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const { registry, loads } = makeRegistry();
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", name: "gallery", component: Plain("The Connectivity Atlas") },
            { path: "/c/:category", name: "category-home", component: Plain("Subject") },
            { path: "/data/:rest(.*)*", name: "data", component: Plain("Data") },
            { path: "/:slug/:view?", name: "dashboard", component: DashboardRoute },
            { path: "/:pathMatch(.*)*", name: "not-found", component: Plain("Not found") },
        ],
    });
    const app = createApp(
        defineComponent({
            setup: () => () =>
                h(SiteShell, {
                    subjects: [
                        { label: "The funds", to: "/c/funds" },
                        { label: "Connectivity", to: "/c/connectivity" },
                    ],
                }),
        }),
    );
    app.provide("test-registry", registry);
    installDashboardRegistry(app, registry);
    app.use(createPinia());
    app.use(router);
    await router.push(path);
    await router.isReady();
    app.mount(host);
    await settle(500);
    return {
        app,
        router,
        loads,
        unmount: () => {
            app.unmount();
            host.remove();
            tokens.remove();
            window.scrollTo(0, 0);
            // `?at=` and the other view keys live on the real location (useUrlState); drop them so
            // the next mount does not restore this one's section.
            history.replaceState(history.state, "", location.pathname);
        },
    };
}

export const settle = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const dock = () => document.querySelector<HTMLElement>("[data-testid='dock']");
