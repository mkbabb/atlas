// U/B7 O-11 (PLAN §5.5): every menu atlas renders is a glass primitive. No template renders a native
// <select>, and none builds its own menu or listbox (role="menu", "menuitem", "listbox", "option" or
// aria-haspopup="menu"/"listbox"). The one exemption is named: SelectionRegion's roving listbox is
// the keyboard model of a map's regions, not a dropdown.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../src");
const EXEMPT = new Map([["charts/geo/SelectionRegion.vue", "the map's region listbox (keyboard model, not a menu)"]]);

function vueFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) return vueFiles(p);
        return name.endsWith(".vue") ? [p] : [];
    });
}
function template(src: string): string {
    const open = src.indexOf("<template");
    const close = src.lastIndexOf("</template>");
    return open >= 0 && close > open ? src.slice(open, close).replace(/<!--[\s\S]*?-->/g, "") : "";
}

const PATTERNS: [string, RegExp][] = [
    ["native <select>", /<select[\s>]/],
    ["role=menu", /role="menu(item)?"/],
    ["role=listbox", /role="listbox"/],
    ["role=option", /role="option"/],
    ["aria-haspopup menu/listbox", /aria-haspopup="(menu|listbox|true)"/],
];

describe("menu census (O-11)", () => {
    const files = vueFiles(ROOT);
    it("scans every template", () => {
        expect(files.length).toBeGreaterThanOrEqual(90);
    });
    it("no template renders a native select or a hand-built menu", () => {
        const found: string[] = [];
        for (const f of files) {
            const rel = relative(ROOT, f);
            if (EXEMPT.has(rel)) continue;
            const t = template(readFileSync(f, "utf8"));
            for (const [name, re] of PATTERNS) if (re.test(t)) found.push(`${rel}: ${name}`);
        }
        expect(found).toEqual([]);
    });
});
