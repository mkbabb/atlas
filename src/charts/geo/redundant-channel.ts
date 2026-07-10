// charts/geo/redundant-channel.ts — THE SIGHTED-COLORBLIND CHOROPLETH CHANNEL (O-A22 · a11y P3).
//
// The choropleth's screen-reader path (the offscreen `<table>`) covers a SR user; the SIGHTED
// colorblind reader was unplaced — a data fill encoded its tier in HUE ALONE, so a deuteranope /
// protanope reading the map without hue discrimination could not tell one tier from its neighbour.
// This module is the REDUNDANT non-hue channel: a tier-indexed TEXTURE (an SVG `<pattern>` per tier,
// distinct at any hue) for the DENSE tiered grid, or an on-mark VALUE-LABEL for the sparse district
// set — chosen per viz by density. It is the PURE MECHANISM (the bin math + the density decision +
// the disjointness law) `GeoChoropleth.vue` consumes and the O-A22 spec proves, mirroring the
// `checkOrdinalRainbowPassthrough` "executable proof" idiom (ColorScale.ts §④): ONE source both the
// component renders from and the gate asserts against, so the two channels can NEVER drift.
//
// THE ONE SHARED BIN SOURCE (the O-C7 tier-bin canon coupling): the redundant channel keys off the
// RESOLVED DATA FILL COLOUR itself — two features that fill the SAME colour share a tier bin, two
// that fill DIFFERENT colours are distinct bins. Because the bin is a pure function of the emitted
// fill (the SAME colour the `ColorScale` ramp produced), tier k's texture LITERALLY carries tier k's
// colour (the pattern's background rect IS the tier fill) — the "tier k's pattern == tier k's colour
// bin" agreement is unbreakable by construction, with ZERO per-plate wiring (the O-A7 inheritance
// law: every choropleth inherits `redundantChannel:'auto'`).
//
// THE ABSENCE DISJOINTNESS (render-A/L13 · a11y §"no-data hatch"): the reserved `#geo-dim-hatch` (a
// 45° muted single-line hatch) already signals DIM / NO-DATA — a receded state, never a data tier.
// The DATA texture set here is visually DISJOINT from it (no member is the lone 45° diagonal), so a
// no-data region reads as ABSENT, never mis-read as a data tier (the O-A22 NEG).

/** The choropleth `redundantChannel` prop KIND (the O-A7-inherited default is `"auto"`). `pattern`
    forces the tier-indexed texture, `value-label` the on-mark word channel, `none` the NEG posture
    (colour-only — the distinguishability assert's negative control). */
export type RedundantChannel = "auto" | "pattern" | "value-label" | "none";

/** The channel `auto` RESOLVES to for a given frame (the density decision's output). `none` when the
    posture is disabled OR the frame carries no viable channel (0 data bins, no label source). */
export type ResolvedChannel = "pattern" | "value-label" | "none";

/** The reserved ABSENCE / dim hatch `<pattern>` id (GeoChoropleth's `#geo-dim-hatch`) — the DATA
    texture set MUST NOT collide with it (id) nor read as it (kind). */
export const ABSENCE_HATCH_ID = "geo-dim-hatch";
/** The reserved absence-hatch KIND — a 45° muted single-line hatch. No DATA texture may be this
    kind (the disjointness law: a data tier never reads as the no-data/dim state). */
export const ABSENCE_HATCH_KIND = "diagonal-45";

/** The `<pattern>` tile edge (user-space px) — the SAME 6px tile the dim hatch uses, so the data
    textures and the absence hatch tile on ONE grain (a shared visual register). */
export const DATA_PATTERN_TILE = 6;

/** A tile-local stroke segment (foreground ink, drawn over the tier-colour background rect). */
export interface PatternLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
/** A tile-local mark: a FILLED dot (`ring` absent/false) or a stroked RING (`ring:true`). */
export interface PatternCircle {
    cx: number;
    cy: number;
    r: number;
    ring?: boolean;
}
/** A tile-local FILLED rect (the checker texture) — foreground ink, never the tier background. */
export interface PatternRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** One tier-texture definition (the geometry, hue-independent). `kind` names the texture so the
    disjointness/uniqueness gate reads it declaratively; `lines`/`circles`/`rects` are the tile-local
    primitives the SFC renders (namespace-safe static tags) over the tier-colour background rect. */
export interface PatternDef {
    /** the `<pattern>` id STEM matches `patternIdForBin` — the SFC keys the fill on `url(#…)`. */
    kind: string;
    lines?: readonly PatternLine[];
    circles?: readonly PatternCircle[];
    rects?: readonly PatternRect[];
}

