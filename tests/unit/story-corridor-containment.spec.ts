import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
    readFileSync(fileURLToPath(new URL(`../../src/${path}`, import.meta.url)), "utf8");

describe("story corridor containment", () => {
    it("creates a local staged context without duplicating geometry or clipping", () => {
        const essay = source("editorial/DashboardEssay.vue");
        const corridor = source("story/StoryCorridor.vue");

        expect(essay).toContain(`:class="{ 'essay-flow--staged': director }"`);
        expect(essay).toMatch(/\.essay-flow\s*\{\s*display: contents;\s*\}/);
        expect(essay).toMatch(
            /\.essay-flow--staged\s*\{[^}]*display: block;[^}]*position: relative;[^}]*isolation: isolate;/,
        );

        const rule = corridor.match(/\.story-corridor\s*\{([^}]*)\}/)?.[1] ?? "";
        expect(rule).toContain("z-index: 1");
        expect(rule).not.toMatch(/padding-inline-start|overflow/);
    });
});
