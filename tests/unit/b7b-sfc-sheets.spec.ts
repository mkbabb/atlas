// U/B7b M3 · F15 — SFC styles ship beside their component, not inside `/styles`.
//
// The aggregate (`dist/styles/components.css`, imported by `styles/index.css` into
// `@layer atlas.components`) put every atlas component's CSS into the consumer's entry sheet:
// 135 KB decoded of sci's 468,715 B entry at the B7b PL head, against the 430 KB budget (PLAN §6.1).
// Each SFC sheet now sits beside its module, the module imports it, and the sheet carries its own
// layer order and resolved @custom-media. Reads the built dist (`npm run build` first).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
    ATLAS_LAYER_ORDER,
    TAILWIND_LAYER_ORDER,
    customMediaOf,
    layeredSheet,
    resolveCustomMedia,
} from "../../vite.sfc-sheets.mts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = resolve(ROOT, "dist");

function walk(dir: string, ext: RegExp, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        if (name === "node_modules") continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, ext, out);
        else if (ext.test(name)) out.push(p);
    }
    return out;
}

describe("the sheet transform", () => {
    const defs = customMediaOf("@custom-media --phone (max-width: 767.98px);\n@custom-media --touch (pointer: coarse);");
    it("resolves @custom-media in @media and @container preludes", () => {
        expect(resolveCustomMedia("@media (--phone){.a{color:red}}", defs)).toBe("@media (max-width: 767.98px){.a{color:red}}");
        expect(resolveCustomMedia("@media (--touch) and (--phone) {.a{}}", defs)).toBe("@media (pointer: coarse) and (max-width: 767.98px) {.a{}}");
        expect(resolveCustomMedia("@container card (--phone){.a{}}", defs)).toBe("@container card (max-width: 767.98px){.a{}}");
    });
    it("refuses a seam breakpoints.css does not declare", () => {
        expect(() => resolveCustomMedia("@media (--nope){.a{}}", defs, "X.css")).toThrow(/--nope/);
    });
    it("leads with the consumer's layer order and wraps the rules in atlas.components", () => {
        const out = layeredSheet(".a[data-v-1]{color:red}", defs);
        expect(out.startsWith(`${TAILWIND_LAYER_ORDER}\n${ATLAS_LAYER_ORDER}\n@layer atlas.components {`)).toBe(true);
        expect(out).toContain(".a[data-v-1]{color:red}");
    });
});

describe("the built dist ships SFC sheets beside their modules (F15)", () => {
    it("has no SFC aggregate in /styles", () => {
        expect(existsSync(join(DIST, "styles/index.css")), "run `npm run build` first").toBe(true);
        expect(existsSync(join(DIST, "styles/components.css"))).toBe(false);
        expect(readFileSync(join(DIST, "styles/index.css"), "utf8")).not.toMatch(/components\.css/);
        expect(existsSync(join(DIST, "assets/core.css"))).toBe(false);
    });

    const sheets = () => walk(DIST, /\.css$/).filter((p) => !p.startsWith(join(DIST, "styles") + "/"));
    const modules = () => walk(DIST, /\.js$/);

    it("ships the scoped component rules as per-module sheets, each layered and resolved", () => {
        const all = sheets();
        expect(all.length).toBeGreaterThan(60);
        let scoped = 0;
        for (const p of all) {
            const css = readFileSync(p, "utf8");
            expect(css.startsWith(`${TAILWIND_LAYER_ORDER}\n${ATLAS_LAYER_ORDER}\n@layer atlas.components {`), relative(DIST, p)).toBe(true);
            expect(css, relative(DIST, p)).not.toMatch(/@(media|container)[^{;]*\(--[\w-]+\)/);
            scoped += (css.match(/\[data-v-[0-9a-f]{8}\]/g) ?? []).length;
        }
        expect(scoped).toBeGreaterThan(500);
    });

    it("every sheet is imported by a module, and every import names a shipped sheet", () => {
        const shipped = new Set(sheets());
        const imported = new Set<string>();
        for (const m of modules()) {
            const code = readFileSync(m, "utf8");
            for (const [, spec] of code.matchAll(/^import "(\.[^"]+\.css)";$/gm)) {
                const target = resolve(dirname(m), spec);
                expect(shipped.has(target), `${relative(DIST, m)} imports ${spec}`).toBe(true);
                imported.add(target);
            }
        }
        expect([...shipped].filter((s) => !imported.has(s)).map((s) => relative(DIST, s))).toEqual([]);
    });

    it("the dock's styles travel with the dock module", () => {
        const dock = modules().find((p) => /platform\/chrome\/dock\/Dock\.vue[^/]*\.js$/.test(p) && /import "\.[^"]+\.css";/.test(readFileSync(p, "utf8")));
        expect(dock, "a Dock.vue module that imports its sheet").toBeTruthy();
    });
});
