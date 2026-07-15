import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileStyle } from "@vue/compiler-sfc";
import { describe, expect, it } from "vitest";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const DOCK = read("../../src/platform/chrome/dock/Dock.vue");
const DOCK_CSS = read("../../src/platform/chrome/dock/Dock.css");

describe("mobile dock crest ownership", () => {
    it("keeps the interactive crest persistent and the decorative summary in the collapsed slot", () => {
        expect(DOCK).toContain("<DockCrest");
        expect(DOCK).toContain("<DockSummary");
        expect(DOCK).toContain(":as-button=\"isPhone\"");
    });

    it("scopes the phone host directly so its collapsed summary is hidden", () => {
        const { code, errors } = compileStyle({
            source: DOCK_CSS,
            filename: "Dock.css",
            id: "data-v-test",
            scoped: true,
        });

        expect(errors).toEqual([]);
        expect(code).toContain(
            ".usf-dock--phone.collapsed[data-v-test] .dock-layers",
        );
        expect(code).toMatch(
            /\.usf-dock--phone\.collapsed\[data-v-test\] \.dock-layers\s*\{\s*display: none;/,
        );
    });
});
