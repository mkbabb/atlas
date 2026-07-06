// platform/motion/seededVariety.ts — THE SEEDED-VARIETY KEYSTONE (K-ANIM A3 · proto/A3-variation.md §4).
//
// The ONE home for deterministic procedural variety across the catalog (and the beeswarm, and any future
// seeded site). NO `Math.random` — every value flows from `mulberry32`/`hashSeed`, so reloads are
// BYTE-IDENTICAL (the var-lane cardinal law; the k-variety-parity gate enforces it).
//
// ROOT-REPO LAW: the PEN's wobble RNG stays in glass-ui (handmark.js via prng); this module MIRRORS the
// SAME mulberry32 algorithm for non-pen marks (the atlas-side seed home). The beeswarm's FNV-1a
// `crnJitter` lifts here verbatim as `hashSeed` (the K-REPOINT lockstep — byte-identical output).

import { clamp } from "@mkbabb/value.js";
import { MICRO_BOUNDS } from "./variant-bounds";

/** mulberry32 — the deterministic PRNG (the handmark boil engine). `seed` masked to u32 then the
    canonical mulberry32 mix. ~4e9 period; independent seeds decorrelate. */
export function mulberry32(seed: number): () => number {
    let a = seed | 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** hashSeed — FNV-1a string → u32 seed (the beeswarm `crnJitter` fold, lifted verbatim — the
    `0x811c9dc5` offset basis / `0x01000193` prime). Seeds off a viz `id` / beat key / mark crn so a
    string-keyed surface gets a stable seed with NO author-supplied integer. */
export function hashSeed(key: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** vary — the bounded jitter primitive: `center ± spread` reachable across the full range (the taste
    fence). The seed sub-knobs ALL flow through this, so the bound is structural, never accidental. */
export function vary(rng: () => number, center: number, spread: number): number {
    return center + (rng() * 2 - 1) * spread;
}

/** seedStream — DECORRELATED per-(salt, index) sub-streams off one base seed. So one `seed` drives many
    independent micro-knobs (one per glyph × one per sub-knob) without correlation, all parity-stable.
    `2654435769` ≡ the golden-ratio u32 (Knuth multiplicative hash). */
export function seedStream(baseSeed: number, salt: string, index = 0): () => number {
    const mixed = ((baseSeed >>> 0) ^ hashSeed(salt) ^ Math.imul(2654435769, index + 1)) >>> 0;
    return mulberry32(mixed);
}

/** The bounded MICRO grain a seeded reveal draws PER element index. Each delta is small + bounded
    (§3.5 MICRO_BOUNDS); `null`-seed ⇒ the ZERO grain (no jitter — the resting case). */
export interface MicroGrain {
    /** ± fraction of one stagger step the reveal-start shifts (alive cadence, not a uniform march). */
    delayFrac: number;
    /** ± fraction of the facet amplitude the arrival over/undershoots. */
    ampFrac: number;
    /** A phase in [0, 2π) for any oscillatory sub-knob (the harmonic seed). */
    phase: number;
}

export const ZERO_GRAIN: MicroGrain = { delayFrac: 0, ampFrac: 0, phase: 0 };

/** microGrain — draw the bounded per-index grain for one element. `baseSeed === null` ⇒ ZERO_GRAIN (the
    resting, no-jitter case — identical to today). Otherwise three DECORRELATED sub-streams (one per
    sub-knob) so the delay/amp/phase jitters do not correlate. Pure + deterministic. */
export function microGrain(baseSeed: number | null, facetKey: string, index: number): MicroGrain {
    if (baseSeed === null) return ZERO_GRAIN;
    const d = seedStream(baseSeed, `${facetKey}:delay`, index);
    const a = seedStream(baseSeed, `${facetKey}:amp`, index);
    const p = seedStream(baseSeed, `${facetKey}:phase`, index);
    return {
        delayFrac: vary(d, 0, MICRO_BOUNDS.delayFrac),
        ampFrac: vary(a, 0, MICRO_BOUNDS.ampFrac),
        phase: p() * MICRO_BOUNDS.phase,
    };
}

/** microGrainArray — the PRECOMPUTED per-index grain for an N-element facet, built ONCE (H1 — the
    per-frame trap). The grain is index-keyed, NOT p-keyed, so it is INVARIANT across the scroll: the
    facet builds this array ONCE per `(baseSeed, facetKey, n)`, then the per-frame path reads
    `grain[order]` (an array index, O(1)). `baseSeed === null` ⇒ a frozen ZERO array. */
export function microGrainArray(
    baseSeed: number | null,
    facetKey: string,
    n: number,
): readonly MicroGrain[] {
    if (baseSeed === null) return new Array<MicroGrain>(n).fill(ZERO_GRAIN);
    const out: MicroGrain[] = new Array<MicroGrain>(n);
    for (let i = 0; i < n; i++) out[i] = microGrain(baseSeed, facetKey, i);
    return out;
}

export { clamp };
