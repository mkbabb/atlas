// src/platform/design/ink.ts — THE D5 PAIRED-INK DERIVATION, JS MIRROR (O-C7 · design-canon §F).
//
// The one-line JS twin of the CSS `--ink-*` recipe in tokens.css §INK. A chart/figure whose TEXT
// colour is bound at RUNTIME to a per-instance registry var (`--viz-*` / `--rainbow-*`) — the
// VizDescription axis-keyed words, the VizKeyStats values, the per-figure hero tints — cannot read
// a pre-named `--ink-*` token (the source var is only known at the call site), so it builds the
// clamp inline through THIS helper. The derivation is byte-identical to the CSS recipe: hue
// preserved, chroma clamped (gamut/neon guard), LIGHTNESS clamped to the contrast-safe band per
// theme via `light-dark()` — light forces L DOWN, dark forces L UP. One derivation, two tiers.
//
// It preserves the i0-colorkind-law identity: the ink still DERIVES from the registry var (never a
// hex), so the "one colour locus" doctrine holds — the mark and its label read the SAME hue, only
// the label's lightness is clamped into legibility.

/**
 * Derive a READABLE ink from any accent — a CSS colour or a `var(--…)` reference.
 *
 * @param accent a CSS `<color>` or `var(--token)` string (the raw data/registry hue).
 * @param large  the AA-large relaxation (≥3.0) for audacious HERO figures (≥24px / ≥18.66px bold):
 *               keeps more vividness (L≤0.62 light / L≥0.66 dark). Default (body) is AA ≥4.5
 *               (L≤0.47 light / L≥0.75 dark — the O-C2-TAIL G16 ruling tightened the body light
 *               arm 0.52→0.47 so chromatic body text, e.g. the VizKeyStats card figures this
 *               helper inks, clears AA-normal across the gamut; the CSS `--ink-*` twin matches).
 * @returns a `light-dark(oklch(from …), oklch(from …))` string for a `color:` binding.
 */
export const inkFromAccent = (accent: string, large = false): string => {
    const lLight = large ? 0.62 : 0.47; // light forces L DOWN to this ceiling
    const lDark = large ? 0.66 : 0.75; // dark forces L UP to this floor
    return `light-dark(oklch(from ${accent} min(l, ${lLight}) min(c, 0.17) h), oklch(from ${accent} max(l, ${lDark}) min(c, 0.15) h))`;
};
