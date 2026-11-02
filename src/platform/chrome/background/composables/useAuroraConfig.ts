// platform/composables/useAuroraConfig.ts — the pole-derived AuroraConfig + the f(p)
// Tide coupling seam (C.W6.a Scope 2/3; fd-atmosphere-suffusion §3 AS-1). This is the
// THIN-CONSUMER brain behind platform/chrome/Aurora.vue: it computes a glass-ui
// `AuroraConfig` ENTIRELY from the active dashboard's two data poles + the page ground,
// so page-glow IS data-glow — a teal state on the map and the teal glow behind it are
// the same teal, derived through the same canonical OKLab matrix the choropleth fills
// with (oklab.ts — the B3.1 root-fix; NEVER value.js mixColorsN).
//
// THE CONVERSION SEAM (the oklab.ts → AuroraConfig door, fd-atmosphere-suffusion §3).
// `oklab.ts`'s `blendOklch` returns a gamut-safe `rgb(r g b)` string (the hinge stop is
// the diverging-mid blended toward the ground in OKLab); `useVizPalette` likewise hands
// every pole as a concrete `rgb(...)` (the canvas-colour law — it cannot ship `var(--…)`
// off the cascade). But `AuroraConfig.palette` is typed `OklchStop{L,C,h}`. The bridge
// is glass-ui's exported `hexToOklchStop` (the named door) — it parses HEX, so the rgb
// poles are normalised rgb→hex first, then handed to the library converter. The result
// is a valid `OklchStop` triple derived from the oklab poles, NOT an invented palette.
//
// AT REST (U/B7 · PLAN §5.6, R-INTERACT §5): the field reads no scroll. The nuclei sit at their
// rest position with no Tide, no section lean and no selection lean, and glass's STILL_FIELD zeroes
// every drift axis and the film grain, so glass-ui's demand gate parks the loop after one frame.
// The config changes only on a route or theme change.

