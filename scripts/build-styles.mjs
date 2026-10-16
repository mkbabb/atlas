// scripts/build-styles.mjs — THE @mkbabb/atlas STYLES CONTRACT (U · D5A-W1).
//
// atlas does not compile CSS against glass-ui or Tailwind. It ships source the consumer's one
// Tailwind root compiles (styles/index.css documents the root):
//   dist/styles/index.css        the Tailwind v4 source entry (styles/index.css, verbatim)
//   dist/styles/design/**        the design sheets the entry names (src/design/**, verbatim)
//   dist/styles/editorial/*.css  the editorial sheets the entry names (verbatim)
//   dist/styles/components.css   the SFC <style> aggregate from the JS lib build (no Tailwind pass
//                                touched it), layered by the entry as atlas.components
// `./styles/breakpoints` resolves to dist/styles/design/foundations/breakpoints.css, the raw
// @custom-media author surface a consumer's PostCSS glue reads.
// A missing SFC aggregate is a build failure, never a warning.
import { readFile, writeFile, rm, mkdir, copyFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const OUT = resolve(DIST, "styles");

const sfc = resolve(DIST, "assets/core.css");
const components = await readFile(sfc, "utf8"); // throws when build:js has not run: no masked fallback

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
await writeFile(resolve(OUT, "components.css"), components);
await rm(sfc);
console.log(
    `build-styles: dist/styles (${named.length} source sheets + entry + components.css ${components.length}B)`,
);
