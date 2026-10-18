// U-F60 clause 4, the atlas half (U RULINGS §I, §K K-2). Every in-the-wild URL parameter is classed:
//
//   · `sel`, `focus`, `drawer` and `<viz>.<dial>` are read on load and never written;
//   · `browse` and `fig` are pushed, as overlays: opening pushes a history entry and closing is Back.
//
// The specs run over a recording window (its History records every push and replace), installed
// before @vueuse/core reads `window`, so a write the ruling forbids is counted, not inferred.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { App } from "vue";

const src = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8");

// ── The recording window ──────────────────────────────────────────────────────────────────────────
type Entry = { state: unknown; url: string };
const writes: Array<{ kind: "push" | "replace"; url: string }> = [];
const listeners = new Map<string, Set<(e: Event) => void>>();
const loc = { pathname: "/", search: "", hash: "", href: "http://atlas.test/" };
const entries: Entry[] = [{ state: null, url: "/" }];
let index = 0;

function setUrl(url: string): void {
    const u = new URL(url, "http://atlas.test");
    loc.pathname = u.pathname;
    loc.search = u.search;
    loc.hash = u.hash;
    loc.href = u.href;
}
const fakeHistory = {
    get state() {
        return entries[index]!.state;
    },
    get length() {
        return entries.length;
    },
    pushState(state: unknown, _t: string, url: string) {
        entries.splice(index + 1);
        entries.push({ state, url });
        index += 1;
        setUrl(url);
        writes.push({ kind: "push", url });
    },
    replaceState(state: unknown, _t: string, url: string) {
        entries[index] = { state, url };
        setUrl(url);
        writes.push({ kind: "replace", url });
    },
    back() {
        if (index === 0) return;
        index -= 1;
        setUrl(entries[index]!.url);
        // A real popstate is a task after the traversal.
        setTimeout(() => {
            for (const l of listeners.get("popstate") ?? []) l(new Event("popstate"));
        }, 0);
    },
};
const fakeWindow = {
    location: loc,
    history: fakeHistory,
    document: { title: "" },
    addEventListener(type: string, l: (e: Event) => void) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(l);
    },
    removeEventListener(type: string, l: (e: Event) => void) {
        listeners.get(type)?.delete(l);
    },
};

/** Reset the window to a fresh load of `url`. */
function load(url: string): void {
    entries.splice(0, entries.length, { state: null, url });
    index = 0;
    setUrl(url);
    writes.length = 0;
}
const settle = () => new Promise<void>((r) => setTimeout(r, 5));

/** Build the view store, let it settle, then start counting. @vueuse's `useUrlSearchParams` replaces
    the entry once as it loads a non-empty query (it re-encodes it). That write on load is the clause-3
    lane's finding (§K K-3), not a dial, selection or focus write, so these specs count from here. */
async function primed(): Promise<void> {
    m.view.useViewParams();
    await settle();
    writes.length = 0;
}

type Mods = {
    vue: typeof import("vue");
    pinia: typeof import("pinia");
    router: typeof import("vue-router");
    registry: typeof import("../../src/contract/registry-inject");
    view: typeof import("../../src/platform/stores/useViewParams");
    selection: typeof import("../../src/platform/stores/useSelection");
    options: typeof import("../../src/charts/composables/useVizOptions");
    stageProv: typeof import("../../src/charts/scene/stage-provenance");
    hub: typeof import("../../src/events/hub");
};
let m: Mods;
const g = globalThis as Record<string, unknown>;
const saved = { window: g.window, document: g.document, history: g.history, location: g.location };

beforeAll(async () => {
    // Vue's DOM runtime reads `document` as it loads, so it (and pinia and the router) load first;
    // @vueuse/core reads `window` as it loads, so the atlas modules load after the window is set.
    const vue = await import("vue");
    const pinia = await import("pinia");
    const router = await import("vue-router");
    g.window = fakeWindow;
    g.document = fakeWindow.document;
    g.history = fakeHistory;
    g.location = loc;
    m = {
        vue,
        pinia,
        router,
        registry: await import("../../src/contract/registry-inject"),
        view: await import("../../src/platform/stores/useViewParams"),
        selection: await import("../../src/platform/stores/useSelection"),
        options: await import("../../src/charts/composables/useVizOptions"),
        stageProv: await import("../../src/charts/scene/stage-provenance"),
        hub: await import("../../src/events/hub"),
    };
});
afterAll(() => {
    Object.assign(g, saved);
});

