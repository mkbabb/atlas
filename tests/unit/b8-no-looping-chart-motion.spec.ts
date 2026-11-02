// U/B8 P-G4 — no looping chart motion. A chart mark never animates on its own and never repeats: no
// CSS `infinite`, no WAAPI `Infinity` iterations, no ECharts effect series (`effectScatter`,
// `rippleEffect`, `lines.effect`) anywhere in the chart family. The one idle register, `breath`, is
// an ornament register that the motion director refuses on a plate. This is a pin: the law already
// holds at b25200d, and the test keeps it holding.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../../src");
function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|vue|css)$/.test(name) && !/\.spec\.ts$/.test(name)) out.push(p);
    }
    return out;
}
/** Strip comments so prose about the law does not trip it. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1").replace(/<!--[\s\S]*?-->/g, "");

describe("no looping chart motion", () => {
    it("the chart family carries no repeating or self-driven animation", () => {
        const hits: string[] = [];
        for (const file of walk(join(SRC, "charts"))) {
            const src = code(readFileSync(file, "utf8"));
            for (const re of [/\binfinite\b/, /iterations\s*:\s*Infinity/, /effectScatter/, /rippleEffect/, /\beffect\s*:\s*\{/]) {
                if (re.test(src)) hits.push(`${file.slice(SRC.length + 1)} ${re}`);
            }
        }
        expect(hits).toEqual([]);
    });
    it("breath stays an ornament register the director refuses on a plate", () => {
        const director = readFileSync(join(SRC, "motion/motion-director.ts"), "utf8");
        expect(director).toMatch(/Exclude<LeanPresetName, "Breath">/);
    });
});
