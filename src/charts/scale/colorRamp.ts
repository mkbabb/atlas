// charts/scale/colorRamp.ts — the RAMP-MATH substrate under the color-scale factory
// (split off `ColorScale.ts` at the O-B4 charts family-split, §A.9 · S2-COH S-2).
//
// This is the low-altitude half of the one color-scale seam: the theme-token read layer, the
// WCAG mark-safe lift, the sequential positioning math, and the shared numeric constants — the
// perceptual primitives every scale factory in `./ColorScale` composes over. The factories
// (diverging / sequential / ordinal-rainbow) + the `colorFor` registry stay in `./ColorScale`;
// the OKLab-blend arithmetic and the `getComputedStyle` token seam live HERE, once. The public
// members (`NET_RETENTION_HINGE`, `MARK_CONTRAST_FLOOR`, `SEQUENTIAL_L_FLOOR`, `SPEED_TIERS`,
// `clearVarMemo`, `liftToMarkFloor`, `Scale`) are re-exported from `./ColorScale` so the family
// surface is byte-stable across the split (a no-op render-identity refactor).

import {
    type Oklab,
    oklchToOklab,
    oklabToOklch,
    oklchComponentsToOklab,
    hexToOklab,
    rgbStringToOklab,
    wcagContrast,
} from "./oklab.js";

/** The diverging hinge as DATA (FD1 §3.1) — net-retention break-even, not 1.0×. */
export const NET_RETENTION_HINGE = 0.7;

/** The sequential L-floor — no magnitude stop sinks below this lightness (FD1 §3.2). */
export const SEQUENTIAL_L_FLOOR = 0.52;

// ── THE MARK-SAFE RAMP FLOOR (F4 · f-scatter-contrast §"The FIX" move 1) ─────────────────────
//
// A ramp pole painted as a FREESTANDING MARK on the bare plate ground (every scatter dot/glyph)
// must clear the WCAG non-text floor (3:1) against that ground — `sequential-low` (CR 1.11/1.41)
// and `diverging-mid` (CR 1.43/1.88) are "recessive-by-design" for AREA fills (a pale county
// reads against its neighbours + the basemap) but were never meant to stand alone. AREA fills
// (choropleth / band-cake) keep the recessive read; a SCATTER consumer requests `markSafe: true`
// and the factory lifts the emitted pole's L toward the 3:1 floor — freezing HUE + CHROMA so the
// encoding is byte-consistent in rank, only its lightness rises off the ground. ONE seam, two
// legal floors, chosen by consumer KIND (never a per-plate color override, never a global token
// darken that would break the recessive area read — f-scatter-contrast anti-moves).

/** The WCAG non-text / graphical-object contrast floor a freestanding data MARK must clear vs
    the plate ground (f-scatter-contrast §1 — the 3:1 measured floor). */
export const MARK_CONTRAST_FLOOR = 3;

/** Resolve the plate ground (`--card`, the surface the scatter renders ON) to OKLab once. The
    mark-safe lift measures contrast against THIS, not the page `--background`. */
export function readGround(): Oklab {
    // Light-cream / dark-espresso `--card` fallbacks (match the tokens.css plate fill).
    const fallback: Oklab = oklchToOklab("", { L: 0.99, a: 0.001, b: 0.012 });
    return readVar("--card", "")
        ? oklchToOklab(readVar("--card", ""), fallback)
        : fallback;
}

/**
 * Lift a blended OKLab mark colour to the MARK-SAFE floor against `ground` — HUE + CHROMA frozen
 * (the encoding's rank is untouched), only L moving the minimum distance to clear `MARK_CONTRAST_
 * FLOOR`. If the colour already clears the floor it is returned unchanged. The lift scans L AWAY
 * from the ground (up on light grounds, down would darken below the body — we always lift toward
 * the legible direction the ground demands): we try lifting L UP first (the dark-mark-on-light
 * and the pale-mark-on-light both clear by going darker OR lighter; the nearest clearing L in
 * EITHER direction wins, so a pale pole on cream darkens to a seen teal, a dim pole on espresso
 * lightens). Capped so a lift never inverts the pole past mid.
 */
