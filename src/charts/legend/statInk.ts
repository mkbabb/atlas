/** A stat numeral's ink from a chart colour token: the token's hue, clamped into the body-legibility
    band (L <= 0.44 light, L >= 0.75 dark), the §INK contract `figure-slug` applies to its suffix. */
export function statInk(colorVar: string): string {
    const c = `var(${colorVar})`;
    return `light-dark(oklch(from ${c} min(l, 0.44) min(c, 0.17) h), oklch(from ${c} max(l, 0.75) min(c, 0.15) h))`;
}
