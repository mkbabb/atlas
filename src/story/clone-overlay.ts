// platform/story/clone-overlay.ts — THE BETWEEN-BEAT CLONE-OVERLAY GEOMETRY (measurement-vindicated).
//
// THE MECHANISM is the document-space clone overlay (N.md §4.B1; NP1; measurement-vindicated by
// P2-A). NOT View Transitions (same-document VT is time-driven + snapshot-frozen — unscrubbable,
// non-bidirectional), NOT flipShared-at-scale (restricted to same-DOM-element cases). At 0<t<1 the
// originals hide and the clones interpolate rect + rx + OKLab-fill between the two handles' geometries;
// at the poles the overlay releases and the stages own their marks (the constancy hand-off).
//
// THE RENDERER is picked CHART-TYPE-BLIND by mark count (P2-A numbers): DOM clones for ≤~800 marks
// (19ms/frame at n=800 is the fallback ceiling), the single canvas clone above (the dense sci-equity
// morph — the full 3243). This module is PURE geometry (rect↔circle rx/w/h lerp + the CACHED-OKLab
// fill lerp + the renderer pick + the no-zero/NaN flight-start guard); the SVG/DOM overlay component
// + the canvas draw loop consume it. The canvas morph itself is N.WP-sci's (GO ruling, §4.B2); WB1
// ships the pure geometry + the SVG/DOM path.
//
// THE FILL-LERP BUDGET (P2, benchmarked): each canvas endpoint's fill is pre-converted to its OKLab
// channels ONCE at cache build (`rgbToOklab`), so the per-frame draw lerps three floats + projects to
// sRGB8 ONCE (`oklabLerpToRgb8`) — ~1.5ms/frame at n=3243. The prior path re-parsed BOTH endpoints and
// ran `mixColors` (two rgb→OKLab conversions) EVERY frame — ~5.4ms/frame for the fill alone, the
// post-value-4-migration regression this cures. Output is byte-identical (OKLab is rectangular, so the
// mix is a channel lerp either way; the cache just hoists the two per-frame conversions to build time).

import { clamp, lerp } from "@mkbabb/value.js/math";
import { rgb, convertColor, toRgba8 } from "@mkbabb/value.js/color";

// ── The renderer pick (chart-type-blind, by mark count — the D5 no-overfit law) ───────────────────

/** The overlay renderer register — DOM clones (small sets) vs a single canvas (dense sets). */
export type MarkCapacity = "dom" | "canvas";

/** The DOM-clone ceiling (P2-A): at n≈800 DOM clones cost 19ms/frame (2 janky) — the fallback ceiling.
    Above it the single canvas clone is the renderer (its fill lerp ~1.5ms/frame at 3243 — the cached-
    OKLab path below). */
export const DOM_CLONE_CEILING = 800;

/** Pick the overlay renderer CHART-TYPE-BLIND — purely by the participating mark COUNT (D5). ≤ the
    ceiling ⇒ DOM clones; above ⇒ the single canvas clone. */
export function pickMarkCapacity(
    markCount: number,
    { ceiling = DOM_CLONE_CEILING }: { ceiling?: number } = {},
): MarkCapacity {
    return markCount <= ceiling ? "dom" : "canvas";
}

// ── The rect geometry (rect↔circle = rx/w/h interpolation) ────────────────────────────────────────

/** A flight rect — the shared-element clone's document-space box (mirrors the gate's `FlightRect`). */
export interface FlightRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** A DOMRect (or the settled measurement) reduced to a plain `FlightRect`. */
export function toFlightRect(r: {
    x: number;
    y: number;
    width: number;
    height: number;
}): FlightRect {
    return { x: r.x, y: r.y, w: r.width, h: r.height };
}

/** Valid iff every component is finite AND the rect has positive area — the no-zero/NaN-rect
    flight-start guard (the P2-B honest-edge: a mid-mount `getBoundingClientRect()` of 0×0 launches the
    flight from the origin). The `n0-render-corridor` gate's `flightStartValid` reads this exact law. */
export function flightRectValid(r: FlightRect): boolean {
    if (![r.x, r.y, r.w, r.h].every((v) => Number.isFinite(v))) return false;
    return r.w > 0 && r.h > 0;
}

/** Interpolate the clone rect A→B at scrub `t` — pure `lerp` of every box component (rect↔circle is a
    pure width/height interpolation; a dot is a square box whose `rx` = half its side). */
export function lerpRect(a: FlightRect, b: FlightRect, t: number): FlightRect {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        w: lerp(a.w, b.w, t),
        h: lerp(a.h, b.h, t),
    };
}

