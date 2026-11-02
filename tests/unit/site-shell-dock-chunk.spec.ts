import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* U/B8 PF (P-G1, entry JS P-8). RED before: SiteShell imported Dock.vue statically, so the dock,
   glass's dock module, the keyframes spring and the dock-only chrome parsed before every route's
   first paint (sci entry 101,836 B brotli after the other B8 cuts, against about 89 KB). Mutation:
   restore the static import and this reds. */
describe("SiteShell loads the dock as its own chunk", () => {
    const src = readFileSync(new URL("../../src/platform/chrome/shell/SiteShell.vue", import.meta.url), "utf8");
    it("has no static import of the dock", () => {
        expect(src).not.toMatch(/^import\s+Dock\s+from\s+"\.\.\/dock\/Dock\.vue";/m);
    });
    it("mounts it through an async component", () => {
        expect(src).toMatch(/defineAsyncComponent\(\(\)\s*=>\s*import\("\.\.\/dock\/Dock\.vue"\)\)/);
    });
});
