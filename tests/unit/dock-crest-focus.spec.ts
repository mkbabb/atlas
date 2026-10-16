import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The crest nulled BrandMark's focus outline and relied on a `focus-ring-gold` box-shadow that no
// shipped glass-ui (7 or 10) defines, so a keyboard user focusing the dock crest saw no ring.
// The gold focus is atlas-owned: the crest's own `:focus-visible` rule must paint an outline.
describe("dock crest focus", () => {
    const sfc = readFileSync(
        resolve(__dirname, "../../src/platform/chrome/dock/components/DockCrest.vue"),
        "utf8",
    );
    const rule = sfc.match(/\.usf-dock__crest:focus-visible\s*\{([^}]*)\}/)?.[1] ?? "";

    it("paints a visible gold outline on :focus-visible", () => {
        expect(rule).toMatch(/outline:\s*var\(--focus-ring-width\)\s+solid\s+var\(--gold\)/);
        expect(rule).not.toMatch(/outline:\s*none/);
    });
});
