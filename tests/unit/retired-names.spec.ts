// U/B7 repair round 1: names the lane retired stay retired. `PlateAct` (and its act vocabulary) went
// for `PlateDock`; `ReadoutSheet` went for `EntityDetail`. No source file, comment included, may
// still name either, so a reader of the code never looks for a component that no longer exists.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));

function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? walk(path) : [path];
    });
}

const RETIRED = [/\bPlateAct\w*/, /\bPLATE_ACTS\b/, /\bReadoutSheet\b/];

describe("retired names (U/B7)", () => {
    it("no source file names PlateAct, PLATE_ACTS or ReadoutSheet", () => {
        const hits = walk(SRC)
            .filter((path) => /\.(ts|vue|css|js)$/.test(path))
            .flatMap((path) =>
                readFileSync(path, "utf8")
                    .split("\n")
                    .map((line, i) => ({ path, line: i + 1, text: line }))
                    .filter(({ text }) => RETIRED.some((re) => re.test(text))),
            )
            .map(({ path, line }) => `${path.slice(SRC.length + 1)}:${line}`);
        expect(hits).toEqual([]);
    });

    it("HoverCard carries no comment cut off mid-sentence", () => {
        const card = readFileSync(join(SRC, "interaction/HoverCard.vue"), "utf8");
        // The stray line read "…a MEASURED datum anchor AND its" and stopped.
        expect(card).not.toMatch(/^\/\/[^\n]*\bAND its\s*$/m);
    });
});
