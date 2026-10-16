// src/vite/preset.compile.spec.ts — the cascade contract on a REAL consumer compile.
// preset.spec.ts tests the two plugins on strings; a string test cannot see what Tailwind inlines.
// Here each fixture is a consumer app built by Vite with `atlasCorePreset()`, against the shipped
// `dist/styles` (run after `npm run build`; a missing dist is a failure). The check that matters is
// on the COMPILED sheet: every top-level item is an atlas layer, or the build refuses.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { atlasCorePreset, topLevelItems } from "./preset";

const HERE = dirname(fileURLToPath(import.meta.url));
const STYLES = resolve(HERE, "../../dist/styles/index.css");

async function compile(fixture: string): Promise<string> {
    if (!existsSync(STYLES)) throw new Error("dist/styles/index.css is absent: run `npm run build` first");
    const out = await build({
        root: resolve(HERE, "fixtures", fixture),
        configFile: false,
        logLevel: "silent",
        plugins: atlasCorePreset(),
        resolve: { alias: [{ find: "@mkbabb/atlas/styles", replacement: STYLES }] },
        build: { write: false, minify: false, cssMinify: false },
    });
    const outputs = (Array.isArray(out) ? out : [out]).flatMap((o) => ("output" in o ? o.output : []));
    return outputs.filter((o) => o.type === "asset" && o.fileName.endsWith(".css")).map((o) => String((o as { source: unknown }).source)).join("\n");
}
const unlayered = (css: string) => topLevelItems(css).filter((i) => i.trim() && !/^\s*(\/\*[\s\S]*?\*\/\s*)*@layer\s+atlas[\s.,;{]/.test(i));

describe("the cascade contract, compiled", () => {
    it("direct root: every top-level item of the compiled sheet is an atlas layer", async () => {
        const css = await compile("direct");
        expect(css).toMatch(/@layer atlas\.recipes/);
        expect(unlayered(css)).toEqual([]);
    }, 900_000);
    it("a second sheet that writes into an atlas layer is left alone", async () => {
        expect(await compile("ownlayer")).toMatch(/\.mine/);
    }, 900_000);
    it("an SFC block that @reference's the root compiles", async () => {
        expect(await compile("reference")).toMatch(/\.mine/);
    }, 900_000);
    it("refuses a root that reaches the atlas styles through a second file", async () => {
        await expect(compile("indirect")).rejects.toThrow(/atlas:layers: .*indirect\/styles\.css compiles @mkbabb\/atlas\/styles but is not an atlas styles root/);
    }, 900_000);
    it("refuses a root written in an SFC <style> block", async () => {
        await expect(compile("sfc")).rejects.toThrow(/atlas:layers: .*App\.vue.* compiles @mkbabb\/atlas\/styles/);
    }, 900_000);
    it("refuses atlas before glass", async () => {
        await expect(compile("swapped")).rejects.toThrow(/atlas:root-order/);
    }, 900_000);
});