export function liftToMarkFloor(color: Oklab, ground: Oklab): Oklab {
    // MEMOIZED (the E4-close flip profile): the lift is called PER DATUM by the markSafe scales
    // (a /sci theme flip re-derives ~2400 scatter dots), and the original 0.001-step linear L-scan
    // paid up to ~2000 contrast evaluations per call — the dominant slice of the 826ms single-job
    // retint. The memo collapses repeated colours (a quantile scale emits few distinct stops; a
    // continuous blend quantizes to 3 decimals) and the scan is now a pair of BISECTIONS.
    const key =
        `${color.L.toFixed(3)}|${color.a.toFixed(3)}|${color.b.toFixed(3)}` +
        `@${ground.L.toFixed(3)}|${ground.a.toFixed(3)}|${ground.b.toFixed(3)}`;
    const hit = liftMemo.get(key);
    if (hit) return hit;
    const out = liftToMarkFloorUncached(color, ground);
    if (liftMemo.size > 4096) liftMemo.clear(); // a bounded memo — themes × ramps stay tiny anyway
    liftMemo.set(key, out);
    return out;
}

const liftMemo = new Map<string, Oklab>();

function liftToMarkFloorUncached(color: Oklab, ground: Oklab): Oklab {
    if (wcagContrast(color, ground) >= MARK_CONTRAST_FLOOR) return color;
    const { C, h } = oklabToOklch(color);
    const at = (L: number) => oklchComponentsToOklab(L, C, h);
    const clears = (L: number) => wcagContrast(at(L), ground) >= MARK_CONTRAST_FLOOR;
    // Contrast vs a fixed ground is monotone in L on each side of the ground's own luminance,
    // so the nearest clearing L in each direction is found by BISECTION (~20 evaluations per
    // side, vs the prior ~1000-step linear scan). The nearer of the two clearing Ls wins —
    // the pole moves the minimum perceptual distance, exactly as before.
    const seek = (lo: number, hi: number, dirUp: boolean): number | null => {
        // invariant: !clears(lo-side bound at the colour), clears(hi-side bound) — else no fix.
        if (!clears(hi)) return null;
        let a = lo;
        let b = hi;
        for (let i = 0; i < 24; i++) {
            const mid = (a + b) / 2;
            if (clears(mid)) b = mid;
            else a = mid;
        }
        return dirUp ? b : b; // b converges to the nearest clearing L from the colour's side
    };
    const up = color.L < 1 ? seek(color.L, 1, true) : null;
    const down = color.L > 0 ? seek(color.L, 0, false) : null;
    const candidates = [up, down].filter((v): v is number => v != null);
    if (candidates.length === 0) return color;
    const nearest = candidates.reduce((best, v) =>
        Math.abs(v - color.L) < Math.abs(best - color.L) ? v : best,
    );
    return at(nearest);
}

/**
 * The 22 source speed tiers (Mbps) → the 14 verbatim rendered stops (FD1 §3.3,
 * DL3 §1.3). The inert cyan/teal tiers (10/20/50 Mbps) are absent: the data
 * floor clamps them to the 100 Mbps green, so they never paint. `tierOrder` is
 * base → apex (ascending speed) — the `.twb` carries no sort, so the primitive
 * asserts it. Each value is the design-locus CSS var the stop reads.
 */
