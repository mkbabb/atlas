// The type floor and the dashboard face (U/B7 · PLAN §5.8, OD-6). No atlas sheet or SFC sets reader
// text below 12 px (RC6 had 44 such literals in 27 files, 9–11.5 px tick tags, chip counts and seam
// tags), and the display and prose roles resolve to the system UI sans outside a
// `[data-type-face="serif"]` surface.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "../../src");
function files(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) return files(p);
        return /\.(vue|css)$/.test(n) ? [p] : [];
    });
}
const px = (value: string, unit: string) => (unit === "px" ? Number(value) : Number(value) * 16);

describe("type floor", () => {
    it("sets no font-size literal below 12 px", () => {
        const under: string[] = [];
        for (const f of files(SRC)) {
            const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
            for (const m of text.matchAll(/font-size:\s*([0-9.]+)(px|rem|em)\b/g))
                if (m[2] !== "em" && px(m[1]!, m[2]!) < 12) under.push(`${f.slice(SRC.length + 1)}: ${m[0]}`);
        }
        expect(under).toEqual([]);
    });
    it("points the display and prose roles at the system sans, serif on opt-in", () => {
        const css = readFileSync(join(SRC, "design/tokens/type.css"), "utf8");
        expect(css).toMatch(/--font-display:\s*var\(--font-sans-ui\)/);
        expect(css).toMatch(/--font-serif:\s*var\(--font-sans-ui\)/);
        expect(css).toMatch(/\[data-type-face="serif"\]\s*\{[^}]*--font-display:\s*var\(--font-serif-display\)/);
    });
});
