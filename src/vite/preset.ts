// src/vite/preset.ts — @atlas/core/vite, THE PUBLISHABLE BUILD PRESET (L5-CORE-BOUNDARY §4.F).
//
// The build-config half of the `@atlas/core` boundary: the core-owned plugins + the shared-dep
// vendor cuts every instance needs. The instance `vite.config.ts` COMPOSES this preset and layers
// its own instance-only plugins on top (`apiSnapshotPreview` reads `./public/data`; `criticalCssPlugin`;
// the geo/vendor `manualChunks`; the `dashboard-<slug>` chunkFileNames that scan `/src/dashboards`)
// — those STAY instance-side. The preset carries only what the core OWNS: vue + tailwind +
// `sealCompositorTransform` (the glass-ui completion-seal compositor fix, glass-ui-coupled → core),
// and the glass-ui / keyframes / echarts shared-dep vendor cuts.

import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { sealCompositorTransform } from "./seal-compositor";

/** The shared-dep vendor cut every instance inherits: glass-ui / keyframes / echarts each ride their
    own named async chunk. Returns `undefined` for everything else so the instance can layer its own
    geo/vendor cuts on top (the instance `manualChunks` calls this first, then adds its own rules). */
export function coreManualChunks(id: string): string | undefined {
    if (id.includes("@mkbabb/glass-ui")) return "glass-ui";
    if (id.includes("echarts") || id.includes("zrender")) return "echarts";
    return undefined;
}

/** The `@atlas/core` build preset — the core-owned plugins (vue + tailwind + the glass-ui
    completion-seal compositor fix). The instance composes `[...atlasCorePreset(), ...instancePlugins]`
    and folds `coreManualChunks` into its own `manualChunks` rollup output. */
export function atlasCorePreset() {
    return [vue(), tailwindcss(), sealCompositorTransform()];
}
