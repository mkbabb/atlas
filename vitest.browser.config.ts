// The engine lane: the colocated `*.browser.spec.ts` specs, in real engines. The exact `playwright`
// pin names the engine builds (1.60.0: chromium-1223, firefox-1522, webkit-2287); nothing overrides
// the path. Node and happy-dom never run ECharts' frame loop, so frame-loop behaviour is observable
// only here. ENGINE picks one engine per run (ci.yml runs the three as a matrix).
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";

const engine = (process.env.ENGINE ?? "chromium") as "chromium" | "firefox" | "webkit";

export default defineConfig({
    plugins: [vue()],
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
