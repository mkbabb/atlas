// platform/motion/resolveVariant.ts — THE PURE VARIANT RESOLVER (K-ANIM A3 · proto/A3-variation.md §5).
//
// Folds a `VariantSpec` + a `ResolveCtx` + the facet's `FacetRegister` into the concrete params each
// animation already takes. PRECEDENCE per axis: explicit ?? bundle ?? autoVary-derived ?? register-default
// (the K-FRAMEWORK ?? idiom). PURE — no DOM, no clock, no Vue ref (the k-variety-parity gate asserts
// purity). PRM collapses to terminal (a variant NEVER changes the END-STATE, only the path).

import { clamp } from "@mkbabb/value.js";
import type { VariantSpec, Direction, EaseToken, DurationToken } from "./variant-spec.js";
import {
    DIRECTION,
    EASE,
    DURATION,
    STAGGER,
    type ResolvedDirection,
    type ResolvedEase,
    type ResolvedDuration,
    type ResolvedStagger,
} from "./variant-registers.js";
import {
    RANK_INTENSITY,
    type Rank,
    type FacetRegister,
    type VariantBundle,
} from "./variant-bounds.js";
import { microGrainArray, hashSeed, type MicroGrain } from "./seededVariety.js";

/** The resolve context — the host-supplied signals (the rank, the sequence index, the base seed for
    auto-vary, the element count for the grain array, the PRM flag). ALL optional except `facetKey` +
    `reduced` (always known). */
export interface ResolveCtx {
    /** The K-C rank (the A5 seam) — drives the `intensity` default when set (§5.3). */
    rank?: Rank;
    /** The element's index in a host SEQUENCE (the auto-vary policy, §5.4). */
    index?: number;
    /** The host's base seed (off a viz `id`/beat key via hashSeed) for auto-vary derivation. */
    baseSeed?: number;
    /** The facet's element count (glyphs in the headline, marks in the column) — the grain ARRAY length.
        The resolver precomputes the grain ONCE for `count` elements; the per-frame path reads `grain[i]`,
        never `microGrain()`. Default 1 (a single-element facet — a count-up, a rule). */
    count?: number;
    /** A stable key for the facet (decorrelates the micro sub-streams; e.g. the viz id + facet name). */
    facetKey: string;
    /** The reduced-motion flag (the host reads `useReducedMotion()` once and passes the value). For
        VARIETY (pure decoration) PRM is non-negotiable, so a facet that sets `respectReducedMotion:false`
        still collapses its VARIANT to terminal. */
    reduced: boolean;
}

/** The RESOLVED variant — the concrete params. The facet reads exactly what it needs (a lettering facet
    reads `direction`/`ease`/`stagger`/`grain`; a count-up reads `ease`/`duration`). */
export interface ResolvedVariant {
    direction: ResolvedDirection;
    ease: ResolvedEase;
    duration: ResolvedDuration;
    stagger: ResolvedStagger;
    /** [0,1] — the amplitude scalar (rank-keyed default). Under PRM this is 0 (terminal, no motion). */
    intensity: number;
    /** The PRECOMPUTED per-index bounded micro-grain (length `ctx.count`, all ZERO under PRM or no-seed).
        The facet reads `grain[order]` in its per-frame loop — an O(1) array index. Built ONCE per resolve. */
    grain: readonly MicroGrain[];
    /** PRM flag passed through (the facet may also bind terminal directly — belt + suspenders). */
    reduced: boolean;
}

/** Auto-vary: derive the per-index OVERRIDES (the zebra generalized, §5.4). `seed` axis = a per-index
    decorrelated seed (DERIVED FROM `ctx.baseSeed`, NOT `spec.seed`); `direction` axis = alternate by
    parity. The per-index `auto.seed` WINS the seed precedence (more specific than the facet-level base). */