// THE DATA TEXTURE SET (8 members) — each a DISTINCT hue-independent texture on the 6px tile, NONE
// the reserved 45° single-line absence hatch. Ordered so a low bin index reads as a light texture
// and higher indices densify; distinguishable under a full grayscale strip (the O-A22 proof). The
// set caps the pattern channel: a frame with more tier bins than this many textures cannot pattern
// (it falls to the value-label channel — `resolveRedundantChannel`).
export const DATA_PATTERNS: readonly PatternDef[] = [
    // 0 · dots — a single centred filled dot per tile (the sparsest texture).
    { kind: "dots", circles: [{ cx: 3, cy: 3, r: 1.1 }] },
    // 1 · vertical lines.
    { kind: "lines-vertical", lines: [{ x1: 3, y1: 0, x2: 3, y2: 6 }] },
    // 2 · horizontal lines.
    { kind: "lines-horizontal", lines: [{ x1: 0, y1: 3, x2: 6, y2: 3 }] },
    // 3 · orthogonal grid (v + h) — a crosshatch that is NOT the 45° hatch.
    {
        kind: "grid",
        lines: [
            { x1: 3, y1: 0, x2: 3, y2: 6 },
            { x1: 0, y1: 3, x2: 6, y2: 3 },
        ],
    },
    // 4 · checker — two filled quadrants (a blocky texture, distinct from any line set).
    {
        kind: "checker",
        rects: [
            { x: 0, y: 0, width: 3, height: 3 },
            { x: 3, y: 3, width: 3, height: 3 },
        ],
    },
    // 5 · chevron — a V of two short strokes (reads distinctly from straight/grid lines).
    {
        kind: "chevron",
        lines: [
            { x1: 0, y1: 5, x2: 3, y2: 1 },
            { x1: 3, y1: 1, x2: 6, y2: 5 },
        ],
    },
    // 6 · rings — a stroked circle outline (an OPEN mark, distinct from the filled dots).
    { kind: "rings", circles: [{ cx: 3, cy: 3, r: 2, ring: true }] },
    // 7 · cross-mesh — BOTH diagonals (45 + 135), an X-mesh that reads as a mesh, NOT the lone 45°
    //     absence hatch (a two-stroke crosshatch, the densest texture).
    {
        kind: "cross-mesh",
        lines: [
            { x1: 0, y1: 0, x2: 6, y2: 6 },
            { x1: 0, y1: 6, x2: 6, y2: 0 },
        ],
    },
];

/** The tier-bin ceiling the pattern channel can carry (the texture-set size). A frame whose distinct
    data-fill count exceeds this cannot be patterned distinctly, so `auto` routes it to value-label. */
export const PATTERN_TIER_MAX = DATA_PATTERNS.length;

/** The `<pattern>` id for a tier bin — the SFC's `<defs>` id + the shape fill `url(#…)` both read
    this, so the fill reference and the pattern definition share ONE id law. Wraps at the set edge
    (never reached under `auto`, which caps at `PATTERN_TIER_MAX`; a forced `pattern` posture with
    more bins reuses textures rather than crashing). */
export function patternIdForBin(bin: number): string {
    return `geo-data-pattern-${bin % DATA_PATTERNS.length}`;
}

/**
 * THE ONE SHARED BIN SOURCE — order the distinct DATA fill colours into tier bins. The bin index is
 * a pure, DETERMINISTIC function of the colour (a stable sort), so a re-render assigns the SAME bin
 * to the SAME colour (the texture never re-shuffles within a frame). Absence colours are EXCLUDED by
 * the caller (it passes only data-shape fills), so a no-data grey never mints a data bin.
 */
export function buildDataFillBins(
    dataFills: Iterable<string>,
    maxBins?: number,
): Map<string, number> {
    const distinct: string[] = [];
    const seen = new Set<string>();
    for (const f of dataFills) {
        if (!seen.has(f)) {
            seen.add(f);
            distinct.push(f);
        }
    }
    // A stable sort → a deterministic bin index (independent of feature draw order): the SAME colour
    // set always yields the SAME colour→bin map, so tier k's texture is invariant across re-renders.
    distinct.sort();
    const bins = new Map<string, number>();
    const n = distinct.length;
    // The bin is a UNIQUE rank per colour (0..n-1) by default. When `maxBins` is supplied AND the
    // distinct colours EXCEED it, the ranks rank/quantile-COLLAPSE into `maxBins` MONOTONE buckets
    // (rank i → floor(i / n · maxBins)) — the >8 pattern SAFETY-NET (`resolveRedundantChannel`), so a
    // label-less continuous frame textures into the ≤PATTERN_TIER_MAX set instead of over-subscribing
    // the texture ids. The bucket stays a pure, deterministic function of the colour's RANK, so the
    // "tier k's texture == tier k's colour" agreement holds within the collapsed set.
    const collapse = maxBins != null && n > maxBins;
    distinct.forEach((color, i) =>
        bins.set(color, collapse ? Math.floor((i * maxBins!) / n) : i),
    );
    return bins;
}

