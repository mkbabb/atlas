// charts/scale/ColorScale.ts — the ONE color-scale factory every dashboard
// fills through (FD1 §3, the four legal KINDS, INV-2 one-colour-one-meaning).
//
// Three named scales, three meanings, never crossed:
//   diverging   — signed net direction around a data hinge (warm payer ↔ cool
//                 receiver). The hinge is DATA, not colour: NET_RETENTION_HINGE
//                 = 0.7 (FD1 §3.1; the live `hinge:0` bug collapses the split).
//   sequential  — unsigned magnitude, single-hue teal ramp, L-floor ≥ 0.52,
//                 quantile-positioned by default so an outlier (Alaska's
//                 per-capita) gets one rank slot and the body spreads (FD1 §3.2).
//   ordinalRainbow — ranked discrete TIERS, the SCI signature (FD1 §3.3). The
//                 22 source tiers render through 14 verbatim stops, base green →
//                 apex violet; the floor clamps cyan/teal 10/20/50 Mbps to 100.
//                 DISCRETE — a tier IS its stop, never interpolated at render.
//
// The stop colours live ONCE in `design/tokens/color.css` (--viz-diverging-*,
// --viz-sequential-*, --rainbow-tier-*). We read them through getComputedStyle (the token seam +
// the OKLab blend live in `./colorRamp`, split off at the O-B4 charts family-split, §A.9) so a
// theme flip retunes every chart from one place, and BLEND in OKLab through the ONE perceptual
// seam (`./oklab`, the canonical matrix), emitting a gamut-safe `rgb()` the SVG and the ECharts
// canvas parse identically. This file is the scale-ASSEMBLY half: the three factory functions,
// the tier helpers, and the promoted `colorFor` registry — over `./colorRamp`'s primitives.

import { type Oklab, lerpOklab, oklabToRgb } from "./oklab.js";
import { VIZ_DIVERGING_MID_FALLBACK } from "./colorKind.js";
import { parseSelKey, type SelectionKey } from "../contract/selection-contract.js";
import { formatUsdCompact, formatCountCompact } from "../lib/format.js";
import {
    type Scale,
    type SequentialMode,
    NET_RETENTION_HINGE,
    SEQUENTIAL_L_FLOOR,
    SPEED_TIERS,
    readVar,
    readPole,
    readGround,
    liftToMarkFloor,
    buildPosition,
} from "./colorRamp.js";

// The ramp-math substrate re-exports through the family's ORIGINAL surface — the split is a no-op
// render-identity refactor, so `charts/scale/ColorScale` keeps every member it exported pre-split.
export {
    type Scale,
    type SequentialMode,
    NET_RETENTION_HINGE,
    MARK_CONTRAST_FLOOR,
    SEQUENTIAL_L_FLOOR,
    SPEED_TIERS,
    clearVarMemo,
    liftToMarkFloor,
} from "./colorRamp.js";

// ── ① DIVERGING ───────────────────────────────────────────────────────────────
export interface DivergingOptions {
    /** [lo, hi] data domain the fill spans. */
    domain: [number, number];
    /** The break-even hinge, in the metric's own units. Default NET_RETENTION_HINGE. */
    hinge?: number;
    /** MARK-SAFE (F4) — when true, every emitted pole is lifted to the 3:1 non-text floor vs the
        plate ground (a freestanding SCATTER mark, not a recessive AREA fill). Hue + chroma frozen;
        only the near-break-even body's L rises off the ground so it reads as a MARK. Default
        false — the choropleth/band-cake keep the recessive read. */
    markSafe?: boolean;
}

/**
 * Diverging scale around a hinge. value ≤ domain[0] → low (warm payer pole),
 * value === hinge → mid (near-neutral break-even), value ≥ domain[1] → high
 * (cool receiver pole). Blends from the mid stop out to whichever pole the value
 * falls on, so the hinge is always the visual zero. Non-finite → no-data grey.
 */
