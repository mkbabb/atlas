// contract/registry.ts — THE PURE DASHBOARD-REGISTRY ALGEBRA (the L1-INVERSION keystone).
//
// The core ships the registry ALGEBRA; the INSTANCE supplies its globs. The discovery
// macro `import.meta.glob("./*/meta.ts")` resolves RELATIVE to the file it is written in, so
// it CANNOT live here (it would scan core's dir, not the instance's `dashboards/*/`). The
// instance therefore calls `createDashboardRegistry(() => globs)` from its own
// `dashboards/registry.ts`, passing the globs as a DEFERRED THUNK; this module owns only the
// pure `.map(...).sort(...)` assembly + `findDashboard`.
//
// R1 — THE DEFERRED THUNK (preserves the J-CLOSE esbuild-collection fix). The globs arrive as
// `() => RegistryGlobs`, NOT eager maps. The factory calls the thunk ONCE on first
// `getDashboards()` and memoizes the result. `import.meta.glob` is a Vite-only BUILD MACRO;
// keeping the macro inside the instance's thunk (never at module-eval) means importing the
// registry under a non-Vite transformer (esbuild — the Playwright test COLLECTION) leaves the
// macro un-replaced but UN-CALLED, so it never throws and aborts the e2e collection. Passing
// EAGER maps would re-collect at module-eval and regress that fix — the thunk is non-negotiable.

import type { Component } from "vue";
import type { DashboardContext, DashboardEntry, DashboardMeta } from "./types";

/** The instance-supplied discovery globs — the three `import.meta.glob` maps over
    `dashboards/<slug>/{meta,dashboard,context}.ts`. The instance constructs these inside the
    deferred thunk `createDashboardRegistry` receives (the eager half discovers the cheap
    meta/context modules; the body half stays a lazy import map so each dashboard code-splits). */
export type RegistryGlobs = {
    metaModules: Record<string, { meta: DashboardMeta }>;
    bodyLoaders: Record<string, () => Promise<{ default: Component }>>;
    contextModules: Record<string, Record<string, DashboardContext>>;
};

/** The assembled registry — the dashboard list (built once, memoized) + the slug lookup. */
export interface DashboardRegistry {
    /** The discovered dashboards, newest-first (memoized on first access). */
    getDashboards: () => DashboardEntry[];
    /** The registry entry for a slug, or undefined when no dashboard owns it. */
    findDashboard: (slug: string) => DashboardEntry | undefined;
}

const folderOf = (path: string): string => path.match(/\.\/([^/]+)\//)?.[1] ?? path;

/** The DashboardContext a context.ts module exports (its first `*Context` value). */
function pickContext(mod: Record<string, unknown>): DashboardContext | undefined {
    for (const [name, value] of Object.entries(mod)) {
        if (name.endsWith("Context") && value != null) return value as DashboardContext;
    }
    return undefined;
}

/**
 * Build the registry algebra over a DEFERRED globs thunk (R1). The thunk is called ONCE on
 * first `getDashboards()` and memoized; the dashboard array is likewise built lazily on first
 * access (the /home TDZ-safe lazy-accessor — deferring the `.map(...).sort(...)` past the
 * cyclic module-init moment, so importing `findDashboard` never forces the build at the
 * registry↔index cycle's init point). Newest-first; dashboards without `updated` sort last.
 */
export function createDashboardRegistry(
    globs: () => RegistryGlobs,
): DashboardRegistry {
    let _globs: RegistryGlobs | null = null;
    const resolvedGlobs = (): RegistryGlobs => (_globs ??= globs());

    let _dashboards: DashboardEntry[] | null = null;

    function buildContextByFolder(): Record<string, DashboardContext> {
        const byFolder: Record<string, DashboardContext> = {};
        for (const [path, mod] of Object.entries(resolvedGlobs().contextModules)) {
            const ctx = pickContext(mod);
            if (ctx) byFolder[folderOf(path)] = ctx;
        }
        return byFolder;
    }

    function build(): DashboardEntry[] {
        const contextByFolder = buildContextByFolder();
        const { metaModules, bodyLoaders } = resolvedGlobs();
        return Object.entries(metaModules)
            .map(([path, mod]) => {
                const folder = folderOf(path);
                const loaderKey = Object.keys(bodyLoaders).find(
                    (k) => folderOf(k) === folder,
                );
                return {
                    ...mod.meta,
                    load: () =>
                        bodyLoaders[loaderKey as string]().then((m) => m.default),
                    context: contextByFolder[folder],
                };
            })
            // newest first; dashboards without `updated` sort last
            .sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));
    }

    const getDashboards = (): DashboardEntry[] => (_dashboards ??= build());

    return {
        getDashboards,
        findDashboard: (slug) => getDashboards().find((d) => d.slug === slug),
    };
}
