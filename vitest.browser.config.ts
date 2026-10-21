// The engine lane: the colocated `*.browser.spec.ts` specs, in real engines. The exact `playwright`
// pin names the engine builds (1.60.0: chromium-1223, firefox-1522, webkit-2287); nothing overrides
// the path. Node and happy-dom never run ECharts' frame loop, so frame-loop behaviour is observable
// only here. ENGINE picks one engine per run (ci.yml runs the three as a matrix).
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";

const engine = (process.env.ENGINE ?? "chromium") as "chromium" | "firefox" | "webkit";

// The consumer's root resolves atlas's `@media (--phone)` seams by textual substitution from
// breakpoints.css (sci `dashboards/vite/postcss-custom-media.mjs`). The engine lane does the same,
// so a spec at 390 px sees the phone register's CSS the way a served page does.
const customMedia = new Map(
    [...readFileSync(new URL("./src/design/foundations/breakpoints.css", import.meta.url), "utf8").matchAll(
        /@custom-media\s+(--[\w-]+)\s+([^;]+);/g,
    )].map((m) => [m[1], m[2].trim()]),
);
const substitute = (params: string) =>
    params.replace(/\(\s*(--[\w-]+)\s*\)/g, (full, name: string) => customMedia.get(name) ?? full);
const resolveCustomMedia = {
    postcssPlugin: "atlas-custom-media",
    AtRule: {
        "custom-media": (rule: { remove: () => void }) => rule.remove(),
        media: (rule: { params: string }) => void (rule.params = substitute(rule.params)),
        container: (rule: { params: string }) => void (rule.params = substitute(rule.params)),
    },
};

export default defineConfig({
    // Tailwind compiles `tests/browser/utilities.css` for the specs that import it, so a layout spec
    // reads the same utility rules a consumer root compiles.
    plugins: [vue(), tailwindcss()],
    css: { postcss: { plugins: [resolveCustomMedia] } },
    // One Vue: the pre-bundled glass-ui chunks and the specs must share the runtime, or a glass
    // component that calls `useTemplateRef` (GlassDock) throws on the other copy's frozen `refs`.
    resolve: { dedupe: ["vue"] },
    test: {
        include: ["src/**/*.browser.spec.ts"],
        browser: {
            enabled: true,
            headless: true,
            api: { port: Number(process.env.PORT ?? 63315), strictPort: true },
            provider: playwright(),
            instances: [{ browser: engine }],
            // `prefers-reduced-motion` per spec (K-1): a plate layer's dismissal is exercised with
            // motion on and off, so a defect that appears only under one setting cannot hide.
            commands: {
                emulateMotion: async ({ page }, reducedMotion: "reduce" | "no-preference") => {
                    await page.emulateMedia({ reducedMotion });
                },
            },
        },
    },
});
