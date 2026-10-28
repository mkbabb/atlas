// U/B7b X1 · U-F60 clause 4 at the atlas root. Every URL write goes through the view store's one bag
// (`useViewParams` over `useUrlState`). The sci writer walk (`u-b4-url-params`) reads atlas's built
// modules and fails on a raw router or History write that carries a query; this is the same walk over
// atlas's own source, so the breach fails here first. Before B7b, `DataViewerRoute.vue` wrote
// `router.replace({ query })` at two sites.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return walk(path);
        return /\.(ts|vue)$/.test(name) && !/\.(spec|d)\.ts$/.test(name) ? [path] : [];
    });
}

/** Blank line and block comments, keeping line numbers; strings are kept as written. */
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:])\/\/.*$/gm, "$1");

function argsAt(src: string, open: number): string {
    let depth = 0;
    for (let i = open; i < src.length; i++) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")" && --depth === 0) return src.slice(open + 1, i);
    }
    return src.slice(open + 1);
}

/** The bag's sink and the push verb's entry copy: the two lawful History writes. */
const HOMES = new Set(["platform/composables/useUrlState.ts", "platform/stores/useViewParams.ts"]);

const breaches = walk(SRC).flatMap((path) => {
    const file = relative(SRC, path);
    const text = strip(readFileSync(path, "utf8"));
    const out: string[] = [];
    for (const m of text.matchAll(/\b(history\.(?:replaceState|pushState)|router\.(?:push|replace))\s*\(/g)) {
        const args = argsAt(text, m.index + m[0].length - 1);
        const line = text.slice(0, m.index).split("\n").length;
        if (m[1].startsWith("history.") ? !HOMES.has(file) : /\bquery\b|\?/.test(args))
            out.push(`${file}:${line} ${m[1]}(${args.trim().slice(0, 40)})`);
    }
    return out;
});

describe("U-F60 cl. 4: atlas writes the query only through the view store's bag", () => {
    it("finds no raw router or History write that carries a query", () => {
        expect(breaches).toEqual([]);
    });
});
