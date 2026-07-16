// platform/composables/useAuroraVeil.ts — THE ONE GLOW ENGINE (§I-VEIL §1 · NET-NEW).
//
// The canonical glow seam: ONE engine, both stage surfaces consume it (this card is the FIRST
// consumer, the I6 filter drawer the SECOND), neither re-derives glow. It is the §AB "giant radial
// glow" RE-AUTHORED as a bounded, data-keyed, leashed membrane — the energy captured, framed, and
// handed to the data so the staged shape glows in its OWN verdict hue.
//
// THE INPUT IS A COMPLETE COLOR. `hueSource` is resolved upstream (the card binds
// `useSelection.veilHue` — the §7c data-hue locus reading the active dashboard's live `Scale<V>`
// through `markColorFor`, NEVER a hand-picked hex). `null` ⇒ UNLIT (the neutral floor). The engine
// never re-rolls the encoding; it consumes the one color string and maps it onto the CSS-var bundle.
//
// THE FIVE §AB CLAMPS this engine owns (the rest live in the stage CSS):
//   #3 the §1.4 aurora ceiling — `accentStrength` is HARD-CLAMPED to 0.14 light / 0.12 dark, read off
//      the ONE atlas theme source (`useThemeKey` — the live `<html>.dark` signal), NEVER a second
//      `useColorMode()` writer the composable owns (the CRITIC-MEDIUM: theme detection does not belong
//      inside the composable; it READS the singleton). The veil can never out-glow the page's budget.
//   #5 the STRUCTURAL neutral floor — at `hueSource === null` the strength is EXACTLY 0 (a literal
//      no-op: the stage `::before` stays `opacity:0`, the rim `color-mix` collapses to `--cp-glass-rim`).
//
// THE OUTPUT BUNDLE maps ONE-TO-ONE onto the W-GLASS-ACCENT (BB-3) seam (`accentColor → --glass-accent`,
// `accentStrength → --glass-accent-strength`) PLUS the fallback-floor `--veil-accent` / `--veil-strength`
// pair the atlas stage CSS reads on the SHIPPED register — so the surface is correct whether glass-ui
// honors the accent props or ignores them (a no-op on the floor, the engine at the cut), the safest
// fallback-first seam (ZERO behavioral branch on glass-ui version, ZERO glass-ui source edit).

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { useThemeKey } from "../../../composables/useThemeKey.js";

/** The bloom-centroid (§I-VEIL graft A) — the focused glyph's stage-centroid in the stage's own
    coordinate space (CSS position values, e.g. `{ x: "30%", y: "42%" }`). `null` ⇒ the static
    corner default (`28% 18%`), Lens-B's resting bloom when nothing is focused. */
export interface VeilCentroid {
    x: string;
    y: string;
}

export interface UseAuroraVeilOptions {
    /** The COMPLETE staged hue (a full CSS colour string off the live scale, or a `var(--route-accent)`
        expression), or `null` ⇒ UNLIT (the neutral floor). NEVER a hand-picked hex. */
    hueSource: MaybeRefOrGetter<string | null>;
    /** The bloom-centroid under the focused glyph (graft A); defaults to the static corner when null. */
    centroid?: MaybeRefOrGetter<VeilCentroid | null>;
    /** Override the §1.4 aurora ceiling (the MAX accent strength). Defaults to the theme-keyed
        0.14 light / 0.12 dark budget. */
    ceiling?: number;
}

export interface UseAuroraVeilReturn {
    /** The CSS-var bundle to bind on the stage host `:style` (the W-GLASS-ACCENT seam + the
        fallback-floor `--veil-*` pair + the `--veil-x`/`--veil-y` bloom-centroid). */
    veilStyle: ComputedRef<Record<string, string>>;
    /** The stage host class (`"aurora-veil-stage"`). A constant, surfaced for the consumer to bind. */
    veilClass: string;
    /** The resolved hue (→ `--glass-accent`), or `"transparent"` at the unlit floor. */
    accentColor: ComputedRef<string>;
    /** The clamped strength in `[0, ceiling]` (→ `--glass-accent-strength` / `--veil-strength`). 0 at
        the neutral floor (the literal no-op). */
    accentStrength: ComputedRef<number>;
    /** True when `hueSource != null` — drives the host `[data-lit]` (the glow opacity flip). */
    isLit: ComputedRef<boolean>;
}

