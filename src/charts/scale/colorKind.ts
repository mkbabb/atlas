// platform/charts/colorKind.ts — the ONE `colorKind → stops` keystone (DV-1, FD1 §3).
//
// The four legal data-color KINDS each have a canonical ORDERED stop list — the gradient
// the dropped-cap glyph paints up its letterform AND the ramp the shared `<ChartLegend>`
// draws in continuous mode. Before this module the stop list lived hardcoded inside
// `FigureInitial.vue` (the `RAINBOW_SAMPLE` + the per-kind `stops` computed) AND was
// re-derived again in the legend hand-rolls — two surfaces painting two different ramps
// with no shared source. Here it is authored ONCE: `colorKindStops(kind, hinge)` returns
// the `{ offset, color }[]` BOTH the glyph and the legend read, so a kind's gradient is
// the same wherever it appears (INV-2, one-colour-one-meaning).
//
// The colours are CSS-var references (`var(--viz-…)` / `var(--rainbow-tier-…)`) resolved
// LATE by the cascade, so a theme flip retunes every consumer from the design locus (the
// SVG paint server + the legend bar both read live tokens). The OKLab-blended `rgb()`
// strings the ECharts canvas needs are NOT this module's job — that is `ColorScale.ts`
// (the canvas-string seam); this module is the CASCADE-resolved gradient the SVG fills use.

/** The four-kind color register (FD1 §3) a gradient-painting consumer can request. The
    `categorical` kind has no continuous ramp (it is discrete program identity), so it is
    absent here — the discrete-chips legend mode carries it, never a gradient. */
export type ColorKind = "diverging" | "sequential" | "rainbow";

/** One ordered gradient stop: `offset` is a 0..100 percentage up the ramp (0 = the crown /
    high-saturation end, 100 = the foot / base end — the up-the-glyph reading the diverging
    key established), `color` a cascade-resolved CSS colour the consumer paints. */
export interface ColorStop {
    offset: number;
    color: string;
}

/** The rainbow ramp SAMPLED base→apex for a narrow gradient (the dropped-cap glyph + the
    legend's continuous rainbow bar). A sparse, even sampling of the 14-tier ordinal ramp
    (FD1 §3.3) so the letterform/bar carries the spectrum without cramming all 14 stops into
    a thin shape. Base green (the connected floor) → apex violet (fully provisioned). The
    DISCRETE band-cake + the map dots still read every tier verbatim through
    `makeOrdinalRainbowScale` — this sampling is the gradient face only. */
export const RAINBOW_SAMPLE = [
    "--rainbow-tier-1", // base green (the connected floor)
    "--rainbow-tier-3", // chartreuse
    "--rainbow-tier-5", // gold
    "--rainbow-tier-7", // orange
    "--rainbow-tier-9", // red
    "--rainbow-tier-11", // pink
    "--rainbow-tier-14", // apex violet (fully provisioned)
] as const;

/** The diverging break-even mid — the ONE `--viz-diverging-mid` fallback constant the whole
    platform reconciles to (DV-1). The light token is `oklch(0.87 0.02 95)` (the K2 wash-fix
    neutral, seen off the cream ground); its canonical sRGB is `#d8d4c6`, its OKLab
    `{ L: 0.87, a: -0.0017, b: 0.0199 }`. `ColorScale.ts` (the OKLab pole read) and
    `useVizPalette.ts` (the canvas-string read) BOTH import this so neither carries a private
    fallback that could drift from the token. The live theme value still wins via
    getComputedStyle; this is only the SSR/jsdom/empty-token floor. */
export const VIZ_DIVERGING_MID_FALLBACK = {
    /** The authored CSS token form (the design locus value). */
    token: "oklch(0.87 0.02 95)",
    /** The canonical sRGB hex (the rgb-string consumers' fallback). */
    hex: "#d8d4c6",
    /** The OKLab decomposition (the pole-blend consumers' fallback). */
    oklab: { L: 0.87, a: -0.0017, b: 0.0199 } as const,
} as const;

