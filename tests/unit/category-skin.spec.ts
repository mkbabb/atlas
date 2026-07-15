import { describe, expect, it } from "vitest";
import { CATEGORY_SKINS, SKINS, resolveCategorySkin } from "@/skin/category";
import { resolveCompletionSeal } from "@/design/recipes/completion";

describe("category skins", () => {
    it("resolve the closed dashboard categories to distinct rendered identities", () => {
        expect(Object.keys(CATEGORY_SKINS)).toEqual(["funds", "connectivity", "outcomes"]);
        expect(CATEGORY_SKINS).toBe(SKINS);
        expect(resolveCategorySkin("funds")).toMatchObject({
            backgroundFamily: "constellation",
            background: "liquid-grid",
            shape: "wordmark",
        });
        expect(resolveCategorySkin("connectivity")).toMatchObject({
            backgroundFamily: "aurora",
            background: "watercolor-dot",
            shape: "check",
        });
        expect(resolveCategorySkin("outcomes")).toMatchObject({
            background: "blob",
            shape: "ring",
        });
    });
});

describe("completion recipe", () => {
    it("mounts only after completion and forwards every paint input", () => {
        const input = { complete: false, label: "Figures complete", shape: "ring" as const };

        expect(resolveCompletionSeal(input)).toBeNull();
        expect(resolveCompletionSeal({ ...input, complete: true })).toEqual({
            label: "Figures complete",
            shape: "ring",
            play: true,
        });
    });
});
