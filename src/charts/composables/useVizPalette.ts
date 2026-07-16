// platform/composables/useVizPalette.ts — the JS-side palette bridge (CQ7 §1,
// A6/CQ7 lib leverage). The design locus declares the viz ramps as CSS custom
// properties (tokens.css / styles/index.css), theme-aware: the `.dark` block
// overrides the diverging/sequential stops. The SVG choropleth and glass chips read
// those vars directly through CSS — but an ECharts canvas CANNOT read CSS vars, so
// the JS option must be handed concrete colour strings. This composable is that
// bridge: it resolves the locus vars via `getComputedStyle` into the three JS
// palettes every viz colours from.
//
// MODE-AWARE: `getComputedStyle` is a one-shot read, so the palette re-resolves on
// Glass's post-paint theme settle. The canvas receives fresh concrete colours only
// after the cascade has settled, never from an independent pre-paint mode watcher.

import { computed, ref, type ComputedRef } from "vue";
import { useGlobalDark } from "@mkbabb/glass-ui/dark";
import { VIZ_DIVERGING_MID_FALLBACK } from "../scale/colorKind.js";
import { clearVarMemo } from "../scale/ColorScale.js";

/** The diverging ramp (net-flow choropleth): low pole → break-even mid → high pole. */
export interface DivergingPalette {
    low: string;
    mid: string;
    high: string;
    noData: string;
}

/** The sequential ramp (single-hue magnitude): low → high, plus the no-data grey. */
export interface SequentialPalette {
    low: string;
    high: string;
    noData: string;
}

/** The ordinal rainbow (bandwidth tiers): 14 stops floor→apex + the no-tier slate. */
export interface RainbowPalette {
    tiers: string[];
    null: string;
}

/**
 * The chrome-register colours an ECharts canvas needs but CANNOT read off CSS
 * custom properties (the canvas is not in the cascade — see the header law). The
 * resolver reads each off `:root` (theme-aware) and hands the option REAL strings,
 * so a dark flip never leaves an unresolvable `var(--…)` on the canvas (which would
 * paint black-on-graphite). This is the fixed, small set the three platform chart
 * SFCs draw their axes/labels/gridlines/box-seams from — authored ONCE here.
 */
export interface VizChrome {
    /** Body ink — axis text, the treemap label default. (`--foreground`) */
    foreground: string;
    /** Recessive ink — the legend strip, muted labels. (`--muted-foreground`) */
    muted: string;
    /** The page ground. (`--background`) */
    background: string;
    /** Gridlines + axis lines — the engraved hairline register. (`--viz-grid`) */
    grid: string;
    /** The plate fill — the engraved box-seam between treemap rects. (`--card`) */
    border: string;
    /** The live tabular/code family used by canvas labels. (`--font-mono`) */
    fontMono: string;
    /** The live prose family used by canvas labels. (`--font-serif`) */
    fontSerif: string;
    /**
     * THE ONE SIGNAL — the teal route-accent rivet ink (the "one signal, one clock", commit
     * a0e94cc/30bfd7b). The multi-year crown's active-year `markPoint` rivet paints in THIS
     * colour, theme- AND route-aware (it resolves `--route-accent`, the receiver-teal diverging
     * high pole by default, re-led per route). A CANVAS cannot read the var, so this is the
     * resolved rgb the markPoint fragment carries — the T-4 bridge for the linked-clock rivet.
     */
    signal: string;
    /**
     * The AXIS-TICK figure rung in CONCRETE px (the figure-slug-axis voice, pv-c2). The locus
     * authors the tick voice as `--type-figure-axis` (a `clamp(rem,vw,rem)`), but an ECharts
     * canvas cannot read a CSS var NOR a `clamp()` — `axisLabel.fontSize` must be a number. This
     * resolves the token to its live computed px (theme/viewport-aware), so the axis tick wears
     * the SAME slug voice the hero + HoverCard reach, never the hard-coded `12` it was stuck at.
     */
    figureAxisPx: number;
}

/** The three JS palettes, all resolved from the live (theme-aware) locus vars. */
export interface VizPalette extends VizChrome {
    diverging: DivergingPalette;
    sequential: SequentialPalette;
    rainbow: RainbowPalette;
}

