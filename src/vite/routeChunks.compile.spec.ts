// src/vite/routeChunks.compile.spec.ts — the route cut on a REAL consumer build (U/B7c C1).
// The fixture (fixtures/routes) is a shell entry, three dashboards in the registry layout and a
// barrel of one-module parts shared unevenly, the shape that gave a dashboard route 79–89 files.
// Each case builds it twice: Rollup's default cut (Vue alone) and `atlasCorePreset()`.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rollup/parseAst";
import { build, type PluginOption } from "vite";
import vue from "@vitejs/plugin-vue";
import { describe, expect, it } from "vitest";
import { atlasCorePreset } from "./preset";
import { assignChunks, dashboardRouteOf, reachOf, shapeOf, type Node, type Shape } from "./routeChunks";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "fixtures", "routes");

interface Chunk {
    fileName: string;
    isEntry: boolean;
    imports: string[];
    moduleIds: string[];
    modules: Record<string, { renderedLength: number }>;
    code: string;
}

async function chunks(plugins: PluginOption[], output: Record<string, unknown> = {}): Promise<Chunk[]> {
    const out = await build({
        root: FIXTURE,
        configFile: false,
        logLevel: "silent",
        plugins,
        build: { write: false, minify: false, rollupOptions: { output } },
    });
    return (Array.isArray(out) ? out : [out]).flatMap((o) => ("output" in o ? o.output : [])).filter((o) => o.type === "chunk") as unknown as Chunk[];
}

/** The files and the code-bearing modules a route loads at once: the entry, its body and context. */
function route(all: Chunk[], slug: string) {
    const holding = (re: RegExp) => all.filter((c) => c.moduleIds.some((id) => re.test(id))).map((c) => c.fileName);
    const start = [
        ...all.filter((c) => c.isEntry).map((c) => c.fileName),
        ...holding(new RegExp(`/dashboards/${slug}/DashboardBody\\.vue$`)),
        ...holding(new RegExp(`/dashboards/${slug}/context\\.ts$`)),
    ];
    const byName = new Map(all.map((c) => [c.fileName, c]));
    const files = new Set<string>();
    const stack = [...start];
    while (stack.length) {
        const f = stack.pop()!;
        if (files.has(f)) continue;
        files.add(f);
        stack.push(...(byName.get(f)?.imports ?? []));
    }
    const modules = new Set(
        [...files].flatMap((f) => Object.entries(byName.get(f)!.modules).filter(([, m]) => m.renderedLength > 0).map(([id]) => id.replace(FIXTURE, ""))),
    );
    return { files, modules };
}

describe("the route cut, compiled", () => {
    it("loads each dashboard route in fewer files, and the same modules, as the default cut", async () => {
        const [plain, cut] = await Promise.all([chunks([vue()]), chunks(atlasCorePreset())]);
        for (const slug of ["a", "b", "c"]) {
            const before = route(plain, slug);
            const after = route(cut, slug);
            expect([...after.modules].sort(), slug).toEqual([...before.modules].sort());
            expect(after.files.size, `${slug}: ${[...before.files].join(", ")} → ${[...after.files].join(", ")}`).toBeLessThan(before.files.size);
        }
    }, 900_000);

    it("keeps route code out of the entry, and the entry imports no route chunk", async () => {
        const entry = (await chunks(atlasCorePreset())).find((c) => c.isEntry)!;
        expect(entry.code).toMatch(/MARK_shell/);
        expect(entry.code).toMatch(/MARK_p0/);
        expect(entry.code).not.toMatch(/MARK_p(?:[1-9]|1[0-2])\b/);
        expect(entry.imports).toEqual([]);
    }, 900_000);

    it("keeps a lazy figure out of the route that imports it", async () => {
        const cut = await chunks(atlasCorePreset());
        // figs/a.ts needs p11, which no route loads at once
        expect([...route(cut, "a").modules].some((m) => /\/lib\/p11\.ts$/.test(m))).toBe(false);
    }, 900_000);

    it("refuses a consumer that sets its own manualChunks", async () => {
        await expect(chunks(atlasCorePreset(), { manualChunks: () => undefined })).rejects.toThrow(
            /atlas:route-chunks: the consumer sets output\.manualChunks/,
        );
    }, 900_000);
});

describe("the route cut's reach", () => {
    const shape = (code: string, sideEffects = false) =>
        shapeOf(parseAst(code) as unknown as { body: Node[] }, code, sideEffects, async (s) => s);

    it("names a dashboard route by the registry layout", () => {
        expect(dashboardRouteOf("/x/dashboards/sci/DashboardBody.vue")).toBe("sci");
        expect(dashboardRouteOf("/x/dashboards/usf-integrity/context.ts")).toBe("usf-integrity");
        expect(dashboardRouteOf("/x/dashboards/sci/lib/derive.ts")).toBeUndefined();
        expect(dashboardRouteOf("/x/dashboards/_shared/context.ts")).toBeUndefined();
    });

    it("does not read a parameter that shadows an import as the import", async () => {
        const s = await shape('import { e } from "dep"; export function f(e) { return e.a; }');
        expect([...s.statements[0].refs]).toEqual([]);
    });

    it("reads a namespace import's member, not the whole namespace", async () => {
        const shapes = new Map<string, Shape>([
            ["main", await shape('import * as ns from "lib"; export const v = ns.used();', true)],
            ["lib", await shape('export { used } from "used"; export { unused } from "unused";')],
            ["used", await shape("export const used = () => 1;")],
            ["unused", await shape("export const unused = () => 2;")],
        ]);
        expect([...reachOf("main", shapes)].sort()).toEqual(["lib", "main", "used"]);
    });

    it("drops a side-effect-free module imported for a type only, keeps one with side effects", async () => {
        const shapes = new Map<string, Shape>([
            ["main", await shape('import "pure"; import "effects"; export const v = 1;', true)],
            ["pure", await shape("export const p = 1;")],
            ["effects", await shape("globalThis.x = 1;", true)],
        ]);
        expect([...reachOf("main", shapes)].sort()).toEqual(["effects", "main"]);
    });

    it("gives a dynamically imported barrel its own facade chunk", async () => {
        const shapes = new Map<string, Shape>([
            ["entry", await shape("export const go = () => 1;", true)],
            ["/d/x/DashboardBody.vue", await shape('import { a } from "barrel"; export default a;')],
            ["barrel", await shape('export { a } from "a"; export { b } from "b";')],
            ["a", await shape("export const a = 1;")],
            ["b", await shape("export const b = 2;")],
        ]);
        const dyn: Record<string, string[]> = { entry: ["/d/x/DashboardBody.vue"], "/d/x/DashboardBody.vue": ["barrel"] };
        const names = assignChunks(["entry"], (id) => dyn[id] ?? [], shapes, () => "x");
        expect(names.get("barrel")).toBe("lazy-barrel");
        expect(names.get("a")).toBe("route-x");
        expect(names.get("entry")).toBe("index");
    });
});
