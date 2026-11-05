// The release vehicle (U RULINGS §J A-2, A-3, H-A5). A prerelease is cut as `-rc.N` and published
// under `next` (npm refuses a prerelease publish without --tag); the publish runs over OIDC trusted
// publishing with no token; CI runs on push to master and the release line plus workflow_dispatch,
// with the three-engine lane pinned to playwright 1.60.0 (WebKit 2287).
import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** The `run: |` body of the step named `name` in a workflow file (indentation-delimited). */
function stepScript(workflow: string, name: string): string {
    const lines = workflow.split("\n");
    const at = lines.findIndex((l) => l.trim() === `- name: ${name}`);
    expect(at, `step "${name}"`).toBeGreaterThan(-1);
    const runAt = lines.findIndex((l, i) => i > at && l.trim() === "run: |");
    const indent = lines[runAt + 1].match(/^ */)![0].length;
    const body: string[] = [];
    for (const l of lines.slice(runAt + 1)) {
        if (l.trim() !== "" && l.match(/^ */)![0].length < indent) break;
        body.push(l.slice(indent));
    }
    return body.join("\n");
}

describe("scripts/release.sh tag grammar", () => {
    // The script runs in a scratch directory whose package.json is at none of these versions, so an
    // admitted tag stops at the version check ("does not match") and a refused one at the usage
    // line. Neither reaches the build. Run from ROOT, a tag equal to the real version (v8.0.0-rc.1
    // at the rc cut) would start `npm run prepublishOnly`, and through `npm run test` this spec again.
    const table: Array<[string, boolean]> = [
        ["v8.0.0", true],
        ["v8.0.0-rc.1", true],
        ["v8.0.0-rc.12", true],
        ["v10.20.30", true],
        ["v8.0.0-rc.0", true],
        ["8.0.0", false],
        ["v8.0", false],
        ["v8.0.0-rc", false],
        ["v8.0.0-rc.", false],
        ["v8.0.0-beta.1", false],
        ["v8.0.0-next.1", false],
        ["v8.0.0-rc.1.2", false],
        ["v8.0.0-rc.01", false],
        ["v08.0.0", false],
        ["v8.0.0+build.1", false],
        ["v8.0.0 ", false],
        ["", false],
    ];
    for (const [tag, admitted] of table) {
        it(`${admitted ? "admits" : "refuses"} ${JSON.stringify(tag)}`, () => {
            const dir = mkdtempSync(join(tmpdir(), "atlas-release-grammar-"));
            let r: SpawnSyncReturns<string>;
            try {
                writeFileSync(join(dir, "package.json"), JSON.stringify({ version: "0.0.0-grammar" }));
                r = spawnSync("bash", [join(ROOT, "scripts/release.sh"), tag], { cwd: dir, encoding: "utf8" });
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
            expect(r.status).toBe(1);
            if (admitted) {
                expect(r.stderr).toMatch(/does not match package version/);
            } else {
                expect(r.stderr).toMatch(/^Usage: /m);
            }
        });
    }
});

describe("release.yml", () => {
    const yml = read(".github/workflows/release.yml");

    it("publishes over OIDC trusted publishing: id-token write, npm >= 11.5.1, no token", () => {
        expect(yml).toMatch(/^\s+id-token: write$/m);
        expect(yml).not.toMatch(/secrets\.NPM_TOKEN/);
        expect(yml).not.toMatch(/NODE_AUTH_TOKEN\s*:/);
        const npm = yml.match(/npm install -g npm@(\d+)\.(\d+)\.(\d+)/);
        expect(npm).not.toBeNull();
        const [maj, min, pat] = npm!.slice(1).map(Number);
        expect(maj * 1e6 + min * 1e3 + pat).toBeGreaterThanOrEqual(11 * 1e6 + 5 * 1e3 + 1);
    });

    it("re-checks that ci.yml passed on the tagged commit before publishing", () => {
        expect(yml).toMatch(/^\s+actions: read$/m);
        expect(stepScript(yml, "Verify CI is green on the tagged commit")).toMatch(
            /gh run list .*--workflow ci\.yml --commit "\$GITHUB_SHA"/s,
        );
    });

    // Run the publish step's own shell with `npm` stubbed, so the channel logic is executed, not read.
    const publish = stepScript(yml, "Publish with provenance");
    const cases: Array<[string, string]> = [
        ["8.0.0-rc.1", "next"],
        ["8.0.0-rc.12", "next"],
        ["8.0.0", "latest"],
        ["7.0.1", "latest"],
    ];
    for (const [version, channel] of cases) {
        it(`publishes ${version} under --tag ${channel}`, () => {
            const dir = mkdtempSync(join(tmpdir(), "atlas-release-"));
            try {
                writeFileSync(join(dir, "package.json"), JSON.stringify({ version }));
                const npm = join(dir, "npm");
                writeFileSync(npm, '#!/usr/bin/env bash\necho "npm $*"\n');
                chmodSync(npm, 0o755);
                const out = execFileSync("bash", ["-euo", "pipefail", "-c", publish], {
                    cwd: dir,
                    encoding: "utf8",
                    env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
                });
                expect(out.trim()).toBe(`npm publish --provenance --access public --tag ${channel}`);
            } finally {
                rmSync(dir, { recursive: true, force: true });
            }
        });
    }
});

describe("ci.yml", () => {
    const yml = read(".github/workflows/ci.yml");
    const on = yml.slice(yml.indexOf("\non:"), yml.indexOf("\npermissions:"));

    it("runs on push to master and the release line, on workflow_dispatch, and on pull requests", () => {
        expect(on).toMatch(/push:\n\s+branches:\n\s+- master\n\s+- "release\/\*\*"/);
        expect(on).toMatch(/^\s+workflow_dispatch:$/m);
        expect(on).toMatch(/^\s+pull_request:$/m);
    });

    it("runs the engine lane in Chromium, Firefox and WebKit on the pinned playwright", () => {
        expect(yml).toMatch(/engine: \[chromium, firefox, webkit\]/);
        expect(yml).toMatch(/npx playwright install --with-deps \$\{\{ matrix\.engine \}\}/);
        expect(yml).toMatch(/npm run test:engines/);
        const pkg = JSON.parse(read("package.json"));
        // 1.60.0 names chromium-1223, firefox-1522 and webkit-2287 (RULINGS §H M-4).
        expect(pkg.devDependencies.playwright).toBe("1.60.0");
        expect(yml).toContain('v!=="1.60.0"');
        expect(pkg.scripts["test:engines"]).toBe("vitest run --config vitest.browser.config.ts");
    });
});