/** The number of ordinal rainbow stops the locus declares (`--rainbow-tier-1..14`). */
const RAINBOW_TIER_COUNT = 14;

// THE CANVAS-COLOUR LAW (T-4, C-AESTHETIC §3.4). An ECharts canvas is NOT in the CSS
// cascade — its 2D context cannot read a CSS custom property, and the locus authors
// every ground/ramp token as `oklch(…)`. Handing the option a raw `var(--…)` (or even
// the resolved `oklch(…)` literal) risks an unpaintable string: in dark the unresolved
// var falls back to black-on-graphite. So the bridge resolves each token to a CONCRETE
// `rgb(…)` the canvas parses everywhere (every browser + the headless test context),
// via a one-shot computed-colour probe: set the token reference on a detached node's
// `color`, read back `getComputedStyle().color`. This collapses `var()` chains,
// `oklch()`, `color-mix()`, hex, and named colours into one canonical rgb string.
let probe: HTMLSpanElement | null = null;

/** Resolve both canvas families and the live figure rung from one probe snapshot. */
function cssTypography(): Pick<
    VizChrome,
    "fontMono" | "fontSerif" | "figureAxisPx"
> {
    const fallback = {
        fontMono: '"Fira Code", monospace',
        fontSerif: '"Newsreader", serif',
        figureAxisPx: 13,
    };
    if (typeof window === "undefined" || typeof document === "undefined") return fallback;
    if (!probe) {
        probe = document.createElement("span");
        probe.style.display = "none";
        document.documentElement.appendChild(probe);
    }
    probe.style.fontSize = "var(--type-figure-axis, 13px)";
    const style = getComputedStyle(probe);
    const read = (name: string, value: string) =>
        style.getPropertyValue(name).trim() || value;
    const figureAxisPx = parseFloat(style.fontSize);
    return {
        fontMono: read("--font-mono", fallback.fontMono),
        fontSerif: read("--font-serif", fallback.fontSerif),
        figureAxisPx:
            Number.isFinite(figureAxisPx) && figureAxisPx > 0
                ? figureAxisPx
                : fallback.figureAxisPx,
    };
}

/** BATCH-resolve a list of CSS colour exprs in ONE style recalc (the E4-close flip profile,
    root 3 of 3): the per-token probe interleaved a style WRITE with a `getComputedStyle` READ —
    on a freshly theme-flipped (whole-tree-dirty) document each pair forced a full recalc
    (~5ms × 25 tokens = the 126ms readPalette slice). The batch writes ALL exprs onto N child
    probes first, then reads them back: the FIRST read flushes one recalc; the rest read a clean
    tree. Same canonical-rgb collapse per token (var() chains, oklch(), color-mix() → rgb). */
function resolveColorsBatch(exprs: { expr: string; fallback: string }[]): string[] {
    if (typeof window === "undefined" || typeof document === "undefined")
        return exprs.map((e) => e.fallback);
    const host = document.createElement("div");
    // NOT display:none — a none subtree is SKIPPED by the regular recalc pass, so each
    // child's getComputedStyle would force its own synthetic per-element style resolve
    // (the 219ms residual this batch existed to kill). visibility:hidden + offscreen
    // keeps the children in the styled tree: ONE recalc styles all of them, and every
    // read after the first is a clean-tree lookup.
    host.style.cssText =
        "position:absolute;visibility:hidden;left:-99999px;top:0;pointer-events:none";
    for (const { expr } of exprs) {
        const child = document.createElement("span");
        child.style.color = expr;
        host.appendChild(child);
    }
    document.documentElement.appendChild(host);
    const out = exprs.map(({ fallback }, i) => {
        const child = host.children[i] as HTMLElement;
        const resolved = getComputedStyle(child).color;
        return resolved && child.style.color ? resolved : fallback;
    });
    host.remove();
    return out;
}

/** THE ATMOSPHERE POLE RESOLVER (N.WD2 §4.D2.5). The declared `atmosphere` poles are CSS token
    EXPRS (`var(--…)`/`color-mix(...)`) the aurora resolves late — through the SAME `resolveColorsBatch`
    the palette snapshots its ramps with (zero new colour machinery; the canvas-colour law holds — an
    ECharts/WebGL surface cannot read a CSS var, so the pole must arrive as a concrete `rgb(…)`). One
    batched recalc for the ≤2 pole exprs; each falls to its `fallback` under SSR/happy-dom (no cascade). */