/** The CATEGORY QUAD (J-COLOR §5.1 — the RWB-emergent-plus-one categorical register). The
    NON-continuous categorical palette the VC ranked-bar↔choropleth coordination reads: bar k +
    its territory both fill `var(--viz-category-{k})`, 1:1 by index through the J-ARCH GeoPlate
    shared scale. It is a FIFTH lawful KIND-adjacent register (a discrete categorical palette, like
    --viz-program-*), in its OWN role — NOT the band-cake rainbow, NOT chrome (the §5.4
    role-separation). Registered here (beside the diverging-mid fallback) so the bar↔map
    coordination resolves through the ONE OKLab seam with a SSR/jsdom floor that cannot drift from
    the token: `ColorScale.ts`/`useVizPalette.ts` read the live theme value via getComputedStyle;
    this triple is only the empty-token fallback. category-1 is a NON-brand data-red, JND-distinct
    from the brand --ncsu-red #cc0000 (COLOR-2). The LIGHT-arm token/hex/oklab; the live cascade
    resolves the dark arm. */
export const VIZ_CATEGORY_QUAD = [
    { token: "var(--viz-category-1)", hex: "#c9484c", oklab: { L: 0.58, a: 0.153, b: 0.0618 } },
    { token: "var(--viz-category-2)", hex: "#1666aa", oklab: { L: 0.5, a: -0.0445, b: -0.1222 } },
    { token: "var(--viz-category-3)", hex: "#b57d00", oklab: { L: 0.63, a: 0.0243, b: 0.1379 } },
    { token: "var(--viz-category-4)", hex: "#348f4f", oklab: { L: 0.58, a: -0.1126, b: 0.065 } },
] as const;

/** Resolve the `var(--viz-category-{k})` token for a categorical class index (1-based, the
    bar↔map index the coordinated pair binds). Wraps at the quad boundary — a >4-class categorical
    encoding is the band-cake rainbow's role, not this quad's (§5.4 role-separation keeps it at 4). */
export function vizCategoryToken(index: number): string {
    return VIZ_CATEGORY_QUAD[(index - 1) % VIZ_CATEGORY_QUAD.length].token;
}

/** The hinge clamped to a legible band — the break-even never pins flush to a pole, so both
    the warm foot and the cool crown always read. `hinge` is a 0..1 fraction up the ramp. */
function clampHinge(hinge: number): number {
    return Math.min(0.85, Math.max(0.15, hinge));
}

/**
 * The ordered gradient stops for a `colorKind`, the SINGLE source both the dropped-cap glyph
 * and the `<ChartLegend>` continuous bar read (DV-1). `offset` runs 0 (crown/high) → 100
 * (foot/base); `hinge` (0..1, default 0.5 the neutral split) slides the diverging break-even
 * up the ramp and re-weights where the sequential/rainbow knee sits, so a distribution-bound
 * consumer is its own LIVE legend.
 *
 * Emitted crown→foot (ascending `offset`, as an SVG `<linearGradient>` paint server requires).
 * Colours are `var(--…)` references the cascade resolves late (theme-aware).
 */
export function colorKindStops(kind: ColorKind, hinge = 0.5): ColorStop[] {
    // The hinge offset measured from the crown (offset 0): a high `hinge` (cool-heavy) pushes
    // the mid toward the crown. SVG/up-the-glyph reading: crown = high, foot = low/base.
    const knee = (1 - clampHinge(hinge)) * 100;

    if (kind === "sequential") {
        // The magnitude ramp: high (saturated) crown → low (pale) foot, the hinge sliding a
        // mid-blend knee so the ramp re-weights to the on-screen distribution. color-mix
        // gives the in-between without a third token.
        return [
            { offset: 0, color: "var(--viz-sequential-high)" },
            {
                offset: knee,
                color: "color-mix(in oklab, var(--viz-sequential-high), var(--viz-sequential-low))",
            },
            { offset: 100, color: "var(--viz-sequential-low)" },
        ];
    }

    if (kind === "rainbow") {
        // The ordinal ramp sampled base→apex, painted apex-at-crown — evenly spaced so the
        // spectrum reads in a narrow shape. The sample is REVERSED so offset 0 (crown) is the
        // apex violet, offset 100 (foot) the base green.
        const n = RAINBOW_SAMPLE.length;
        return RAINBOW_SAMPLE.map((_, i) => ({
            offset: (i / (n - 1)) * 100,
            color: `var(${RAINBOW_SAMPLE[n - 1 - i]})`,
        }));
    }

    // diverging (default) — the three-pole key, the live hinge sliding the neutral mid.
    return [
        { offset: 0, color: "var(--viz-diverging-high)" },
        { offset: knee, color: "var(--viz-diverging-mid)" },
        { offset: 100, color: "var(--viz-diverging-low)" },
    ];
}
