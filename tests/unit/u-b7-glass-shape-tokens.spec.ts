// U/B7 I1: atlas reads glass's shape tokens once glass ships them (G1, B7-G4). The collapsed dock is
// a circle on `--radius-circle`, the phone bar and the provenance strip are bars on `--radius-bar`,
// and no atlas rule keeps a literal fallback for either token.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const rule = (css: string, selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, `${selector} is declared`).toBeGreaterThanOrEqual(0);
    return css.slice(at, css.indexOf("}", at));
};

describe("glass shape tokens (U/B7 · B7-G4)", () => {
    it("the installed glass defines --radius-circle and --radius-bar", () => {
        const glass = read("node_modules/@mkbabb/glass-ui/dist/styles/theme/radius.css");
        expect(glass).toMatch(/--radius-circle\s*:/);
        expect(glass).toMatch(/--radius-bar\s*:/);
    });

    it("the collapsed dock is a circle and the phone bar a bar, on glass's tokens", () => {
        const css = read("src/platform/chrome/dock/Dock.css");
        expect(rule(css, ".usf-dock.collapsed")).toMatch(/border-radius:\s*var\(--radius-circle\);/);
        expect(rule(css, ".usf-dock--bar")).toMatch(/border-radius:\s*var\(--radius-bar\);/);
    });

    it("the provenance strip reads --radius-bar with no fallback", () => {
        const sfc = read("src/platform/provenance/VizAppendixDock.vue");
        expect(sfc).toMatch(/border-radius:\s*var\(--radius-bar\);/);
        expect(sfc).not.toMatch(/var\(--radius-bar,/);
    });
});
