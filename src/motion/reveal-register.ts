// platform/motion/reveal-register.ts — THE KEPT REVEAL REGISTER binding surface (N.WC1 · N.md §4.C).
//
// The lean `reveal` + `count` mechanisms bind HERE — the scroll-reveal register ratified §0.7 (the
// scroll-driven.css `data-reveal-*` compositor system · `useCoverProgress` · `useScrollLettering` ·
// `useCountUp`), NEVER the deleted fragment-blend engine (the purged K-arc catalog tree). The DOM-tier
// styleFor form the `useMotionDirector` hands the template: an inline `{opacity, transform}` object off
// the cover scalar. It imports ZERO purge-set symbols — the gate witness (`REVEAL_REGISTER_BINDINGS`)
// freezes that fact so the reveal register can never re-couple to the corpse.
//
// The atlas host reveal is compositor-driven ([data-reveal-fan] + `--scroll-tl`, zero JS per frame); the
// styleFor form here is the JS seam a plate binds when it declares a `RevealUp`/`CountDial` MotionSegment
// through the director (the crown reveal + the number dial), so the reveal is DECLARED, not hand-wired.

import { clamp, easeOutExpo } from "@mkbabb/value.js";

const clamp01 = (x: number): number => clamp(x, 0, 1);

/** THE `reveal` MECHANISM for a DOM HOST (the director styleFor seam) — fade + lift off the cover
    scalar. Opacity climbs `easeOutExpo(scroll)`; the host lifts `liftEm` into place. Under reduced
    motion the director passes `scroll=1` ⇒ terminal (opacity 1, no lift). Independent CSS loci
    (`opacity` + `transform: translateY`) so the blend never fights a transform slot. */
export function revealHostStyle(
    scroll: number,
    { liftEm = 0.6 }: { liftEm?: number } = {},
): Record<string, string> {
    const e = easeOutExpo(clamp01(scroll));
    return {
        opacity: e.toFixed(4),
        transform: `translateY(${((1 - e) * liftEm).toFixed(4)}em)`,
    };
}

export interface CountAtOptions {
    readonly completeAt?: number;
    /** Preserve the historic integer dial by default; `false` keeps the fractional ramp intact. */
    readonly round?: boolean;
    /** Optional decimal-place rounding for consumers that want the dial, rather than the formatter,
        to own a fixed precision. Ignored when `round` is false. */
    readonly decimals?: number;
}

/** THE `count` MECHANISM (the `useCountUp` tier) — a number dial off the SAME cover scalar, P193-timed
    so it COMPLETES at cover `completeAt` (default 0.50 ≡ viewport centre): the count reads its terminal
    by the time the figure is centred (the ratified owner ask · N-R5 K2 · G-N13 count arm). Integer
    output remains the default; `round:false` preserves fractional crowns for the formatter. */
export function countAt(
    target: number,
    scroll: number,
    {
        completeAt = 0.5,
        round = true,
        decimals,
    }: CountAtOptions = {},
): number {
    const remapped = clamp01(scroll / completeAt); // t=1 by the time cover hits `completeAt`
    const value = target * easeOutExpo(remapped);
    if (!round) return value;
    if (decimals != null) {
        const places = Math.max(0, Math.trunc(decimals));
        const scale = 10 ** places;
        return Math.round(value * scale) / scale;
    }
    return Math.round(value);
}

/** THE PURGE WITNESS (NC3-B3 · G-N6 half): this module deliberately binds only the KEPT register and
    imports ZERO purge-set symbol. The gate asserts the reveal register never re-imports the corpse. */
export const REVEAL_REGISTER_BINDINGS = Object.freeze({
    scrollDrivenCss: "scroll-driven.css (data-reveal-*, --scroll-tl)",
    coverScalar: "useCoverProgress",
    lettering: "useScrollLettering",
    count: "useCountUp",
    purgeSetImports: "none (the deleted stack/catalog/timeline engines are not referenced)",
});