/** Interpolate the corner radius A→B — a bar is `rx≈2`, a dot is `rx = r` (half its side), so the
    rect↔circle morph is a pure `rx` lerp alongside the w/h lerp. */
export function lerpRx(rxA: number, rxB: number, t: number): number {
    return lerp(rxA, rxB, t);
}

// ── The OKLab fill lerp — the CACHED-ENDPOINT path (the P2 canvas-tier budget cure) ───────────────

/** An sRGB triple in 0..255 (the fill the clone paints). */
export type Rgb255 = [number, number, number];

/** A mark's fill pre-converted to its OKLab channels [L, a, b] — resolved ONCE per endpoint at cache
    build (the §3.4 cache discipline), so the per-frame draw lerps three floats + projects to sRGB8
    once, never a per-frame rgb→OKLab round-trip. */
export type OklabTriple = [number, number, number];

/** Convert a settled sRGB fill (0..255) to its OKLab channels — CACHE-TIME work (once per endpoint),
    never per frame. Inputs are settled 0..255 marks, so the conversion cannot fail; a failure is a
    programming error — thrown, never masked. */
export function rgbToOklab(c: Rgb255): OklabTriple {
    const src = rgb(...c);
    if (!src.ok) throw new Error(`rgbToOklab: invalid rgb ${c}`);
    const lab = convertColor(src.value, "oklab");
    if (!lab.ok) throw new Error(`rgbToOklab: oklab conversion failed for ${c}`);
    const [l, a, b] = lab.value.channels;
    return [l as number, a as number, b as number];
}

/** Interpolate two CACHED OKLab endpoints and project to sRGB8 — the PER-FRAME canvas fill lerp. OKLab
    is a rectangular space, so the perceptual mix IS a channel lerp; the projection to 8-bit sRGB
    (gamut-clipped) happens ONCE per mark per frame. Byte-identical to re-parsing + `mixColors` every
    frame (the pre-cure path), at ~1.5ms/frame vs ~5.4ms at n=3243 — the endpoints already carry the
    two rgb→OKLab conversions that path repeated every frame. The DOM tier emits `cssOklabMix`
    (browser-native); this is the canvas tier's. */
export function oklabLerpToRgb8(from: OklabTriple, to: OklabTriple, t: number): Rgb255 {
    const c = clamp(t, 0, 1);
    const px = toRgba8(
        {
            space: "oklab" as const,
            channels: [
                lerp(from[0], to[0], c),
                lerp(from[1], to[1], c),
                lerp(from[2], to[2], c),
            ],
            alpha: 1,
        },
        { gamut: "clip" },
    );
    if (!px.ok) throw new Error("oklabLerpToRgb8: rgba8 projection failed");
    return [px.value[0], px.value[1], px.value[2]];
}

/** The DOM-tier fill lerp — a browser-native `color-mix(in oklab, …)` string (zero JS color math per
    frame; the compositor interpolates). The SVG/DOM clone paints THIS. */
export function cssOklabMix(fillFrom: string, fillTo: string, t: number): string {
    const p = Math.round(clamp(t, 0, 1) * 10000) / 100; // 0..100, 2-dp (stable string per frame)
    return `color-mix(in oklab, ${fillFrom}, ${fillTo} ${p}%)`;
}

// ── The resolved clone frame (what the overlay paints per mark, per frame) ────────────────────────

/** One side of a flight endpoint — the cached box + the mark's RENDERED ink (fill, and the optional
    N5 fidelity fields: rim stroke/width + opacity — see `MarkStyle`). The clone that carries the same
    ink the settled mark paints hands off invisibly at the poles (no ink-weight blink). */
export interface CloneEndpointSide {
    rect: FlightRect;
    rx: number;
    fill: string;
    /** The mark's rim ink (concrete color). Omit ⇒ no rim. */
    stroke?: string;
    /** The rim width in px. Omit ⇒ 0. */
    strokeWidth?: number;
    /** The mark's rendered opacity (0..1). Omit ⇒ 1. */
    opacity?: number;
}

/** A single mark's resolved clone at scrub `t` — the box + corner radius + the interpolated ink.
    The overlay's per-frame work = `lerp(cached endpoints)` → this frame → draw ONLY (the cache
    discipline: `markRects()` is snapshotted once per beat; per-frame is lerp+draw, never re-measure). */
