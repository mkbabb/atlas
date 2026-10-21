// The site layer (U/B7 §2.2, §2.3, §2.4). SiteShell mounts the dock once, above the router: it renders
// with no DashboardContext (the homepage, a subject page, `/data/*`, a 404), it is the same node
// before and after every route change, and only the active dashboard's context loads.
import { afterEach, describe, expect, it } from "vitest";
import { dock, mountSite, ROSTER, ROUTES, settle, type MountedSite } from "../../../../tests/browser/mount-site.js";

let site: MountedSite | null = null;
afterEach(() => {
    site?.unmount();
    site = null;
});

describe("the dock is mounted once, above the router (U/B7 §2.2)", () => {
    for (const width of [390, 1440]) {
        it(`at ${width} px it renders on every route and stays the same node across them`, async () => {
            site = await mountSite("/", width);
            const first = dock();
            expect(first).not.toBeNull();
            for (const path of [...ROUTES.slice(1), "/"]) {
                await site.router.push(path);
                await settle(250);
                expect(dock(), path).toBe(first);
                const context = dock()!.dataset.dockContext;
                const isDashboard = ROSTER.some((d) => `/${d.slug}` === path);
                expect(context, path).toBe(isDashboard ? "dashboard" : path === "/" ? "home" : "site");
            }
        });
    }

    it("loads only the visited dashboard's context, once", async () => {
        site = await mountSite("/sci", 1440);
        await site.router.push("/usf");
        await settle(200);
        await site.router.push("/sci");
        await settle(200);
        expect(Object.fromEntries(site.loads)).toEqual({ sci: 1, usf: 1 });
    });

    it("a cold deep link to a dashboard resolves its route layer", async () => {
        site = await mountSite("/sci/trend", 1440);
        expect(dock()!.dataset.dockContext).toBe("dashboard");
        expect(document.querySelectorAll("button[data-testid^='dock-step-']").length).toBe(4);
    });
});