function autoVaryOverrides(
    spec: VariantSpec | undefined,
    ctx: ResolveCtx,
): { seed?: number; direction?: Direction } {
    if (spec?.autoVary?.by !== "index" || ctx.index === undefined) return {};
    const axis = spec.autoVary.axis ?? "seed";
    if (axis === "direction") {
        // The deliberate loud zebra — alternate ltr/rtl by parity (NEVER `order`; a declared axis).
        return { direction: ctx.index % 2 === 0 ? "ltr" : "rtl" };
    }
    // The safe invisible-but-alive default — per-index decorrelated seed off the HOST base.
    const base = (ctx.baseSeed ?? hashSeed(ctx.facetKey)) >>> 0;
    return { seed: (base + ctx.index) >>> 0 };
}

/** Prototype-safe bundle lookup: `register.bundles["constructor"]`/`"__proto__"` would otherwise return
    an inherited member — `Object.hasOwn` fences the inherited keys so a typo'd/hostile `variant` degrades
    to the register default, never an inherited prototype member. */
function lookupBundle(register: FacetRegister, name?: string): VariantBundle {
    return name && Object.hasOwn(register.bundles, name) ? register.bundles[name] : {};
}

/** A finite-number fence: an author-passed `NaN`/`Infinity` intensity must NOT propagate into a
    `translate3d(0, NaNem, 0)` (clamp(NaN,…) === NaN). */
const finiteOr = (v: number | undefined, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

/** THE RESOLVER. Pure; one call per facet (inside a `computed` keyed on spec/ctx — re-runs on a
    seed/count/rank/PRM change, NEVER on scroll). */
export function resolveVariant(
    spec: VariantSpec | undefined,
    ctx: ResolveCtx,
    register: FacetRegister,
): ResolvedVariant {
    const auto = autoVaryOverrides(spec, ctx);
    const bundle = lookupBundle(register, spec?.variant);
    const d = register.defaults;

    // ── PRECEDENCE per axis: explicit ?? bundle ?? autoVary ?? register-default ─────────────────
    const directionName: Direction =
        spec?.direction ?? bundle.direction ?? auto.direction ?? d.direction;
    const easeName: EaseToken = spec?.ease ?? bundle.ease ?? d.ease;
    const durationName: DurationToken = spec?.duration ?? bundle.duration ?? d.duration;
    const staggerPace = spec?.stagger?.pace ?? bundle.stagger ?? d.stagger;
    const staggerFromName = spec?.stagger?.from ?? directionName;

    // intensity (§5.3): explicit ?? bundle ?? RANK-keyed (when ctx.rank set) ?? register-default — each
    // guarded finite (a NaN never reaches the clamp).
    const intensityRaw = finiteOr(
        spec?.intensity ?? bundle.intensity,
        ctx.rank ? RANK_INTENSITY[ctx.rank] : d.intensity,
    );

    // seed: autoVary-derived (per-index, MOST specific) ?? explicit base ?? bundle ?? null (no grain).
    const seed: number | null = auto.seed ?? spec?.seed ?? bundle.seed ?? null;

    // ── PRM COLLAPSE (the terminal law): under PRM intensity → 0 (no amplitude), grain → ZERO (no
    // jitter), stagger → instant band (all-at-once), duration → ms 0 (SNAP to terminal).
    const intensity = ctx.reduced ? 0 : clamp(intensityRaw, 0, 1);
    const stagger: ResolvedStagger = ctx.reduced ? { eachMs: 0, bandFrac: 1 } : STAGGER[staggerPace];
    const duration: ResolvedDuration = ctx.reduced
        ? { cssVar: "var(--duration-instant)", ms: 0 }
        : DURATION[durationName];
    const effectiveSeed: number | null = ctx.reduced ? null : seed;
    const n = Math.max(1, ctx.count ?? 1);

    return {
        direction: { ...DIRECTION[directionName], origin: DIRECTION[staggerFromName].origin },
        ease: EASE[easeName],
        duration,
        stagger,
        intensity,
        grain: microGrainArray(effectiveSeed, ctx.facetKey, n),
        reduced: ctx.reduced,
    };
}
