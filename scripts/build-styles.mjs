// scripts/build-styles.mjs — THE @mkbabb/atlas STYLES CONTRACT (U · D5A-W1).
//
// atlas does not compile CSS against glass-ui or Tailwind. It ships source the consumer's one
// Tailwind root compiles (styles/index.css documents the root):
//   dist/styles/index.css        the Tailwind v4 source entry (styles/index.css, verbatim)
//   dist/styles/design/**        the design sheets the entry names (src/design/**, verbatim)
//   dist/styles/editorial/*.css  the editorial sheets the entry names (verbatim)
// The SFC <style> blocks are not here: each ships beside its module and the module imports it
// (vite.sfc-sheets.mts, F15), so the consumer's entry carries only the components it renders.
// `./styles/breakpoints` resolves to dist/styles/design/foundations/breakpoints.css, the raw
// @custom-media author surface a consumer's PostCSS glue reads.
import { readFile, rm, mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const OUT = resolve(DIST, "styles");

// Ship exactly the sheets the entry names: `./design/…` and `./editorial/…` map to src/.
const entry = await readFile(resolve(ROOT, "styles/index.css"), "utf8");
const named = [...entry.matchAll(/^@import "\.\/((?:design|editorial)\/[^"]+\.css)"/gm)].map((m) => m[1]);
if (named.length === 0) throw new Error("build-styles: styles/index.css names no design or editorial sheet");
await rm(OUT, { recursive: true, force: true });
for (const rel of named) {
    const dst = resolve(OUT, rel);
    await mkdir(dirname(dst), { recursive: true });
    await copyFile(resolve(ROOT, "src", rel), dst);
}
await copyFile(resolve(ROOT, "styles/index.css"), resolve(OUT, "index.css"));
console.log(`build-styles: dist/styles (${named.length} source sheets + entry)`);