/** A fresh app context (pinia, router, registry) on a fresh load of `url`. */
function boot(url: string): App {
    load(url);
    const app = m.vue.createApp({ render: () => null });
    app.use(m.pinia.createPinia());
    app.use(
        m.router.createRouter({
            history: m.router.createMemoryHistory(),
            routes: [{ path: "/", component: { render: () => null } }],
        }),
    );
    m.registry.installDashboardRegistry(app, { getDashboards: () => [], findDashboard: () => undefined });
    m.pinia.setActivePinia(app.config.globalProperties.$pinia);
    return app;
}

const MEASURE = {
    kind: "segmented" as const,
    key: "measure",
    label: "Measure",
    default: "count",
    choices: [
        { value: "count", label: "Count" },
        { value: "share", label: "Share" },
    ],
};
const LOG = { kind: "switch" as const, key: "log", label: "Log", default: false };

describe("dials are read on load and never written (U-F60 cl. 4)", () => {
    it("set and reset change the dial without writing the URL", async () => {
        const app = boot("/");
        await app.runWithContext(async () => {
            const opts = m.options.useVizOptions("sci-bandcake", [MEASURE, LOG]);
            opts.set("measure", "share");
            opts.set("log", true);
            await settle();
            expect(opts.values.measure).toBe("share");
            expect(opts.values.log).toBe(true);
            expect(opts.isDefault.value).toBe(false);
            opts.reset();
            await settle();
            expect(opts.values.measure).toBe("count");
            expect(opts.values.log).toBe(false);
        });
        expect(writes).toEqual([]);
        expect(loc.search).toBe("");
    });

    it("two readers of one dial share its value (the popover controller and the host derivation)", async () => {
        const app = boot("/");
        await app.runWithContext(async () => {
            const popover = m.options.useVizOptions("sci-bandcake", [MEASURE]);
            const host = m.options.useVizOptions("sci-bandcake", [MEASURE]);
            popover.set("measure", "share");
            await settle();
            expect(host.values.measure).toBe("share");
        });
        expect(writes).toEqual([]);
    });

    it("a deep link seeds the dial; the reader's return to the default outranks the seed", async () => {
        const app = boot("/?viz.sci-bandcake.measure=share");
        await app.runWithContext(async () => {
            await primed();
            const opts = m.options.useVizOptions("sci-bandcake", [MEASURE]);
            expect(opts.values.measure).toBe("share");
            opts.set("measure", "count");
            await settle();
            expect(opts.values.measure).toBe("count");
        });
        expect(writes).toEqual([]);
        expect(new URLSearchParams(loc.search).get("viz.sci-bandcake.measure")).toBe("share");
    });

    it("the view reset returns every dial to its default without writing a dial key", async () => {
        const app = boot("/");
        await app.runWithContext(async () => {
            const opts = m.options.useVizOptions("usf-fund-ledger", [MEASURE]);
            const view = m.view.useViewParams();
            opts.set("measure", "share");
            view.resetParams();
            await settle();
            expect(opts.values.measure).toBe("count");
            expect(view.registeredKeys.has("viz.usf-fund-ledger.measure")).toBe(false);
        });
        expect(writes.filter((w) => w.url.includes("viz."))).toEqual([]);
    });
});

describe("?sel and ?focus are read on load and never written (U-F60 cl. 4)", () => {
    it("a selection never mirrors to ?sel; a deep-link ?sel seeds the set once", async () => {
        const app = boot("/?sel=state:06");
        await app.runWithContext(async () => {
            await primed();
            const selection = m.selection.useSelection();
            expect([...selection.selectedKeys]).toEqual(["state:06"]);
            selection.select("state:48", { additive: true });
            await settle();
            selection.clearSelection();
            await settle();
        });
        expect(writes).toEqual([]);
        expect(new URLSearchParams(loc.search).get("sel")).toBe("state:06");
    });

    it("the view store has no ?sel or ?focus writer, and ReadoutDrill re-aims in memory only", async () => {
        const app = boot("/?focus=district:370480");
        await app.runWithContext(() => {
            const view = m.view.useViewParams();
            expect("setSel" in view).toBe(false);
            expect("setFocus" in view).toBe(false);
            expect(view.focusKey?.key).toBe("district:370480");
        });
        const drill = src("interaction/ReadoutDrill.vue");
        expect(drill).not.toMatch(/setFocus|useViewParams/);
        expect(src("platform/stores/useSelection.ts")).not.toMatch(/setSel/);
    });
});