export interface CloneFrame {
    rect: FlightRect;
    rx: number;
    /** The DOM-tier fill (a `color-mix(in oklab, …)` string). */
    fill: string;
    /** The rim ink at `t` (a `color-mix` string), present iff either endpoint declares a stroke. */
    stroke?: string;
    /** The rim width at `t`, present iff either endpoint declares a stroke. */
    strokeWidth?: number;
    /** The clone opacity at `t` — the lerp of the endpoints' rendered opacities (default 1). */
    opacity: number;
}

/** Resolve a DOM-tier clone frame from the cached A/B endpoints at scrub `t` — pure lerp of the box,
    the corner radius, and the OKLab ink (fill + optional rim + opacity). No measurement (the
    endpoints are the cached snapshots). A side that omits `stroke` contributes its FILL to the rim
    mix (the rim fades toward the rimless side's body ink instead of popping). */
export function resolveCloneFrame(
    from: CloneEndpointSide,
    to: CloneEndpointSide,
    t: number,
): CloneFrame {
    const c = clamp(t, 0, 1);
    const hasStroke = from.stroke !== undefined || to.stroke !== undefined;
    return {
        rect: lerpRect(from.rect, to.rect, c),
        rx: lerpRx(from.rx, to.rx, c),
        fill: cssOklabMix(from.fill, to.fill, c),
        ...(hasStroke
            ? {
                  stroke: cssOklabMix(from.stroke ?? from.fill, to.stroke ?? to.fill, c),
                  strokeWidth: lerp(from.strokeWidth ?? 0, to.strokeWidth ?? 0, c),
              }
            : {}),
        opacity: lerp(from.opacity ?? 1, to.opacity ?? 1, c),
    };
}

/** The shared MarkKeys the flight animates — the intersection of A's and B's rect keys (a mark
    without a counterpart on the far side has no morph target, so it is NOT flown; it crossfades with
    its stage). `marks:"all"` ⇒ the full intersection; a subset ⇒ the intersection ∩ the subset. */
export function sharedFlightKeys(
    fromKeys: Iterable<string>,
    toKeys: ReadonlySet<string>,
    subset?: "all" | readonly string[],
): string[] {
    const from = [...fromKeys].filter((k) => toKeys.has(k));
    if (subset === undefined || subset === "all") return from;
    const want = new Set(subset);
    return from.filter((k) => want.has(k));
}

// ── THE PRE-WARM HANDSHAKE guard (N.WP-sci · RC3-RM1 · the CANVAS hydrate no-NaN arm of G-N1) ──────

/** A resolved flight endpoint pair — the from/to geometry + rendered ink the clone lerps between. */
export interface FlightEndpoint {
    from: CloneEndpointSide;
    to: CloneEndpointSide;
}

/** The validated flight the overlay commits to a beat. `warm` = the arriving figure has SETTLED
    (its `markRects()` resolved to real geometry), so the flight may launch; `!warm` = a lazyMounted
    plate whose `markRects()` still start empty/0×0 — the overlay DEFERS (keeps the originals, crossfades)
    until the arriving figure registers its settled stage. `deferred` counts the keys skipped this pass. */
export interface ValidatedFlight {
    endpoints: Map<string, FlightEndpoint>;
    warm: boolean;
    deferred: number;
}

/** THE PRE-WARM HANDSHAKE (the canvas-clone morph trap the WP-sci arm of G-N1 owns). A lazyMounted
    canvas plate whose `markRects()` start empty — or return a mid-mount `convertToPixel` 0×0 — must
    NEVER launch a shared-element flight from the origin. This filters the raw shared endpoints through
    `flightRectValid` (both poles): any key whose from OR to rect is not yet resolved (zero/NaN/Inf) is
    DROPPED this pass and counted in `deferred`. `warm` is true iff there is genuinely nothing pending —
    either every shared key resolved, or there were no shared keys at all (a permanent crossfade edge).
    When `!warm` the caller must NOT hide the originals; it re-asks once the arriving stage (re)registers
    its settled handle. Pure + unit-testable — no DOM, no measurement (the endpoints are already cached). */
export function validateFlightEndpoints(
    raw: ReadonlyMap<string, FlightEndpoint>,
): ValidatedFlight {
    const endpoints = new Map<string, FlightEndpoint>();
    let deferred = 0;
    for (const [k, ep] of raw) {
        if (flightRectValid(ep.from.rect) && flightRectValid(ep.to.rect)) {
            endpoints.set(k, ep);
        } else {
            deferred++;
        }
    }
    // warm iff nothing is pending: no raw shared keys (crossfade edge) OR every raw key resolved.
    return { endpoints, warm: deferred === 0, deferred };
}