/**
 * THE DENSITY DECISION (`auto`) — a tiered/dense grid (FEW distinct fill colours) gets the tier-
 * TEXTURE; a continuous/sparse district set (MANY distinct colours) gets the on-mark VALUE-LABEL.
 * `binCount` is the density signal AND the pattern-capacity guard in one: pattern is chosen only
 * when the bins fit the texture set (`≤ PATTERN_TIER_MAX`), so the pattern channel is always a
 * DISTINCT-per-tier set, never an over-subscribed collision. A forced posture (`pattern` /
 * `value-label`) is honoured when it is viable (pattern needs ≥1 bin; value-label needs a label
 * source), else it degrades to `none` (an honest non-answer the live verifier re-wires).
 */
export function resolveRedundantChannel(
    mode: RedundantChannel,
    binCount: number,
    hasLabelSource: boolean,
): ResolvedChannel {
    if (mode === "none") return "none";
    if (mode === "pattern") return binCount > 0 ? "pattern" : "none";
    if (mode === "value-label") return hasLabelSource ? "value-label" : "none";
    // auto — the density decision, now with the >8 SAFETY-NET so it can NEVER emit `none` on a frame
    // that carries DATA. A truly EMPTY frame (0 data bins) is the SOLE `none`. A FEW-bin frame (≤
    // PATTERN_TIER_MAX) is a tiered / dense grid ⇒ TEXTURE. A MANY-bin frame is a continuous / sparse
    // district set: WITH a label source it gets the on-mark VALUE-LABEL; WITHOUT one it falls to the
    // >8 quantize safety-net — the distinct fills rank-collapse into the ≤PATTERN_TIER_MAX texture
    // tier-set (`buildDataFillBins(fills, PATTERN_TIER_MAX)`), so it STILL textures rather than going
    // colour-only. After this net, the auto→none-on-DATA hole is unrepresentable (the O-A22 positive
    // control): a data-encoding choropleth ALWAYS carries a redundant non-hue channel.
    if (binCount === 0) return "none";
    if (binCount <= PATTERN_TIER_MAX) return "pattern";
    return hasLabelSource ? "value-label" : "pattern";
}

// ── X10-LIB · THE PER-REGION LABEL DECLUTTER (the label-vs-A22 reconcile) ──────────────────────
//
// THE TENSION (X10, design-usf-sci-ecf.md §X10 · D13-found): the owner's declutter rule says an
// in-map value label should render ONLY when it clears (a) a SIZE floor — its region's minor axis
// — AND (b) a WCAG non-text CONTRAST floor against its own fill; a label failing either reads as
// "texture noise wearing data's clothes" and must not paint. But O-A22's `value-label` channel is
// deliberately LEGIBLE AT REST for every region of a continuous / sparse district set (the sighted-
// colorblind channel — §above). Applied FRAME-wide, the two rules collide: X10 would blank labels
// O-A22 requires to stay a channel.
//
// THE RECONCILE: gate PER REGION, not per frame. A region that clears BOTH gates keeps its resting
// label (X10 satisfied, O-A22 satisfied). A region that fails EITHER gate does not go silent —
// it falls back to the PATTERN texture, keyed off the SAME tier-bin source every pattern-channel
// region already uses (`buildDataFillBins`/`patternIdForBin`), so the redundant channel NEVER
// drops for that region; it only changes FORM (word → texture). The channel-per-region invariant
// (every data region carries a non-hue channel at rest) survives declutter intact.
export const LABEL_MINOR_AXIS_FLOOR_PX = 48;
export const LABEL_CONTRAST_FLOOR = 3.0;

