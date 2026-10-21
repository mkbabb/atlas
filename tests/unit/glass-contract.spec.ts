// The glass-ui consumption contract that vue-tsc cannot see (U · D5A-W2, the glass 10.1 adopt).
//
// A glass-ui major can remove a prop, a custom property or a theme key without one type error:
//   - an undeclared prop falls through as an HTML attribute (vue-tsc reports only the first excess
//     property of a template object literal, and not at all for kebab attributes);
//   - a `var(--x)` whose definition left glass resolves to its fallback, or to the guaranteed-invalid
//     value, at computed-value time;
//   - a theme key glass sets to `initial` (glass 10 clears `--text-sm`/`--text-xs`) makes Tailwind emit
//     no rule for the utility, so the class is inert.
// Every check below is derived from atlas source and the INSTALLED glass-ui dist, never listed by hand,
// so the next glass major fails here instead of shipping silent drops.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseSfc } from "@vue/compiler-sfc";
import { NodeTypes, type ElementNode, type TemplateChildNode } from "@vue/compiler-dom";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = join(ROOT, "src");
const GLASS = join(ROOT, "node_modules/@mkbabb/glass-ui");

const walk = (d: string, re: RegExp, o: string[] = []): string[] => {
    for (const n of readdirSync(d)) {
        if (n === "node_modules") continue;
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p, re, o);
        else if (re.test(n) && !/\.(spec|test)\./.test(n)) o.push(p);
    }
    return o;
};
const rel = (f: string) => relative(ROOT, f);
const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const ATLAS_FILES = [...walk(SRC, /\.(vue|css|ts)$/), ...walk(join(ROOT, "styles"), /\.css$/)].map((f) => ({
    f,
    t: readFileSync(f, "utf8"),
}));
const GLASS_TEXT = walk(join(GLASS, "dist"), /\.(css|js)$/).map((f) => readFileSync(f, "utf8"));

describe("glass-ui component props used in atlas templates are declared by the component", () => {
    // Attribute names a component never declares because they belong to the rendered element.
    const HTML_ATTR =
        /^(class|style|id|key|ref|role|title|tabindex|lang|dir|hidden|inert|draggable|slot|is|for|name|type|href|target|rel|src|alt|value|disabled|placeholder|autofocus|popover|aria[A-Z].*|data[A-Z].*|on[A-Z].*)$/;

    function declaredOf(comp: any): Set<string> | null {
        if (!comp || typeof comp !== "object") return null;
        if (comp.props === undefined && !comp.mixins && !comp.extends) return null;
        const names = new Set<string>();
        const add = (p: any) => {
            if (Array.isArray(p)) p.forEach((k: string) => names.add(camel(k)));
            else if (p) Object.keys(p).forEach((k) => names.add(camel(k)));
        };
        add(comp.props);
        for (const m of comp.mixins ?? []) add(m.props);
        if (comp.extends) add(comp.extends.props);
        const emits = comp.emits;
        for (const e of Array.isArray(emits) ? emits : Object.keys(emits ?? {})) {
            const c = camel(e);
            names.add("on" + c[0].toUpperCase() + c.slice(1));
        }
        return names;
    }

    // Props atlas codes against ahead of the glass release that adds them (U/B7 PLAN §5.2: GlassDock
    // expandOn, anchor, collapsedLabel from glass lane G1, branch u/b7-glass-shape a88999b6b). Each is
    // accepted only while the installed glass lacks it; once the planted glass declares it, the
    // "still incoming" case below fails and the entry is deleted.
    const INCOMING_GLASS_PROPS = new Map([
        ["GlassDock", ["expandOn", "anchor", "collapsedLabel"]],
    ]);

    it("every incoming glass prop is still absent from the installed glass", async () => {
        const dock: any = await import("@mkbabb/glass-ui/dock");
        for (const [exp, props] of INCOMING_GLASS_PROPS) {
            const declared = declaredOf(dock[exp]) ?? new Set<string>();
            expect(props.filter((p) => declared.has(p)), `${exp}: delete the shipped entries`).toEqual([]);
        }
    });

    it("no atlas template passes an undeclared prop to a glass-ui component", async () => {
        const dropped: string[] = [];
        let checked = 0;
        for (const { f, t } of ATLAS_FILES.filter((x) => x.f.endsWith(".vue"))) {
            const { descriptor } = parseSfc(t, { filename: f });
            const script = (descriptor.scriptSetup?.content ?? "") + (descriptor.script?.content ?? "");
            const bindings = new Map<string, string>();
            for (const m of script.matchAll(
                /import\s*\{([^}]*)\}\s*from\s*["'](@mkbabb\/glass-ui\/[^"']+)["']/g,
            ))
                for (const part of m[1]
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s && !s.startsWith("type "))) {
                    const [orig, local = orig] = part.split(/\s+as\s+/);
                    bindings.set(local.trim(), `${m[2]}#${orig.trim()}`);
                }
            if (!bindings.size || !descriptor.template?.ast) continue;
            const visit = async (nodes: TemplateChildNode[]) => {
                for (const n of nodes) {
                    if (n.type !== NodeTypes.ELEMENT) continue;
                    const el = n as ElementNode;
                    const tag = bindings.has(el.tag)
                        ? el.tag
                        : [...bindings.keys()].find(
                              (k) => k.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() === el.tag,
                          );
                    if (tag) {
                        const [spec, exp] = bindings.get(tag)!.split("#");
                        const mod: any = await import(/* @vite-ignore */ spec).catch(() => null);
                        if (!mod || !(exp in mod)) {
                            dropped.push(`${rel(f)}:${el.loc.start.line} <${el.tag}> ${spec}#${exp} is not exported`);
                            await visit(el.children);
                            continue;
                        }
                        const declared = declaredOf(mod[exp]);
                        if (declared) {
                            checked++;
                            for (const p of el.props) {
                                const name =
                                    p.type === NodeTypes.ATTRIBUTE
                                        ? p.name
                                        : p.name === "bind" && p.arg?.type === NodeTypes.SIMPLE_EXPRESSION
                                          ? p.arg.content
                                          : p.name === "model"
                                            ? p.arg?.type === NodeTypes.SIMPLE_EXPRESSION
                                                ? p.arg.content
                                                : "modelValue"
                                            : null;
                                if (!name) continue;
                                const c = camel(name);
                                if (HTML_ATTR.test(c) || declared.has(c)) continue;
                                if (INCOMING_GLASS_PROPS.get(exp)?.includes(c)) continue;
                                dropped.push(`${rel(f)}:${el.loc.start.line} <${el.tag} ${name}>`);
                            }
                        }
                    }
                    await visit(el.children);
                }
            };
            await visit(descriptor.template.ast.children);
        }
        expect(checked).toBeGreaterThan(0);
        expect(dropped).toEqual([]);
    }, 120_000);
});

