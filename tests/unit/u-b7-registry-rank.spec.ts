// U/B7 §2.3: the registry orders by `rank` (O-3; the `updated` sort is gone) and loads each
// dashboard's context lazily (F10): discovery reads the meta glob only, and a route's context module
// loads on its first `loadContext()` call, once.
import { describe, expect, it, vi } from "vitest";
import { createDashboardRegistry, type DashboardMeta, type RegistryGlobs } from "../../src/contract/index.js";

const meta = (slug: string, rank: DashboardMeta["rank"], updated: string): { meta: DashboardMeta } => ({
    meta: { slug, title: slug, rank, updated },
});

function globs() {
    const loads: Record<string, ReturnType<typeof vi.fn>> = {};
    const contextModules: RegistryGlobs["contextModules"] = {};
    const metaModules: RegistryGlobs["metaModules"] = {
        // `updated` runs against `rank` on purpose: a newest-first sort would put vft first.
        "./vft/meta.ts": meta("vft", "companion", "2026-10-19"),
        "./usfi/meta.ts": meta("usfi", "held", "2026-10-18"),
        "./usf/meta.ts": meta("usf", 2, "2026-01-01"),
        "./sci/meta.ts": meta("sci", 1, "2025-01-01"),
        "./bead/meta.ts": meta("bead", 5, "2026-07-01"),
    };
    const bodyLoaders: RegistryGlobs["bodyLoaders"] = {};
    for (const path of Object.keys(metaModules)) {
        const folder = path.split("/")[1];
        bodyLoaders[`./${folder}/DashboardBody.vue`] = async () => ({ default: { name: folder } });
        loads[folder] = vi.fn(async () => ({ [`${folder}Context`]: { id: folder, title: folder, nav: [] } }));
        contextModules[`./${folder}/context.ts`] = loads[folder] as never;
    }
    return { globs: { metaModules, bodyLoaders, contextModules }, loads };
}

describe("the dashboard registry (U/B7 §2.3)", () => {
    it("orders entries by rank: ranked by number, then held, then companions", () => {
        const { globs: g } = globs();
        const registry = createDashboardRegistry(() => g);
        expect(registry.getDashboards().map((d) => d.slug)).toEqual(["sci", "usf", "bead", "usfi", "vft"]);
    });

    it("loads no context module during discovery", () => {
        const { globs: g, loads } = globs();
        const registry = createDashboardRegistry(() => g);
        expect(registry.getDashboards()).toHaveLength(5);
        expect(registry.findDashboard("sci")?.title).toBe("sci");
        for (const load of Object.values(loads)) expect(load).not.toHaveBeenCalled();
    });

    it("loads one route's context on demand, once, and no other route's", async () => {
        const { globs: g, loads } = globs();
        const registry = createDashboardRegistry(() => g);
        const sci = registry.findDashboard("sci")!;
        const [a, b] = await Promise.all([sci.loadContext(), sci.loadContext()]);
        expect(a).toBe(b);
        expect(a.id).toBe("sci");
        expect(await sci.loadContext()).toBe(a);
        expect(loads.sci).toHaveBeenCalledTimes(1);
        expect(loads.usf).not.toHaveBeenCalled();
    });
});
