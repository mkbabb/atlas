// The cascade contract, kept in the consumer's compile: the root-order assertion reads the root's
// source; the wrap then leaves only atlas layers at the top level of THAT root, and of no other sheet.
import { describe, expect, it } from "vitest";
import type { Plugin } from "vite";
import { ATLAS_LAYER_ORDER, atlasLayers, checkRootOrder, topLevelItems, wrapInAtlasLayers } from "./preset";

const ROOT = '@import "tailwindcss";\n@import "@mkbabb/glass-ui/styles";\n@import "@mkbabb/atlas/styles";\n';
const compiled = [
    "@layer theme, base, components, utilities;",
    ":root { --font-text: 'Plus Jakarta Sans'; }",
    "body { font-family: var(--font-text); } /* a } in a comment */",
    ".q::before { content: \"}\"; }",
    ".\\[\\&_svg\\:not\\(\\[class\\*\\=\\'size-\\'\\]\\)\\] svg { width: 1rem; }",
    ATLAS_LAYER_ORDER,
    "@layer atlas.tokens { :root { --font-text: Newsreader; } }",
    "@layer utilities { .p-2 { padding: .5rem; } }",
    "@layer atlas.components { .x[data-v-1] { color: red; } }",
].join("\n");

type T = (code: string, id: string) => { code: string } | undefined;
const plugins = () => {
    const [order, layers] = atlasLayers() as [Plugin, Plugin];
    return { pre: order.transform as T, wrap: layers.transform as T, order, layers };
};

describe("atlas:root-order", () => {
    it("runs before Tailwind compiles the root", () => expect(plugins().order.enforce).toBe("pre"));
    it("accepts tailwindcss → glass → atlas", () => expect(checkRootOrder(ROOT)).toBe(true));
    it("ignores a sheet that does not import the atlas styles", () =>
        expect(checkRootOrder('@import "tailwindcss";\n.a{b:c}')).toBe(false));
    it("throws when atlas precedes glass", () =>
        expect(() => checkRootOrder('@import "tailwindcss";\n@import "@mkbabb/atlas/styles";\n@import "@mkbabb/glass-ui/styles";', "/x/styles.css")).toThrow(
            /atlas:root-order: \/x\/styles\.css imports tailwindcss → @mkbabb\/atlas\/styles → @mkbabb\/glass-ui\/styles/,
        ));
    it("throws when glass is absent", () =>
        expect(() => checkRootOrder('@import "tailwindcss";\n@import "@mkbabb/atlas/styles";')).toThrow(/atlas:root-order/));
    it("throws when tailwindcss is not first", () =>
        expect(() => checkRootOrder('@import "@mkbabb/glass-ui/styles";\n@import "tailwindcss";\n@import "@mkbabb/atlas/styles";')).toThrow(/atlas:root-order/));
    it("does not read a commented-out import", () =>
        expect(() => checkRootOrder('@import "tailwindcss";\n/* @import "@mkbabb/glass-ui/styles"; */\n@import "@mkbabb/atlas/styles";')).toThrow(/atlas:root-order/));
});

describe("atlas:layers", () => {
    it("wraps the root the order plugin recorded, by module id (query ignored)", () => {
        const { pre, wrap } = plugins();
        pre(ROOT, "/app/styles.css");
        expect(wrap(compiled, "/app/styles.css?direct")?.code.startsWith(ATLAS_LAYER_ORDER)).toBe(true);
    });
    it("leaves any other sheet alone, even one that names an atlas layer", () => {
        const { pre, wrap } = plugins();
        pre(ROOT, "/app/styles.css");
        pre("@layer atlas.components { .mine { color: red } }", "/app/other.css");
        expect(wrap("@layer atlas.components { .mine { color: red } } body{color:blue}", "/app/other.css")).toBeUndefined();
    });
    const out = wrapInAtlasLayers(compiled);
    it("leads with the atlas layer order", () => expect(out.startsWith(ATLAS_LAYER_ORDER)).toBe(true));
    it("leaves only atlas layers at top level", () => {
        for (const item of topLevelItems(out)) expect(item.trim()).toMatch(/^@layer atlas[\s.,;{]/);
    });
    it("keeps foreign rules, in order, inside atlas.recipes", () => {
        expect(out.indexOf("Plus Jakarta")).toBeLessThan(out.indexOf("Newsreader"));
        expect(out).toContain('content: "}"');
        expect(out.match(/@layer atlas\.recipes \{/g)).toHaveLength(2);
    });
    it("throws on unbalanced input instead of passing it through", () => {
        expect(() => wrapInAtlasLayers("a { b: c;")).toThrow(/unbalanced/);
    });
});
