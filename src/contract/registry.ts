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
import type { DashboardContext, DashboardEntry, DashboardMeta, DashboardRank } from "./types.js";

/** The instance-supplied discovery globs — the three `import.meta.glob` maps over
    `dashboards/<slug>/{meta,DashboardBody,context}`. The instance constructs these inside the
    deferred thunk `createDashboardRegistry` receives. Discovery is the eager meta glob; the body
    and context globs are lazy import maps, so a route loads only its own body and context
    (U/B7 F10). The lazy maps' keys still name every folder without loading any module. */
export type RegistryGlobs = {
    metaModules: Record<string, { meta: DashboardMeta }>;
    bodyLoaders: Record<string, () => Promise<{ default: Component }>>;
    contextModules: Record<string, () => Promise<Record<string, DashboardContext>>>;
};

/** The assembled registry — the dashboard list (built once, memoized) + the slug lookup. */
export interface DashboardRegistry {
    /** The discovered dashboards in roster order (`rank`; memoized on first access). */
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

/** The roster order of a rank: ranked entries by number, then held, then companions. */
function rankOrder(rank: DashboardRank): [number, number] {
    if (typeof rank === "number") return [0, rank];
    return rank === "held" ? [1, 0] : [2, 0];
}

/** Compare two entries by roster order (`rank`), ties broken by slug so the order is stable. */
export function compareRank(a: DashboardMeta, b: DashboardMeta): number {
    const [ga, ra] = rankOrder(a.rank);
    const [gb, rb] = rankOrder(b.rank);
    return ga - gb || ra - rb || a.slug.localeCompare(b.slug);
}

/**
 * Build the registry algebra over a DEFERRED globs thunk (R1). The thunk is called ONCE on
 * first `getDashboards()` and memoized; the dashboard array is likewise built lazily on first
 * access (the /home TDZ-safe lazy-accessor — deferring the `.map(...).sort(...)` past the
 * cyclic module-init moment, so importing `findDashboard` never forces the build at the
 * registry↔index cycle's init point). Sorted by `rank` (U/B7 O-3).
 */
export function createDashboardRegistry(
    globs: () => RegistryGlobs,
): DashboardRegistry {
    let _globs: RegistryGlobs | null = null;
    const resolvedGlobs = (): RegistryGlobs => (_globs ??= globs());

    let _dashboards: DashboardEntry[] | null = null;

    /** One memoized context loader per folder: the module loads on the first call only. */
    function contextLoader(folder: string): () => Promise<DashboardContext> {
        const { contextModules } = resolvedGlobs();
        const key = Object.keys(contextModules).find((k) => folderOf(k) === folder);
        let pending: Promise<DashboardContext> | null = null;
        return () =>
            (pending ??= (async () => {
                if (!key) throw new Error(`dashboard "${folder}" has no context.ts`);
                const ctx = pickContext(await contextModules[key]());
                if (!ctx) throw new Error(`dashboard "${folder}" context.ts exports no *Context`);
                return ctx;
            })());
    }

    function build(): DashboardEntry[] {
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
                    loadContext: contextLoader(folder),
                };
            })
            .sort(compareRank);
    }

    const getDashboards = (): DashboardEntry[] => (_dashboards ??= build());

    return {
        getDashboards,
        findDashboard: (slug) => getDashboards().find((d) => d.slug === slug),
    };
}
