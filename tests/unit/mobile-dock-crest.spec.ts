import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileStyle } from "@vue/compiler-sfc";
import { describe, expect, it } from "vitest";

const read = (rel: string): string =>
    readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const DOCK_CSS = read("../../src/platform/chrome/dock/Dock.css");
const DOCK_CREST = read("../../src/platform/chrome/dock/components/DockCrest.vue");

describe("mobile dock crest ownership", () => {
    it("lets the phone crest click own disclosure without Glass focus pre-expansion", () => {
        expect(DOCK_CREST).toContain(
            '@focusin="props.asButton && $event.stopPropagation()"',
        );
        expect(DOCK_CREST).toContain(
            '@click="props.asButton && emit(\'toggle\')"',
        );
    });

    it("compiles dock root and mobile state rules against the scoped host", () => {
        const { code, errors } = compileStyle({
            source: DOCK_CSS,
            filename: "Dock.css",
            id: "data-v-test",
            scoped: true,
        });

        expect(errors).toEqual([]);
        expect(code).toContain(".usf-dock[data-v-test]");
        expect(code).not.toContain("[data-v-test] .usf-dock");
        expect(code).toContain(
            ".usf-dock--phone.collapsed[data-v-test] .dock-layers",
        );
        expect(code).toMatch(
            /\.usf-dock--phone\.collapsed\[data-v-test\] \.dock-layers\s*\{\s*display: none;/,
        );
        expect(code).toMatch(
            /\.usf-dock--phone\[data-v-test\]:not\(\.collapsed\)\s*\{\s*inline-size: min\(20rem,/,
        );
        expect(code).toMatch(
            /\.usf-dock--phone\[data-v-test\]:not\(\.collapsed\) \.usf-dock__step-label\s*\{\s*display: block;/,
        );
        expect(code).toContain(".usf-dock--phone[data-v-test],");
    });
});