export function makeDivergingScale(opts: DivergingOptions): Scale<number | null> {
    const hinge = opts.hinge ?? NET_RETENTION_HINGE;
    const [lo, hi] = opts.domain;
    // The three poles, resolved to OKLab once: warm payer (low), dark-neutral break-
    // even (mid), cool receiver (high). Fallbacks match the light-theme tokens.
    const low = readPole("--viz-diverging-low", { L: 0.62, a: 0.15, b: 0.08 });
    // The mid fallback is the ONE reconciled `--viz-diverging-mid` constant (DV-1) — the K2
    // wash-fix neutral, a warm-grey at L 0.87 darkened off the cream so break-even is a SEEN
    // hinge, distinct from both paper and --viz-no-data (FD1 §3.1; SCI S-P0-2, ECF E-P1-4).
    // Imported from colorKind.ts so this read and useVizPalette's both floor on one value (no
    // private fallback that could drift from the token). The live theme value still wins.
    const mid = readPole("--viz-diverging-mid", { ...VIZ_DIVERGING_MID_FALLBACK.oklab });
    const high = readPole("--viz-diverging-high", { L: 0.55, a: -0.06, b: -0.1 });
    const noData = readVar("--viz-no-data", "#e2e2e6");
    // MARK-SAFE (F4) — resolve the plate ground once; every emitted blend lifts to the 3:1 floor
    // against it so a near-break-even mark (the recessive `--viz-diverging-mid` body) reads as a
    // freestanding mark, not a ghost on the cream. Frozen when `markSafe` is off (the area read).
    const ground = opts.markSafe ? readGround() : null;
    const emit = (c: Oklab): string =>
        oklabToRgb(ground ? liftToMarkFloor(c, ground) : c);

    return (value) => {
        if (value == null || !Number.isFinite(value)) return noData;
        if (value <= hinge) {
            const span = hinge - lo || 1;
            const t = (hinge - value) / span;
            return emit(lerpOklab(mid, low, t < 0 ? 0 : t > 1 ? 1 : t));
        }
        const span = hi - hinge || 1;
        const t = (value - hinge) / span;
        return emit(lerpOklab(mid, high, t < 0 ? 0 : t > 1 ? 1 : t));
    };
}

/**
 * The PERCENTILE-ROBUST diverging domain for a scatter colour channel (SX-3, additive to the
 * discrete-stop invariant — NOT the rainbow .dark arm). Replacing a raw `Math.min/max` domain
 * (which one outlier blows out, washing the whole body to the near-neutral mid — the SCI
 * equity scatter's monochrome failure), this clips each side at a percentile so the dense
 * body of the cloud spans the ramp's coloured reach and a lone extreme saturates rather than
 * flattening everyone toward break-even.
 *
 * The domain is symmetric-in-RANK around the hinge: the low edge is the `p`-th percentile of
 * the values BELOW the hinge, the high edge the `(1−p)`-th of those ABOVE — so equal spreads
 * of payers and receivers reach equal pole saturation (the hinge stays the visual zero). A
 * `minSpan` floor keeps a near-degenerate side from collapsing to a zero span (which would
 * pin that whole arm to a pole). Falls back to ±1 around the hinge when a side is empty.
 */
