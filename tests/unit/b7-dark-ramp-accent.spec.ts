// C-05 / T-12 (PLAN §8.3, R-TAB-ECF defect 2): the dark sequential ramp is widened so per-student tints
// separate on dark stock (its lightness span at least matches the light arm's and its ends are wider
// apart than before), and every token a dashboard uses as `meta.accent` clears 3:1 against the dark
// card it sits on. Before: dark ramp L 0.35 → 0.78; --ncsu-red had no dark value (2.7:1 on the card).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "../../src/design/tokens/color.css"), "utf8");

/** The value a token takes in the first block whose selector is `sel`, searching every such block. */
function token(sel: ":root" | ".dark", name: string): string | null {
    const re = new RegExp(`(^|\\n)${sel.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`, "g");
    let found: string | null = null;
    for (const m of css.matchAll(re)) {
        const body = m[2]!.replace(/\/\*[\s\S]*?\*\//g, "");
        const d = new RegExp(`${name}:\\s*([^;]+);`).exec(body);
        if (d) found = d[1]!.replace(/\s+/g, " ").trim();
    }
    return found;
}

type RGB = [number, number, number];
function oklchToRgb(l: number, c: number, hDeg: number): RGB {
    const h = (hDeg * Math.PI) / 180;
    const a = c * Math.cos(h);
    const b = c * Math.sin(h);
    const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin: RGB = [
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
    ];
    return lin.map((v) => Math.min(1, Math.max(0, v))) as RGB;
}
function hexToLinear(hex: string): RGB {
    const n = hex.replace("#", "");
    return [0, 2, 4].map((i) => {
        const v = parseInt(n.slice(i, i + 2), 16) / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }) as RGB;
}
function hslToLinear(h: number, s: number, l: number): RGB {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as RGB;
}
function linear(value: string): RGB {
    const v = value.trim();
    let m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(v);
    if (m) return oklchToRgb(+m[1]!, +m[2]!, +m[3]!);
    m = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(v);
    if (m) return hslToLinear(+m[1]!, +m[2]!, +m[3]!);
    if (v.startsWith("#")) return hexToLinear(v);
    throw new Error(`unparsed colour ${v}`);
}
const lum = (rgb: RGB) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
function contrast(a: string, b: string): number {
    const [x, y] = [lum(linear(a)), lum(linear(b))].sort((p, q) => q - p);
    return (x! + 0.05) / (y! + 0.05);
}
const L = (v: string) => Number(/oklch\(\s*([\d.]+)/.exec(v)![1]);

/** The tokens the dashboards name as `meta.accent` (u/build, every `dashboards/<slug>/meta.ts`). */
const ACCENT_TOKENS = [
    "--viz-sequential-high",
    "--viz-diverging-high",
    "--rainbow-signature-1",
    "--viz-speedtest-bright",
    "--ncsu-red",
];

describe("dark arm (C-05, T-12)", () => {
    it("the dark sequential ramp spans at least the light arm's lightness and is wider than 0.43", () => {
        const dLow = L(token(".dark", "--viz-sequential-low")!);
        const dHigh = L(token(".dark", "--viz-sequential-high")!);
        const lLow = L(token(":root", "--viz-sequential-low")!);
        const lHigh = L(token(":root", "--viz-sequential-high")!);
        expect(Math.abs(dHigh - dLow)).toBeGreaterThanOrEqual(Math.abs(lLow - lHigh));
        expect(Math.abs(dHigh - dLow)).toBeGreaterThanOrEqual(0.5);
    });

    it("every meta.accent token clears 3:1 on the dark card", () => {
        const card = token(".dark", "--card")!;
        for (const name of ACCENT_TOKENS) {
            const dark = token(".dark", name) ?? token(":root", name);
            expect(dark, name).not.toBeNull();
            expect(contrast(dark!, card), `${name} ${dark} on ${card}`).toBeGreaterThanOrEqual(3);
        }
    });
});
