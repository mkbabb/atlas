// contract/registry-inject.ts — THE DASHBOARD-REGISTRY APP-LEVEL INJECT (L1-INVERSION).
//
// `findDashboard` is INSTANCE-built (it rides the instance's `import.meta.glob`), so core
// chrome cannot statically import it. It inverts through Vue provide/inject — exactly as
// `site.config` inverts through `installAtlasSite` (D1): the instance builds its registry and
// `installDashboardRegistry(app, registry)` at bootstrap; core chrome reads it through
// `useDashboardRegistry()`. Core NEVER imports the instance's `dashboards/registry`.

import { inject, type App, type InjectionKey } from "vue";
import type { DashboardRegistry } from "./registry";

/** The provide/inject token the chrome reads the instance-built registry through. */
export const REGISTRY_KEY: InjectionKey<DashboardRegistry> = Symbol(
    "atlas-dashboard-registry",
);

/** Install the instance-built registry at bootstrap (the instance's `main.ts` calls this). */
export function installDashboardRegistry(app: App, registry: DashboardRegistry): void {
    app.provide(REGISTRY_KEY, registry);
}

/** Read the installed registry, or `undefined` when none is installed (Law 2's
    befitting-silent default — a primitive that may legitimately render outside the
    provider, e.g. a story/preview harness). Never throws. */
export function useOptionalDashboardRegistry(): DashboardRegistry | undefined {
    return inject(REGISTRY_KEY);
}

/** Read the installed registry. THROWS when uninstalled (fail-explicit — no silent default
    masks a missing bootstrap). Callable from a component setup or any app-level inject context
    (a Pinia setup store that already runs in injection context — `useActiveDashboard`). */
export function useDashboardRegistry(): DashboardRegistry {
    const registry = useOptionalDashboardRegistry();
    if (!registry) {
        throw new Error(
            "useDashboardRegistry(): no dashboard registry installed — call " +
                "installDashboardRegistry(app, registry) at bootstrap.",
        );
    }
    return registry;
}
