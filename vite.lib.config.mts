// vite.lib.config.mts — THE @mkbabb/atlas BUILD VEHICLE.
//
// COPIED-and-adapted from packages/atlas-core/vite.lib.config.mts (the N.WE2 · G-N7 vehicle) at the
// O-B0 genesis. The one structural adaptation: this repo IS the library, so the source root is the
// repo's own `src/` (no `../../atlas` hop) and every emitted byte lands in this repo's `dist/`.
//
// Run:
//   vite build -c vite.lib.config.mts
//
// The barrel entries are the exports-map subpaths. `preserveModules` keeps a
// 1:1 source→dist tree so each subpath resolves to a real emitted module (not a mega-bundle).
// `external` externalizes EVERY bare specifier (peers + runtime deps + node builtins) AND the NC/US
// topology JSON (a generic viz lib must not ship geodata; the instance supplies the loaders). The
// "@/" alias + relative imports stay IN the graph (preserveModulesRoot: src). `base: "./"` makes the
// feed-worker URL module-relative so it survives off-origin-root. `copyPublicDir: false` keeps any
// instance public/ out of the lib dist. `cssCodeSplit: false` collapses per-component SFC <style>
// chunks into ONE dist/assets/core.css aggregate (folded into dist/style.css by build-styles.mjs).
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const OUT = resolve(ROOT, "dist");
const src = (p: string) => resolve(ROOT, "src", p);

// The TS/Vue barrel entries the exports map names (styles = CSS, handled by the css aggregate
// pass in scripts/build-styles.mjs; not a JS entry here). Entry KEYS become the flat dist/<key>.js.
const entries = {
    contract: src("contract/index.ts"),
    chrome: src("platform/chrome/index.ts"),
    charts: src("charts/index.ts"),
    "viz-set": src("charts/viz-set.ts"),
    provenance: src("platform/provenance/index.ts"),
    filter: src("filter/index.ts"),
    events: src("events/index.ts"),
    skin: src("skin/index.ts"),
    story: src("story/index.ts"),
    stage: src("stage/index.ts"),
    motion: src("motion/index.ts"),
    editorial: src("editorial/index.ts"),
    interaction: src("interaction/index.ts"),
    data: src("data/index.ts"),
    stores: src("platform/stores/index.ts"),
    composables: src("platform/composables/index.ts"),
    lib: src("lib/index.ts"),
    vite: src("vite/preset.ts"),
};

const nodeBuiltins = new Set([
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
]);

// The NC/US topology JSON stays OUT of the core dist (instance-supplied). Matches both the bare
// us-atlas file and the relative committed topology (./nc-counties.json, ./glyphs/*.json).
const GEODATA = /(?:^us-atlas\/|[/\\](?:glyphs[/\\][^/\\]+|nc-counties)\.json$)/;

function external(id: string): boolean {
    if (GEODATA.test(id)) return true; // geodata never bundles into core
    if (id.startsWith(".") || id.startsWith("/") || id.startsWith("\0")) return false;
    if (id.startsWith("@/")) return false; // the src alias — keep in graph (preserveModules)
    if (nodeBuiltins.has(id)) return true;
    return true; // every other bare specifier = external (peer + dep)
}

