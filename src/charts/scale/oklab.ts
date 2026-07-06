// platform/charts/oklab.ts — the ONE perceptual-blend seam every scale fills
// through. OKLab interpolation + the canonical Björn Ottosson OKLab→sRGB matrix,
// gamut-clamped per channel, emitting a CSS-native `rgb(r g b)` string the SVG and
// the ECharts canvas both parse byte-identically.
//
// Why not value.js mixColorsN here: `mixColorsN([oklch,oklch], "oklab")` mis-maps
// the OKLCH inputs (it returns a/b channels ~6, far outside OKLab's ±0.4 gamut, on
// an inconsistent 0-100 L scale), and `.toString()` serialises an `oklab(…)` string
// the browser clamps to saturated red. value.js's own `oklabToRgb255` then can't
// recover it. The canonical matrix below is the correct, deterministic conversion —
// the same transform browsers use for `oklch()` — so the blend is exact and
// gamut-safe. (Verified against value.js: ColorScale.spec asserts the diverging mid
// is a warm tan, not red.)

export interface Oklab {
    L: number;
    a: number;
    b: number;
}

/** Parse an `oklch(L C H)` token (the authored stop form) into OKLab. Falls back to
    the supplied OKLab when the token is empty/non-oklch (SSR, jsdom, a hex stop). */
export function oklchToOklab(token: string, fallback: Oklab): Oklab {
    const m = token
        .trim()
        .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([-\d.]+)/i);
    if (!m) return fallback;
    const L = m[1].endsWith("%") ? Number(m[1].slice(0, -1)) / 100 : Number(m[1]);
    const C = Number(m[2]);
    const h = (Number(m[3]) * Math.PI) / 180;
    return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}

/** Linear interpolate two OKLab colors (perceptually uniform; `t` = weight to `y`). */
export function lerpOklab(x: Oklab, y: Oklab, t: number): Oklab {
    return { L: x.L + (y.L - x.L) * t, a: x.a + (y.a - x.a) * t, b: x.b + (y.b - x.b) * t };
}

/** OKLab → the three gamut-clamped sRGB 0-255 bytes (the canonical matrix; one place). */
function oklabToRgb255({ L, a, b }: Oklab): [number, number, number] {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const lin2srgb = (x: number): number => {
        const c = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, c)) * 255);
    };
    return [
        lin2srgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        lin2srgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        lin2srgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    ];
}

/** OKLab → sRGB `rgb(r g b)` (the canonical matrix; each channel gamut-clamped). */
export function oklabToRgb(c: Oklab): string {
    const [r, g, b] = oklabToRgb255(c);
    return `rgb(${r} ${g} ${b})`;
}

