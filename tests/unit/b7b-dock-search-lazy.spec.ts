// U/B7b M3 · O-7 entry JS. DockSearch statically imported the glass command palette (CommandDialog,
// its dialog and the reka combobox), so every consumer's entry chunk carried a palette nobody had
// opened. The palette is now its own module, imported dynamically on the first open (or when the
// pointer or focus reaches the button). Reads the built dist (`npm run build` first).
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DOCK = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist/platform/chrome/dock/components");
const read = (f: string) => readFileSync(resolve(DOCK, f), "utf8");
const staticImports = (code: string) => [...code.matchAll(/^import [^;]*?from "([^"]+)";$/gm)].map((m) => m[1]);

describe("the search palette is not in the dock's static graph", () => {
    it("DockSearch imports the palette dynamically and the command palette not at all", () => {
        const search = ["DockSearch.vue.js", "DockSearch2.vue.js"].filter((f) => existsSync(resolve(DOCK, f))).map(read).join("\n");
        expect(staticImports(search)).not.toContain("@mkbabb/glass-ui/command");
        expect(search).toMatch(/import\("\.\/DockSearchPalette\.vue\.js"\)/);
    });
    it("the palette module owns the command palette", () => {
        expect(existsSync(resolve(DOCK, "DockSearchPalette.vue.js"))).toBe(true);
        const files = ["DockSearchPalette.vue.js", "DockSearchPalette2.vue.js"].filter((f) => existsSync(resolve(DOCK, f)));
        expect(files.flatMap((f) => staticImports(read(f)))).toContain("@mkbabb/glass-ui/command");
    });
});
