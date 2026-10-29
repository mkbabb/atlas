// U/B7c M1 · O-7 entry JS. The More gear (DockSettings) is always mounted, and it held a glass
// DropdownMenu. glass's DropdownMenu root provides the whole reka DropdownMenu family (content,
// popper, dismissable layer, focus scope, sub-menus), so every consumer's entry carried those and
// floating-ui for a sheet the reader may never open: about 60 KB raw of sci's 427,088 B entry
// (measured on 079743b6). The gear is now a face that loads the live menu (DockSettingsMenu) on its
// first pointer, focus or open. Reads the built dist (`npm run build` first).
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist");
const DOCK = resolve(DIST, "platform/chrome/dock");
const staticImports = (code: string) => [...code.matchAll(/^import ([^;]*?) from "([^"]+)";$/gm)].map((m) => ({ what: m[1], from: m[2] }));
const code = (f: string) =>
    [`${f}.vue.js`, `${f}2.vue.js`].filter((x) => existsSync(resolve(DOCK, x))).map((x) => readFileSync(resolve(DOCK, x), "utf8")).join("\n");

/** Every dist module Dock reaches by static import. */
function staticGraph(entry: string): string[] {
    const seen = new Set<string>();
    const stack = [resolve(DIST, entry)];
    while (stack.length) {
        const file = stack.pop()!;
        if (seen.has(file) || !file.endsWith(".js") || !existsSync(file)) continue;
        seen.add(file);
        for (const { from } of staticImports(readFileSync(file, "utf8")))
            if (from.startsWith(".")) stack.push(resolve(dirname(file), from));
    }
    return [...seen];
}

describe("the More sheet is not in the dock's static graph", () => {
    it("no module Dock imports statically reaches glass's menu", () => {
        const files = staticGraph("platform/chrome/dock/Dock.vue.js");
        expect(files.length).toBeGreaterThan(10);
        const naming = files.filter((f) => staticImports(readFileSync(f, "utf8")).some((i) => i.from === "@mkbabb/glass-ui/menu"));
        expect(naming.map((f) => f.replace(`${DIST}/`, ""))).toEqual([]);
    });

    it("the gear imports its live menu dynamically, and the live menu holds the root and the sheet", () => {
        expect(code("DockSettings")).toMatch(/import\("\.\/DockSettingsMenu\.vue\.js"\)/);
        expect(staticImports(code("DockSettingsMenu")).some((i) => i.from === "@mkbabb/glass-ui/menu" && /\bDropdownMenu\b/.test(i.what) && /DropdownMenuContent/.test(i.what))).toBe(true);
    });
});