// Vite's json plugin strips the `with { type: "json" }` import-attribute BEFORE externalization, so
// an externalized JSON import emits attribute-less (`import x from "us-atlas/…json"`) → native Node
// ESM throws ERR_IMPORT_ATTRIBUTE_MISSING. This output pass RESTORES the attribute on every emitted
// `.json` specifier (static, side-effect, and dynamic) so the externalize-safe form survives into
// dist and native-ESM consumers do not throw. Bundlers ignore/accept the attribute — no regression.
function preserveJsonImportAttributes() {
    const withStatic = (code: string) =>
        code.replace(
            /(\bimport\b[^;\n]*?["'][^"'\n]+\.json["'])(\s*;)/g,
            (m, head, semi) => (/\bwith\b/.test(head) ? m : `${head} with { type: "json" }${semi}`),
        );
    const withDynamic = (code: string) =>
        code.replace(
            /\bimport\((["'])([^"'\n]+\.json)\1\)/g,
            (_m, q, p) => `import(${q}${p}${q}, { with: { type: "json" } })`,
        );
    return {
        name: "atlas-preserve-json-import-attrs",
        generateBundle(_opts: unknown, bundle: Record<string, { type: string; code?: string }>) {
            for (const file of Object.values(bundle)) {
                if (file.type === "chunk" && typeof file.code === "string") {
                    file.code = withDynamic(withStatic(file.code));
                }
            }
        },
    };
}

// The committed geodata is EXTERNALIZED (never bundled/inlined into the JS graph — see `external`
// above), so the emitted modules keep bare `import … from "./glyphs/x.json" with { type: "json" }` /
// `import … from "./nc-counties.json"` specifiers that resolve to SIBLING files in dist. v1.0.0 left
// the imports externalized but never SHIPPED the files — the consumer's bundler then failed to
// resolve `./glyphs/*.json`. This pass EMITS the committed geodata (the `data/glyphs/*` registry +
// the cropped `data/nc-counties.json`) verbatim into dist at its module-relative path, so the raw
// JSON rides beside `dist/data/leaJoin.js` / `geometry.js` / `districtTopology.js` as a static asset.
// (The BARE `us-atlas/*` topology stays external — it resolves from the consumer's node_modules; only
// the LIBRARY-COMMITTED relative geodata ships here.)
function emitCommittedGeodata() {
    const dataDir = src("data");
    const glyphsDir = src("data/glyphs");
    return {
        name: "atlas-emit-committed-geodata",
        generateBundle(this: { emitFile: (f: unknown) => void }) {
            const emit = (absPath: string, fileName: string): void =>
                this.emitFile({
                    type: "asset",
                    fileName,
                    source: readFileSync(absPath),
                });
            for (const f of readdirSync(glyphsDir)) {
                if (f.endsWith(".json")) emit(resolve(glyphsDir, f), `data/glyphs/${f}`);
            }
            emit(resolve(dataDir, "nc-counties.json"), "data/nc-counties.json");
        },
    };
}

export default defineConfig({
    root: ROOT,
    base: "./", // module-relative worker/asset URLs (survive off-origin-root)
    cacheDir: resolve(ROOT, ".vite-cache"),
    logLevel: "info",
    plugins: [vue(), tailwindcss(), preserveJsonImportAttributes(), emitCommittedGeodata()],
    resolve: { alias: { "@": src("") } },
    build: {
        outDir: OUT,
        emptyOutDir: true,
        copyPublicDir: false,
        target: "es2022",
        minify: false,
        sourcemap: false,
        cssCodeSplit: false, // per-component SFC <style> chunks collapse into ONE core.css
        lib: {
            entry: entries,
            formats: ["es"],
        },
        rollupOptions: {
            external,
            output: {
                preserveModules: true,
                preserveModulesRoot: resolve(ROOT, "src"),
                entryFileNames: "[name].js",
                // The single `cssCodeSplit:false` SFC aggregate MUST land at the documented
                // `assets/core.css` (build-styles.mjs folds THAT path into `@layer atlas.components`).
                // Vite otherwise names the lib CSS after the package (`atlas.css`), so the fold silently
                // missed the 68 SFC <style> blocks (232 KB of scoped component CSS never reached
                // dist/style.css → consumer plates rendered unstyled). Pin the CSS name so the stated
                // core.css contract holds; every other asset keeps its `[name]` (the worker rides its
                // own hashed worker-pipeline naming, untouched by this asset rule).
                assetFileNames: (info): string => {
                    const name = info.names?.[0] ?? info.name ?? "";
                    return name.endsWith(".css") ? "assets/core.css" : "assets/[name][extname]";
                },
            },
        },
    },
});
