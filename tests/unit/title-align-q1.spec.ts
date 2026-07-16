import { describe, expect, it } from "vitest";
import { resolveTitleAlign, type TitleAlign } from "../../src/editorial/title-align";

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