/** THE PER-REGION LABEL GATE — a pure predicate, the X10 declutter rule collapsed to one call.
    `minorAxisPx` is a region's bounding-box minor axis (SVG user-space px — the SAME space
    `GeoChoropleth` measures a region's centroid in); `contrastRatio` is the label ink's WCAG
    contrast against THAT region's own resolved fill (∈[1,21], `wcagContrast` in `./oklab`/
    `cssColorToOklab` in `./colorRamp`). Both gates must clear for the label to render at rest —
    a region failing either is NOT rendered label-less; the caller routes it to the pattern
    fallback instead (`GeoChoropleth`'s per-shape channel decision, below), so a data region never
    goes colour-only. */
export function regionClearsLabelGate(minorAxisPx: number, contrastRatio: number): boolean {
    return minorAxisPx >= LABEL_MINOR_AXIS_FLOOR_PX && contrastRatio >= LABEL_CONTRAST_FLOOR;
}

/**
 * THE O-A22 EXECUTABLE PROOF (the `checkOrdinalRainbowPassthrough` idiom) — the pure-mechanism
 * teeth the acceptance rides, collapsed into ONE function the spec calls (returns `{ok, failures}`,
 * never throws). It proves the four load-bearing invariants WITHOUT a DOM mount:
 *
 *   ① DISJOINTNESS — no data texture reuses the reserved absence-hatch id or kind (a no-data region
 *      never reads as a data tier).
 *   ② UNIQUENESS — every data texture is a distinct `kind` (a per-tier, distinguishable set).
 *   ③ TIER-BIN AGREEMENT — the bin is a pure function of the fill: the SAME colour → the SAME bin →
 *      the SAME texture id; DISTINCT colours → DISTINCT bins (the two channels never disagree).
 *   ④ THE DENSITY DECISION + THE NEG — a few-bin frame resolves to `pattern`, a many-bin frame to
 *      `value-label`, and the disabled posture (`none`) resolves to `none` (colour-only — the
 *      distinguishability negative control).
 */
export function checkRedundantChannel(): { ok: boolean; failures: string[] } {
    const failures: string[] = [];

    // ① DISJOINTNESS from the reserved absence hatch (id + kind).
    for (const p of DATA_PATTERNS) {
        if (patternIdForBin(DATA_PATTERNS.indexOf(p)) === ABSENCE_HATCH_ID) {
            failures.push(`① a data texture reuses the absence-hatch id (${ABSENCE_HATCH_ID})`);
        }
        if (p.kind === ABSENCE_HATCH_KIND) {
            failures.push(`① data texture "${p.kind}" reuses the reserved absence-hatch kind`);
        }
    }

    // ② UNIQUENESS — every texture kind is distinct (a per-tier set, not a repeated fill).
    const kinds = DATA_PATTERNS.map((p) => p.kind);
    if (new Set(kinds).size !== kinds.length) {
        failures.push("② the data texture set has a duplicate kind (tiers not distinct)");
    }
    // every def carries at least one primitive (an empty texture reads as no channel).
    for (const p of DATA_PATTERNS) {
        const n = (p.lines?.length ?? 0) + (p.circles?.length ?? 0) + (p.rects?.length ?? 0);
        if (n === 0) failures.push(`② the "${p.kind}" texture is empty (no ink primitive)`);
    }

    // ③ TIER-BIN AGREEMENT — the bin (and thus the texture id) is a pure function of the fill.
    const fills = ["rgb(10,20,30)", "rgb(10,20,30)", "rgb(200,10,10)", "rgb(40,60,80)"];
    const bins = buildDataFillBins(fills);
    // the SAME colour maps to ONE bin (idempotent) …
    if (bins.get("rgb(10,20,30)") == null) {
        failures.push("③ a data fill did not receive a bin");
    }
    // … and DISTINCT colours map to DISTINCT bins (no collision) …
    const distinctBins = new Set(bins.values());
    if (distinctBins.size !== bins.size) {
        failures.push("③ two distinct fills collapsed to one bin (channels would disagree)");
    }
    // … so the texture id is a pure function of the colour (agreement, by construction).
    const idA = patternIdForBin(bins.get("rgb(10,20,30)")!);
    const idA2 = patternIdForBin(bins.get("rgb(10,20,30)")!);
    const idB = patternIdForBin(bins.get("rgb(200,10,10)")!);
    if (idA !== idA2) failures.push("③ the SAME fill produced two texture ids (not a function)");
    if (idA === idB) failures.push("③ DISTINCT fills produced the SAME texture id (a collision)");

    // ④ THE DENSITY DECISION + THE >8 SAFETY-NET + THE POSITIVE CONTROL + THE NEG.
    if (resolveRedundantChannel("auto", 3, false) !== "pattern") {
        failures.push("④ a FEW-bin frame did not resolve to the pattern channel");
    }
    if (resolveRedundantChannel("auto", PATTERN_TIER_MAX + 50, true) !== "value-label") {
        failures.push("④ a MANY-bin frame with a label source did not resolve to value-label");
    }
    // THE >8 SAFETY-NET — a MANY-bin frame with NO label source falls to the quantize PATTERN, NEVER
    // colour-only `none` (the auto→none-on-data hole, closed at the mechanism root).
    if (resolveRedundantChannel("auto", PATTERN_TIER_MAX + 50, false) !== "pattern") {
        failures.push("④ a MANY-bin, label-less DATA frame did not fall to the pattern safety-net");
    }
    // ④+ THE POSITIVE CONTROL — `auto` NEVER yields `none` on a frame that carries data (at ANY
    // density, WITH or WITHOUT a label source). The ONLY auto→none is a truly EMPTY frame (0 bins).
    for (const n of [1, PATTERN_TIER_MAX, PATTERN_TIER_MAX + 1, 51, 200]) {
        if (resolveRedundantChannel("auto", n, false) === "none") {
            failures.push(`④+ auto→none on a DATA frame (binCount ${n}, no label source) — the hole`);
        }
        if (resolveRedundantChannel("auto", n, true) === "none") {
            failures.push(`④+ auto→none on a DATA frame (binCount ${n}, label source) — the hole`);
        }
    }
    if (resolveRedundantChannel("auto", 0, false) !== "none") {
        failures.push("④+ auto on an EMPTY frame (0 data bins) did not resolve to none");
    }
    // THE NEG CONTROL — the disabled posture is colour-only (fails the distinguishability assert).
    if (resolveRedundantChannel("none", 3, true) !== "none") {
        failures.push("④ NEG: the disabled posture did not resolve to none (colour-only)");
    }
    // THE >8 QUANTIZE — the safety-net collapse keeps the pattern tier-set within the texture cap, so
    // the `auto`-routed label-less continuous frame textures into a distinct-per-tier (≤8) set.
    const collapsed = buildDataFillBins(
        Array.from({ length: 51 }, (_, i) => `rgb(${i},0,0)`),
        PATTERN_TIER_MAX,
    );
    if (new Set(collapsed.values()).size > PATTERN_TIER_MAX) {
        failures.push("④ the >8 quantize did not collapse the distinct fills within PATTERN_TIER_MAX");
    }

    return { ok: failures.length === 0, failures };
}

