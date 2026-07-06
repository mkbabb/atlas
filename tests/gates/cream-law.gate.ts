// platform/design/cream-law.gate.ts — THE EXECUTABLE CREAM-LAW CONTRAST GATE.
//
// The standing replacement for the absolute-OKLab-L lint (render-matrix.spec.ts:218).
// It implements the FROZEN contract authored in C0:
//   usf/docs/tranches/C/gates/contrast-gate.spec.md
// and seeds its assertions from the verified columns of
//   usf/docs/tranches/C/audit/fd-warm-ground-palette.md §1.4 / §2.3 / §3.2 / §3.4 / §4.2.
//
// PAPER, NOT PIXELS — the eye does not see a token's own L; it sees the FIGURE-TO-GROUND
// contrast of a stop against the RESOLVED --background of the active theme. So the gate
// measures resolved-background-relative contrast, never absolute L:
//
//   ① WARMTH-IS-VISIBLE (the "reads as paper" test, §1):
//        chroma(--background) ≥ 0.018      (above the near-white JND, not "hue in band")
//        hue(--background)    ∈ [40, 90]    (the warm spine — cream 44–48 / ink 50–80)
//        contrast(--background, #ffffff) ≥ 1.08   (the page is MEASURABLY not blank white)
//        contrast(--card, --background)  ≥ 1.05   (the C1 engraved-plate demarcation reads)
//
//   ② FIGURE-TO-GROUND (the "clears the floor + separates" test, §2):
//        ②.a  APCA Lc ≥ 45  OR  WCAG ≥ 3.0       (the FIGURE-ON-GROUND stops: the dark
//             rainbow + every diverging/sequential/program magnitude pole, both arms. The
//             LIGHT-arm rainbow is NOT a figure-on-ground stop — see ②.c.)
//        ②.b  ΔC_ab(stop, ground) ≥ 0.110         (DARK ARM ONLY — chromatic-plane vector
//             separation, NOT ΔL/Δh/APCA: the deployed apex PASSES ΔL/Δh/APCA on the cool
//             ground while sinking to mud — §2.1. ΔC_ab is the only metric that is
//             red-on-cool / green-on-warm, because it is hue-sensitive — §4 RR-1.a.)
//        ②.c  INTER-TIER SEPARATION (the RAINBOW band-cake quantity, both arms): min adjacent
//             ΔEOK ≥ 0.008 AND total spectral path Σ ΔEOK ≥ 0.40. The SCI rainbow is a STACKED
//             band-cake (RainbowStack.vue → StackedBar, borderless clean bands) — its tiers are
//             read against EACH OTHER, never as fills against the cream they are never adjacent
//             to (audit §3.2 documents the middle tiers' light-cream contrast as INTENTIONALLY
//             LOW). Measuring every-tier-vs-ground-on-light is the WRONG quantity (INV-C4); ②.c
//             is the right one. This is the SAME quantity ground-matrix.spec.ts reconciles to —
//             the unit gate and the π-matrix measure ONE band-cake quantity and cannot drift.
//
// THE THREE-NEGATIVE-TEST DISCIPLINE (the gate must actually GATE): the gate is GREEN on
// the warm grounds AND demonstrably RED on (1) a synthetic chroma-0.008 near-white token
// (the §1.1 deployed cream — fails ①), (2) the synthetic static-dark-rainbow apex resolved
// against the OLD cool ground #161b20 (the §3.1 apex — fails ②.b), and (3) a synthetic
// muddy/monochrome rainbow (one hue, collapsed bands — fails ②.c). The asymmetry is the
// gate's own falsifiability proof.
//
// USABLE FROM BOTH SEAMS (no rendered surface required):
//   • a pure VITEST unit — seed from the authored :root / .dark token text (§1.4/§2.3/§3.4);
//   • a PLAYWRIGHT runtime — pass the resolved sRGB values sampled off the live tokens.
// The gate reads tokens; it does NOT author them (tokens.css / oklab.ts are other units').
//
// All OKLab / OKLCH / contrast figures are computed by the EXACT forward map the render
// matrix uses — the canonical Björn Ottosson sRGB↔OKLab matrix (mirrored from oklab.ts /
// render-matrix.spec.ts:79-99), the WCAG relative-luminance contrast formula, the APCA Lc
// estimate, and Euclidean OKLab chromatic-plane distance.

// ─────────────────────────────────────────────────────────────────────────────
// 0. COLOR MATH — the canonical Ottosson matrix (mirrors oklab.ts), WCAG, APCA, ΔC_ab.
// ─────────────────────────────────────────────────────────────────────────────

export interface Oklab {
    L: number;
    a: number;
    b: number;
}

export type RGB = readonly [number, number, number];