describe("browse and fig are pushed; closing is Back (U-F60 cl. 4)", () => {
    it("openFig pushes one entry; closeFig goes Back and the entry below keeps its query", async () => {
        const app = boot("/?year=2025");
        await app.runWithContext(async () => {
            await primed();
            const view = m.view.useViewParams();
            view.openFig("usf-net-retention");
            await settle();
            expect(view.figId).toBe("usf-net-retention");
            expect(writes.map((w) => w.kind)).toEqual(["push", "replace"]);
            expect(entries).toHaveLength(2);
            expect(entries[0]!.url).toBe("/?year=2025");
            view.closeFig("usf-net-retention");
            view.closeFig("usf-net-retention"); // a second close while Back is in flight is inert
            await settle();
            expect(index).toBe(0);
            expect(view.figId).toBeUndefined();
            expect(loc.search).toBe("?year=2025");
        });
    });

    it("a deep-linked fig closes in place (nothing to go Back to)", async () => {
        const app = boot("/?fig=usf-net-retention");
        await app.runWithContext(async () => {
            await primed();
            const view = m.view.useViewParams();
            view.closeFig("usf-net-retention");
            await settle();
            expect(view.figId).toBeUndefined();
            expect(writes.map((w) => w.kind)).toEqual(["replace"]);
            expect(index).toBe(0);
        });
    });

    it("closeFig never closes a sibling's fig", async () => {
        const app = boot("/");
        await app.runWithContext(async () => {
            const view = m.view.useViewParams();
            view.openFig("a");
            await settle();
            expect(view.popParam("fig", "b")).toBe("none");
            view.closeFig("b");
            await settle();
            expect(view.figId).toBe("a");
        });
    });

    it("pushParam opens browse with grain on one pushed entry; popParam is Back", async () => {
        const app = boot("/");
        await app.runWithContext(async () => {
            const view = m.view.useViewParams();
            view.pushParam("browse", "sci-scatter");
            view.setParam("grain", "selection");
            await settle();
            expect(entries).toHaveLength(2);
            expect(new URLSearchParams(entries[1]!.url.split("?")[1]).get("browse")).toBe("sci-scatter");
            expect(new URLSearchParams(entries[1]!.url.split("?")[1]).get("grain")).toBe("selection");
            expect(view.popParam("browse", "sci-scatter")).toBe("back");
            await settle();
            expect(view.param("browse")).toBeUndefined();
            expect(view.param("grain")).toBeUndefined();
        });
    });

    it("useVizPlate and ChapterStage open browse with the push verb and close it with popParam", () => {
        for (const file of ["charts/frame/useVizPlate.ts", "charts/scene/ChapterStage.vue"]) {
            const text = src(file);
            expect(text).not.toMatch(/setParam\("browse"/);
            expect(text).toMatch(/popParam\("browse"/);
        }
        expect(src("charts/frame/useVizPlate.ts")).toMatch(/pushParam\("browse"/);
    });
});

describe("?drawer is honoured on load through the stage's open-at-detent command (U-F60 cl. 4)", () => {
    const scope = { grain: "stage" as const, stageId: "sci-scatter" };

    it("a linked open detent opens the appendix and is announced to a late subscriber", () => {
        const hub = m.hub.createAtlasEventHub();
        const prov = m.stageProv.createStageProvenance({ hub, scope, authored: "shut", linked: "full" });
        expect(prov.detent.value).toBe("full");
        const seen: string[] = [];
        hub.on("provenance-drawer", (e) => seen.push(e.detent), { immediate: true });
        expect(seen).toEqual(["full"]);
    });

    it("no link, `shut` or a foreign value keeps the authored detent and announces nothing", () => {
        for (const linked of [undefined, "shut", "wide"]) {
            const hub = m.hub.createAtlasEventHub();
            const prov = m.stageProv.createStageProvenance({ hub, scope, authored: "peek", linked });
            expect(prov.detent.value).toBe("peek");
            const seen: string[] = [];
            hub.on("provenance-drawer", (e) => seen.push(e.detent), { immediate: true });
            expect(seen).toEqual([]);
        }
    });

    it("the command moves the detent and announces each move", () => {
        const hub = m.hub.createAtlasEventHub();
        const prov = m.stageProv.createStageProvenance({ hub, scope, authored: undefined, linked: undefined });
        const seen: string[] = [];
        hub.on("provenance-drawer", (e) => seen.push(e.detent));
        prov.openProvenance("peek");
        prov.openProvenance("shut");
        expect(prov.detent.value).toBe("shut");
        expect(seen).toEqual(["peek", "shut"]);
    });

    it("ChapterStage reads ?drawer once, provides the command, and never registers or watches drawer", () => {
        const stage = src("charts/scene/ChapterStage.vue");
        expect(stage).toMatch(/createStageProvenance\(/);
        expect(stage).toMatch(/provide\(STAGE_COMMANDS_KEY/);
        expect(stage).not.toMatch(/registerKeys\(\[[^\]]*"drawer"/);
        expect(stage).not.toMatch(/watch\(\s*\(\) => view\.param\("drawer"\)/);
    });
});
