// tests/gates/genesis.gate.ts — the O-B0 GENESIS GATE. Asserts the born-clean invariants the
// wave fixes: the name/version identity, the full subpath-exports map, files whitelist, the
// public scoped-package posture, bounded-caret peers, every
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
    it("carries a valid semver at or above the 1.0.0 release floor (a re-cut must never orphan the gate)", () => {
        // The gate asserts the PACKAGE STATE, not a frozen literal. A re-cut bumps package.json
        // (1.0.0 first cut → 1.0.1/1.0.2/1.0.3 re-cuts, §5.5 owner override) and the gate MUST
        // travel with it — pinning a literal here orphaned the gate at the 1.0.2 re-cut. So read the
        // live manifest (already off disk, line 12) and assert the two invariants that actually hold:
        // semver SHAPE + the >=1.0.0 public-release floor (major >= 1 never regresses below cut one).
        const v = pkg.version as string;
        const m = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(v);
        expect(m, `version is not semver-shaped: ${v}`).not.toBeNull();
        expect(Number(m![1]), `version ${v} is below the 1.0.0 release floor`).toBeGreaterThanOrEqual(1);
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

describe("O-B0 genesis — publish posture", () => {
    it("publishes the scoped package publicly", () => {
        expect(pkg.publishConfig).toEqual({ access: "public" });
    });
    it("composes prepublishOnly = typecheck && build && lint:pub && test && gates", () => {
        const p = pkg.scripts.prepublishOnly as string;
        for (const step of ["typecheck", "build", "lint:pub", "test", "gates"]) {
            expect(p, `prepublishOnly missing ${step}`).toContain(step);
        }
    });
});

describe("O-B0 genesis — bounded-caret peers (never open >=)", () => {
    it("has no open-ended peer range (>= / * / x)", () => {
        for (const [name, range] of Object.entries(pkg.peerDependencies as Record<string, string>)) {
            expect(range, `peer ${name} is open-ended: ${range}`).not.toMatch(/(^|\s)(>=|\*|x)/i);
        }
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
