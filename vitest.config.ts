import { defineConfig, configDefaults } from "vitest/config";

// vitest.config.ts — @mkbabb/atlas test + gate runner. `test` runs the whole tree; `gates`
// scopes to tests/gates (the library gate corpus). Node environment: the O-B0 genesis gates
// read live source + package.json off disk, no DOM.
//
// TWO gate shapes live in tests/gates/ (atlas CLAUDE.md): SELF-TESTING gates (genesis.gate.ts —
// their own describe/it) and DRIVEN measurement modules (cream-law.gate.ts, evicted from src at
// O-B2 — 716 LOC of exported assertion fns with NO inline suite, run by a colocated *.spec.ts).
// The driven module is not itself a test file, so it is excluded from the test-file match; its
// spec (cream-law.spec.ts) IS the runner. A later gate-corpus wave (WG-B B13–B15) may formalize a
// naming convention for driven-gate modules; until then this exclude names them explicitly.
export default defineConfig({
    test: {
        include: ["tests/**/*.spec.ts", "tests/**/*.gate.ts"],
        exclude: [...configDefaults.exclude, "tests/gates/cream-law.gate.ts"],
        environment: "node",
    },
});