/** sRGB channel [0,255] → linear-light [0,1] (the matrix's own gamma, oklab.ts §s2l). */
function srgbChannelToLinear(u: number): number {
    const x = u / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

/** sRGB [0,255]³ → OKLab. The exact forward map of render-matrix.spec.ts:79-92 (and the
    inverse of oklab.ts oklabToRgb), carrying the a/b axes the chromatic-plane metric needs. */
export function srgbToOklab([r, g, b]: RGB): Oklab {
    const lr = srgbChannelToLinear(r);
    const lg = srgbChannelToLinear(g);
    const lb = srgbChannelToLinear(b);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return {
        L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    };
}

/** OKLab → sRGB [0,255]³, the canonical matrix from oklab.ts oklabToRgb, gamut-clamped.
    Used to round-trip an authored `oklch(L C H)` GROUND token into the sampled sRGB the
    gate measures (so the vitest seam needs no browser to resolve a token). */
export function oklabToRgb255({ L, a, b }: Oklab): RGB {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const f = (x: number): number => {
        const c = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, c)) * 255);
    };
    return [
        f(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        f(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        f(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
}

/** Parse an `oklch(L C H)` token (the authored stop form, % or unit L) into OKLab. */
export function oklchToOklab(token: string): Oklab | null {
    const m = token.trim().match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([-\d.]+)/i);
    if (!m) return null;
    const L = m[1].endsWith("%") ? Number(m[1].slice(0, -1)) / 100 : Number(m[1]);
    const C = Number(m[2]);
    const h = (Number(m[3]) * Math.PI) / 180;
    return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}

/** `#rgb` / `#rrggbb` → sRGB [0,255]³. */
export function hexToRgb(hex: string): RGB {
    let h = hex.trim().replace(/^#/, "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Resolve ANY supported token form (hex or `oklch(…)`) to sRGB [0,255]³. The gate's one
    front-door: a `:root`/`.dark` token text in either authored form lands as measured sRGB. */
export function resolveToRgb(token: string): RGB {
    const t = token.trim();
    if (t.startsWith("#")) return hexToRgb(t);
    const ol = oklchToOklab(t);
    if (ol) return oklabToRgb255(ol);
    const m = t.match(/^rgb\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    throw new Error(`cream-law.gate: unsupported color token "${token}"`);
}

export function chroma(ol: Oklab): number {
    return Math.hypot(ol.a, ol.b);
}

export function hueDeg(ol: Oklab): number {
    const h = (Math.atan2(ol.b, ol.a) * 180) / Math.PI;
    return h < 0 ? h + 360 : h;
}

/** WCAG relative-luminance contrast ratio between two sRGB triples (≥ 1). */
export function wcagContrast(rgb1: RGB, rgb2: RGB): number {
    const lum = ([r, g, b]: RGB) =>
        0.2126 * srgbChannelToLinear(r) + 0.7152 * srgbChannelToLinear(g) + 0.0722 * srgbChannelToLinear(b);
    const a = lum(rgb1);
    const b = lum(rgb2);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
}

/** APCA Lc (the bridge-PCA estimate) for `text` on `bg`, returned as |Lc| so the gate can
    take the figure-to-ground magnitude regardless of polarity. Implements the APCA-W3
    0.0.98G-4g constants — the non-text "data-fill floor" the spec cites (②.a Lc ≥ 45). */
export function apcaLc(textRgb: RGB, bgRgb: RGB): number {
    const Ys = ([r, g, b]: RGB) =>
        0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
    const Ytxt = Ys(textRgb);
    const Ybg = Ys(bgRgb);
    const blkThrs = 0.022;
    const blkClmp = 1.414;
    const clamp = (y: number) => (y < blkThrs ? y + (blkThrs - y) ** blkClmp : y);
    const txt = clamp(Ytxt);
    const bg = clamp(Ybg);
    if (Math.abs(bg - txt) < 0.0005) return 0;
    const scaleBoW = 1.14;
    const scaleWoB = 1.14;
    const loClip = 0.1;
    const deltaYmin = 0.0005;
    let lc: number;
    if (bg > txt) {
        // normal polarity (dark text on light bg)
        lc = (bg ** 0.56 - txt ** 0.57) * scaleBoW;
        lc = lc < deltaYmin ? 0 : lc < loClip ? lc - lc * 0.027 : lc - 0.027;
    } else {
        // reverse polarity (light text on dark bg)
        lc = (bg ** 0.65 - txt ** 0.62) * scaleWoB;
        lc = lc > -deltaYmin ? 0 : lc > -loClip ? lc - lc * 0.027 : lc + 0.027;
    }
    return Math.abs(lc * 100);
}

/** ΔC_ab — Euclidean distance in the OKLab (a, b) chromatic plane, L DROPPED (§2). A
    VECTOR chroma separation: sensitive to BOTH the stop's chroma AND the hue angle to the
    ground, which is exactly why it is ground-dependent (red-on-cool / green-on-warm) where
    the scalar |C_t − C_g| is not (§4 RR-1.a). */
export function deltaCab(stop: Oklab, ground: Oklab): number {
    return Math.hypot(stop.a - ground.a, stop.b - ground.b);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE GATE THRESHOLDS — the FROZEN contract constants (contrast-gate.spec.md §5).
// ─────────────────────────────────────────────────────────────────────────────

export const WARM_SPINE = {
    /** ①.a — above the near-white JND (NOT merely "hue in band"). */
    minChroma: 0.018,
    /** ①.a — the C1-4 "pink ceiling" upper bound (more = pink over-correction; C1.md HG-1). */
    maxChroma: 0.026,
    /** ①.b — the warm spine: cream 44–48 / ink 50–80. */
    hue: [40, 90] as const,
} as const;

/** ①.c — the page is MEASURABLY not blank white. */
export const NOT_WHITE_FLOOR = 1.08;
/** ①.d — the C1 engraved-plate demarcation reads (the --card mat separates). */
export const PLATE_SEP_FLOOR = 1.05;

/** ②.a — the non-text data-fill legibility floor (APCA Lc OR WCAG). */
export const APCA_FLOOR = 45;
export const WCAG_FLOOR = 3.0;

/** ②.b — the DARK-ARM chromatic-plane separation floor, k = 0.110 (§3.2). The valid
    fail-then-green window is k ∈ (0.1092, 0.1145]; k = 0.110 fails the deployed apex on
    cool (0.1092) and greens the W1 dual on warm (0.1145). RR-1.b: re-confirm vs the
    as-landed .dark hexes — done in §3 of this file's seed table. */
export const DARK_SEP_FLOOR = 0.11;

// ── ②.c — THE INTER-TIER SEPARATION FLOORS (the SCI band-cake quantity) ───────────────
//
// THE RAINBOW IS A STACKED BAND-CAKE, NOT A SET OF FIGURE-ON-GROUND STOPS (audit §3.2 +
// INV-C4). RainbowStack.vue → StackedBar renders the 14 tiers as deliberately BORDERLESS
// clean bands, each tier SANDWICHED between its neighbours — a middle tier is NEVER adjacent
// to the cream ground. So the right contrast quantity for the rainbow is INTER-TIER
// separation (does each band read distinctly from the one above/below it?), NOT every-tier-
// vs-the-cream-ground (②.a). Audit §3.2 tabulates the middle tiers' light-cream contrast as
// INTENTIONALLY LOW — tier-3 ctr(lt)/cream=2.35, tier-4=1.77, tier-5=1.62, tier-6=1.91 —
// precisely because they are mid-spectral golds on near-white paper, only ever seen against
// adjacent bands. Forcing ②.a ≥ 3:1 on the LIGHT arm would demand darkening the FROZEN
// gold/amber stops and break the hue+ordinal-rank invariant the wave freezes (the chip+label
// legend pattern carries identification — the legible mono Mbps LABEL beside a 10px hue chip).
//
// The metric is two-pronged so a smooth MONOCHROME ramp cannot sneak through a per-pair test:
//   ②.c.1  min adjacent ΔEOK ≥ 0.008  — every consecutive band reads distinctly from its
//          neighbour (a collapsed/duplicate pair fails). The real arms' tightest pair is the
//          two by-design orange near-twins (tier-7 750Mb / tier-8 2Gb): LIGHT ΔEOK 0.0152,
//          DARK 0.0140 — both clear 0.008 with ~1.8× margin; a dense muddy ramp (ΔEOK ~0.003)
//          fails by ~2.5×.
//   ②.c.2  total spectral path-length Σ ΔEOK ≥ 0.40 — the fan spans real chromatic ground,
//          not a tiny monochrome segment (catches the smooth gray ramp that clears the per-
//          pair floor: Σ 0.129 fails by ~3×). Real LIGHT Σ=0.979, DARK Σ=0.759 — both ≥1.9×.
// ΔEOK = full OKLab Euclidean (L,a,b) — the perceptual band-to-band distance the eye reads
// between two stacked bands (includes the L step the bars carry, unlike the dark-ground ②.b
// which DROPS L because there it is the hue-collision into the ground that matters).
//
// This is the SAME quantity the π-matrix (ground-matrix.spec.ts) reconciles its rainbow
// assertion to — the two gates measure ONE band-cake quantity and cannot drift.
export const INTER_TIER_MIN_ADJ = 0.008;
export const INTER_TIER_MIN_PATH = 0.4;

/** ΔEOK — full Euclidean OKLab distance (L, a, b ALL carried). The perceptual band-to-band
    separation between two stacked rainbow bands (the inter-tier ②.c metric). Distinct from
    `deltaCab`, which DROPS L for the dark-ground hue-collision ②.b. */
export function deltaEOK(p: Oklab, q: Oklab): number {
    return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE SEEDED GROUND + STOP TABLES — the verified columns (fd-warm-ground-palette).
//    The gate's DEFAULT seed reflects the W1 prescription (§1.4/§2.3/§3.4). A caller may
//    override `grounds`/`stops` with values resolved off the LIVE :root/.dark tokens.
// ─────────────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface Grounds {
    /** the authored `--background` token text, per theme (oklch(…) or hex). */
    background: Record<Theme, string>;
    /** the authored `--card` token text, per theme. */
    card: Record<Theme, string>;
}

/** A figure-to-ground data stop. `commit` = ②.b is a HARD gate clause; `reprobe` = ②.b is
    a RECORDED re-probe finding only (the recessive no-tier/break-even/ramp-floor stops and
    the RR-C1-arms program stops tuned against the OLD cool ground — never a SILENT pass). */
export interface DataStop {
    name: string;
    kind: "rainbow" | "rainbow-null" | "diverging" | "sequential" | "program";
    /** the per-theme token text (oklch(…) or hex). */
    value: Record<Theme, string>;
    /** ②.b dark-arm chromatic-plane separation: hard gate vs recorded re-probe finding. */
    sep: "commit" | "reprobe";
}

/** THE W1 GROUNDS — fd-warm-ground-palette §1.4 (light) + §2.3 (dark). */
export const W1_GROUNDS: Grounds = {
    background: {
        light: "oklch(0.970 0.022 47)", // #fff1e9 — warm peach-ivory paper
        dark: "oklch(0.205 0.018 55)", //  #1e150f — warm espresso stock
    },
    card: {
        light: "oklch(0.990 0.010 55)", // #fffaf6 — the brighter printed plate
        dark: "oklch(0.255 0.020 57)", //  #2a2019 — the plate on dark stock
    },
};

/** THE 14 RAINBOW MAGNITUDE TIERS — light §RAINBOW (tokens.css:114-127) + dark §3.4. These
    are the committed-②.b keystone stops (the SCI band-cake). */
// tier-8 (2 Gb/s) is the D3 RE-TEMPER: #ef641a→#ec5816 (light) / #f67e49→#f77744 (dark),
// pushed off tier-7's orange so the load-bearing 750↔2G pair clears swatch JND (the inter-tier
// ΔEOK opens ~2-2.6×; tier-7→8 stays the tightest legitimate adjacent pair, both arms). Kept
// byte-for-byte in sync with tokens.css §RAINBOW / §RAINBOW.dark (this table is the gate mirror).
const RAINBOW_LIGHT = [
    "#23ac78", "#3ea147", "#84ae2d", "#cabc21", "#f2b921", "#f89f1a", "#f16b18",
    "#ec5816", "#e0302b", "#ef3955", "#f85a84", "#da6bbb", "#ac6cc1", "#7c72c1",
];
const RAINBOW_DARK = [
    "#53b98b", "#5dae61", "#97bc56", "#d3c855", "#edbc4d", "#ffb254", "#f8844a",
    "#f77744", "#fc695c", "#fe6673", "#ff7796", "#e383c6", "#c38bd6", "#a29be2",
];

/** THE DEFAULT W1 STOP TABLE — seeds ② figure-to-ground.

    Rainbow tiers 1-14 are `commit` (the keystone). The recessive stops and the RR-C1-arms
    arms (diverging / sequential / program) are seeded `reprobe`: ②.a (legibility) is always
    asserted, but ②.b is RECORDED, not gated — the diverging/sequential/program stops were
    tuned against the OLD cool-250 ground and the §3.2 k-calibration is for the 14 magnitude
    tiers (contrast-gate.spec.md §3.2/§4 RR-1, C1.md RR-C1-arms). null is report-only (§4
    RR-1.c). The magnitude POLES (diverging-low/high, sequential-high) carry their ②.b for
    the re-probe record; the recessive (diverging-mid break-even, sequential-low ramp floor)
    are recessive-by-design like null. */
export const W1_STOPS: DataStop[] = [
    ...RAINBOW_LIGHT.map((light, i): DataStop => ({
        name: `rainbow-tier-${i + 1}`,
        kind: "rainbow",
        value: { light, dark: RAINBOW_DARK[i] },
        sep: "commit",
    })),
    {
        name: "rainbow-null",
        kind: "rainbow-null",
        value: { light: "#4e79a7", dark: "#7495bb" },
        sep: "reprobe", // §4 RR-1.c — the recessive no-data stop, NOT a committed-RED stop
    },
    // ── RR-C1-arms PROBE: diverging / sequential / program on the NEW warm-espresso ground ──
    {
        name: "diverging-low",
        kind: "diverging",
        value: { light: "oklch(0.62 0.17 28)", dark: "oklch(0.68 0.18 28)" },
        sep: "reprobe",
    },
    {
        name: "diverging-mid",
        kind: "diverging",
        value: { light: "oklch(0.87 0.02 95)", dark: "oklch(0.42 0.02 250)" },
        sep: "reprobe", // RR-C1-diverging-mid — the break-even hinge, recessive-by-design
    },
    {
        name: "diverging-high",
        kind: "diverging",
        value: { light: "oklch(0.55 0.13 245)", dark: "oklch(0.68 0.14 245)" },
        sep: "reprobe",
    },
    {
        name: "sequential-low",
        kind: "sequential",
        value: { light: "oklch(0.95 0.03 230)", dark: "oklch(0.35 0.05 250)" },
        sep: "reprobe", // the ramp's pale floor, recessive-by-design
    },
    {
        name: "sequential-high",
        kind: "sequential",
        value: { light: "oklch(0.52 0.15 250)", dark: "oklch(0.78 0.15 250)" },
        sep: "reprobe",
    },
    // PROGRAM — glass-ui --section-color-* dark arm (tokens.css §PROGRAM aliases).
    {
        name: "program-high-cost",
        kind: "program",
        value: { light: "oklch(0.530 0.124 69.6)", dark: "oklch(0.813 0.109 78.2)" },
        sep: "reprobe", // J-COLOR amber leg — the --section-color-5 retune SHIPPED at the glass-ui root in the published 4.1.0 (N2: 0.623→0.530, the darker amber now clears ②.b vs the warm-55° ground); the atlas consumes the shipped rung, the fixture re-baselines to it.
    },
    {
        name: "program-low-income",
        kind: "program",
        value: { light: "oklch(0.484 0.163 265.5)", dark: "oklch(0.718 0.107 268.4)" },
        sep: "reprobe",
    },
    {
        name: "program-rural-healthcare",
        kind: "program",
        value: { light: "oklch(0.551 0.088 171.1)", dark: "oklch(0.776 0.105 172.6)" },
        sep: "reprobe",
    },
    {
        name: "program-schools-libraries",
        kind: "program",
        value: { light: "oklch(0.532 0.180 317.5)", dark: "oklch(0.739 0.134 318.1)" },
        sep: "reprobe",
    },
];

/** The DEPLOYED cool dark ground (#161b20) — the OLD substrate the apex sank into. Carried
    only for the second negative test (assert ②.b RED on the deployed apex against it). */
export const DEPLOYED_COOL_DARK_GROUND = "#161b20";

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE ASSERTIONS — the executable cream-law (return a structured report; the test
//    harness/Playwright matrix asserts on `.pass` and surfaces `.findings`).
// ─────────────────────────────────────────────────────────────────────────────

export interface Clause {
    clause: string;
    pass: boolean;
    detail: string;
}

export interface StopFinding {
    stop: string;
    kind: DataStop["kind"];
    theme: Theme;
    /** the ②.b separation result for a `reprobe` stop that UNDER-CLEARS k (recorded, not gated). */
    deltaCab: number;
    wcag: number;
    apca: number;
    note: string;
}

export interface GateReport {
    /** ① + ② + ②.c committed clauses all green. */
    pass: boolean;
    assertion1: Clause[];
    assertion2: Clause[];
    /** ②.c — the inter-tier band-cake separation clauses (both arms). */
    assertion2c: Clause[];
    /** RR-C1-arms / RR-1 re-probe findings — recorded under-clears, NEVER a silent pass. */
    reprobeFindings: StopFinding[];
}

/** ASSERTION ① — warmth-is-visible. Bounds the GROUNDS themselves (light arm, §1). */
export function assertWarmthIsVisible(grounds: Grounds = W1_GROUNDS): Clause[] {
    const out: Clause[] = [];
    for (const theme of ["light", "dark"] as const) {
        const bgRgb = resolveToRgb(grounds.background[theme]);
        const cardRgb = resolveToRgb(grounds.card[theme]);
        const bgOl = srgbToOklab(bgRgb);
        const C = chroma(bgOl);
        const H = hueDeg(bgOl);

        if (theme === "light") {
            // ①.a chroma floor + the C1-4 pink ceiling
            out.push({
                clause: "①.a chroma ∈ [0.018, 0.026]",
                pass: C >= WARM_SPINE.minChroma && C <= WARM_SPINE.maxChroma,
                detail: `light --background chroma=${C.toFixed(4)} (floor ${WARM_SPINE.minChroma}, ceiling ${WARM_SPINE.maxChroma})`,
            });
            // ①.b hue band
            out.push({
                clause: "①.b hue ∈ [40,90]",
                pass: H >= WARM_SPINE.hue[0] && H <= WARM_SPINE.hue[1],
                detail: `light --background hue=${H.toFixed(1)}°`,
            });
            // ①.c not-white
            const ctrWhite = wcagContrast(bgRgb, [255, 255, 255]);
            out.push({
                clause: "①.c contrast(--background,#fff) ≥ 1.08",
                pass: ctrWhite >= NOT_WHITE_FLOOR,
                detail: `light ctr vs #fff = ${ctrWhite.toFixed(3)}`,
            });
            // ①.d plate separates
            const ctrPlate = wcagContrast(cardRgb, bgRgb);
            out.push({
                clause: "①.d contrast(--card,--background) ≥ 1.05 (light)",
                pass: ctrPlate >= PLATE_SEP_FLOOR,
                detail: `light --card vs --background = ${ctrPlate.toFixed(3)}`,
            });
        } else {
            // Dark arm: the spine is warm (R>G>B measurably; hue in band) and the plate
            // separates. The dark ①.a chroma ceiling does not apply (espresso sits below
            // the cream's L); the gate asserts the warm-spine hue + the dark plate split.
            out.push({
                clause: "①.b hue ∈ [40,90] (dark stock warm)",
                pass: H >= WARM_SPINE.hue[0] && H <= WARM_SPINE.hue[1] && bgRgb[0] >= bgRgb[1] && bgRgb[1] >= bgRgb[2],
                detail: `dark --background hue=${H.toFixed(1)}° sRGB=(${bgRgb.join(",")}) R≥G≥B=${bgRgb[0] >= bgRgb[1] && bgRgb[1] >= bgRgb[2]}`,
            });
            const ctrPlate = wcagContrast(cardRgb, bgRgb);
            out.push({
                clause: "①.d contrast(--card,--background) ≥ 1.05 (dark)",
                pass: ctrPlate >= PLATE_SEP_FLOOR,
                detail: `dark --card vs --background = ${ctrPlate.toFixed(3)}`,
            });
        }
    }
    return out;
}

/** ASSERTION ②.c — INTER-TIER SEPARATION (the SCI stacked band-cake quantity, both arms).
    The rainbow's tiers are read against EACH OTHER (adjacent bands), never as figure-on-
    ground fills against the cream — audit §3.2 documents the middle tiers' low light-cream
    contrast as INTENTIONAL (sandwiched, never ground-adjacent); INV-C4 mandates measuring
    the RIGHT quantity. So the gate measures (1) the min adjacent ΔEOK (every consecutive band
    reads distinctly) and (2) the total spectral path-length Σ ΔEOK (the fan spans real
    chromatic ground — a monochrome ramp fails even if each tiny step clears the per-pair
    floor). This is the same band-cake quantity the π-matrix reconciles its rainbow assertion
    to (ground-matrix.spec.ts) — the two gates cannot drift. */
export function assertRainbowInterTierSeparation(stops: DataStop[] = W1_STOPS): Clause[] {
    const out: Clause[] = [];
    const tiers = stops
        .filter((s) => s.kind === "rainbow")
        .sort((a, b) => {
            const n = (s: DataStop) => Number(s.name.replace(/^rainbow-tier-/, ""));
            return n(a) - n(b);
        });

    for (const theme of ["light", "dark"] as const) {
        const ol = tiers.map((s) => srgbToOklab(resolveToRgb(s.value[theme])));
        const adj: number[] = [];
        for (let i = 0; i < ol.length - 1; i++) adj.push(deltaEOK(ol[i], ol[i + 1]));
        const minAdj = Math.min(...adj);
        const path = adj.reduce((sum, d) => sum + d, 0);
        // which adjacent pair is tightest (for the detail trail)
        const tight = adj.indexOf(minAdj);

        out.push({
            clause: `②.c.1 min adjacent ΔEOK ≥ ${INTER_TIER_MIN_ADJ} · rainbow · ${theme}`,
            pass: minAdj >= INTER_TIER_MIN_ADJ,
            detail: `min ΔEOK=${minAdj.toFixed(4)} at tier-${tight + 1}→tier-${tight + 2} (${theme} band-cake)`,
        });
        out.push({
            clause: `②.c.2 spectral path Σ ΔEOK ≥ ${INTER_TIER_MIN_PATH} · rainbow · ${theme}`,
            pass: path >= INTER_TIER_MIN_PATH,
            detail: `Σ ΔEOK=${path.toFixed(4)} across the 14-tier fan (${theme})`,
        });
    }
    return out;
}

/** ASSERTION ② — figure-to-ground, every data stop, both themes (§2). ②.a is a HARD gate
    for all stops; ②.b is HARD for `commit` stops and a RECORDED re-probe finding (never a
    silent pass) for `reprobe` stops. */
export function assertFigureToGround(
    stops: DataStop[] = W1_STOPS,
    grounds: Grounds = W1_GROUNDS,
): { clauses: Clause[]; reprobeFindings: StopFinding[] } {
    const clauses: Clause[] = [];
    const reprobeFindings: StopFinding[] = [];

    for (const stop of stops) {
        for (const theme of ["light", "dark"] as const) {
            const stopRgb = resolveToRgb(stop.value[theme]);
            const groundRgb = resolveToRgb(grounds.background[theme]);
            const stopOl = srgbToOklab(stopRgb);
            const groundOl = srgbToOklab(groundRgb);

            // ②.a legibility floor — APCA Lc ≥ 45 OR WCAG ≥ 3.0.
            const wcag = wcagContrast(stopRgb, groundRgb);
            const apca = apcaLc(stopRgb, groundRgb);
            const legible = apca >= APCA_FLOOR || wcag >= WCAG_FLOOR;
            // The recessive-by-design near-neutral stops (no-data, break-even hinge, ramp
            // floor) are NOT figure stops — their legibility floor is recorded, not gated.
            const recessive =
                stop.kind === "rainbow-null" ||
                stop.name === "diverging-mid" ||
                stop.name === "sequential-low";
            // The bright mid-spectrum rainbow tiers (chartreuse→amber) on the LIGHT cream are
            // an INTRINSIC, accepted property of the FROZEN spectral fan — a saturated gold on
            // near-white paper reads at WCAG ~1.6–2.3 (fd-warm-ground-palette §3.2 ctr(lt)/cream
            // column tabulates exactly this: tier-3=2.35, tier-4=1.77, tier-5=1.62, tier-6=1.91).
            // The rainbow is the SCI STACKED band-cake (RainbowStack.vue → StackedBar, borderless
            // clean bands): its tiers are distinguished from EACH OTHER (now a HARD gate — the ②.c
            // inter-tier separation, asserted ABOVE in assertRainbowInterTierSeparation), NEVER
            // asserted as 3:1 fills against the cream they are never adjacent to. The 10px hue
            // CHIP beside its legible mono Mbps LABEL carries identification (the chip+label a11y
            // pattern). So the LIGHT-arm every-tier-vs-ground ②.a is the WRONG quantity (INV-C4)
            // and is a RECORDED finding only (surfaced, never silently dropped, never gated —
            // forcing 3:1 here would darken the frozen gold/amber stops and break the hue+ordinal-
            // rank invariant the wave freezes). ②.a stays a HARD gate where it IS the right
            // quantity: the dark rainbow (where §3 tabulates the WCAG/ΔC_ab muddiness evidence)
            // and every diverging/sequential/program magnitude pole (both arms), which DO sit on
            // the ground. The π-matrix (ground-matrix.spec.ts) reconciles to the SAME split.
            const lightRainbowReprobe = stop.kind === "rainbow" && theme === "light";
            if (!recessive && !lightRainbowReprobe) {
                clauses.push({
                    clause: `②.a legible · ${stop.name} · ${theme}`,
                    pass: legible,
                    detail: `APCA Lc=${apca.toFixed(1)} / WCAG=${wcag.toFixed(2)} on ${theme} ground`,
                });
            } else if (lightRainbowReprobe && !legible) {
                reprobeFindings.push({
                    stop: stop.name,
                    kind: stop.kind,
                    theme,
                    deltaCab: NaN, // ②.a finding, not ②.b — separation is dark-arm only
                    wcag,
                    apca,
                    note: "bright mid-spectrum rainbow tier on the light cream: intrinsic to the FROZEN spectral fan (discrete-ordinal kind, read against adjacent tiers, not as a 3:1 fill on paper) — accepted, recorded",
                });
            }

            // ②.b chromatic-plane separation — DARK ARM ONLY.
            if (theme === "dark") {
                const dCab = deltaCab(stopOl, groundOl);
                if (stop.sep === "commit" && !recessive) {
                    clauses.push({
                        clause: `②.b ΔC_ab ≥ ${DARK_SEP_FLOOR} · ${stop.name} · dark`,
                        pass: dCab >= DARK_SEP_FLOOR,
                        detail: `ΔC_ab=${dCab.toFixed(4)} vs dark ground`,
                    });
                } else if (dCab < DARK_SEP_FLOOR) {
                    // RECORDED re-probe finding — never a silent pass (C1.md RR-C1-arms).
                    reprobeFindings.push({
                        stop: stop.name,
                        kind: stop.kind,
                        theme,
                        deltaCab: dCab,
                        wcag,
                        apca,
                        note:
                            stop.kind === "rainbow-null"
                                ? "no-data stop, recessive-by-design (§4 RR-1.c) — routed to W1/W7 null-floor calibration"
                                : stop.name === "diverging-mid"
                                  ? "break-even hinge, recessive-by-design (RR-C1-diverging-mid) — hue adjudication open"
                                  : stop.name === "sequential-low"
                                    ? "sequential ramp pale floor, recessive-by-design"
                                    : "RR-C1-arms re-probe: tuned against the OLD cool-250 ground; under-clears ②.b on the NEW warm-espresso ground",
                    });
                }
            }
        }
    }
    return { clauses, reprobeFindings };
}

/** Run the full cream-law gate (① + ②) over a ground + stop seed and return a report.
    `pass` is true iff every COMMITTED clause is green; `reprobeFindings` carries the
    recorded RR-C1-arms / RR-1 under-clears (a non-blocking re-probe ledger). */
export function runCreamLawGate(
    grounds: Grounds = W1_GROUNDS,
    stops: DataStop[] = W1_STOPS,
): GateReport {
    const assertion1 = assertWarmthIsVisible(grounds);
    const { clauses: assertion2, reprobeFindings } = assertFigureToGround(stops, grounds);
    const assertion2c = assertRainbowInterTierSeparation(stops);
    const pass = [...assertion1, ...assertion2, ...assertion2c].every((c) => c.pass);
    return { pass, assertion1, assertion2, assertion2c, reprobeFindings };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE TWO NEGATIVE TESTS — the gate must demonstrably go RED, or it gates nothing.
// ─────────────────────────────────────────────────────────────────────────────

/** NEGATIVE TEST ① — the synthetic chroma-0.008 near-white token (the §1.1 deployed cream)
    MUST FAIL assertion ①. Returns the ① clauses for that synthetic ground; the harness
    asserts at least one is RED. The deployed `oklch(0.985 0.008 85)` round-trips to
    chroma 0.0085 (< 0.018) and ctr 1.042 vs #fff (< 1.08) — both ① floors break. */
export function negativeTestChroma008Cream(): Clause[] {
    const syntheticDeployed: Grounds = {
        background: { light: "oklch(0.985 0.008 85)", dark: W1_GROUNDS.background.dark },
        card: { light: "oklch(0.995 0.006 85)", dark: W1_GROUNDS.card.dark },
    };
    return assertWarmthIsVisible(syntheticDeployed);
}

/** NEGATIVE TEST ② — the synthetic STATIC-DARK-RAINBOW regression: the deployed light
    rainbow (byte-identical in both themes — the T-3 defect) resolved against the OLD cool
    ground #161b20 MUST FAIL ②.b for the apex (the §3.1 captured-RED stop: ΔC_ab 0.1092 <
    0.110). Returns the apex's dark-arm ②.b result on the cool ground; the harness asserts
    it is RED, then asserts it GREENS on the warm ground (the fail-then-green proof). */
export function negativeTestStaticDarkRainbow(): {
    apexName: string;
    onCool: { deltaCab: number; pass: boolean };
    onWarm: { deltaCab: number; pass: boolean };
} {
    // The static (un-themed) apex is the LIGHT hex used in dark — the regression.
    const apexStatic = "#7c72c1";
    const apexOl = srgbToOklab(resolveToRgb(apexStatic));
    const coolOl = srgbToOklab(resolveToRgb(DEPLOYED_COOL_DARK_GROUND));
    const warmOl = srgbToOklab(resolveToRgb(W1_GROUNDS.background.dark));
    const dCool = deltaCab(apexOl, coolOl);
    const dWarm = deltaCab(apexOl, warmOl);
    return {
        apexName: "rainbow-tier-14 (static #7c72c1)",
        onCool: { deltaCab: dCool, pass: dCool >= DARK_SEP_FLOOR },
        onWarm: { deltaCab: dWarm, pass: dWarm >= DARK_SEP_FLOOR },
    };
}

/** NEGATIVE TEST ③ — the synthetic MUDDY/MONOCHROME rainbow MUST FAIL the ②.c inter-tier
    separation. A 14-stop near-monochrome amber ramp (one hue, near-constant L, tiny chroma)
    is the degenerate band-cake the ②.c quantity exists to catch: adjacent bands collapse into
    each other (the min adjacent ΔEOK falls below INTER_TIER_MIN_ADJ) AND the spectral fan
    spans almost no chromatic ground (Σ ΔEOK falls below INTER_TIER_MIN_PATH). The harness
    asserts at least one ②.c clause is RED here, then asserts the real W1 rainbow GREENS both
    clauses (the fail-then-green proof — the gate gates the RIGHT band-cake quantity). The
    ramp is built as OKLCH duals so it round-trips through the same forward map as the real
    tiers; the SAME muddy ramp seeds both arms (it has no theme-pairing — that is the defect). */
export function negativeTestMuddyRainbow(): {
    muddy: Clause[];
    real: Clause[];
} {
    // 14 near-monochrome amber stops: hue ~75° fixed, L barely walking, chroma well below the
    // spectral fan's. round-trips OKLCH→sRGB so it lands as the real tiers' measured form.
    const ramp: string[] = [];
    for (let i = 0; i < 14; i++) {
        const L = (0.7 + i * 0.004).toFixed(3);
        ramp.push(`oklch(${L} 0.05 75)`);
    }
    const muddyStops: DataStop[] = ramp.map((c, i) => ({
        name: `rainbow-tier-${i + 1}`,
        kind: "rainbow",
        value: { light: c, dark: c }, // byte-identical both arms — the degenerate, un-paired fan
        sep: "commit",
    }));
    return {
        muddy: assertRainbowInterTierSeparation(muddyStops),
        real: assertRainbowInterTierSeparation(W1_STOPS),
    };
}