export function divergingScatterDomain(
    values: readonly (number | null)[],
    hinge: number,
    p = 0.05,
): [number, number] {
    const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
    if (finite.length === 0) return [hinge - 1, hinge + 1];

    // Percentile off a sorted slice (linear interpolation between ranks).
    const pct = (sorted: number[], q: number): number => {
        if (sorted.length === 0) return NaN;
        if (sorted.length === 1) return sorted[0];
        const idx = q * (sorted.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        const frac = idx - lo;
        return sorted[lo] + (sorted[hi] - sorted[lo]) * frac;
    };

    const below = finite.filter((v) => v < hinge).sort((a, b) => a - b);
    const above = finite.filter((v) => v > hinge).sort((a, b) => a - b);

    // The robust low edge: the p-th percentile below the hinge (clipping the warm tail's
    // single deepest outlier). The robust high edge: the (1−p)-th above. Empty side ⇒ a unit
    // step off the hinge so that arm still carries a usable (if narrow) ramp.
    const loEdge = below.length ? pct(below, p) : hinge - 1;
    const hiEdge = above.length ? pct(above, 1 - p) : hinge + 1;

    // Floor each half-span so a near-degenerate side does not pin its whole arm to a pole.
    const minSpan = Math.max(Math.abs(hinge) * 1e-3, 1e-6);
    const lo = Math.min(loEdge, hinge - minSpan);
    const hi = Math.max(hiEdge, hinge + minSpan);
    return [lo, hi];
}

// ── ② SEQUENTIAL ────────────────────────────────────────────────────────────
export interface SequentialOptions {
    /** The full set of values to position against (drives quantile/log domains). */
    values: readonly (number | null)[];
    /** Positioning mode. Default `quantile` — outlier-robust (FD1 §3.2). */
    mode?: SequentialMode;
    /** MARK-SAFE (F4) — lift every emitted pole to the 3:1 floor vs the plate ground (the
        freestanding SCATTER mark; the pale `--viz-sequential-low` floor, CR 1.11, ghosts on
        cream otherwise). Hue + chroma frozen, only L rises. Default false — the treemap/choropleth
        FILL keeps the recessive read. */
    markSafe?: boolean;
}

/**
 * Sequential magnitude scale, single-hue teal ramp, L-floor honoured by the
 * stops themselves (tokens.css). Defaults to `quantile` positioning so one
 * outlier occupies one rank slot and the distribution's body stays legible. The
 * returned function maps a value to its CSS colour; nulls → no-data grey.
 */
export function makeSequentialScale(opts: SequentialOptions): Scale<number | null> {
    const mode = opts.mode ?? "quantile";
    // The single-hue ramp poles, resolved to OKLab once (light high-pole L kept ≥
    // SEQUENTIAL_L_FLOOR by the tokens). Fallbacks match the light-theme tokens.
    const low = readPole("--viz-sequential-low", { L: 0.95, a: -0.019, b: -0.023 });
    // The high-pole fallback honours SEQUENTIAL_L_FLOOR (0.52, NOT 0.45 — the live
    // "too dark" bug, FD1 §3.2): no magnitude stop sinks below this lightness.
    const high = readPole("--viz-sequential-high", { L: SEQUENTIAL_L_FLOOR, a: -0.055, b: -0.15 });
    const noData = readVar("--viz-no-data", "#e2e2e6");
    const position = buildPosition(opts.values, mode);
    // MARK-SAFE (F4) — lift the emitted pole to the 3:1 mark floor vs the plate ground when the
    // scale paints a freestanding scatter mark (the pale low pole ghosts on cream otherwise).
    const ground = opts.markSafe ? readGround() : null;

    return (value) => {
        const pos = position(value);
        if (pos == null) return noData;
        const blend = lerpOklab(low, high, pos);
        return oklabToRgb(ground ? liftToMarkFloor(blend, ground) : blend);
    };
}

// ── ③ ORDINAL-RAINBOW ──────────────────────────────────────────────────────
export interface OrdinalRainbowOptions {
    /**
     * The ordered tier keys, base → apex. Defaults to `SPEED_TIERS` Mbps values
     * — the SCI signature ramp. A tier's colour is its stop; keys past the apex
     * collapse into the apex band (the no-cool-stripe reconciliation, FD1 §3.3).
     */
    tierOrder?: readonly number[];
}

/**
 * Ordinal-rainbow scale — a DISCRETE tier → stop map, never interpolated. Each
 * tier reads its verbatim CSS var; a key not in `tierOrder` falls back to the
 * recessive slate null. This is the kind that carries the SCI band-cake: the
 * stack binds a tier to its fixed hue, with zero render-time OKLab blending.
 */
export function makeOrdinalRainbowScale(opts: OrdinalRainbowOptions = {}): Scale<number> {
    const order = opts.tierOrder ?? SPEED_TIERS.map((t) => t.mbps);
    const nullColor = readVar("--rainbow-null", "#4e79a7");
    // Resolve each tier's stop once; an explicit tierOrder reuses the SPEED_TIERS
    // var slots by position (base→apex), so any ordered facet rides the same ramp.
    const stops = new Map<number, string>();
    order.forEach((key, i) => {
        const slot = SPEED_TIERS[Math.min(i, SPEED_TIERS.length - 1)];
        stops.set(key, readVar(slot.cssVar, "#23ac78"));
    });

    return (tier) => stops.get(tier) ?? nullColor;
}

/** The ordered legend stops for a rainbow scale (tier key + resolved colour). */
export function rainbowLegendStops(
    opts: OrdinalRainbowOptions = {},
): { key: number; color: string }[] {
    const scale = makeOrdinalRainbowScale(opts);
    const order = opts.tierOrder ?? SPEED_TIERS.map((t) => t.mbps);
    return order.map((key) => ({ key, color: scale(key) }));
}

/**
 * Quantize a CONTINUOUS magnitude onto its tier band: the greatest tier key at/below `value`
 * (base → apex). A value below `order[0]` clamps to the floor tier (the SAME 100 Mbps clamp
 * `sci/lib/derive.ts` applies); a value at/above the apex collapses into the apex band (the
 * no-cool-stripe reconciliation). PURE — `order` is ascending (the rainbow's base→apex contract).
 * Reached ONLY after `tierHue`'s absence guard, so `value` here is always a present finite number.
 */
function quantizeToTier(value: number, order: readonly number[]): number {
    let tier = order[0];
    for (const key of order) {
        if (value >= key) tier = key;
        else break;
    }
    return tier;
}

/**
 * The ABSENCE-FIRST ordinal-magnitude binner (K-PAPER §5). Bins a CONTINUOUS magnitude to its
 * tier band, then reads that tier's authored stop off the discrete `makeOrdinalRainbowScale` map
 * (ONE source of stop truth — no second var read). Absence is its OWN slate (`--rainbow-null`),
 * NEVER the floor tier — the false-positive-magnitude foreclose.
 *
 * THE ABSENCE-FIRST LAW: the null/NaN/non-finite short-circuit is the FIRST statement, BEFORE any
 * quantize/clamp. NEVER `?? order[0]`: a NaN floored to the base tier would paint an ABSENT datum
 * as the 100 Mbps "connected" green (`--rainbow-tier-1`), a false-positive magnitude. A
 * present-but-out-of-range magnitude is a real floor/apex tier; an ABSENT one returns `nullColor`
 * here and never reaches the quantize.
 */
export function tierHue(
    value: number | null | undefined,
    opts: OrdinalRainbowOptions = {},
): string {
    const order = opts.tierOrder ?? SPEED_TIERS.map((t) => t.mbps);
    const nullColor = readVar("--rainbow-null", "#4e79a7");
    // ABSENCE-FIRST — BEFORE any quantize/clamp. NEVER `?? order[0]`.
    if (value == null || !Number.isFinite(value)) return nullColor;
    const scale = makeOrdinalRainbowScale(opts); // ONE source of stop truth
    return scale(quantizeToTier(value, order)); // a HARD step — the tier IS its authored stop
}

/** The register a tier-legend chip's face speaks (the rank-as-tier-hue arm ranks fields that are
    NOT bandwidth — brokered $, students, $/ADM — so the label speaks the row's unit). */
export type TierUnit = "bandwidth" | "count" | "currency" | "ordinal";

/**
 * The UNIT-AWARE tier label (K-PAPER §5) — the legend-chip face, generalizing the SCI route's
 * bandwidth-only `tierLabel(mbps)` (`sci/lib/derive.ts`) to speak the ranked row's unit. The
 * `"bandwidth"` branch reproduces that formula byte-for-byte (`>= 1000` → `Gb/s` with the
 * integer/`.toFixed(1)` split, else `Mbps`); the SCI delegate re-points to `tierLabel(mbps,
 * "bandwidth")` (byte-identical output — the band-cake legend does not move a pixel).
 */
export function tierLabel(tier: number, unit: TierUnit): string {
    switch (unit) {
        case "bandwidth":
            if (tier >= 1000) {
                const gb = tier / 1000;
                return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} Gb/s`;
            }
            return `${tier} Mbps`;
        case "currency":
            return formatUsdCompact(tier);
        case "count":
            return formatCountCompact(tier);
        case "ordinal":
            return String(tier);
    }
}

/**
 * THE ONE RANK-HUE CHANNEL (K-PAPER §5) — a `<RankedBar>` row's fill is a binned ordinal
 * MAGNITUDE (tier) XOR a coordinated categorical TERRITORY (region). A consumer CANNOT bind both:
 * the discriminated union makes "both-set" un-representable (retiring the prior dual `fill |
 * category` prop ambiguity, where `category` silently won). The keystone composes on the existing
 * colour contract — `mode: "tier"` carries a resolved stop (from `tierHue` / any `Scale<V>`), the
 * LENGTH-paired loud hue; `mode: "region"` carries a `--viz-category-{1..4}` quad index (the
 * J-COLOR §5.1 bar↔choropleth pair), resolved off `:root` by the host.
 */
export type RankHue =
    | { mode: "tier"; fill: string } // a hard tier stop / resolved scale fill — the LENGTH-paired magnitude
    | { mode: "region"; category: number }; // a --viz-category-{1..4} quad index — the J-COLOR §5.1 pair

// ── ④ DISCRETE-STOP INVARIANT (C.W1.b — the passthrough proof, NOT an L-clamp) ──
//
// `makeOrdinalRainbowScale` is a PURE CSS-var passthrough: a tier IS its authored stop,
// emitted byte-for-byte, never interpolated or L-clamped at render (FD1 §3.3/§3.5). The
// rainbow `.dark` L-floor lives in the `oklab.ts` relight TRANSFORM (where the L-math is),
// NOT here — adding an L-clamp to this accessor would be the T-8 wrong-quantity trap (there
// is no L to clamp in a passthrough). This is the executable proof of that invariant: feed a
// known token map, assert each tier returns its authored value unmodified (and an unknown
// tier falls back to the authored null). Safe to import in a unit test or call once; returns
// `{ ok, failures }`, never throws.

/** Assert the ordinal-rainbow accessor returns the AUTHORED token unmodified (no OKLab math, no
    L-clamp) AND that the binned hue paints as HARD STEPS, never a laundered continuous gradient
    (K-PAPER §5 — the doc-guard rebuild collapses INTO this one function, carrying all THREE probes):

      ① DISCRETE PASSTHROUGH — each tier emits its authored stop unmodified.
      ② ADJACENT TIERS DISTINCT — a continuous scale blends neighbours to a near-equal pair → collapse.
      ③ A NON-TIER MID MISSES TO --rainbow-null — a value strictly between two tier keys returns the
        recessive null slate, NOT a blend (a continuous scale returns an interpolated colour there).
        The null is sourced through `scale(min(order) - 1)` — a sentinel strictly below every key, a
        guaranteed `stops.get`-miss → `nullColor`, jsdom-safe (no resolved `:root` token required).

    `resolve` supplies the token map under test (the real accessor reads these off `:root`); the
    default exercises the live `:root`. `scale` is the accessor under test — the discrete
    `makeOrdinalRainbowScale()` by default; a doc-guard NEG control feeds a CONTINUOUS scale to prove
    probes ②③ go RED. Probes ②③ guard on the AUTHORED map's own distinctness so happy-dom's uniform
    fallback (every var → one fallback) never false-trips a vacuous green. Safe to import in a unit
    test or call once; returns `{ ok, failures }`, never throws. */
export function checkOrdinalRainbowPassthrough(
    resolve: (cssVar: string) => string = (v) =>
        getComputedStyle(document.documentElement).getPropertyValue(v).trim(),
    scale: Scale<number> = makeOrdinalRainbowScale(),
): { ok: boolean; failures: string[] } {
    const failures: string[] = [];
    const order = SPEED_TIERS.map((t) => t.mbps);
    // ① the discrete passthrough — each tier emits its authored stop (skips when the token does not
    //    resolve, e.g. SSR/happy-dom: nothing to assert against).
    for (const { mbps, cssVar } of SPEED_TIERS) {
        const authored = resolve(cssVar);
        if (!authored) continue;
        const emitted = scale(mbps);
        if (emitted !== authored) {
            failures.push(`① tier ${mbps}: emitted ${emitted} ≠ authored ${authored} (${cssVar})`);
        }
    }
    // ② adjacent tiers are DISTINCT stops — guarded by the authored map's own distinctness so the
    //    happy-dom uniform fallback never false-trips; a continuous blend collapses adjacency.
    for (let i = 0; i + 1 < order.length; i++) {
        const a = resolve(SPEED_TIERS[i].cssVar);
        const b = resolve(SPEED_TIERS[i + 1].cssVar);
        if (a && b && a !== b && scale(order[i]) === scale(order[i + 1])) {
            failures.push(`② tiers ${order[i]} / ${order[i + 1]} collapse to one stop`);
        }
    }
    // ③ a NON-tier mid MISSES to the null sentinel — a continuous scale returns a blend there → RED.
    const nullSentinel = scale(Math.min(...order) - 1);
    for (let i = 0; i + 1 < order.length; i++) {
        const mid = (order[i] + order[i + 1]) / 2;
        if (mid === order[i] || mid === order[i + 1]) continue; // coincident keys carry no mid
        if (scale(mid) !== nullSentinel) {
            failures.push(`③ non-tier mid ${mid} did not miss to --rainbow-null (a blend)`);
        }
    }
    return { ok: failures.length === 0, failures };
}

// ── ⑤ THE PROMOTED colorFor REGISTRY (I5 §3/§7c · the data-hue locus the veil reads) ─────────
//
// CRITIC-HIGH (the §I-VEIL catch): the veil's "lit in its OWN data hue" claim was UNBUILDABLE on
// the code as-shipped. The per-datum FILL is built LOCALLY inside each feature (NetRetentionMap's
// `scale = makeDivergingScale(...)` over its own domain), so a PLATFORM store (`useSelection`) had
// no reach to it — `markColor(key)` simply did not exist. This registry PROMOTES that reach OUT:
// the active dashboard PUBLISHES a tiny resolver — "given a composite `{kind}:{id}` key, return the
// datum's verdict fill off my live `Scale<V>`" — into ONE platform slot, and `markColorFor(key)`
// (read by `useSelection.veilHue`) asks it. The per-feature `makeDivergingScale` stays the FILL
// source (untouched); this registry is only the platform READ over it.
//
// ONE active resolver, not a map. Exactly one dashboard is mounted at a time (the route view), so
// it OWNS the live scale for the focused datum. A producer publishes on mount + on every scale
// re-derive (theme flip, domain change), and CLEARS on unmount so a stale /usf resolver never
// answers a /sci key. When no resolver is published (the gallery, SSR, a route mid-transition), or
// the resolver returns null (a heterogeneous key it cannot grain), `markColorFor` returns null and
// `veilHue` falls through to `--route-accent` — the aurora's pole, never a hand-picked hex.

/**
 * A dashboard's mark-colour resolver: given a PARSED composite key (the focused selection), return
 * the datum's verdict fill off the dashboard's live `Scale<V>` — or `null` when the key is not this
 * dashboard's native grain / not in its current frame (so the veil falls through to `--route-accent`).
 * The resolver reads the PARSED key (kind + id), never re-parses — the registry parses once.
 */
export type MarkColorResolver = (sel: SelectionKey) => string | null;

/** The ONE active resolver — the mounted dashboard's published reach to its live `Scale<V>`. Null
    until a dashboard publishes (the gallery / SSR / a route mid-transition leave it null). */
let activeMarkColorResolver: MarkColorResolver | null = null;

/**
 * PUBLISH a dashboard's live mark-colour resolver into the ONE platform slot (the producer adoption
 * seam, I5.c). The active dashboard calls this on mount + on every scale re-derive so `markColorFor`
 * always reads the CURRENT scale (post theme-flip, post domain-change). Returns a disposer that
 * clears the slot IFF it still holds THIS resolver — so a route's `onScopeDispose` cannot blank a
 * resolver the next route already published (the last-writer-wins handoff stays clean).
 */
export function publishMarkColorResolver(resolver: MarkColorResolver): () => void {
    activeMarkColorResolver = resolver;
    return () => {
        if (activeMarkColorResolver === resolver) activeMarkColorResolver = null;
    };
}

/**
 * Resolve a composite selection KEY to its staged datum's verdict fill — the veil-hue locus
 * (`useSelection.veilHue` reads this for a single focused selection). Parses the canonical key once,
 * then asks the active dashboard's published resolver. A concrete `rgb(...)`/CSS colour when the
 * focused datum is in the live frame; `null` when no resolver is published or it cannot grain the key (the heterogeneous
 * fall-through to `--route-accent`). It NEVER returns a hand-picked hex — every colour comes off the
 * dashboard's live `Scale<V>` through the published resolver.
 */
export function markColorFor(key: string): string | null {
    return activeMarkColorResolver?.(parseSelKey(key)) ?? null;
}
