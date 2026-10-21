// Scroll never changes layout (U/B7 · PLAN §5.1). A keyframe bound to a scroll or view timeline may
// animate compositor and paint properties only. RC6 bound `title-compact` (font-size, then a 560 → 600
// weight lift) and `page-title-wayfind-in` (max-inline-size 0 → 24ch inside the h1) to
// `scroll(root)`; the kicker re-wrapped the phone hero title and grew /usf and /speedtest by 42 px on
// the first wheel step (clone scroll-free, Chromium, 390).
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
const LAYOUT = /^\s*(font-size|font-weight|font-family|letter-spacing|line-height|(max-|min-)?(inline|block)-size|width|height|(max-|min-)?(width|height)|margin[\w-]*|padding[\w-]*|inset[\w-]*|top|left|right|bottom|gap|grid-template[\w-]*|flex[\w-]*|display)\s*:/m;

describe("scroll-bound keyframes", () => {
    it("animate no layout property", () => {
        const css = files(SRC)
            .map((f) => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""))
            .join("\n");
        const keyframes = new Map<string, string>();
        for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) keyframes.set(m[1]!, m[2]!);
        const bound = new Set<string>();
        for (const m of css.matchAll(/\{([^{}]*animation-timeline:\s*(?:scroll|view|--)[^{}]*)\}/g)) {
            const block = m[1]!;
            const name = /animation-name:\s*([\w-]+)/.exec(block)?.[1] ?? /animation:\s*([\w-]+)/.exec(block)?.[1];
            if (name && keyframes.has(name)) bound.add(name);
        }
        expect(bound.size).toBeGreaterThan(0);
        const offending = [...bound].filter((n) => LAYOUT.test(keyframes.get(n)!.replace(/^[^{]*\{|\}[^{}]*$/g, "")));
        expect(offending).toEqual([]);
    });
});
