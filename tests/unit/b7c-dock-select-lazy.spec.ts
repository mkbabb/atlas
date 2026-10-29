// U/B7c C1 · O-7 entry JS. The dock's Selects were always mounted, so the dock's static graph (and so
// every consumer's entry) carried glass's Select and reka's Select content for lists nobody had
// opened. Each Select is now a seat (DockSelectSeat) whose live module loads on first use, and the
// section Select is an async component. Reads the built dist (`npm run build` first).
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "../../dist");
const staticImports = (code: string) => [...code.matchAll(/^import (?:[^;]*? from )?"([^"]+)";$/gm)].map((m) => m[1]);

/** Every dist module the file reaches by static import, with its bare (package) imports. */
function staticGraph(entry: string): { files: string[]; bare: Map<string, string[]> } {
    const seen = new Set<string>();
    const bare = new Map<string, string[]>();
    const stack = [resolve(DIST, entry)];
    while (stack.length) {
        const file = stack.pop()!;
        if (seen.has(file) || !file.endsWith(".js") || !existsSync(file)) continue;
        seen.add(file);
        for (const spec of staticImports(readFileSync(file, "utf8"))) {
            if (spec.startsWith(".")) stack.push(resolve(dirname(file), spec));
            else bare.set(spec, [...(bare.get(spec) ?? []), file.replace(`${DIST}/`, "")]);
        }
    }
    return { files: [...seen].map((f) => f.replace(`${DIST}/`, "")), bare };
}

describe("the dock's Selects are not in its static graph", () => {
    it("Dock reaches no glass Select by static import", () => {
        const { files, bare } = staticGraph("platform/chrome/dock/Dock.vue.js");
        expect(files.length).toBeGreaterThan(10);
        expect(bare.get("@mkbabb/glass-ui/select") ?? []).toEqual([]);
    });

    it("each seat imports its live Select dynamically", () => {
        const dir = resolve(DIST, "platform/chrome/dock/components");
        const code = (f: string) => [`${f}.vue.js`, `${f}2.vue.js`].filter((x) => existsSync(resolve(dir, x))).map((x) => readFileSync(resolve(dir, x), "utf8")).join("\n");
        expect(code("DockDashboardSelect")).toMatch(/import\("\.\/DockDashboardSelectLive\.vue\.js"\)/);
        expect(code("DockSavedViews")).toMatch(/import\("\.\/DockSavedViewsLive\.vue\.js"\)/);
        expect(code("DockRoster")).toMatch(/import\("\.\/DockRosterSubjectsLive\.vue\.js"\)/);
        expect(staticImports(code("DockDashboardSelectLive"))).toContain("@mkbabb/glass-ui/select");
    });
});
