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
// `external` externalizes every bare runtime specifier while source-owned `?raw` data carriers stay
// inside the graph as native-ESM-safe JavaScript modules. The
// Relative imports stay IN the graph (preserveModulesRoot: src). `base: "./"` makes the
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

// The TS/Vue barrel entries the exports map names (styles = CSS, handled by the css aggregate
// pass in scripts/build-styles.mjs; not a JS entry here). Entry KEYS become the flat dist/<key>.js.
const entries = {
    contract: src("contract/index.ts"),
    chrome: src("platform/chrome/index.ts"),
    charts: src("charts/index.ts"),
    provenance: src("platform/provenance/index.ts"),
    filter: src("filter/index.ts"),
    events: src("events/index.ts"),
    skin: src("skin/index.ts"),
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

function external(id: string): boolean {
    if (id.endsWith("?raw")) return false;
    if (id.startsWith(".") || id.startsWith("/") || id.startsWith("\0")) return false;
    if (nodeBuiltins.has(id)) return true;
    return true; // every other bare specifier = external (peer + dep)
}

export default defineConfig({
    root: ROOT,
    base: "./", // module-relative worker/asset URLs (survive off-origin-root)
    cacheDir: resolve(ROOT, ".vite-cache"),
    logLevel: "info",
    plugins: [vue(), tailwindcss()],
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
