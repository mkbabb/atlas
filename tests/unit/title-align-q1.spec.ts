import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveTitleAlign, type TitleAlign } from "@/editorial/title-align";

const root = fileURLToPath(new URL("../..", import.meta.url));
const typeCss = readFileSync(`${root}/src/design/tokens/type.css`, "utf8");
const heroCss = readFileSync(`${root}/src/editorial/DashboardHero.css`, "utf8");

describe("resolveTitleAlign", () => {
    it("is total over the bounded three-pole grammar", () => {
        const cases: Array<[TitleAlign | undefined, "left" | "center" | "right"]> = [
            ["left", "left"],
            ["center", "center"],
            ["right", "right"],
            ["auto", "left"],
            [undefined, "left"],
        ];
        expect(cases.map(([input, fallback]) => resolveTitleAlign(input, fallback))).toEqual([
            "left",
            "center",
            "right",
            "left",
            "left",
        ]);
        expect(resolveTitleAlign("auto", "right")).toBe("right");
    });
});

describe("Q1 title-to-figure band", () => {
    it("registers paired length tracks and routes every hero rank through the bounded rung", () => {
        expect(typeCss).toContain("@property --q1-h1");
        expect(typeCss).toContain("@property --q1-rung");
        expect(typeCss).toContain("calc(var(--q1-h1) * 1.4)");
        expect(typeCss).toContain("calc(var(--q1-h1) * 2.2)");
        expect(heroCss.match(/var\(--q1-rung\)/g)).toHaveLength(4);
        expect(heroCss).not.toMatch(
            /dashboard-hero__figure--(?:lede|support|ancillary)[\s\S]{0,500}var\(--type-display-audacious\)/,
        );
    });
});
