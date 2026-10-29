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
    it("loads each dashboard route in fewer files than the default cut, every module it needs, and beyond those only effect-free parts", async () => {
        const [plain, cut] = await Promise.all([chunks([vue()]), chunks(atlasCorePreset())]);
        for (const slug of ["a", "b", "c"]) {
            const before = route(plain, slug);
            const after = route(cut, slug);
            for (const m of before.modules) expect(after.modules.has(m), `${slug}: ${m}`).toBe(true);
            // the small set chunks fold into a wider route set's chunk (MIN_SET_CHUNK)
            for (const m of after.modules) if (!before.modules.has(m)) expect(m, slug).toMatch(/\/lib\/p\d+\.ts$/);
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

    // U/B7c M1 (O-7): a phone dashboard route loaded 34–37 route files before its hero, most of
    // them a module or two of 0–2 KB (an icon, a helper) shared by a different set of routes. On
    // HTTP/1.1's six connections at 150 ms each, the count, not the bytes, set the hero's paint.
    it("folds a small, effect-free set chunk into the smallest chunk of a wider route set", async () => {
        const big = `export const big = [${"1,".repeat(6000)}];`;
        const body = (route: string, names: string[], more = "") =>
            [`/d/${route}/DashboardBody.vue`, `${names.map((n) => `import { ${n} } from "${n}";`).join(" ")} export default [${names}];${more}`] as const;
        const bodies = [
            body("w", ["big"]),
            body("x", ["big", "icon", "fx", "lz"]),
            body("y", ["big", "icon", "sheet"], ' export const later = () => import("fig");'),
            body("z", ["big", "fx", "sheet"]),
        ];
        const shapes = new Map<string, Shape>([
            ["entry", await shape("export const go = () => 1;", true)],
            ...(await Promise.all(bodies.map(async ([id, code]) => [id, await shape(code, true)] as const))),
            ["fig", await shape('import { lz } from "lz"; export default lz;', true)],
            ["big", await shape(big)],
            ["icon", await shape("export const icon = 1;")],
            ["fx", await shape("export const fx = 1; globalThis.fx = fx;", true)],
            ["sheet", await shape('import "./sheet.css"; export const sheet = 1;', true)],
            ["./sheet.css", await shape("export default 1;", true)],
            ["lz", await shape("export const lz = 1;")],
        ]);
        const dyn: Record<string, string[]> = { entry: bodies.map(([id]) => id), "/d/y/DashboardBody.vue": ["fig"] };
        const names = assignChunks(["entry"], (id) => dyn[id] ?? [], shapes, (id) => /\/d\/(\w)\//.exec(id)?.[1]);
        expect(names.get("big")).toBe("route-shared-4");
        // {x, y} holds only `icon`, effect-free: it rides the {w, x, y, z} chunk
        expect(names.get("icon")).toBe("route-shared-4");
        // a module that runs code, or brings a sheet, stays where only its own routes load it
        expect(names.get("fx")).toBe("route-x+z");
        expect(names.get("sheet")).toBe("route-y+z");
        // {x} at once and a lazy figure hosted on y: it can load on x and y, both of which load the
        // {w, x, y, z} chunk at once
        expect(names.get("lz")).toBe("route-shared-4");
        expect(names.get("fig")).not.toBe("route-shared-4");
    });

    // The dock's on-demand menus are lazy imports of the entry, so a helper a menu shares with some
    // routes got a chunk of its own on each of those routes (U/B7c M1: 7 more /sci files once the
    // More menu loaded on demand).
    it("folds a small effect-free chunk into an effect-free chunk that loads late on some of its routes", async () => {
        const body = (route: string, names: string[], more = "") =>
            [`/d/${route}/DashboardBody.vue`, `${names.map((n) => `import { ${n} } from "${n}";`).join(" ")} export default [${names}];${more}`] as const;
        // `wide` loads at once on x and y and late (through the menu) on z; `small` at once on x
        const bodies = [
            body("x", ["wide", "small"]),
            body("y", ["wide"]),
            body("z", ["zed"], ' export const later = () => import("menu");'),
        ];
        const wide = `export const wide = [${"1,".repeat(6000)}];`;
        const shapes = new Map<string, Shape>([
            ["entry", await shape("export const go = () => 1;", true)],
            ...(await Promise.all(bodies.map(async ([id, code]) => [id, await shape(code, true)] as const))),
            ["menu", await shape('import { wide } from "wide"; import { small } from "small"; export default [wide, small];', true)],
            ["wide", await shape(wide)],
            ["small", await shape("export const small = 1;")],
            ["zed", await shape("export const zed = 1;")],
        ]);
        const dyn: Record<string, string[]> = { entry: bodies.map(([id]) => id), "/d/z/DashboardBody.vue": ["menu"] };
        const names = assignChunks(["entry"], (id) => dyn[id] ?? [], shapes, (id) => /\/d\/(\w)\//.exec(id)?.[1]);
        expect(names.get("small")).toBe(names.get("wide"));
    });
});
