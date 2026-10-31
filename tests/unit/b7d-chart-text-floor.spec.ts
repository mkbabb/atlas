import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// U/B7d M3 · T-02 (R-REQ-CHECK: "type one golden step larger, captions included"). Chart text the
// option builders paint on canvas floors at 11 px (MB-3 / G4, the axis-tick floor). The B7d
// re-measure read 9 px canvas text on /sci (the trend's crossing and partial-year eyebrows) and
// 10 px on the /ecf treemap meta runs: every literal `fontSize` under 11 in `src/charts` is listed.
const ROOT = join(__dirname, "../../src/charts");
const FLOOR = 11;

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return files(p);
        return /\.(ts|vue)$/.test(f) && !/\.spec\.ts$/.test(f) ? [p] : [];
    });
}

describe("chart text floor (T-02)", () => {
    it(`no option builder paints a literal fontSize under ${FLOOR} px`, () => {
        const under: string[] = [];
        for (const f of files(ROOT)) {
            readFileSync(f, "utf8")
                .split("\n")
                .forEach((line, i) => {
                    const m = line.match(/\bfontSize:\s*(\d+(?:\.\d+)?)\b/);
                    if (m && Number(m[1]) < FLOOR) under.push(`${f.slice(ROOT.length + 1)}:${i + 1} ${m[1]}`);
                });
        }
        expect(under).toEqual([]);
    });
});
