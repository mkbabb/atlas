import { defineConfig } from "vitest/config";

// vitest.config.ts — @mkbabb/atlas test + gate runner. `test` runs the whole tree; `gates`
// scopes to tests/gates (the library gate corpus). Node environment: the O-B0 genesis gates
// read live source + package.json off disk, no DOM.
export default defineConfig({
    test: {
        include: ["tests/**/*.spec.ts", "tests/**/*.gate.ts"],
        environment: "node",
    },
});
