import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    test: {
        include: ["tests/**/*.spec.ts", "src/**/*.spec.ts", "styles/**/*.spec.ts"],
        // The engine lane runs these in real browsers (vitest.browser.config.ts).
        exclude: ["**/node_modules/**", "**/*.browser.spec.ts"],
        environment: "node",
        // glass-ui 10.2 (u/b7-glass, B7-G7) ships per-component sheets as `import "./…/styles.css"`
        // inside its chunks. Node cannot load a .css module, so the suite lets Vite transform
        // glass-ui (CSS imports become no-ops in the node environment) instead of externalizing it.
        server: { deps: { inline: [/@mkbabb\/glass-ui/] } },
    },
});
