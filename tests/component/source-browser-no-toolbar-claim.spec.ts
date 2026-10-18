// U RULINGS §K H-A1′ (B5 atlas-check seat census): no atlas run claims `role="toolbar"` while it
// holds a container seat. A toolbar promises one Tab stop and arrow keys across its controls
// (WAI-ARIA toolbar pattern); a row whose seats are containers (a single-select ToggleGroup with its
// own roving tab stop, and a group of export buttons) keeps a plain Tab order instead, so it is a
// labelled group, not a toolbar (the letter's third shape, applied at atlas's own consumer).
//
// The census (three engines, 390 and 1440) found the source-data browser's control row claiming
// `role="toolbar"` over two container seats, with 5 Tab stops and no arrow handling of its own.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { createPinia } from "pinia";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import { REGISTRY_KEY } from "../../src/contract/registry-inject";
import { createAtlasEventHub } from "../../src/events";
import { createBrowserFromScope } from "../../src/filter/engine/browser-from-scope";
import SourceDataBrowser from "../../src/filter/ui/SourceDataBrowser.vue";
import type { DataScope } from "../../src/platform/provenance/data-scope";

const SRC = join(__dirname, "../../src");

interface Row {
    lea: string;
    year: number;
    cost: number;
}

const scope: DataScope<Row, string> = {
    source: { id: "sci-districts", kind: "exact", label: "SCI district feed", snapshot: "data/sci.snapshot.json" },
    encoding: { x: "lea", y: "cost" },
    grainNoun: "districts",
    dataset: () => [
        { lea: "010", year: 2023, cost: 4 },
        { lea: "020", year: 2024, cost: 6 },
    ],
    filterPredicate: () => ({ op: "any" }),
    selectionKey: (row) => `district:${row.lea}`,
    browseKey: (row) => `${row.lea}-${row.year}`,
    routeUniverse: () => "sci-lea",
    grains: [{ scope: "state", by: () => "NC", create: (_key, representative) => representative }],
    columns: [
        { key: "lea", label: "District", value: (row) => row.lea },
        { key: "cost", label: "Cost", value: (row) => row.cost, measure: { kind: "extensive" } },
    ],
};

async function renderBrowser(): Promise<string> {
    const binding = createBrowserFromScope(scope, () => "2026-10-18");
    const app = createSSRApp({
        render: () =>
            h(SourceDataBrowser as never, {
                ...binding,
                eventHub: createAtlasEventHub(),
                eventScope: { grain: "viz", vizId: "sci-scatter" },
                vizId: "sci-scatter",
            }),
    });
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/:slug?", component: { render: () => null } }] });
    app.use(createPinia());
    app.use(router);
    app.provide(REGISTRY_KEY, { findDashboard: () => undefined } as never);
    await router.push("/sci");
    await router.isReady();
    return renderToString(app);
}

describe("H-A1′ · no atlas toolbar claim over container seats", () => {
    it("the source-data browser's control row is a labelled group, not a toolbar", async () => {
        const html = await renderBrowser();
        // The row and its two container seats rendered (the grain chooser and the export group).
        expect(html).toContain("source-browser__toolbar");
        expect(html).toContain("source-browser__exports");
        expect(html).not.toMatch(/role="toolbar"/);
        expect(html).toMatch(/class="source-browser__toolbar"[^>]*role="group"[^>]*aria-label="Source data controls"/);
    });

    it("no atlas source authors role=toolbar (no atlas run roves its seats as one stop)", () => {
        const walk = (dir: string): string[] =>
            readdirSync(dir).flatMap((name) => {
                const path = join(dir, name);
                return statSync(path).isDirectory() ? walk(path) : [path];
            });
        const offenders = walk(SRC)
            .filter((p) => /\.(vue|ts)$/.test(p) && !/\.spec\.ts$/.test(p))
            .filter((p) =>
                /role\s*[=:]\s*["']toolbar["']/.test(
                    readFileSync(p, "utf8").replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, ""),
                ),
            );
        expect(offenders).toEqual([]);
    });
});
