import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    test: {
        include: ["tests/**/*.spec.ts", "src/**/*.spec.ts", "styles/**/*.spec.ts"],
        // The engine lane runs these in real browsers (vitest.browser.config.ts).
        exclude: ["**/node_modules/**", "**/*.browser.spec.ts"],
        environment: "node",
    },
});
