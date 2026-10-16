// styles/contract.spec.ts — the shipped styles contract (`dist/styles/**`) as the consumer compiles it
// (U · D5A-W1). Runs after `npm run build` (CI and prepublishOnly both build first); a missing dist is
// a failure.
//
//  1. No declaration atlas authors is lost in the consumer's Lightning CSS pass. atlas ships source;
//     the consumer's Tailwind runs `optimize` (Lightning CSS at Tailwind's targets) over it. With
//     `backdrop-filter:X; -webkit-backdrop-filter:X` that pass keeps ONLY the prefixed form, so the
//     unprefixed declaration is lost in every engine that reads it.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, optimize } from "@tailwindcss/node";
import postcss, { type AtRule, type ChildNode, type Container } from "postcss";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST_STYLES = resolve(HERE, "../dist/styles");
// The consumer root the contract prescribes (README; atlas:root-order enforces it in the preset).
const ROOT = '@import "tailwindcss";\n@import "@mkbabb/glass-ui/styles";\n@import "./index.css";\n';

function shipped(): string {
    if (!existsSync(join(DIST_STYLES, "index.css")))
        throw new Error("dist/styles/index.css is absent: run `npm run build` before the styles contract spec");
    return DIST_STYLES;
}

// ─── 1 · no declaration lost ────────────────────────────────────────────────────────────────────
const family = (p: string) => p.replace(/^-(webkit|moz|ms|o)-/, "");
// Longhands Lightning CSS folds into a shorthand whose name is not their prefix (CSS spec shorthands).
const SHORTHAND: Record<string, string> = {
    "row-gap": "gap", "column-gap": "gap",
    "flex-direction": "flex-flow", "flex-wrap": "flex-flow",
    "align-items": "place-items", "justify-items": "place-items",
    "align-content": "place-content", "justify-content": "place-content",
    "align-self": "place-self", "justify-self": "place-self",
    top: "inset", right: "inset", bottom: "inset", left: "inset",
};
const GRID_AREA = /^grid-(row|column)(-start|-end)?$/;
/** Property names under a node (nested rules included), as written. */
function props(node: ChildNode | Container): string[] {
    const out: string[] = [];
    (node as Container).walkDecls?.((d) => void out.push(d.prop.toLowerCase()));
    return out;
}
/**
 * Loss of one authored property P under Lightning CSS: no property of P's family survives (a
 * longhand folding into its shorthand counts as kept), or P was unprefixed and only a vendor-prefixed
 * form of it survives.
 */
function lostProps(before: string[], after: string[]): string[] {
    const kept = new Set(after);
    const keptFamilies = new Set(after.map(family));
    const related = (p: string) =>
        [...keptFamilies].some(
            (q) => q === p || p.startsWith(q + "-") || q.startsWith(p + "-") || SHORTHAND[p] === q || (GRID_AREA.test(p) && q === "grid-area"),
        );
    const lost = new Set<string>();
    for (const p of before) {
        if (p.startsWith("--")) continue;
        const f = family(p);
        if (!related(f)) lost.add(p);
        else if (p === f && !kept.has(p) && [...kept].some((q) => q !== p && family(q) === p)) lost.add(p);
    }
    return [...lost];
}
async function consumerCompiled(): Promise<string> {
    const base = shipped();
    const compiler = await compile(ROOT, { base, onDependency: () => {} });
    return compiler.build([]);
}
/** Every child of an atlas layer block, each optimized on its own (so no cross-rule merge hides a loss). */
function atlasItemLosses(compiled: string): { checked: number; findings: string[] } {
    const findings: string[] = [];
    let checked = 0;
    const root = postcss.parse(compiled);
    // Each item is optimized alone, so it carries the sheet's @custom-media definitions with it.
    const customMedia: string[] = [];
    root.walkAtRules("custom-media", (m) => void customMedia.push(m.toString() + ";"));
    root.walkAtRules("layer", (layer: AtRule) => {
        if (!/^atlas(\.|$)/.test(layer.params.trim()) || !layer.nodes) return;
        for (const child of layer.nodes) {
            if (child.type === "comment" || (child.type === "atrule" && child.name === "layer")) continue;
            const before = props(child);
            if (!before.length) continue;
            checked++;
            const mini = `${customMedia.join("\n")}\n@layer ${layer.params} {\n${child.toString()}\n}`;
            const after = props(postcss.parse(optimize(mini, { minify: true }).code));
            for (const p of lostProps(before, after))
                findings.push(`${layer.params} · ${(child.type === "rule" ? child.selector : "@" + (child as AtRule).name + " " + (child as AtRule).params).slice(0, 120)} · ${p}`);
        }
    });
    return { checked, findings };
}

describe("the consumer's Lightning CSS pass loses no atlas declaration", () => {
    it("the loss rule itself: unprefixed-only survival is kept, prefixed-only survival is a loss", () => {
        expect(lostProps(["backdrop-filter", "-webkit-backdrop-filter"], ["-webkit-backdrop-filter"])).toEqual(["backdrop-filter"]);
        expect(lostProps(["backdrop-filter"], ["-webkit-backdrop-filter", "backdrop-filter"])).toEqual([]);
        expect(lostProps(["margin-top", "margin-bottom", "margin-left", "margin-right"], ["margin"])).toEqual([]);
        expect(lostProps(["row-gap", "column-gap", "grid-row", "grid-column"], ["gap", "grid-area"])).toEqual([]);
        expect(lostProps(["color"], [])).toEqual(["color"]);
    });
    it("every atlas-layer item keeps every authored property", async () => {
        const compiled = await consumerCompiled();
        expect(compiled).toMatch(/@layer atlas\.components/);
        const { checked, findings } = atlasItemLosses(compiled);
        console.log(`styles-contract: ${checked} atlas-layer items optimized, ${findings.length} losses`);
        expect(checked).toBeGreaterThan(500);
        expect(findings).toEqual([]);
    }, 60_000);
});
