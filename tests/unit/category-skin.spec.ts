import { describe, expect, it } from "vitest";
import { SKINS, defineSkin, resolveSkin } from "../../src/skin/category";
import type { StoryManifest } from "../../src/story";
import { resolveCompletionSeal } from "../../src/design/recipes/completion";

const invalidStorySkin: StoryManifest = {
    id: "invalid-skin",
    // @ts-expect-error Story manifests may name only a published SKINS key.
    skin: "not-a-skin",
    points: [],
};
void invalidStorySkin;

describe("category skins", () => {
    it("resolve the closed dashboard categories to distinct rendered identities", () => {
        expect(Object.keys(SKINS)).toEqual(["funds", "connectivity", "outcomes"]);
        expect(resolveSkin("funds")).toMatchObject({
            backgroundFamily: "constellation",
            background: "liquid-grid",
            shape: "wordmark",
        });
        expect(resolveSkin("connectivity")).toMatchObject({
            backgroundFamily: "aurora",
            background: "watercolor-dot",
            shape: "check",
        });
        expect(resolveSkin("outcomes")).toMatchObject({
            background: "blob",
            shape: "ring",
        });
    });

    it("resolves a manifest skin once, and carries PRESENTATION only (never route theming)", () => {
        const story = { id: "example", skin: "funds", points: [] } satisfies StoryManifest;
        expect(resolveSkin(story.skin)).toBe(SKINS.funds);

        const skin = defineSkin({
            id: "proof",
            category: "connectivity",
            backgroundFamily: "aurora",
            label: "Proof",
            accent: "teal",
            background: "watercolor-dot",
            shape: "check",
        });
        // The skin is frozen presentation: no chrome legs, no atmosphere, no ramp, no `--route-*`
        // writer — the route's colour identity is its Theme, bound once by the platform shell.
        expect(Object.keys(skin).sort()).toEqual([
            "accent",
            "background",
            "backgroundFamily",
            "category",
            "id",
            "label",
            "shape",
        ]);
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
