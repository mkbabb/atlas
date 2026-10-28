// U/B7b X1: `useActiveDashboard.ensureLoaded` shares one load per slug while it is in flight.
//
// The B7b probe (out/b7b-x1/probe-fetch-2.log) found /sci fetching its snapshot once at the landed
// head: its one caller is the body's `onMounted`, and the guard's preload serves that fetch. Two
// callers on one route are still possible (/usf mounts `ensureLoaded` in its body and in the decade
// point), and before this fix two calls made before the first resolved each ran `loadFeed`: two
// fetches and two parses of one snapshot.
import { describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";

const loads: string[] = [];
const waiting: (() => void)[] = [];
/** Let every load in flight resolve. */
const release = () => waiting.splice(0).forEach((r) => r());
vi.mock("../../src/data/loadFeed.js", () => ({
    loadFeed: vi.fn(async (slug: string) => {
        loads.push(slug);
        await new Promise<void>((r) => waiting.push(r));
        return { meta: { slug }, rows: [] };
    }),
}));

const { useActiveDashboard } = await import("../../src/platform/stores/useActiveDashboard");
const { installDashboardRegistry } = await import("../../src/contract/registry-inject");

async function store() {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/:slug", component: defineComponent({ render: () => h("div") }) }],
    });
    const app = createApp({ render: () => null });
    app.use(createPinia());
    app.use(router);
    installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    await router.push("/sci");
    await router.isReady();
    return app.runWithContext(() => useActiveDashboard());
}

describe("useActiveDashboard.ensureLoaded", () => {
    it("runs one load for two calls made while the first is in flight", async () => {
        loads.length = 0;
        const active = await store();
        const a = active.ensureLoaded();
        const b = active.ensureLoaded();
        release();
        await Promise.all([a, b]);
        expect(loads).toEqual(["sci"]);
        expect(active.feed).not.toBeNull();
        expect(active.loading).toBe(false);
    });

    it("a forced reload after the load settles runs a second load", async () => {
        loads.length = 0;
        const active = await store();
        const first = active.ensureLoaded();
        release();
        await first;
        const again = active.reload();
        release();
        await again;
        expect(loads).toEqual(["sci", "sci"]);
    });
});