/** OKLab → a lower-case `#rrggbb` hex (the token-authoring form the `.dark` arm prints). */
export function oklabToHex(c: Oklab): string {
    return "#" + oklabToRgb255(c).map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Blend two `oklch(…)` stop tokens in OKLab and emit gamut-safe `rgb()`. `t` is the
    weight toward `b` in [0,1]. The fallbacks cover the SSR/jsdom empty-token case. */
export function blendOklch(
    aToken: string,
    bToken: string,
    t: number,
    aFallback: Oklab,
    bFallback: Oklab,
): string {
    const tt = t < 0 ? 0 : t > 1 ? 1 : t;
    return oklabToRgb(lerpOklab(oklchToOklab(aToken, aFallback), oklchToOklab(bToken, bFallback), tt));
}

// ─────────────────────────────────────────────────────────────────────────────
// THE RAINBOW `.dark` RELIGHT TRANSFORM (C.W1.b — fd-warm-ground-palette §3.1/§3.2/§3.4)
//
// The SCI ordinal-rainbow is the one data-KIND that escaped the FD1 §3.0 theme-paired
// invariant — its 14 tiers shipped byte-identical in both themes, so the apex sank into
// the dark ground (D2-rainbow / T-3). This is the FIX, single-sourced: the `.dark` arm is
// a PURE FUNCTION of the LIGHT arm, never a second hand-authored constant table to drift.
//
//   Cd = C_lt × 0.86               — trim chroma so the lifted tiers don't glare
//   Ld = clamp(L_lt + LIFT, FLOOR, CEIL)  — lift L; FREEZE hue + ordinal rank
//
// The FLOOR is the figure-to-ground CONTRAST law baked WHERE THE L-MATH LIVES: it is the
// minimum L at the tier's (frozen hue, trimmed chroma) that clears WCAG contrast
// `RAINBOW_DARK_MIN_CONTRAST` against the warm-espresso dark ground. Because it is derived
// from the contrast requirement — not an arbitrary L-constant — a dark-on-dark tier is
// STRUCTURALLY IMPOSSIBLE at the source for ANY input stop, not just the curated fourteen.
// (Chroma only adds luminance, so the achromatic floor is the worst case and the binding
// guarantee; coloured stops clear the bar at equal-or-lower L.)
// ─────────────────────────────────────────────────────────────────────────────

/** The figure-to-ground contrast floor for the rainbow `.dark` arm (fd-warm-ground §3.2:
    "every dark tier clears contrast 5.78"). The transform's `clamp` floor is derived from
    THIS — not a hand-picked L — so the figure-to-ground law is baked into the L-math. */
export const RAINBOW_DARK_MIN_CONTRAST = 5.78;

/** The base lift (the apex/low tiers lift FURTHER via the contrast floor; §3.2). */
export const RAINBOW_DARK_LIFT = 0.05;

/** The L ceiling — the lightest a lifted tier may reach (so a near-max-L tier doesn't
    glare to a near-white on dark stock; §3.2 `clamp(…, 0.82)`). */
export const RAINBOW_DARK_L_CEIL = 0.82;

/** The chroma-trim factor (§3.2: `Cd = C_lt × 0.86`). */
export const RAINBOW_DARK_C_FACTOR = 0.86;

/** The warm-espresso dark ground the dark tiers are floored against
    (`oklch(0.205 0.018 55)` = `#1e150f`; fd-warm-ground §2.3). */
export const DARK_GROUND_OKLCH = { L: 0.205, C: 0.018, h: 55 } as const;

/** OKLab → OKLCH (L unchanged, chroma = hypot, hue in degrees [0,360)). The inverse of the
    `oklchToOklab` parse — used to FREEZE hue/rank while only L and C move in the relight. */
export function oklabToOklch(c: Oklab): { L: number; C: number; h: number } {
    const h = (Math.atan2(c.b, c.a) * 180) / Math.PI;
    return { L: c.L, C: Math.hypot(c.a, c.b), h: h < 0 ? h + 360 : h };
}

/** OKLCH components (L, C, hue°) → OKLab. The authoring-direction companion to `oklabToOklch`. */
export function oklchComponentsToOklab(L: number, C: number, hDeg: number): Oklab {
    const h = (hDeg * Math.PI) / 180;
    return { L, a: C * Math.cos(h), b: C * Math.sin(h) };
}

/** WCAG relative luminance of an OKLab colour (via the canonical sRGB conversion). */
function relativeLuminance(c: Oklab): number {
    const [r, g, b] = oklabToRgb255(c);
    const lin = (x: number): number => {
        const s = x / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two OKLab colours (∈ [1, 21]). */
export function wcagContrast(x: Oklab, y: Oklab): number {
    const a = relativeLuminance(x);
    const b = relativeLuminance(y);
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return (hi + 0.05) / (lo + 0.05);
}

/** ΔEOK — the canonical full Euclidean OKLab distance (L, a, b ALL carried), the perceptual
    separation between two colours. This is the natural home for the helper (beside `wcagContrast`/
    `lerpOklab`, its two-`Oklab`-argument distance-class siblings): it was formerly authored inside
    `cream-law.gate.ts` (the inter-tier ②.c metric), and is RELOCATED here (J-COLOR §4) so ONE
    canonical `deltaEOK` serves BOTH the cream-law fixture AND the route-JND gate — the no-duplicate
    doctrine. (Distinct from `cream-law.gate.ts`'s `deltaCab`, which DROPS L for the dark-ground
    hue-collision ②.b.) */
export function deltaEOK(p: Oklab, q: Oklab): number {
    return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

const DARK_GROUND_OKLAB: Oklab = oklchComponentsToOklab(
    DARK_GROUND_OKLCH.L,
    DARK_GROUND_OKLCH.C,
    DARK_GROUND_OKLCH.h,
);

/** The minimum L (at the given trimmed chroma + frozen hue) that clears `minContrast`
    against `ground` — the figure-to-ground CONTRAST floor, capped at `RAINBOW_DARK_L_CEIL`.
    This is the L-floor the relight `clamp` bakes in: structural, not hand-picked. Scans in
    fine L steps from black up; the first L that clears the bar is the floor (monotone in L). */
function contrastFloorL(C: number, hDeg: number, ground: Oklab, minContrast: number): number {
    for (let L = 0; L <= RAINBOW_DARK_L_CEIL; L += 0.001) {
        if (wcagContrast(oklchComponentsToOklab(L, C, hDeg), ground) >= minContrast) {
            return L;
        }
    }
    return RAINBOW_DARK_L_CEIL;
}

/**
 * Relight ONE light rainbow stop into its DARK dual (fd-warm-ground §3.2). Pure function of
 * the light arm: hue + ordinal rank are FROZEN (the spectral order IS the data); only L and
 * C move. Chroma trims by `RAINBOW_DARK_C_FACTOR`; L lifts by `RAINBOW_DARK_LIFT` then is
 * `clamp`ed between the figure-to-ground CONTRAST floor (so a dark-on-dark tier is
 * structurally impossible AT THE SOURCE) and `RAINBOW_DARK_L_CEIL`. The floor lives INSIDE
 * the clamp — where the L-math lives — so it cannot be bypassed by any caller.
 */
export function relightRainbowStop(lightStop: Oklab, ground: Oklab = DARK_GROUND_OKLAB): Oklab {
    const { L, C, h } = oklabToOklch(lightStop);
    const Cd = C * RAINBOW_DARK_C_FACTOR;
    const floor = contrastFloorL(Cd, h, ground, RAINBOW_DARK_MIN_CONTRAST);
    const lifted = L + RAINBOW_DARK_LIFT;
    const Ld = lifted < floor ? floor : lifted > RAINBOW_DARK_L_CEIL ? RAINBOW_DARK_L_CEIL : lifted;
    return oklchComponentsToOklab(Ld, Cd, h);
}

/** Relight a light `#rrggbb` (or `oklch(…)`) rainbow stop to its DARK dual hex. The token-
    authoring helper: feed a light tier hex, get the `.dark` arm hex the transform derives. */
export function relightRainbowStopHex(lightStop: string): string {
    const lab = lightStop.startsWith("#")
        ? hexToOklab(lightStop)
        : oklchToOklab(lightStop, { L: 0.5, a: 0, b: 0 });
    return oklabToHex(relightRainbowStop(lab));
}

/** Parse a `#rrggbb` to OKLab via the canonical inverse matrix (the sRGB→OKLab direction the
    token-authoring helper needs; the light tiers are authored as hex in tokens.css). */
export function hexToOklab(hex: string): Oklab {
    const h = hex.replace("#", "");
    const srgb2lin = (n: number): number => {
        const s = n / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const r = srgb2lin(parseInt(h.slice(0, 2), 16));
    const g = srgb2lin(parseInt(h.slice(2, 4), 16));
    const b = srgb2lin(parseInt(h.slice(4, 6), 16));
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return {
        L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    };
}

/** The 14 LIGHT rainbow tiers + the no-tier null, base-green → apex-violet (fd-warm-ground
    §3.2 "light hex" column; the authored light arm, the SINGLE source the dark arm derives
    from). Order is tier-1 … tier-14 then null — the §3.4 token-block order.

    N.WF2 · G-N14 arm 1 — tier-8 HEALED to the ONE source: this table carried the
    pre-`D3 RE-TEMPER` `#ef641a` while `tokens.css §RAINBOW` ships the re-tempered `#ec5816`
    (2 Gbps red-orange, pushed off tier-7's orange so the 750↔2G pair is JND-distinct;
    cream-law.gate.ts:307 documents the pairing). The two sources are now byte-identical, so
    `emitRainbowDarkArm()` derives its dark arm from the SAME light hex tokens.css ships. */
export const RAINBOW_LIGHT_STOPS = [
    "#23ac78", "#3ea147", "#84ae2d", "#cabc21", "#f2b921", "#f89f1a", "#f16b18",
    "#ec5816", "#e0302b", "#ef3955", "#f85a84", "#da6bbb", "#ac6cc1", "#7c72c1",
] as const;
export const RAINBOW_LIGHT_NULL = "#4e79a7";

/** Emit the 14 dark tier hex (+ null) as the OUTPUT of the relight transform — the derivable,
    verifiable source for the `.dark { --rainbow-tier-* }` token block (fd-warm-ground §3.4).
    These are computed from `RAINBOW_LIGHT_STOPS`, never hand-authored.

    N.WF2 · G-N14 arm 2 — PROVENANCE, ratify-as-authored. This emit is NOT byte-identical to the
    SHIPPED `.dark` block: 5 of the 14 tiers (8, 9, 10, 13, 14) carry hand-tuned duals that
    diverge from the closed-form transform (e.g. shipped tier-8 `#f77744` vs emitted `#f27445`).
    Measured (P2-B): both the shipped and the emitted sets clear the figure-to-ground floor
    (ctr ≥ 5.78 vs `--background` `#1e150f`); the shipped duals are the MORE-legible D3 apex
    re-temper. The N.WF2 owner ruling RATIFIES the shipped values as authored — the transform is
    the single-source *derivation seam* (any instance-authored ramp derives its dark arm through
    it), not a byte-clamp the shipped apex must collapse to. The 5 divergent tiers are named in
    the recorded disposition (`docs/tranches/N/__readback__/N.WF2/dark-palette-disposition.json`)
    so `n0-relight-divergence` treats them as lawful, not a silent hand-nudge. Do NOT re-emit the
    shipped block downward toward this output. */
export function emitRainbowDarkArm(): { tiers: string[]; null: string } {
    return {
        tiers: RAINBOW_LIGHT_STOPS.map(relightRainbowStopHex),
        null: relightRainbowStopHex(RAINBOW_LIGHT_NULL),
    };
}

/**
 * Pure-function self-check for the relight transform (the C.W1.b structural assertions; safe
 * to import in a unit test or call once at module load). Returns `{ ok, failures }` — never
 * throws — so callers choose how to surface it. Asserts:
 *   1. The L-floor is BAKED IN: a SYNTHETIC below-floor light stop (`L_lt + lift < floor`)
 *      relights to EXACTLY the contrast floor (fail-then-pass on the pure function — a
 *      dark-on-dark tier is structurally impossible at the source).
 *   2. Hue + rank are FROZEN: every dark tier's hue equals its light tier's hue.
 *   3. Figure-to-ground: every dark tier clears `RAINBOW_DARK_MIN_CONTRAST` vs the dark ground.
 */
export function checkRelightTransform(): { ok: boolean; failures: string[] } {
    const failures: string[] = [];

    // 1 — the negative test: a synthetic stop whose lifted L sits BELOW the floor.
    const synthLight = oklchComponentsToOklab(0.3, 0.1, 200); // L+lift = 0.35 ≪ any floor
    const synthDark = oklabToOklch(relightRainbowStop(synthLight));
    const synthFloor = contrastFloorL(
        0.1 * RAINBOW_DARK_C_FACTOR,
        200,
        DARK_GROUND_OKLAB,
        RAINBOW_DARK_MIN_CONTRAST,
    );
    if (Math.abs(synthDark.L - synthFloor) > 1e-9) {
        failures.push(
            `below-floor stop not clamped: got L=${synthDark.L.toFixed(4)}, floor=${synthFloor.toFixed(4)}`,
        );
    }
    if (
        wcagContrast(relightRainbowStop(synthLight), DARK_GROUND_OKLAB) <
        RAINBOW_DARK_MIN_CONTRAST - 1e-6
    ) {
        failures.push("below-floor stop did not clear the contrast floor after clamp");
    }

    // 2 + 3 — hue frozen + figure-to-ground for the real arm.
    for (let i = 0; i < RAINBOW_LIGHT_STOPS.length; i++) {
        const lightLab = hexToOklab(RAINBOW_LIGHT_STOPS[i]);
        const lightHue = oklabToOklch(lightLab).h;
        const darkLab = relightRainbowStop(lightLab);
        const darkHue = oklabToOklch(darkLab).h;
        if (Math.abs(((darkHue - lightHue + 540) % 360) - 180) > 0.5) {
            failures.push(`tier ${i + 1}: hue moved ${lightHue.toFixed(1)}° → ${darkHue.toFixed(1)}°`);
        }
        const ctr = wcagContrast(darkLab, DARK_GROUND_OKLAB);
        if (ctr < RAINBOW_DARK_MIN_CONTRAST - 1e-6) {
            failures.push(`tier ${i + 1}: contrast ${ctr.toFixed(2)} < ${RAINBOW_DARK_MIN_CONTRAST}`);
        }
    }
    const nullCtr = wcagContrast(relightRainbowStop(hexToOklab(RAINBOW_LIGHT_NULL)), DARK_GROUND_OKLAB);
    if (nullCtr < RAINBOW_DARK_MIN_CONTRAST - 1e-6) {
        failures.push(`null: contrast ${nullCtr.toFixed(2)} < ${RAINBOW_DARK_MIN_CONTRAST}`);
    }

    return { ok: failures.length === 0, failures };
}