import { computed, reactive, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { useThemeKey } from "../../../composables/useThemeKey.js";

import {
    DEFAULT_AURORA_CONFIG,
    PAPER_WASH_GROUND,
    STILL_FIELD,
    hexToOklchStop,
    type AuroraConfig,
    type AuroraHuePath,
    type AuroraNucleus,
    type OklchStop,
} from "@mkbabb/glass-ui/aurora";
import {
    useVizPalette,
    resolveAtmosphereColors,
    type VizPalette,
} from "../../../../charts/composables/useVizPalette.js";
import { blendOklch, type Oklab } from "../../../../charts/scale/oklab.js";
import type {
    AtmosphereIntensity,
    DepositionProfile,
    Theme,
} from "../../../../contract/index.js";
import {
    ATMOSPHERE_PRESETS,
    selectAtmosphere,
    type AtmosphereSelection,
} from "./atmosphere.js";
import { nucleiSpecs, nucleusAt } from "./aurora-nuclei.js";

// ── THE ATMOSPHERE RESOLUTION (N.WD2 §4.D2 — the ruled departure) ─────────────────────────────
// The per-surface `surfacePoles`/`surfaceProfile` slug-switch is DELETED (D2.5). The poles + the
// deposition character are now DECLARED on the instance context (`Theme.atmosphere`);
// `selectAtmosphere` (the pure ladder) turns that declaration — or the theme's chrome legs (the D6
// default), or NEUTRAL for an unknown route — into unresolved pole EXPRS + a bias-cap + a clamped
// deposition. This composable resolves the EXPRS through the palette bridge's `resolveAtmosphereColors`
// (the EXISTING `resolveColorsBatch`), so page-glow stays data-glow with zero new colour machinery.

/** The resolved atmosphere for one route: the two poles as CONCRETE `rgb(…)` (canvas-colour law),
    the directional bias-cap, and the clamped deposition character. */
interface ResolvedAtmosphere {
    warm: string;
    cool: string;
    biasCap: number;
    deposition: DepositionProfile;
    /** The declared loudness rung — the key into `ATMOSPHERE_PRESETS` the ceiling reads. */
    intensity: AtmosphereIntensity;
    /** Which ladder rung produced the POLES — surfaced on the mount so an acceptance probe reads
        `"neutral"` off the PAINTED field, not off a transcription of the table (A-25). */
    rung: AtmosphereSelection["rung"];
}

/** Resolve a surface's declared atmosphere (or its chrome-leg/NEUTRAL fallback) to concrete poles
    off the live palette. The DOM probe (`resolveAtmosphereColors`) runs ONLY here — this is called
    from the theme/route-keyed `resolved` computed, never per scroll tick (the Tide reads the cached
    poles). SSR/happy-dom falls each pole to its palette fallback (no cascade to read). */
function resolveAtmosphere(
    theme: Theme | undefined,
    pal: VizPalette,
): ResolvedAtmosphere {
    const sel = selectAtmosphere(theme?.atmosphere, theme?.chrome);
    // The SSR/happy-dom fallbacks: the neutral floor falls to the warm recessive no-data; a
    // declared/derived route falls to the diverging poles (a sensible, aria-hidden-only default).
    const fallback =
        sel.rung === "neutral"
            ? [pal.diverging.noData, pal.diverging.noData]
            : [pal.diverging.low, pal.diverging.high];
    const [warm, cool] = resolveAtmosphereColors([
        { expr: sel.warmExpr, fallback: fallback[0] },
        { expr: sel.coolExpr, fallback: fallback[1] },
    ]);
    return {
        warm,
        cool,
        biasCap: sel.biasCap,
        deposition: sel.deposition,
        intensity: sel.intensity,
        rung: sel.rung,
    };
}

// ── THE CONVERSION SEAM — rgb/hex/oklch token → OklchStop, via glass-ui's hexToOklchStop ──

const COOL_FALLBACK: Oklab = { L: 0.55, a: -0.04, b: -0.07 };
const BG_FALLBACK: Oklab = { L: 0.96, a: 0, b: 0 };

/** Normalise a `useVizPalette` token (always `rgb(r g b)` or `rgb(r, g, b)`) to `#rrggbb`,
    so the library's hex-only `hexToOklchStop` can parse it. Returns the input unchanged
    when it is already hex (the SSR/jsdom fallback tokens are hex). */
function rgbToHex(token: string): string {
    const t = token.trim();
    if (t.startsWith("#")) return t;
    const m = t.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (!m) return "#808080"; // an unparseable token → mid-grey (never an invalid stop)
    const byte = (n: string): string =>
        Math.max(0, Math.min(255, Math.round(Number(n))))
            .toString(16)
            .padStart(2, "0");
    return `#${byte(m[1])}${byte(m[2])}${byte(m[3])}`;
}

/** Read a numeric term that may be a percentage (`68%` ⇒ 0.68 at the given scale). */
function term(raw: string, scale = 1): number {
    return raw.endsWith("%") ? (Number(raw.slice(0, -1)) / 100) * scale : Number(raw);
}

/**
 * The named bridge: a resolved pole token → a valid `OklchStop{L,C,h}` triple.
 *
 * THE oklab ARM IS A LIVE-DEFECT CURE (W-ATMOS). The seam above promises every pole arrives as a
 * concrete `rgb(…)`, and for a plain `var(--token)` it does. For a `color-mix(in oklab, …)` it does
 * NOT: Chrome serialises the computed value in the MIXING space, so `getComputedStyle().color`
 * returns `oklab(L a b)` — which `rgbToHex` cannot parse, so every such pole fell to its
 * unparseable-token mid-grey. Measured live at :5173 before the cure: `AMERICA.chrome.accentWarm`
 * (`color-mix(in oklab, var(--viz-diverging-low), var(--viz-diverging-high))`) resolved to
 * `oklab(0.68 0.049882 -0.0211891)` on /usf, so the FLAGSHIP route's warm pole was painting
 * `#808080` — a null wash inside the pole ladder itself, on the one route that declares nothing.
 *
 * The cure is not new colour machinery: an `oklch()` value IS an `OklchStop` already, and `oklab` is
 * the same space in cartesian form, so the polar identity (`C = hypot(a,b)`, `h = atan2(b,a)`) is
 * the whole conversion. Only sRGB values still need the hex door.
 *
 * EXPORTED so the bridge is testable against the SHIPPED function rather than a transcription of it
 * (`tests/unit/oklch-stop-bridge.spec.ts`). It repaints the pole of every route, so it is pinned:
 * the arm that fell through to `#808080` did so silently for as long as it existed, and a silent
 * colour bridge is exactly the thing a live probe cannot be trusted to notice twice.
 */
export function toOklchStop(token: string): OklchStop {
    const t = token.trim();
    const lch = t.match(/^oklch\(\s*([\d.%]+)[\s,]+([\d.%]+)[\s,]+([-\d.]+)/i);
    if (lch) return { L: term(lch[1]), C: term(lch[2], 0.4), h: Number(lch[3]) };
    const lab = t.match(/^oklab\(\s*([\d.%]+)[\s,]+([-\d.%]+)[\s,]+([-\d.%]+)/i);
    if (lab) {
        const [a, b] = [term(lab[2], 0.4), term(lab[3], 0.4)];
        const h = (Math.atan2(b, a) * 180) / Math.PI;
        return { L: term(lab[1]), C: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
    }
    return hexToOklchStop(rgbToHex(t));
}

/** THE AURORA OPACITY CEILING — the felt-but-DEFT compositing envelope (J-GLASS re-gate · J-CLOSE
    arm b · O-DIR-4 ARM 2 · UN-STRANGLED at W-ATMOS). `opacityCeiling` is the OUTER envelope glass-ui
    applies uniformly to the canvas AND the CSS placeholder (via `--aurora-opacity-ceiling`): the
    maximum opacity the whole aurora surface ever composites at. It is theme-aware — the dark stock
    absorbs more, so a higher envelope reads as the same felt depth.

    THE UN-STRANGLE (RC-7 W-46). The two constants that used to live here — 0.30 light / 0.36 dark,
    themselves a 3× lift off the "no visible aurora" 0.10/0.12 floor — were the SAME number on every
    route, which is how seven hand-tuned atmospheres flattened into one subliminal wash: a route
    could tune its deposition and still composite at the identical ceiling as every other. The
    ceiling is now the DECLARED intensity's (`ATMOSPHERE_PRESETS[…].opacityCeiling`), so `quiet`
    recedes below `data` and a `hero` route's field is visibly richer. The old pair survives as the
    `data` row's neighbourhood, so an undeclared route moves by design, not by accident.

    THE DOCK-BLEED TRADE (render-matrix (b) · the Bug-1 radial-glow floor). A brighter envelope
    BLEEDS the aurora's warm centre through the translucent floating dock plate (a light-stock 0.14
    test lit the plate's centre past its luminance floor). Until the glass 10.1 adopt the dock half of
    that pair was an atlas opacity floor; glass 8 deleted the token it wrote, and the plate's
    legibility over the field is now glass's adaptive dock register (backdrop-luma veil lift +
    `contrast-color` ink). The ceiling is the one lever left here. */

/** THE DEVICE-TIER GATE (O-F5 · motion-arch §2.3), injected by `Aurora.vue` off the shared
    `useAtmosphereTier` selector (NOT re-derived here). */
export interface UseAuroraConfigOptions {
    /** TIER C ⇒ `true` — collapse the 2+2+1 rule-of-thirds field to a flat 2-stop wash (the primary
        warm + primary cool lobe only). `false` (tier A/B) keeps the full 5-nucleus gradient. */
    flatWash?: MaybeRefOrGetter<boolean>;
}

/** The composable's reactive surface. `config` is a REACTIVE `AuroraConfig` (glass-ui
    deep-watches it). */
export interface UseAuroraConfig {
    /** The reactive pole-derived config — hand straight to `<Aurora :config>`. */
    config: AuroraConfig;
    /** The outer compositing envelope (→ `<Aurora :opacity-ceiling>`) — the DECLARED intensity's
        row, per stock. Re-derives on every theme flip and on a route change. */
    opacityCeiling: ComputedRef<number>;
    /** Which ladder rung produced the poles — stamped on the mount for the A-25 acceptance probe. */
    rung: ComputedRef<AtmosphereSelection["rung"]>;
}

/**
 * Build the reactive, pole-derived `AuroraConfig` for a route, with the f(p) Tide wired
 * at rest. The palette (5 stops: bg → warm → hinge →
 * cool → bg) and the nuclei are all DERIVED from the route's DECLARED atmosphere poles (or its
 * chrome legs / NEUTRAL — N.WD2 §4.D2) + the page ground through the canonical OKLab
 * matrix (oklab.ts) — never invented, never a hardcoded slug-switch. The returned `config` is a
 * `reactive` object: every field is recomputed from the live palette + the live `p` via a
 * `watchEffect`-free getter chain (Vue tracks the deps through `reactive`).
 *
 * `theme` is a getter for the SURFACE's declared theme — a dashboard's own, or the one the A-25
 * brand ladder builds for a brand surface (`skin/brand.ts`). `undefined` (SSR, an unknown route, or
 * a brand surface with no pole source) is the NEUTRAL floor, and the ONLY door to it: the parameter
 * is the theme rather than the `DashboardContext` precisely so a non-dashboard surface can hand one
 * over — a `/c/*` category home has no context to inject, which is how the null wash got in.
 */
export function useAuroraConfig(
    theme: () => Theme | undefined,
    options: UseAuroraConfigOptions = {},
): UseAuroraConfig {
    const { flatWash = false } = options;
    const palette = useVizPalette();
    const themeKey = useThemeKey();

    const resolved = computed<ResolvedAtmosphere>(() =>
        resolveAtmosphere(theme(), palette.value),
    );

    // THE OPACITY CEILING — the DECLARED intensity's row, per stock (the un-strangle: one ceiling
    // per RUNG, not one ceiling for every route).
    const opacityCeiling = computed<number>(() => {
        void themeKey.value; // establish the theme dependency — re-derive on a `.dark` flip
        const isDark =
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark");
        const ceiling = ATMOSPHERE_PRESETS[resolved.value.intensity].opacityCeiling;
        return isDark ? ceiling.dark : ceiling.light;
    });

    // The 5-stop derived palette: bg → warm pole → hinge (mid blended toward bg) → cool
    // pole → bg, every stop an OklchStop bridged from the oklab poles via hexToOklchStop.
    const stops = computed<OklchStop[]>(() => {
        const pal = palette.value;
        const { warm, cool } = resolved.value;
        const bg = pal.background;
        // The hinge — the diverging-mid pushed halfway toward the ground in OKLab (the
        // canonical matrix; gamut-safe rgb), so the palette's centre recedes to a
        // dark-neutral hinge rather than a competing third hue.
        const hinge = blendOklch(pal.diverging.mid, bg, 0.5, COOL_FALLBACK, BG_FALLBACK);
        return [
            toOklchStop(bg),
            toOklchStop(warm),
            toOklchStop(hinge),
            toOklchStop(cool),
            toOklchStop(bg),
        ];
    });

    // The nuclei AT REST — recomputed only when the route's bias-cap/deposition changes. Tier C
    // collapses the 2+2+1 field to the primary warm (0) + primary cool (2) lobe.
    const nuclei = computed<AuroraNucleus[]>(() => {
        const { biasCap, deposition } = resolved.value;
        const specs = nucleiSpecs(biasCap, deposition);
        const activeSpecs = toValue(flatWash) ? [specs[0], specs[2]] : specs;
        return activeSpecs.map((s) => nucleusAt(s));
    });

    // THE PER-ROUTE DEPOSITION (N.WD2 §4.D2) — the declared (clamped) deposition character that gives
    // each page its flair UNDER the shared PAPER_WASH floor. Reactive (a route/theme change re-derives)
    // so glass-ui's deep watch re-uploads. granulation/breath are the deposition; huePath is the SCI
    // spectral sweep (omitted on USF/ECF → the clean OKLab-rectangular blend).
    const profile = computed<DepositionProfile>(() => resolved.value.deposition);

    // The reactive config. The shape is THREE layers, spread in priority order (later wins):
    //   1. DEFAULT_AURORA_CONFIG — the library's neutral floor for the many knobs we don't author.
    //   2. PAPER_WASH_GROUND — the library-CANON recessive-ground crayon calibration (MOVE 1: the
    //      smooth→crayon flip lands by SPREADING the published partial, never hand-setting the tooth
    //      dials — the root-repo law: the calibration lives in the library). This discharges the
    //      sub-perceptual defect (a flat smooth hue-tint dies at the clamped ceiling; a dry crayon
    //      tooth is FELT there — texture is cheap, flat hue is expensive). It carries NO palette /
    //      nuclei, so the pole-derived pigment below is preserved (page-glow IS data-glow).
    //   3. our authored register (warp + the per-route deposition delta) — the deft motion knobs the
    //      partial does not set, plus the §2.4 per-route granulation/breath/huePath signature.
    // The getters off `stops`/`nuclei` keep the pigment + nuclei reactive (the Tide + theme re-derive).
    const config = reactive({
        ...DEFAULT_AURORA_CONFIG,
        ...PAPER_WASH_GROUND, // MOVE 1 — medium:"crayon", granulation .30, canvasGrain .5, strokeAmount .35, …
        warpMode: "fbm", // Quilez double-fBm domain warp — the organic zones
        warpAmount: 0.42, // below the 0.5 default — deft, not turbulent
        // MOVE 2 — the per-route deposition signature (granulation / breath / huePath), reactive off
        // the surface so a route change re-tunes the ground's flair. These OVERRIDE PAPER_WASH's
        // shared floor with the route's own character (USF currents that breathe, SCI the spectral
        // sweep at the calmest tooth, ECF the still low-chroma wash). saturation is the RUNG's now:
        // 0.92 at quiet/data (PAPER_WASH's recessive floor, unchanged — the ground spends no chroma
        // budget, the pops live in the icons), lifted only at a declared `hero`.
        get granulation(): number {
            return profile.value.granulation;
        },
        // THE STILL FIELD (U/B8 PF, A7 / P-G2; O-16). glass's STILL_FIELD zeroes every drift
        // axis and the clocked film grain, so the demand gate parks the loop after the first
        // frame and the field draws once. Before it, DEFAULT_AURORA_CONFIG's drift (nuclei and
        // palette 0.015, warp 0.008) and PAPER_WASH's film grain (0.008) rode through the
        // spread: the gate never parked while the reader was active, and the grain re-seeded on
        // every frame, scrolling included. The spatial crayon tooth stays.
        ...STILL_FIELD,
        get breathPeriod(): number {
            return profile.value.breathPeriod;
        },
        get huePath(): AuroraHuePath | undefined {
            return profile.value.huePath;
        },
        get saturation(): number {
            // The chroma clamp is the RUNG's, not a global floor: quiet/data hold PAPER_WASH's
            // recessive 0.92 (byte-identical to the spread it overrides), and only a declared
            // `hero` spends the budget — the W-70 chroma amplify, off the shader entirely.
            return ATMOSPHERE_PRESETS[resolved.value.intensity].saturation;
        },
        get palette(): OklchStop[] {
            return stops.value;
        },
        get nuclei(): AuroraNucleus[] {
            return nuclei.value;
        },
    }) as unknown as AuroraConfig;

    return {
        config,
        opacityCeiling,
        rung: computed(() => resolved.value.rung),
    };
}
