// The route-cut fixture: a shell entry, three dashboards (body + context each, the registry
// layout) and a barrel library of small modules shared unevenly between them.
import { shell } from "./lib";

const routes: Record<string, () => Promise<unknown>> = {
    a: () => import("./dashboards/a/DashboardBody.vue"),
    actx: () => import("./dashboards/a/context.ts"),
    b: () => import("./dashboards/b/DashboardBody.vue"),
    bctx: () => import("./dashboards/b/context.ts"),
    c: () => import("./dashboards/c/DashboardBody.vue"),
    cctx: () => import("./dashboards/c/context.ts"),
};
(globalThis as { atlasFixture?: unknown }).atlasFixture = { shell: shell(), routes };