export function resolveAtmosphereColors(
    exprs: { expr: string; fallback: string }[],
): string[] {
    return resolveColorsBatch(exprs);
}

/** Snapshot the locus vars into the three JS palettes (ONE batched recalc — see above). */
function readPalette(): VizPalette {
    // canvas-guard:resolver-table-start — the RESOLVER DECLARATION TABLE (F0 repair 2).
    // These `var(--…)` exprs are this seam's RESOLVED-INPUT: `resolveColorsBatch` feeds each into
    // `child.style.color = expr` → `getComputedStyle` → a concrete `rgb(…)` string. They never
    // reach an EChartsOption as a raw `var()` — they are the cure the canvas-colour guard exists
    // to enforce, not the defect. The guard scopes PAST this marked region (it cannot tell a
    // `var()` handed to an option from a `var()` declared as a resolver expr by text alone), and
    // still catches any `var()` outside it (anything reaching an option). See
    // `scripts/check-canvas-colors.mjs` (the §2.1 WRONG-GATE seam the F-arc dissolved).
    const tokens: { expr: string; fallback: string }[] = [
        { expr: "var(--viz-diverging-low)", fallback: "#d4634a" },
        // The ONE reconciled `--viz-diverging-mid` fallback (DV-1) — the same constant
        // ColorScale's OKLab pole read floors on, so the canvas-string read and the
        // SVG-blend read can never drift to two different break-even mids with no CSS.
        { expr: "var(--viz-diverging-mid)", fallback: VIZ_DIVERGING_MID_FALLBACK.hex },
        { expr: "var(--viz-diverging-high)", fallback: "#3f6fb0" },
        { expr: "var(--viz-no-data)", fallback: "#e2e2e6" },
        { expr: "var(--viz-sequential-low)", fallback: "#e4eef8" },
        { expr: "var(--viz-sequential-high)", fallback: "#2b4f86" },
        ...Array.from({ length: RAINBOW_TIER_COUNT }, (_, i) => ({
            expr: `var(--rainbow-tier-${i + 1})`,
            fallback: "#4e79a7",
        })),
        { expr: "var(--rainbow-null)", fallback: "#4e79a7" },
        { expr: "var(--foreground)", fallback: "#1c1c1f" },
        { expr: "var(--muted-foreground)", fallback: "#6b6b73" },
        { expr: "var(--background)", fallback: "#ffffff" },
        { expr: "var(--viz-grid)", fallback: "rgba(160,160,170,0.4)" },
        { expr: "var(--card)", fallback: "#ffffff" },
        // THE ONE SIGNAL — the teal route-accent rivet ink (the linked-clock markPoint). It
        // resolves `--route-accent` (the receiver-teal high pole by default, re-led per route),
        // so the crown's active-year rivet wears the same signal the dock/eyebrow chrome does.
        { expr: "var(--route-accent)", fallback: "#3f6fb0" },
    ];
    // canvas-guard:resolver-table-end
    const r = resolveColorsBatch(tokens);
    const N = 6 + RAINBOW_TIER_COUNT;
    const typography = cssTypography();
    return {
        diverging: { low: r[0], mid: r[1], high: r[2], noData: r[3] },
        sequential: { low: r[4], high: r[5], noData: r[3] },
        rainbow: {
            tiers: r.slice(6, N),
            null: r[N],
        },
        foreground: r[N + 1],
        muted: r[N + 2],
        background: r[N + 3],
        grid: r[N + 4],
        border: r[N + 5],
        ...typography,
        // The ONE signal — the teal route-accent rivet ink (the linked-clock markPoint), the
        // last resolved token (after `--card`). Resolved per (theme, route) like every stop.
        signal: r[N + 6],
    };
}

