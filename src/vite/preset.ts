// src/vite/preset.ts — @atlas/core/vite, THE PUBLISHABLE BUILD PRESET (L5-CORE-BOUNDARY §4.F).
//
// The build-config half of the `@atlas/core` boundary: the core-owned plugins + the shared-dep
// vendor cuts every instance needs. The instance `vite.config.ts` COMPOSES this preset and layers
// its own instance-only plugins on top (`apiSnapshotPreview` reads `./public/data`; `criticalCssPlugin`;
// the geo/vendor `manualChunks`; the `dashboard-<slug>` chunkFileNames that scan `/src/dashboards`)
// — those stay instance-side. The preset carries only what the core owns: Vue, Tailwind, and
// shared-dependency vendor cuts.

import type { Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// THE CASCADE CONTRACT, KEPT IN THE CONSUMER'S COMPILE (U · D5A-W1). atlas ships Tailwind source
// (`@mkbabb/atlas/styles`) that the shell's ONE root compiles after tailwindcss and glass-ui:
//
//     @import "tailwindcss";
//     @import "@mkbabb/glass-ui/styles";
//     @import "@mkbabb/atlas/styles";
//
// glass-ui's sheet carries unlayered rules (its body type, its component rules), and an unlayered
// rule outranks every layer, so glass would beat the atlas recipes it is meant to sit under. Two
// plugins keep the contract:
//   · `atlas:root-order` (pre, BEFORE @tailwindcss/vite) reads the root's SOURCE. It throws unless
//     the three imports appear in that order, and it records the root's module id. Misordering
//     otherwise compiles silently to different bytes.
//   · `atlas:layers` (normal, after @tailwindcss/vite and vite:css) wraps, in that recorded root
//     only, every top-level item that is not an `@layer atlas…` item in `@layer atlas.recipes`,
//     and leads the sheet with the atlas order statement. The root is known by id, never by text,
//     so a second consumer sheet that names an atlas layer is left alone.
export const ATLAS_LAYER_ORDER = "@layer atlas, atlas.tokens, atlas.recipes, atlas.components;";
export const ROOT_IMPORTS = ["tailwindcss", "@mkbabb/glass-ui/styles", "@mkbabb/atlas/styles"] as const;

/** The `@import` specifiers of a CSS source, in order, comments ignored. */
export function importSpecifiers(css: string): string[] {
    const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
    return [...text.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g)].map((m) => m[1]);
}

/**
 * Whether `css` is an atlas styles root (it imports `@mkbabb/atlas/styles`). Throws when such a
 * root does not import tailwindcss, then glass-ui's styles, then atlas's styles, in that order.
 */
export function checkRootOrder(css: string, id = "<css>"): boolean {
    const specs = importSpecifiers(css);
    if (!specs.includes(ROOT_IMPORTS[2])) return false;
    const at = ROOT_IMPORTS.map((s) => specs.indexOf(s));
    if (at.some((i) => i < 0) || !(at[0] < at[1] && at[1] < at[2]))
        throw new Error(
            `atlas:root-order: ${id} imports ${specs
                .filter((s) => (ROOT_IMPORTS as readonly string[]).includes(s))
                .join(" → ")}; an atlas styles root imports ${ROOT_IMPORTS.join(" → ")}, in that order`,
        );
    return true;
}

/** Split compiled CSS into its top-level items (statements and blocks), respecting comments and strings. */
export function topLevelItems(css: string): string[] {
    const items: string[] = [];
    let depth = 0;
    let start = 0;
    let i = 0;
    while (i < css.length) {
        const c = css[i];
        if (c === "\\") {
            i += 2; // an escape outside a string (`.\\[\\&_svg\\:not\\(…`)
            continue;
        }
        if (c === "/" && css[i + 1] === "*") {
            const e = css.indexOf("*/", i + 2);
            i = e < 0 ? css.length : e + 2;
            continue;
        }
        if (c === '"' || c === "'") {
            i++;
            while (i < css.length && css[i] !== c) i += css[i] === "\\" ? 2 : 1;
            i++;
            continue;
        }
        if (c === "{") depth++;
        else if (c === "}") {
            depth--;
            if (depth === 0) {
                items.push(css.slice(start, i + 1));
                start = i + 1;
            }
        } else if (c === ";" && depth === 0) {
            items.push(css.slice(start, i + 1));
            start = i + 1;
        }
        i++;
    }
    if (depth !== 0) throw new Error(`atlas:layers: unbalanced braces in compiled CSS (depth ${depth})`);
    const tail = css.slice(start);
    if (tail.trim()) items.push(tail);
    return items;
}

