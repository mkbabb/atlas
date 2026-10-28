// vite.sfc-sheets.mts — SFC styles ship beside their component, not inside `/styles` (U/B7b M3, F15).
//
// Before: `cssCodeSplit: false` folded every SFC <style> block into one aggregate that
// `styles/index.css` imported into `@layer atlas.components`. The consumer's one Tailwind root
// compiled it, so all 300 KB of component CSS sat in the consumer's entry sheet, whatever route
// the reader opened (PLAN §6.2 F15: entry sheet ≤ 430 KB decoded).
//
// Now: `cssCodeSplit: true` emits one sheet per module that owns a <style> block. `generateBundle`
//   · writes `import "./<Module>.css";` at the head of that module's chunk, so the consumer's
//     bundler loads the sheet with the chunk that renders the component (the entry keeps only the
//     sheets of components the entry imports; a lazy route carries its own);
//   · opens each sheet with the consumer's layer order (Tailwind's four, then atlas's) and wraps its
//     rules in `@layer atlas.components`, the layer the aggregate had. A sheet that loads before the
//     consumer root therefore cannot rank atlas below Tailwind, and the cascade is unchanged;
//   · resolves the `@custom-media` seams (`@media (--phone)`) against atlas's own breakpoints.css.
//     The aggregate was resolved by the consumer's root compile; a chunk sheet is not compiled by a
//     root, so atlas resolves its own seams.
import { readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import type { Plugin } from "vite";

export const TAILWIND_LAYER_ORDER = "@layer theme, base, components, utilities;";
export const ATLAS_LAYER_ORDER = "@layer atlas, atlas.tokens, atlas.recipes, atlas.components;";

/** `@custom-media --name (cond);` declarations → Map<name, cond>. */
export function customMediaOf(css: string): Map<string, string> {
    const defs = new Map<string, string>();
    for (const m of css.matchAll(/@custom-media\s+(--[\w-]+)\s+([^;]+);/g)) defs.set(m[1], m[2].trim());
    return defs;
}

/** Replace every `(--name)` in an `@media` / `@container` prelude; an unknown name is an error. */
export function resolveCustomMedia(css: string, defs: Map<string, string>, file = "<css>"): string {
    return css.replace(/@(media|container)([^{;]*)\{/g, (_full, kind: string, prelude: string) => {
        const out = prelude.replace(/\(\s*(--[\w-]+)\s*\)/g, (_ref, name: string) => {
            const cond = defs.get(name);
            if (!cond) throw new Error(`sfc-sheets: ${file} names @custom-media ${name}, which breakpoints.css does not declare`);
            return cond;
        });
        return `@${kind}${out}{`;
    });
}

/** The shipped form of one SFC sheet: the layer order, then its rules in `@layer atlas.components`. */
export function layeredSheet(css: string, defs: Map<string, string>, file = "<css>"): string {
    return `${TAILWIND_LAYER_ORDER}\n${ATLAS_LAYER_ORDER}\n@layer atlas.components {\n${resolveCustomMedia(css, defs, file)}\n}\n`;
}

export function sfcSheets(breakpointsCss: string): Plugin {
    const defs = customMediaOf(readFileSync(breakpointsCss, "utf8"));
    if (!defs.size) throw new Error(`sfc-sheets: ${breakpointsCss} declares no @custom-media`);
    return {
        name: "atlas:sfc-sheets",
        apply: "build",
        // After vite:css-post, which folds each pure-CSS style chunk into its importer (leaving
        // `/* empty css */`) and moves that chunk's `importedCss` onto the importer.
        generateBundle: { order: "post", handler(_options, bundle) {
            for (const output of Object.values(bundle)) {
                if (output.type === "asset" && output.fileName.endsWith(".css")) {
                    output.source = layeredSheet(String(output.source), defs, output.fileName);
                    continue;
                }
                if (output.type !== "chunk") continue;
                const sheets = [...(output.viteMetadata?.importedCss ?? [])];
                if (!sheets.length) continue;
                const from = dirname(output.fileName);
                const lines = sheets.map((sheet) => {
                    const path = relative(from, sheet).split(sep).join("/");
                    return `import "${path.startsWith(".") ? path : `./${path}`}";\n`;
                });
                output.code = lines.join("") + output.code;
            }
        } },
    };
}

export const BREAKPOINTS_CSS = (root: string): string => resolve(root, "src/design/foundations/breakpoints.css");