export const SPEED_TIERS: readonly { mbps: number; cssVar: string }[] = [
    { mbps: 100, cssVar: "--rainbow-tier-1" },
    { mbps: 200, cssVar: "--rainbow-tier-2" },
    { mbps: 250, cssVar: "--rainbow-tier-3" },
    { mbps: 300, cssVar: "--rainbow-tier-4" },
    { mbps: 320, cssVar: "--rainbow-tier-5" },
    { mbps: 400, cssVar: "--rainbow-tier-6" },
    { mbps: 750, cssVar: "--rainbow-tier-7" },
    { mbps: 2000, cssVar: "--rainbow-tier-8" },
    { mbps: 3000, cssVar: "--rainbow-tier-9" },
    { mbps: 4000, cssVar: "--rainbow-tier-10" },
    { mbps: 5000, cssVar: "--rainbow-tier-11" },
    { mbps: 10000, cssVar: "--rainbow-tier-12" },
    { mbps: 15000, cssVar: "--rainbow-tier-13" },
    { mbps: 20000, cssVar: "--rainbow-tier-14" },
] as const;

/** Read a theme-resolved CSS custom property off :root, with a fallback.
    MEMOIZED per theme-state (the E4-close flip profile, root 2 of 3): every uncached call is
    `getComputedStyle(documentElement)` — after a theme flip the whole tree is style-dirty, so
    EACH read forced a full-document recalc (~9ms × ~28 reads per option re-derive ≈ the 251ms
    ColorScale slice of the /sci long task). The memo keys on the live `.dark` presence
    (a classList read — never forces recalc), so post-flip the FIRST read pays one recalc and
    every subsequent token is a Map hit. */
const varMemo = new Map<string, string>();
/** Every token this module ever reads — warmed in ONE pass on the first miss per theme, so
    a theme flip pays a single forced recalc here instead of one per token (the pump jobs
    run across frames; each frame's first dirty-tree read would otherwise re-pay it). */
const KNOWN_VARS = [
    "--card",
    "--viz-no-data",
    "--viz-diverging-low",
    "--viz-diverging-mid",
    "--viz-diverging-high",
    "--viz-sequential-low",
    "--viz-sequential-high",
    "--rainbow-null",
    ...Array.from({ length: 14 }, (_, i) => `--rainbow-tier-${i + 1}`),
] as const;
/** Clear the per-theme token memo (F6.6 §2(b).2 — the ONE invalidation clock). The varMemo
    keys on the live `.dark` presence and so is correct across a settled flip on its own; but the
    palette plane invalidates as ONE beat on `onFlipSettled` (useVizPalette wires the settle
    subscriber), so the canvas-string read and the SVG-blend read bust together and a post-settle
    re-resolve never serves a token frozen against a mid-flip cascade phase. Called by
    `bumpVizPaletteEpoch` so the two colour memos share one settle invalidation. */
export function clearVarMemo(): void {
    varMemo.clear();
}

export function readVar(name: string, fallback: string): string {
    if (typeof window === "undefined") return fallback;
    const themeKey = document.documentElement.classList.contains("dark") ? "d" : "l";
    const key = `${themeKey}|${name}`;
    const hit = varMemo.get(key);
    if (hit !== undefined) return hit || fallback;
    // ONE getComputedStyle object, every known token read off it in one go — the single
    // recalc the first read forces styles the whole tree; the rest are clean lookups.
    const cs = getComputedStyle(document.documentElement);
    for (const v of KNOWN_VARS) {
        varMemo.set(`${themeKey}|${v}`, cs.getPropertyValue(v).trim());
    }
    const direct = varMemo.get(key);
    if (direct !== undefined) return direct || fallback;
    const one = cs.getPropertyValue(name).trim();
    varMemo.set(key, one);
    return one || fallback;
}

/** Resolve a `--viz-*` stop to OKLab once (the live oklch token, else the fallback). */
export function readPole(name: string, fallback: Oklab): Oklab {
    return oklchToOklab(readVar(name, ""), fallback);
}

