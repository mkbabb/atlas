// tests/gates/genesis.gate.ts — the O-B0 GENESIS GATE. Asserts the born-clean invariants the
// wave fixes: the name/version identity, the full subpath-exports map, files whitelist, the
// ABSENCE of publishConfig (private-repo git-dependency consumption), bounded-caret peers, every
// export backed by a real src barrel, and the ATLAS_DEV_LINK dev-alias guard staying unset in
// committed config/CI. Reads live off disk — no fixtures.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));

// The 14 named JS subpaths the exports map MUST carry (repo-split §A.10) + the . root.
const REQUIRED_JS_SUBPATHS = [
    ".",
    "./contract",
    "./chrome",
    "./charts",
    "./provenance",
    "./filter",
    "./story",
    "./motion",
    "./editorial",
    "./interaction",
    "./data",
    "./stores",
    "./composables",
    "./lib",
    "./vite",
];

describe("O-B0 genesis — package identity", () => {
    it("is named @mkbabb/atlas (the ROUND-RULED name; @atlas/core is unpublishable)", () => {
        expect(pkg.name).toBe("@mkbabb/atlas");
    });
    it("is version 1.0.1 — the O-B10 re-cut over the 1.0.0 first cut (§5.5 owner override)", () => {
        expect(pkg.version).toBe("1.0.1");
    });
    it("ships bundler-only via files: [dist, types]", () => {
        expect(pkg.files).toEqual(["dist", "types"]);
    });
    it("carries a type:module + a repository pointing at github.com/mkbabb/atlas", () => {
        expect(pkg.type).toBe("module");
        expect(pkg.repository?.url ?? "").toContain("github.com/mkbabb/atlas");
    });
});

describe("O-B0 genesis — the subpath exports map", () => {
    it("carries every required JS subpath (14 named + the . root)", () => {
        for (const sub of REQUIRED_JS_SUBPATHS) {
            expect(pkg.exports, `missing export ${sub}`).toHaveProperty([sub]);
        }
    });
    it("carries the ./styles + ./styles/tokens CSS exports", () => {
        expect(pkg.exports["./styles"]).toBe("./dist/style.css");
        expect(pkg.exports["./styles/tokens"]).toBe("./dist/tokens.css");
    });
    it("backs every JS subpath with a real src barrel (empty-but-present at genesis)", () => {
        for (const sub of REQUIRED_JS_SUBPATHS) {
            if (sub === ".") continue; // aliases ./contract
            const entry = pkg.exports[sub];
            const dist = entry.import as string; // ./dist/<name>.js
            const name = dist.replace(/^\.\/dist\//, "").replace(/\.js$/, "");
            // The restructure (src-rearchitecture §A.10) progressively lifts each family from the
            // genesis `platform/<name>/` stub to a top-level `src/<name>/` home; the barrel is real
            // in EITHER location, so both are accepted (`vite` is preset-backed, not a barrel).
            const candidates =
                name === "vite"
                    ? ["src/vite/preset.ts"]
                    : [`src/${name}/index.ts`, `src/platform/${name}/index.ts`];
            expect(
                candidates.some((c) => existsSync(resolve(ROOT, c))),
                `no src barrel for ${sub} (looked at ${candidates.join(", ")})`,
            ).toBe(true);
        }
    });
});

describe("O-B0 genesis — publish posture (private → git-dependency)", () => {
    it("has NO publishConfig at genesis (Q59-private; the flip sets access at O-B17)", () => {
        expect(pkg.publishConfig).toBeUndefined();
    });
    it("composes prepublishOnly = typecheck && build && lint:pub && test && gates", () => {
        const p = pkg.scripts.prepublishOnly as string;
        for (const step of ["typecheck", "build", "lint:pub", "test", "gates"]) {
            expect(p, `prepublishOnly missing ${step}`).toContain(step);
        }
    });
});

describe("O-B0 genesis — bounded-caret peers (never open >=)", () => {
    it("has no open-ended peer range (>= / * / x); glass-ui is caret-bounded", () => {
        for (const [name, range] of Object.entries(pkg.peerDependencies as Record<string, string>)) {
            expect(range, `peer ${name} is open-ended: ${range}`).not.toMatch(/(^|\s)(>=|\*|x)/i);
        }
        // The LEAD reconcile: glass-ui floor is ^4.2.0 (published latest; no 4.3.0 exists).
        expect(pkg.peerDependencies["@mkbabb/glass-ui"]).toMatch(/^\^4\./);
    });
});

describe("O-B0 genesis — the ATLAS_DEV_LINK guard (ANSWERS Q72)", () => {
    it("is unset in the test/CI environment", () => {
        expect(process.env.ATLAS_DEV_LINK ?? "").toBe("");
    });
    it("is never truthily set in the committed ci.yml (asserts-unset, not aliased)", () => {
        const ci = readFileSync(resolve(ROOT, ".github/workflows/ci.yml"), "utf8");
        // The ONLY permitted mentions are comments + the guard step that asserts it unset (which
        // legitimately reads `${ATLAS_DEV_LINK:-}`). What is BANNED: a YAML env-key assignment
        // (`ATLAS_DEV_LINK: <value>` at a line start) or a bash `ATLAS_DEV_LINK=<value>` export.
        expect(ci, "no YAML env assignment of ATLAS_DEV_LINK").not.toMatch(/^\s*ATLAS_DEV_LINK\s*:\s*\S/m);
        expect(ci, "no bash ATLAS_DEV_LINK=<value> export").not.toMatch(/ATLAS_DEV_LINK=[^\s"'}]/);
    });
});