/** Lead with the atlas order statement; wrap every run of non-atlas top-level items in atlas.recipes. */
export function wrapInAtlasLayers(css: string): string {
    const out: string[] = [ATLAS_LAYER_ORDER];
    let run: string[] = [];
    const flush = () => {
        if (run.join("").trim()) out.push(`@layer atlas.recipes {${run.join("")}\n}`);
        run = [];
    };
    for (const item of topLevelItems(css)) {
        const head = item.replace(/^(\s|\/\*[\s\S]*?\*\/)*/, "");
        if (/^@layer\s+atlas[\s.,{;]/.test(head) || /^@(charset|import)\b/.test(head)) {
            flush();
            out.push(item);
        } else run.push(item);
    }
    flush();
    return out.join("\n");
}

// A CSS request as Vite sees it: a `.css` file, or an SFC `<style>` block (`X.vue?vue&type=style&…&lang.css`).
const isCss = (id: string) => /\.css(?:$|\?)/.test(id);
const moduleFile = (id: string) => id.split("?", 1)[0];

/**
 * Whether COMPILED css carries the atlas styles sheet. The sheet declares `--atlas-styles` in
 * `@layer atlas` (styles/index.css); that declaration survives the consumer's compile wherever the
 * sheet was inlined from. The layer order statement does not (Tailwind rewrites it), and an
 * `@layer atlas.*` block proves nothing: a consumer sheet may write into an atlas layer.
 */
export function carriesAtlasStyles(compiled: string): boolean {
    return /(?<![\w-])--atlas-styles\s*:/.test(compiled);
}

/** The two plugins of the cascade contract. List them BEFORE `tailwindcss()` (see atlasCorePreset). */
export function atlasLayers(): Plugin[] {
    const roots = new Set<string>();
    return [
        {
            name: "atlas:root-order",
            enforce: "pre",
            transform(code, id) {
                if (!isCss(id)) return undefined;
                // Re-decided on every transform: an HMR edit that turns a root into an indirect sheet
                // un-records it, so atlas:layers refuses it on the dev path exactly as the build does.
                if (checkRootOrder(code, id)) roots.add(moduleFile(id));
                else roots.delete(moduleFile(id));
                return undefined;
            },
        },
        {
            name: "atlas:layers",
            transform(code, id) {
                if (!isCss(id)) return undefined;
                const file = moduleFile(id);
                // A root is a `.css` FILE whose own source passed atlas:root-order.
                if (file.endsWith(".css") && roots.has(file))
                    return { code: wrapInAtlasLayers(code), map: null };
                // THE COMPILED-OUTPUT CHECK (CX-1). Tailwind inlines nested `@import`s itself, so a
                // sheet can compile the atlas styles without its own source naming them (one level of
                // CSS indirection, or an SFC `<style>` block). Such a sheet is never wrapped, glass-ui's
                // unlayered rules outrank every atlas layer, and the build is green. Refuse it here.
                if (carriesAtlasStyles(code))
                    throw new Error(
                        `atlas:layers: ${id} compiles @mkbabb/atlas/styles but is not an atlas styles root. ` +
                            `Import ${ROOT_IMPORTS.join(" → ")} directly, in that order, in ONE .css file`,
                    );
                return undefined;
            },
        },
    ];
}

/** The shared-dep vendor cut every instance inherits: glass-ui / keyframes / echarts each ride their
    own named async chunk. Returns `undefined` for everything else so the instance can layer its own
    geo/vendor cuts on top (the instance `manualChunks` calls this first, then adds its own rules). */
export function coreManualChunks(id: string): string | undefined {
    if (id.includes("@mkbabb/glass-ui")) return "glass-ui";
    if (id.includes("echarts") || id.includes("zrender")) return "echarts";
    return undefined;
}

/** The `@atlas/core` build preset — the core-owned Vue, cascade-contract and Tailwind plugins. The
    instance composes
    `[...atlasCorePreset(), ...instancePlugins]`
    and folds `coreManualChunks` into its own `manualChunks` rollup output. */
export function atlasCorePreset() {
    // atlas:root-order must read the root's source before Tailwind compiles it.
    return [vue(), ...atlasLayers(), tailwindcss()];
}