// ── X10-LIB — THE CSS-COLOR → OKLAB RESOLVE (the label-vs-A22 reconcile's contrast leg) ────────
//
// GeoChoropleth's per-region label gate (`redundant-channel.ts::regionClearsLabelGate`) needs the
// WCAG contrast between the label ink and its OWN region's resolved fill — but a data fill arrives
// in any of THREE forms: a ramp-emitted `rgb(r g b)` (every `Scale<V>` factory's own output,
// `oklabToRgb`), an authored `oklch(…)`/`#hex` stop, or a `var(--viz-category-{k})` reference (the
// J-COLOR §5.1 coordinated-categorical branch). This is the ONE reverse-resolve a caller needs —
// composing the pure parsers (`oklab.ts`) with THIS module's DOM-token seam (`readVar`) for the
// `var()` case — so the gate reads any live fill string without a second colour-resolution path.
export function cssColorToOklab(color: string, fallback: Oklab): Oklab {
    const c = color.trim();
    if (!c) return fallback;
    if (c.startsWith("#")) return hexToOklab(c);
    if (/^oklch\(/i.test(c)) return oklchToOklab(c, fallback);
    const rgb = rgbStringToOklab(c);
    if (rgb) return rgb;
    const ref = c.match(/^var\(\s*(--[\w-]+)/i);
    if (ref) return cssColorToOklab(readVar(ref[1], ""), fallback);
    return fallback;
}

/** Resolve the LABEL INK — `--foreground`, the same ink `.geo-value-label` paints (GeoChoropleth.
    css) — to OKLab once per theme (memoized transitively via `readVar`). The X10-LIB per-region
    contrast gate measures THIS against a region's own resolved fill. The fallback is the light
    `--foreground` literal (`oklch(0.255 0.028 55)`, tokens/color.css) — the SSR/jsdom-safe value a
    live DOM always overrides. */
export function readLabelInk(): Oklab {
    const fallback: Oklab = oklchComponentsToOklab(0.255, 0.028, 55);
    return oklchToOklab(readVar("--foreground", ""), fallback);
}

/** A scale is a pure value → CSS-colour function; the legend reads its stops. */
export type Scale<V> = (value: V) => string;

/** Map a value to its [0, 1] position under a scale mode (positioning only). */
export function buildPosition(
    values: readonly (number | null)[],
    mode: SequentialMode,
): (v: number | null) => number | null {
    const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
    if (finite.length === 0) return () => null;
    const lo = Math.min(...finite);
    const hi = Math.max(...finite);

    if (mode === "quantile") {
        // A value's position is the midpoint rank of its bin, so the extreme
        // outlier holds a single slot and never pins the body at the poles.
        const sorted = [...finite].sort((a, b) => a - b);
        const n = sorted.length;
        return (v) => {
            if (v == null || !Number.isFinite(v)) return null;
            let loI = 0;
            let hiI = n;
            while (loI < hiI) {
                const mid = (loI + hiI) >> 1;
                if (sorted[mid] < v) loI = mid + 1;
                else hiI = mid;
            }
            let loU = loI;
            let hiU = n;
            while (loU < hiU) {
                const mid = (loU + hiU) >> 1;
                if (sorted[mid] <= v) loU = mid + 1;
                else hiU = mid;
            }
            return n > 1 ? (loI + loU) / 2 / n : 0.5;
        };
    }

    if (mode === "log") {
        // Shift to a strictly-positive domain, then take logs (guards lo ≤ 0).
        const shift = lo <= 0 ? 1 - lo : 0;
        const a = Math.log(lo + shift + 1e-9);
        const b = Math.log(hi + shift + 1e-9);
        const span = b - a || 1;
        return (v) => {
            if (v == null || !Number.isFinite(v)) return null;
            return clamp01((Math.log(v + shift + 1e-9) - a) / span);
        };
    }

    const span = hi - lo || 1;
    return (v) => {
        if (v == null || !Number.isFinite(v)) return null;
        return clamp01((v - lo) / span);
    };
}

export function clamp01(t: number): number {
    return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** The positioning mode a sequential scale reads its domain through (FD1 §3.2). */
export type SequentialMode = "linear" | "log" | "quantile";