/** The §1.4 aurora budget — the LOCAL lift ceiling, never a brighter one. */
const CEILING_LIGHT = 0.14;
const CEILING_DARK = 0.12; // the dark dock-plate luminance gate floor (above it the gate blows).

/** The Lens-B static corner the bloom rests at when no glyph is focused (graft A default). */
const CORNER_X = "28%";
const CORNER_Y = "18%";

/**
 * The ONE glow engine. Resolves a COMPLETE hue + a clamped, theme-keyed strength into the stage
 * CSS-var bundle (the W-GLASS-ACCENT seam ALONGSIDE the fallback-floor `--veil-*` pair) + the
 * bloom-centroid. Reads the ONE atlas theme source (`useThemeKey`) for its ceiling — never a second
 * `useColorMode()`. PRM is the stage CSS's own fence (the transition/sweep live only in the
 * full-motion arm); the engine emits the same structural bundle either way (it is structure, not
 * motion — the membrane STILL renders under PRM, only the crossfade/sweep are cut at the CSS).
 */
export function useAuroraVeil(opts: UseAuroraVeilOptions): UseAuroraVeilReturn {
    // THE ONE THEME SOURCE (CRITIC-MEDIUM) — `useThemeKey` bumps on every `<html>.dark` flip, so the
    // ceiling re-derives the instant the theme changes (the dock toggle, the system flip, a test's
    // direct class write). It is the SVG-fill re-derive signal the choropleth fill already consumes —
    // NOT a second color-mode writer the composable owns.
    const themeKey = useThemeKey();
    const ceiling = computed<number>(() => {
        if (opts.ceiling !== undefined) return opts.ceiling;
        // touch the key so the computed re-runs on a theme flip; read the LIVE `<html>` class.
        void themeKey.value;
        const isDark =
            typeof document !== "undefined" &&
            document.documentElement.classList.contains("dark");
        return isDark ? CEILING_DARK : CEILING_LIGHT;
    });

    const isLit = computed<boolean>(() => toValue(opts.hueSource) != null);
    const accentColor = computed<string>(
        () => toValue(opts.hueSource) ?? "transparent",
    );
    // §AB clamp #5 — 0 at the unlit floor (a literal no-op); the §1.4 ceiling when lit (clamp #3).
    const accentStrength = computed<number>(() => (isLit.value ? ceiling.value : 0));
    const centroid = computed<VeilCentroid | null>(
        () => toValue(opts.centroid ?? null) ?? null,
    );

    const veilStyle = computed<Record<string, string>>(() => ({
        // THE W-GLASS-ACCENT seam (BB-3) — auto-composed by GlassPanel's rim on the published 4.1.0 cut; on the
        // shipped register the host's own CSS reads the `--veil-*` fallback pair below. ONE-TO-ONE.
        "--glass-accent": accentColor.value,
        "--glass-accent-strength": `${accentStrength.value * 100}%`,
        // THE FALLBACK-FLOOR pair the stage `::before` + the 1px accent rim read TODAY (byte-correct
        // on the shipped base; the BB upgrade is subtractive — the rim becomes the library's).
        "--veil-accent": accentColor.value,
        "--veil-strength": `${accentStrength.value}`,
        // graft A — the bloom-centroid (default the static corner; under the focused glyph when staged).
        "--veil-x": centroid.value?.x ?? CORNER_X,
        "--veil-y": centroid.value?.y ?? CORNER_Y,
    }));

    return {
        veilStyle,
        veilClass: "aurora-veil-stage",
        accentColor,
        accentStrength,
        isLit,
    };
}
