import { describe, expect, it } from "vitest";
import {
    CATEGORY_SKINS,
    SKINS,
    defineSkin,
    resolveCategorySkin,
    resolveSkin,
    skinCssVars,
} from "@/skin/category";
import type { StoryManifest } from "@/story";
import { resolveCompletionSeal } from "@/design/recipes/completion";

const invalidStorySkin: StoryManifest = {
    id: "invalid-skin",
    // @ts-expect-error Story manifests may name only a published SKINS key.
    skin: "not-a-skin",
    points: [],
};
void invalidStorySkin;

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

    it("resolves a manifest skin once and binds the established inherited CSS contract", () => {
        const story = { id: "example", skin: "funds", points: [] } satisfies StoryManifest;
        expect(resolveSkin(story.skin)).toBe(SKINS.funds);

        const skin = defineSkin({
            id: "proof",
            category: "connectivity",
            surfaceKind: "data",
            backgroundFamily: "aurora",
            atmosphere: {},
            chrome: {
                accent: "teal",
                accentWarm: "warm",
                accentCool: "cool",
                eyebrowHue: "eyebrow",
            },
            type: { audacious: "10rem", masthead: "6rem" },
        });
        expect(skinCssVars(skin)).toEqual({
            "--route-accent": "teal",
            "--route-accent-warm": "warm",
            "--route-accent-cool": "cool",
            "--route-eyebrow-hue": "eyebrow",
            "--q1-rung": "10rem",
            "--type-masthead-headline": "6rem",
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