/**
 * THE X10-LIB EXECUTABLE PROOF (the `checkRedundantChannel` sibling) — the per-region label-gate
 * teeth, DOM-less. Proves the size floor, the contrast floor, and their conjunction (a region
 * clears the gate iff BOTH hold — never an OR), at the exact boundary (the floor itself passes;
 * one unit under fails), so `regionClearsLabelGate` cannot silently degrade to a single-axis check.
 */
export function checkLabelGate(): { ok: boolean; failures: string[] } {
    const failures: string[] = [];

    // ① the SIZE floor alone: at-floor passes, one px under fails (contrast held fixed, clearing).
    if (!regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX, LABEL_CONTRAST_FLOOR)) {
        failures.push("① a region exactly AT both floors did not clear the gate");
    }
    if (regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX - 1, LABEL_CONTRAST_FLOOR + 5)) {
        failures.push("① a region 1px UNDER the size floor cleared the gate (size ignored)");
    }
    // ② the CONTRAST floor alone: one hundredth under, at a generous size, still fails.
    if (regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX + 100, LABEL_CONTRAST_FLOOR - 0.01)) {
        failures.push("② a region under the contrast floor cleared the gate (contrast ignored)");
    }
    // ③ THE CONJUNCTION — clearing ONE axis alone never clears the gate (no OR-degrade).
    if (regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX + 200, 1)) {
        failures.push("③ a huge region at contrast 1 cleared the gate (size alone is not enough)");
    }
    if (regionClearsLabelGate(1, 21)) {
        failures.push("③ a 1px region at max contrast cleared the gate (contrast alone is not enough)");
    }
    // ④ a comfortably-clearing region (both well over floor) passes — the positive control.
    if (!regionClearsLabelGate(LABEL_MINOR_AXIS_FLOOR_PX * 2, LABEL_CONTRAST_FLOOR * 2)) {
        failures.push("④ a region well clear of both floors did not pass (positive control)");
    }

    return { ok: failures.length === 0, failures };
}
