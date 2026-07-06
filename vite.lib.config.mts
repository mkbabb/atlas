// vite.lib.config.mts — THE @mkbabb/atlas BUILD VEHICLE.
//
// COPIED-and-adapted from packages/atlas-core/vite.lib.config.mts (the N.WE2 · G-N7 vehicle) at the
// O-B0 genesis. The one structural adaptation: this repo IS the library, so the source root is the
// repo's own `src/` (no `../../atlas` hop) and every emitted byte lands in this repo's `dist/`.
//
// Run:
//   vite build -c vite.lib.config.mts
//
// The 14 barrel entries are the exports-map subpaths (contract/chrome/charts/provenance/filter/
// story/motion/editorial/interaction/data/stores/composables/lib/vite). `preserveModules` keeps a
// 1:1 source→dist tree so each subpath resolves to a real emitted module (not a mega-bundle).
// `external` externalizes EVERY bare specifier (peers + runtime deps + node builtins) AND the NC/US
// topology JSON (a generic viz lib must not ship geodata; the instance supplies the loaders). The
// "@/" alias + relative imports stay IN the graph (preserveModulesRoot: src). `base: "./"` makes the
// feed-worker URL module-relative so it survives off-origin-root. `copyPublicDir: false` keeps any
// instance public/ out of the lib dist. `cssCodeSplit: false` collapses per-component SFC <style>
// chunks into ONE dist/assets/core.css aggregate (folded into dist/style.css by build-styles.mjs).
import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { builtinModules } from "node:module";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const OUT = resolve(ROOT, "dist");
const src = (p: string) => resolve(ROOT, "src", p);

// The 14 TS/Vue barrel entries the exports map names (styles = CSS, handled by the css aggregate
// pass in scripts/build-styles.mjs; not a JS entry here). Entry KEYS become the flat dist/<key>.js.
const entries = {
    contract: src("contract/index.ts"),
    chrome: src("platform/chrome/index.ts"),
    charts: src("charts/index.ts"),
    provenance: src("platform/provenance/index.ts"),
    filter: src("filter/index.ts"),
    story: src("story/index.ts"),
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

export default defineConfig({
    root: ROOT,
    base: "./", // module-relative worker/asset URLs (survive off-origin-root)
    cacheDir: resolve(ROOT, ".vite-cache"),
    logLevel: "info",
    plugins: [vue(), tailwindcss(), preserveJsonImportAttributes()],
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
                assetFileNames: "assets/[name][extname]",
            },
        },
    },
});
