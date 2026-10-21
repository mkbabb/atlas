// The clone lane: specs that drive a served sci-report build (a "sci clone" with this atlas planted)
// in a real engine, through the Playwright library. CLONE_URL names the served build; ENGINE picks
// one engine per run; CLONE_OUT (optional) receives each spec's per-cell measurements as JSON.
// One browser per spec file, a new context per cell, both closed in `finally` (tests/clone/harness.ts).
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/clone/**/*.browser.spec.ts"],
        environment: "node",
        fileParallelism: false,
        testTimeout: 600_000,
        hookTimeout: 120_000,
    },
});