// ── THE ONE THEME SIGNAL (F6.6 §2(b).1 — INV-F1) ────────────────────────────────────────────
// There is ONE theme, and it is the live `.dark` class on `documentElement`. The memo keys on
// THAT (the resolved cascade), the SAME representation `ColorScale.readVar` uses — never the
// vueuse store string (`auto`-collapse-prone: vueuse writes `"auto"` on a light return when
// OS=light, so a store-keyed memo freezes a mismatched half of the canvas the instant the
// store↔cascade mapping breaks 1:1 — the "lossy" round-trip). The cascade class is the cache key;
// `resolvedThemeKey()` is its lawful shape.
function resolvedThemeKey(): "d" | "l" {
    if (typeof document === "undefined") return "l";
    return document.documentElement.classList.contains("dark") ? "d" : "l";
}

let paletteCache: { key: string; value: VizPalette } | null = null;
let paletteEpoch = 0;

// F6.6 §2(b).2 — THE SETTLE-CLOCK INVALIDATOR (now LIVE). `bumpVizPaletteEpoch` is the manual
// cache-bust the module wires to glass-ui's `onFlipSettled` (below) so the palette plane
// invalidates on the SAME post-paint beat the charts re-merge — ONE invalidation clock for the
// whole canvas colour plane. It (1) clears `paletteCache` so the next read resolves a fresh
// snapshot AFTER the cascade has settled, (2) clears `ColorScale.varMemo` so the SVG-blend read
// busts together with the canvas-string read (the two colour memos share one settle bust), and
// (3) bumps the reactive `settleEpoch` so every `useVizPalette` computed re-fires on the SETTLE
// clock — not the synchronous pre-paint `mode`-ref flush. So a fresh cache entry is only ever
// populated post-settle, never against a mid-flip cascade phase.
const settleEpoch = ref(0);
export function bumpVizPaletteEpoch(): void {
    paletteEpoch++;
    paletteCache = null;
    clearVarMemo();
    settleEpoch.value++;
}

function readPaletteMemo(): VizPalette {
    // The key is the RESOLVED theme (the `.dark` class) folded with the settle epoch — so the
    // `auto`-collapse store string is structurally irrelevant, and a settle-time invalidation
    // (a same-theme re-resolve) still forces a fresh read.
    const key = `${resolvedThemeKey()}#${paletteEpoch}`;
    if (paletteCache?.key === key) return paletteCache.value;
    const value = readPalette();
    paletteCache = { key, value };
    return value;
}

// F6.6 §2(b).2 — THE LIVE SETTLE WIRE. ONE module-level subscription to glass-ui's
// `onFlipSettled` busts the palette plane on the post-paint settle beat — the live caller that
// makes `bumpVizPaletteEpoch` real (GATE-C ②). Lazy so an SSR/test context that never resolves
// a palette never constructs the dark singleton; idempotent so the subscription is wired ONCE no
// matter how many plates mount. The settle fires in the SAME coalesced task the charts' retint
// subscribes (useEChart `onFlipSettled`); the chart retint runs in its after-paint pump a frame
// later, so by the time a plate's option factory re-reads `palette.value` the epoch is already
// bumped and the resolve runs against the SETTLED cascade — GATE-D clock unity.
let settleWired = false;
function ensureSettleWire(): void {
    if (settleWired || typeof window === "undefined") return;
    settleWired = true;
    useGlobalDark().onFlipSettled(() => bumpVizPaletteEpoch());
}

/**
 * The reactive palette bridge. Returns a `computed<VizPalette>` that re-resolves the locus vars
 * on the POST-SETTLE clock — every `useVizPalette` computed keys reactivity on the `settleEpoch`
 * ref the `onFlipSettled` wire bumps, so a consumer reading `palette.value` re-resolves after the
 * cascade has settled (one resolution moment, one memo epoch — the GATE-D unity), never on the
 * synchronous pre-paint `mode`-ref flush that straddled the flip. The memo keys on the live
 * `.dark` class (the resolved theme), so the `auto`-collapse store string can never freeze a
 * mismatched half. The `computed` also re-derives lazily, so a component that only reads it once
 * still gets the current theme's palette.
 */
export function useVizPalette(): ComputedRef<VizPalette> {
    ensureSettleWire(); // the live settle subscriber — wired once per module
    return computed<VizPalette>(() => {
        void settleEpoch.value;
        return readPaletteMemo();
    });
}