describe("custom properties atlas reads resolve to atlas or the installed glass-ui", () => {
    const defsIn = (texts: string[]) => {
        const s = new Set<string>();
        for (const t of texts) {
            for (const m of t.matchAll(/(--[\w-]+)\s*:/g)) s.add(m[1]);
            for (const m of t.matchAll(/setProperty\(\s*["'`](--[\w-]+)/g)) s.add(m[1]);
            for (const m of t.matchAll(/["'`](--[\w-]+)["'`]\s*[:\]]/g)) s.add(m[1]);
            for (const m of t.matchAll(/@property\s+(--[\w-]+)/g)) s.add(m[1]);
        }
        return s;
    };
    // Names atlas reads that neither atlas nor glass defines BY DESIGN: the consumer (or a runtime
    // writer outside the regex's reach) supplies them, and each read site either carries a fallback
    // or is a runtime-composed template. Adding a name here is a reviewed act, not a silencer: a
    // glass-ui token never belongs in this list.
    const SUPPLIED_ELSEWHERE = new Set([
        "--a", // atmosphere.ts template `var(--${a})` scan artefact
        "--token", // ink.ts / useAuroraConfig.ts template `var(--${token})` scan artefact
        "--beat-cis",
        "--beat-tl",
        "--brand",
        "--dock-bar-reserve", // the phone bar reserve (PLAN §2.2); A1 defines it in the shell, EntityDetail reads it with a 0px fallback
        "--breath-depth",
        "--breath-period",
        "--dot-op",
        "--duration-sheen",
        "--len",
        "--mark-highlight",
        "--mark-highlight-bright",
        "--mark-scrub-start",
        "--safe-foot",
        "--source-lead-col",
        "--surface-card",
        "--title-law-max",
        "--title-law-min",
        "--title-sticky-top",
        "--type-panel-title",
        "--veil-mask-extent",
        "--vft-accent",
        "--vft-moss",
        "--vft-ochre",
        "--vft-sage",
        "--vft-viz-high",
        "--vft-viz-low",
        "--z-atmosphere-grid",
        "--z-sticky",
        "--seal-stroke-width", // CompletionSeal's consumer-tunable nib, read with its own fallback
    ]);
    // Tokens atlas reads ahead of the glass release that defines them, each with a fallback (U/B7
    // PLAN §5.7: --radius-bar from glass lane G1). Accepted only while the installed glass lacks them.
    const INCOMING_GLASS_TOKENS = new Set(["--radius-bar"]);
    it("every incoming glass token is still absent from the installed glass", () => {
        const glass = defsIn(GLASS_TEXT);
        expect([...INCOMING_GLASS_TOKENS].filter((k) => glass.has(k))).toEqual([]);
    });

    it("every var(--x) atlas reads is defined by atlas, by glass-ui, or is a reviewed consumer-supplied name", () => {
        const defined = new Set([...defsIn(ATLAS_FILES.map((x) => x.t)), ...defsIn(GLASS_TEXT)]);
        const unresolved = new Map<string, Set<string>>();
        for (const { f, t } of ATLAS_FILES)
            for (const m of t.matchAll(/var\(\s*(--[\w-]*\w)(?![\w-]|\$\{)/g)) {
                // A name composed at runtime (`var(--viz-${key})`) is not a token reference.
                const k = m[1];
                if (defined.has(k) || SUPPLIED_ELSEWHERE.has(k) || INCOMING_GLASS_TOKENS.has(k)) continue;
                if (!unresolved.has(k)) unresolved.set(k, new Set());
                unresolved.get(k)!.add(rel(f));
            }
        expect(
            [...unresolved].map(([k, fs]) => `${k} (${[...fs].join(", ")})`).sort(),
        ).toEqual([]);
    });

    it("no reviewed consumer-supplied name is actually a glass-ui token", () => {
        const glass = defsIn(GLASS_TEXT);
        expect([...SUPPLIED_ELSEWHERE].filter((k) => glass.has(k))).toEqual([]);
    });
});

describe("theme keys glass-ui clears are not used as atlas utilities", () => {
    // glass `@theme inline { --text-sm: initial; … }`: Tailwind emits no rule for a cleared key.
    const cleared = new Set<string>();
    for (const t of GLASS_TEXT)
        for (const m of t.matchAll(/--([a-z]+)-([\w-]+)\s*:\s*initial\b/g)) cleared.add(`${m[1]}-${m[2]}`);

    it("glass-ui's theme still clears at least one key (the check is live)", () => {
        expect(cleared.size).toBeGreaterThan(0);
    });

    it("no atlas class list or @apply names a cleared utility", () => {
        const hits: string[] = [];
        // Comments may name a retired utility (a migration note); only live code counts.
        const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*\/\/.*$/gm, "");
        for (const { f, t: raw } of ATLAS_FILES) {
            const t = code(raw);
            const sources: string[] = [];
            for (const m of t.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) sources.push(m[1]);
            for (const m of t.matchAll(/@apply\s+([^;]+);/g)) sources.push(m[1]);
            for (const m of t.matchAll(/["'`]([^"'`\n]*)["'`]/g)) sources.push(m[1]);
            for (const s of sources)
                for (const tok of s.split(/\s+/)) {
                    const bare = tok.replace(/^.*:/, "").replace(/^!/, "");
                    if (cleared.has(bare)) hits.push(`${rel(f)} ${tok}`);
                }
        }
        expect([...new Set(hits)].sort()).toEqual([]);
    });
});

describe("named theme utilities atlas writes resolve to a theme key", () => {
    // `z-<name>` reads `--z-index-<name>` and `ease-<name>` reads `--ease-<name>` from the Tailwind
    // theme. glass 8 removed `--z-index-hovercard` and the `--ease-spring-*` family, so a class like
    // `z-hovercard` compiled to NO rule and the element lost its stacking rung without an error.
    // Tailwind's own defaults for these namespaces are listed; everything else must be declared
    // by glass-ui or by atlas.
    const TAILWIND_DEFAULT = new Set(["ease-linear", "ease-in", "ease-out", "ease-in-out", "z-auto"]);
    const declared = new Set<string>();
    for (const t of [...GLASS_TEXT, ...ATLAS_FILES.map((x) => x.t)])
        for (const m of t.matchAll(/--(z-index|ease)-([\w-]+)\s*:/g))
            declared.add(`${m[1] === "z-index" ? "z" : "ease"}-${m[2]}`);

    it("every z-/ease- class token in an atlas class list or @apply has a theme key", () => {
        const misses: string[] = [];
        const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");
        for (const { f, t: raw } of ATLAS_FILES) {
            const t = code(raw);
            const lists: string[] = [];
            for (const m of t.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) lists.push(m[1]);
            for (const m of t.matchAll(/@apply\s+([^;]+);/g)) lists.push(m[1]);
            for (const list of lists)
                for (const tok of list.split(/\s+/)) {
                    const bare = tok.replace(/^.*:/, "").replace(/^!/, "");
                    if (!/^(z|ease)-[a-z][\w-]*$/.test(bare)) continue;
                    if (TAILWIND_DEFAULT.has(bare) || declared.has(bare)) continue;
                    misses.push(`${rel(f)} ${tok}`);
                }
        }
        expect([...new Set(misses)].sort()).toEqual([]);
    });
});

describe("glass-owned classes and slots atlas names exist in the installed glass-ui", () => {
    // A class glass deletes (`.glass-material` at 10; `.glass-gilt`, `.focus-ring-gold` before it)
    // or a part it re-cuts (`.hm__svg`, `.status-dot__dot`, `[data-glass-drawer]`) leaves an atlas
    // class list or selector pointing at nothing: no error, just lost paint or a dead override.
    const GLASS_PREFIX =
        /^(glass-|focus-ring|paper-(grain|underpaint|grid|texture|aged)|metal-|hm[-_]|status-dot|labeled-field|completion-seal)/;
    const classDefs = (texts: string[]) => {
        const out = new Set<string>();
        for (const t of texts) {
            for (const m of t.matchAll(/\.((?:\\.|[\w-])+)/g)) out.add(m[1].replace(/\\(.)/g, "$1"));
            for (const m of t.matchAll(/@utility\s+([\w-]+)/g)) out.add(m[1]);
            for (const m of t.matchAll(/class:\s*"([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => out.add(c));
            for (const m of t.matchAll(/"([\w-]+(?:\s+[\w-]+)*)"/g)) m[1].split(/\s+/).forEach((c) => out.add(c));
        }
        return out;
    };
    const glassClasses = classDefs(GLASS_TEXT);
    const uncomment = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
    const atlasCss = ATLAS_FILES.map(({ t: raw }) => uncomment(raw)).map((t) =>
        [...t.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n") +
        (t.includes("<template") ? "" : t),
    );
    const atlasClasses = new Set<string>();
    for (const t of atlasCss) {
        for (const m of t.matchAll(/\.((?:\\.|[\w-])+)/g)) atlasClasses.add(m[1].replace(/\\(.)/g, "$1"));
        for (const m of t.matchAll(/@utility\s+([\w-]+)/g)) atlasClasses.add(m[1]);
    }
    const code = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "");

    it("every glass-prefixed class in an atlas class list is defined by glass-ui or atlas", () => {
        const misses: string[] = [];
        for (const { f, t: raw } of ATLAS_FILES) {
            const t = code(raw);
            for (const m of t.matchAll(/\bclass\s*=\s*"([^"]*)"/g))
                for (const tok of m[1].split(/\s+/))
                    if (GLASS_PREFIX.test(tok) && !glassClasses.has(tok) && !atlasClasses.has(tok))
                        misses.push(`${rel(f)} ${tok}`);
        }
        expect([...new Set(misses)].sort()).toEqual([]);
    });

    it("every :deep()/:global() glass-prefixed class and data-slot atlas styles exists in glass-ui", () => {
        const glassJs = GLASS_TEXT.join("\n");
        const misses: string[] = [];
        for (const { f, t: raw } of ATLAS_FILES) {
            const t = code(raw);
            for (const m of t.matchAll(/:(?:deep|global)\(([^)]*(?:\([^)]*\))?[^)]*)\)/g)) {
                for (const c of m[1].matchAll(/\.((?:\\.|[\w-])+)/g)) {
                    const cls = c[1];
                    if (GLASS_PREFIX.test(cls) && !glassClasses.has(cls) && !atlasClasses.has(cls))
                        misses.push(`${rel(f)} .${cls}`);
                }
                for (const a of m[1].matchAll(/\[(data-[\w-]+)(?:="([^"]*)")?\]/g)) {
                    const [, attr, val] = a;
                    if (!/^data-(slot|glass-)/.test(attr)) continue;
                    const needle = val ? `"${attr}": "${val}"` : `"${attr}"`;
                    if (!glassJs.includes(needle) && !(val && glassJs.includes(`${attr}="${val}"`)))
                        misses.push(`${rel(f)} [${attr}${val ? `="${val}"` : ""}]`);
                }
            }
        }
        expect([...new Set(misses)].sort()).toEqual([]);
    });
});
