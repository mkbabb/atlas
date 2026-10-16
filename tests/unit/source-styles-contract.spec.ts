// The source styles contract: every stylesheet atlas ships or compiles from source parses under
// PostCSS's strict parser, the parser a consumer's Tailwind/Vite pipeline runs. A stray literal
// (base.css:92 carried `</content>`, an editor artefact) throws there, so it is caught here at the
// source, per file, not in a consumer build.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import postcss from "postcss";
import { parse as parseSfc } from "vue/compiler-sfc";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function walk(dir: string, ext: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, ext, out);
        else if (p.endsWith(ext)) out.push(p);
    }
    return out;
}

const sheets = [...walk(join(ROOT, "src"), ".css"), ...walk(join(ROOT, "styles"), ".css")];
const sfcs = walk(join(ROOT, "src"), ".vue");

describe("source stylesheets parse under PostCSS's strict parser", () => {
    it("finds the source set", () => {
        expect(sheets.length).toBeGreaterThan(10);
        expect(sfcs.length).toBeGreaterThan(10);
    });
    for (const file of sheets) {
        it(relative(ROOT, file), () => {
            expect(() => postcss.parse(readFileSync(file, "utf8"), { from: file })).not.toThrow();
        });
    }
    it("every SFC <style> block", () => {
        const failures: string[] = [];
        for (const file of sfcs) {
            const { descriptor } = parseSfc(readFileSync(file, "utf8"), { filename: file });
            descriptor.styles.forEach((s, i) => {
                if (s.lang && s.lang !== "css") return;
                try {
                    postcss.parse(s.content, { from: `${file}?style=${i}` });
                } catch (e) {
                    failures.push(`${relative(ROOT, file)}#${i}: ${(e as Error).message}`);
                }
            });
        }
        expect(failures).toEqual([]);
    });
});
