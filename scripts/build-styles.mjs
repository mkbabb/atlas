// scripts/build-styles.mjs — THE @mkbabb/atlas CSS AGGREGATE (COPIED-and-adapted from
// packages/atlas-core at O-B0; the ROOT hop is the one adaptation — this repo IS the library).
//
// THE CSS RULING (E2.c, verbatim): ONE compiled aggregate at ./styles (dist/style.css), built
// through the Tailwind pipeline, with the ENTIRE output inside `@layer atlas` (sub-layered
// atlas.tokens / atlas.recipes / atlas.components) so UNLAYERED consumer CSS ALWAYS wins (the
// re-skin guarantee) — var() references PRESERVED (no oklch/hex baking where a token exists),
// injection-by-JS REJECTED (one <link>-able stylesheet). The per-component SFC <style> chunks
// merge into the aggregate — the JS lib build collapses them into ONE `dist/assets/core.css`
// (cssCodeSplit:false); this pass folds that into `@layer atlas.components`.
//
// Pipeline: (1) Vite-compile styles/index.css → the tokens+recipes+base body; (2) Vite-compile
// styles/tokens.css → the token-only body (the atlas.tokens sub-layer of the aggregate); (3) read
// the SFC aggregate from the JS build (dist/assets/core.css, absent while the scaffold has no SFC);
// (4) wrap each body in its named cascade sub-layer and emit dist/style.css.
import { build } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { readFile, writeFile, rm, mkdir, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIST = resolve(ROOT, "dist");
const TMP = resolve(ROOT, ".vite-cache/styles-tmp");

/** Compile one CSS root through the Tailwind pipeline; return the emitted CSS body. A tiny JS stub
 *  imports the css so Vite lib-mode emits it. */
async function compileCss(name, cssEntry) {
    const stub = resolve(TMP, `${name}.entry.js`);
    await mkdir(TMP, { recursive: true });
    await writeFile(stub, `import ${JSON.stringify(cssEntry)};\n`);
    const out = resolve(TMP, name);
    await build({
        root: ROOT,
        configFile: false,
        cacheDir: resolve(ROOT, ".vite-cache/styles"),
        logLevel: "warn",
        plugins: [tailwindcss()],
        css: { transformer: "postcss" },
        build: {
            outDir: out,
            emptyOutDir: true,
            cssCodeSplit: false,
            minify: false,
            lib: { entry: stub, formats: ["es"], fileName: name },
            rollupOptions: { output: { assetFileNames: "[name][extname]" } },
        },
    });
    const files = await readdir(out);
    const css = files.find((f) => f.endsWith(".css"));
    if (!css) throw new Error(`build-styles: no CSS emitted for ${name} (files: ${files.join(",")})`);
    return await readFile(resolve(out, css), "utf8");
}

const header =
    "/* @mkbabb/atlas — the compiled platform aggregate. ENTIRE output is inside @layer atlas so\n" +
    "   unlayered consumer CSS always wins (the re-skin guarantee). var() references are preserved:\n" +
    "   swap the glass-ui peer stylesheet and this sheet re-resolves. */\n";

const tokensBody = await compileCss("tokens", resolve(ROOT, "styles/tokens.css"));
const aggBody = await compileCss("index", resolve(ROOT, "styles/index.css"));
let sfcBody = "";
try {
    sfcBody = await readFile(resolve(DIST, "assets/core.css"), "utf8");
} catch {
    console.warn("build-styles: dist/assets/core.css absent — no SFC layer yet (scaffold).");
}

await mkdir(DIST, { recursive: true });

// dist/style.css — the batteries-included aggregate. Sub-layer order declared up front so the
// cascade is deterministic regardless of import order: tokens < recipes < components.
const styleCss =
    header +
    "@layer atlas, atlas.tokens, atlas.recipes, atlas.components;\n" +
    `@layer atlas.tokens {\n${tokensBody}\n}\n` +
    `@layer atlas.recipes {\n${aggBody}\n}\n` +
    (sfcBody ? `@layer atlas.components {\n${sfcBody}\n}\n` : "");
await writeFile(resolve(DIST, "style.css"), styleCss);

// dist/breakpoints.css — the RAW `@custom-media` author-surface (the `./styles/breakpoints` export;
// v1.0.1 · O-B10). The compiled aggregates above ship 0 raw `@custom-media` (Tailwind + the token
// layer resolve them away), but the consumer's build glue — a local zero-dep PostCSS plugin that
// substitutes `@media (--phone)` across its OWN dashboard SFC <style> blocks — must READ the raw
// `@custom-media --name (cond);` DECLARATIONS. So the design-foundation source ships VERBATIM (no
// layer wrap, no Tailwind pass) as a resolvable style asset, retiring the consumer's vendored mirror.
const breakpointsCss = await readFile(
    resolve(ROOT, "src/design/foundations/breakpoints.css"),
    "utf8",
);
await writeFile(resolve(DIST, "breakpoints.css"), breakpointsCss);

// Delete the intermediate SFC chunk (folded into style.css).
await rm(resolve(DIST, "assets/core.css"), { force: true });
await rm(TMP, { recursive: true, force: true });

console.log(
    `build-styles: dist/style.css (${styleCss.length}B) — @layer atlas wrapped, SFC folded.`,
);
