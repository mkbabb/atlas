// charts/geo/useChoroplethShapes.ts — THE CHOROPLETH GEOMETRY + REDUNDANT-CHANNEL DERIVATION
// (the platform-side mirror of the feature `useXOption` convention, I-ARCH.AR-8). Where
// `useTimeSeriesOption` lifts the ECharts option-assembly out of its SFC, this lifts the
// choropleth's SVG DERIVATION out of `GeoChoropleth.vue`: the projected shapes (path/centroid/
// bounds), the DEV (topology,projection,viewport) coherence backstop, the O-A22 sighted-colorblind
// redundant channel (tier textures vs value-label), the X10-LIB per-region label gate, and the
// deterministic label-collision declutter. The SFC keeps only its interaction seams (hover / touch-
// select) and the template — the derivation is MOVED, not rewritten (the byte-identical parity).
//
// Rendered with d3-geo `geoIdentity().reflectY(false)`: the us-atlas Albers file is PRE-projected to
// a 975×610 viewport with coordinates already in y-DOWN SVG space, so the path generator must NOT
// re-flip Y — `reflectY(true)` would mirror the map off the top of the viewport (the classic
// blank/flipped-map failure).
import { computed, type ComputedRef } from "vue";
import { useMediaQuery } from "@vueuse/core";
import {
    geoIdentity,
    geoPath,
    type GeoProjection,
    type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import type { FeedMeta } from "../../data/contract.js";
// K-D-GEO §4.B — the DEV (topology,projection,viewport) coherence backstop reuses the gate's ONE
// pure predicate (no drift). The `import.meta.env.DEV` branch that calls it is tree-shaken out of
// the prod build, so this gate module never ships in the bundle (it is side-effect-free).
import { isCoherent, type GeoCoherenceSample } from "./geo-coherence.js";
// O-A22 — the sighted-colorblind redundant channel (the a11y P3 pattern/value-label fallback) + the
// X10-LIB per-region label gate + the pairwise-collision declutter. The PURE mechanism lives beside
// the SFC so the component and the O-A22 spec read ONE source (no drift).
import {
    buildDataFillBins,
    resolveRedundantChannel,
    regionClearsLabelGate,
    resolveLabelCollisions,
    patternIdForBin,
    DATA_PATTERNS,
    PATTERN_TIER_MAX,
    type LabelBox,
    type RedundantChannel,
    type ResolvedChannel,
    type PatternDef,
    type DataFillEntry,
} from "./redundant-channel.js";
// X10-LIB — the label-vs-A22 reconcile's CONTRAST leg: resolve the label ink + a region's own
// resolved fill to OKLab and measure WCAG contrast between them (the size gate's sibling axis).
import { type Oklab, wcagContrast } from "../scale/oklab.js";
import { cssColorToOklab, readLabelInk } from "../scale/colorRamp.js";
// `useGeoPaletteEpoch` is the SAME settle-epoch seam `GeoPlate.vue` owns (idempotent — one
// subscription per module), so a theme flip re-derives the per-region gate in the post-settle task.
import { useGeoPaletteEpoch } from "../composables/useGeoPaletteEpoch.js";

// The choropleth joins on a feed's entity key — the value under `FeedMeta.keyField` (a zero-padded
// FIPS, an LEA number, an entity id). Binding the type to the shared contract keeps every
// dashboard's map keyed on ONE grain.
export type EntityKey = FeedMeta["keyField"];

/** The GeoChoropleth prop contract — the derivation's inputs (the SFC declares `defineProps` off
    this, the composable reads it reactively). The extensive per-prop rationale lives here beside the
    derivation that consumes each field. */
export interface ChoroplethProps {
    /** A pre-projected TopoJSON topology (e.g. us-atlas states-albers-10m). */
    topology: Topology;
    /** The topology object name to render (default "states"). */
    object?: string;
    /**
     * An explicit feature subset to draw, overriding the topology extraction — e.g.
     * `loadNcGeometry().ncCounties` so the map renders ONLY NC's 100 counties (not all 3,141 US
     * counties), NC-filling. When omitted, every feature in `topology.objects[object]` is drawn.
     */
    features?: Feature<Geometry, Record<string, unknown>>[];
    /**
     * The projection the paths draw through. Default = `geoIdentity().reflectY(false)` (the us-atlas
     * files are pre-projected screen-space). NC supplies its bbox-cropped identity so the state fills
     * the frame.
     */
    projection?: GeoProjection;
    /** The SVG viewBox the projection fits into. Default the US Albers canvas. */
    viewport?: readonly [number, number];
    /** Fill colour for a feature, keyed by its feed entity key. */
    fill: (key: EntityKey) => string;
    /**
     * U·B3 M-1 — THE RAMP ORDINAL. The value the caller's colour scale was fed for a key (the same
     * number `fill` maps to a colour). The O-A22 texture tiers are ordered by it, so texture k is a
     * contiguous run of the ramp. A colour string is not an order on the ramp, so without this prop
     * the textures fall back to first-seen (feature) order — distinct per colour but not ordinal.
     * Return null for a no-data key.
     */
    value?: (key: EntityKey) => number | null | undefined;
    /**
     * J-COLOR §5.1 — THE COORDINATED CATEGORICAL FILL (the VC ranked-bar↔choropleth pair). Supply a
     * per-key INDEX into the `--viz-category-{1..4}` quad; the choropleth emits the cascade-resolved
     * quad stop so a `<RankedBar>` row and this territory bind by COLOUR through the caller's ONE
     * shared scale. When BOTH `category` and `fill` are given, `category` WINS for a key it resolves;
     * a key it returns `null/undefined` for falls back to `fill`. Omit ⇒ `fill` alone.
     */
    category?: (key: EntityKey) => number | null | undefined;
    /**
     * Pull a feature's join key. Default = the zero-padded us-atlas id (FIPS). Override for atlases
     * that carry their key in a properties field.
     */
    keyField?: (f: Feature<Geometry, Record<string, unknown>>) => string;
    /** A feature's display name (for the offscreen accessible table). */
    nameField?: (f: Feature<Geometry, Record<string, unknown>>) => string;
    /** Keys to RAISE (hover linked-highlight). */
    raisedKeys?: ReadonlySet<string>;
    /** Keys to DIM (filter non-match) — they read recessive + hatched. */
    dimmedKeys?: ReadonlySet<string>;
    /** Keys that are SELECTED (the pinned-mark FRAME) — distinct from raised (hover). */
    selectedKeys?: ReadonlySet<string>;
    /**
     * The per-feature DRAW-ON rank (C.W4.3) — the extremes-first stagger index the `.geo-shape--draw`
     * keyframe reads as `--rank`. Producer-time and FROZEN: derive it from a STORE-STABLE order,
     * NEVER from the hover-sorted set, so a hover can never re-key the draw. Omit ⇒ no draw markup.
     */
    rank?: (key: EntityKey) => number | undefined;
    /** The key under the roving keyboard cursor (a ring), or null. */
    kbdActiveKey?: string | null;
    /** Formats a key's value for the offscreen table. */
    valueFormat?: (key: string) => string;
    /**
     * GAP-5 — the FORCED-COLORS TEXT CHANNEL (I9.c). A short per-feature value LABEL (the magnitude
     * as a WORD) drawn at each shape's centroid so a `forced-colors: active` / colour-blind user
     * reads the magnitude even when the OS palette override flattens the fill. Returns "" to omit a
     * feature's label (no-data cells). Omit the prop ⇒ no text channel.
     */
    valueLabel?: (key: string) => string;
    /**
     * O-A22 — THE SIGHTED-COLORBLIND REDUNDANT CHANNEL (a11y P3). `'auto'` (the DEFAULT — the O-A7
     * inheritance-breadth law) chooses by density: a tiered / dense grid gets a tier-indexed TEXTURE,
     * a continuous / sparse district set gets the on-mark VALUE-LABEL. `'pattern'` / `'value-label'`
     * force a channel; `'none'` disables it (colour-only — the NEG).
     */
    redundantChannel?: RedundantChannel;
    /**
     * D-02 (W-USF hallmark) — THE GRADUATED-SYMBOL MAGNITUDE CHANNEL. A second, size-borne
     * quantity fused onto the hue-borne ratio: when present, each feature draws a centre-anchored
     * RING at the radius (SVG user units) this returns — the caller owns the √-area scaling so
     * ring AREA ∝ its magnitude. Return null to omit a feature's ring. Rings are
     * pointer-transparent hairline ink (`.geo-magnitude-ring`) above the fills, below the value
     * labels, so the hue channel stays legible beneath. Omit the prop ⇒ byte-identical render.
     */
    symbolR?: (key: string) => number | null;
    /**
     * A-28 (dial 5 — bold state letters AUGMENT, never replace) — THE PLACE-LABEL AUGMENT CHANNEL.
     * A short per-feature PLACE word (the bold state / entity letters — "NC", "TX") drawn at the
     * feature's centroid, ON TOP of the value-label channel it never replaces: the letters carry
     * PLACE while the magnitude stays on the fill + hover, the two labels coexisting (the ruling's
     * AUGMENT word). Return "" to omit a feature's letters; omit the prop ⇒ no channel, byte-
     * identical render for every route that does not declare it.
     */
    placeLabel?: (key: string) => string;
    ariaLabel?: string;
}

export interface Shape {
    key: string;
    d: string;
    name: string;
    /** The frozen extremes-first draw rank (C.W4.3) — undefined when no `rank` prop is given. */
    rank?: number;
    /** GAP-5 — the centroid the forced-colors value LABEL is seated at (px, viewport space). */
    cx: number;
    cy: number;
    /** GAP-5 — the per-feature value word (the forced-colors text channel); "" ⇒ no label. */
    label: string;
    /** A-28 — the per-feature bold place word (`placeLabel`); "" ⇒ none. */
    place: string;
    /** O-A22 — the RESOLVED data fill (computed once). The region always paints this exact colour;
        the redundant tier texture is an ink overlay above it, never a replacement fill. */
    fill: string;
    /** U·B3 M-1 — the ramp ordinal (`value` prop) the texture tiers are ordered by; null when the
        caller declares none or the key has no finite value. */
    ordinal: number | null;
    /** X10-LIB — the region's bounding-box MINOR AXIS (SVG user-space px, the SAME space `cx`/`cy`
        are measured in) — the label-declutter SIZE gate's input. 0 when no word source exists. */
    minorAxis: number;
    /** O-A22 — whether this feature carries a DATA value (vs a no-data absence cell). Keys off the
        GAP-5 empty-`valueLabel` convention ("" ⇒ no-data). An absence cell mints NO tier bin. */
    hasValue: boolean;
}

/** The emitted tier-texture `<pattern>` descriptor (the SFC renders it into `<defs>`). INK ONLY:
    the pattern has no background, so the overlay it fills shows the region's own colour beneath. */
export interface PatternDefEmit {
    id: string;
    geom: PatternDef;
}

/** One label face in SVG user space (the `cx`/`cy` frame): a character's advance and the line box,
    ascent to descent. Both words are monospace, so a word's box is its length times the advance. */
export interface LabelFace {
    advance: number;
    line: number;
}
/** The two faces the stack seats: the bold place word and the value word. */
export interface LabelFaces {
    place: LabelFace;
    value: LabelFace;
}
/** The faces before the rendered words are measured: `.geo-place-label` is 11 user units bold mono
    times the phone counter-scale, `.geo-value-label` `--type-micro` (12) mono; a mono advance is about
    0.6 em and Fira Code's line box (99% + 32%) 1.32 em. The SFC replaces them with the faces it reads
    off the rendered words (`measureLabelFaces`), since engines and fallback fonts differ (U/B8 N-2:
    the fixed estimate left 7 overlaps in Chromium and 14 in Firefox on /ecf at 1440). */
export function estimatedLabelFaces(placeScale = 1): LabelFaces {
    return {
        place: { advance: 11 * placeScale * 0.6, line: 11 * placeScale * 1.32 },
        value: { advance: 12 * 0.6, line: 12 * 1.32 },
    };
}
/** Read a face off a rendered word: its box over its length. Null for an empty or unrendered word. */
export function measureLabelFace(el: SVGTextElement | null): LabelFace | null {
    const text = el?.textContent?.trim() ?? "";
    if (!el || !text) return null;
    const box = el.getBBox();
    if (!(box.width > 0 && box.height > 0)) return null;
    return { advance: box.width / text.length, line: box.height };
}

/**
 * U/B8 N-2 · THE LABEL STACK. A region that carries both a place word and a value word seats them as
 * one block centred on its centroid: the place word above, the value word below. They never share a
 * baseline (they did: both at the centroid, so /ecf printed PITT over $14.66, 63 overlaps at 1440).
 * Returns each word's centre y and box size, from the faces.
 */
export function labelStack(
    s: Pick<Shape, "cx" | "cy" | "label" | "place">,
    faces: LabelFaces = estimatedLabelFaces(),
): { placeY: number; valueY: number; placeW: number; placeH: number; valueW: number; valueH: number } {
    const placeH = s.place ? faces.place.line : 0;
    const valueH = s.label ? faces.value.line : 0;
    return {
        placeY: s.cy - valueH / 2,
        valueY: s.cy + placeH / 2,
        placeW: s.place.length * faces.place.advance,
        placeH,
        valueW: Math.max(1, s.label.length) * faces.value.advance,
        valueH,
    };
}

// ── A-04 · THE AGGREGATED-CELL TAP FLOOR (the L4 law at the geo mark) ───────────────────────────
// A BINNED field (the speedtest H3 hex layer) draws its cells at the bin's own size: at a phone
// measure that landed 2.2×2.0 px marks — a 20× sub-tap target and an invisible encoding. Below the
// floor the layer CLAMPS THE MARK: each cell scales about its own box to the tappable floor, its
// seat untouched (a proportional-symbol read of the same aggregate).
// The floor is an OWNED constant, near the `--size-tap` rung — NOT a prop (α-M-6): the one live
// geography is cured by the default, and a second geography that genuinely differs mints its option
// WITH its declarer, born-live.
/** The tappable/legible floor for an aggregated cell (px, rendered). */
export const CELL_TAP_FLOOR_PX = 12;
/** The congruence band a BINNED field sits inside — every cell within 12% of the largest. A
    tessellation of equal bins passes; an administrative partition (counties, states, districts —
    whose whole nature is unequal shapes) never does, so its contiguous geometry is never scaled. */
const CELL_CONGRUENCE_BAND = 0.12;

/** THE FLOOR SCALE — the multiplier a field's cells must wear to clear `CELL_TAP_FLOOR_PX`, or 1
    (the identity — no clamp) for any field that is not an under-floor congruent cell set. Pure:
    `(shapes, px-per-viewport-unit) → number`, so the mark reads it off its measured box. */
export function cellFloorScale(shapes: Shape[], pxPerUnit: number): number {
    if (!(pxPerUnit > 0) || shapes.length < 3) return 1;
    let min = Infinity;
    let max = 0;
    for (const s of shapes) {
        if (!(s.minorAxis > 0)) return 1; // a degenerate/unmeasured field is never clamped
        if (s.minorAxis < min) min = s.minorAxis;
        if (s.minorAxis > max) max = s.minorAxis;
    }
    if (max - min > max * CELL_CONGRUENCE_BAND) return 1; // not a binned cell field
    const renderedPx = min * pxPerUnit;
    if (renderedPx >= CELL_TAP_FLOOR_PX) return 1; // already above the floor
    return CELL_TAP_FLOOR_PX / renderedPx;
}

/** A finite ramp ordinal, else null (no-data / undeclared). */
function ordinalOf(v: number | null | undefined): number | null {
    return v != null && Number.isFinite(v) ? v : null;
}

const defaultKeyField = (f: Feature<Geometry, Record<string, unknown>>): string =>
    String(f.id ?? "").padStart(2, "0");
const defaultNameField = (f: Feature<Geometry, Record<string, unknown>>): string =>
    String(f.properties?.name ?? "");

// J-COLOR §5.1 — THE COORDINATED CATEGORICAL QUAD (the VC bar↔map pair). FOUR stops
// (`--viz-category-1..4`); an index outside 1..4 is clamped into the quad. The stop is emitted as a
// cascade-resolved `var(--…)` reference (an SVG fill the theme retunes from the design locus) —
// NEVER an OKLab-blended rgb here (the SVG owns no canvas string).
const VIZ_CATEGORY_STOPS = 4;
function categoryVar(idx: number): string {
    const k = Math.min(VIZ_CATEGORY_STOPS, Math.max(1, Math.round(idx)));
    return `var(--viz-category-${k})`;
}

/**
 * THE CHOROPLETH DERIVATION — `props → { shapes, resolvedChannel, patternDefs, textureFor, labels… }`.
 * The reactive orchestration the SFC braided inline, lifted once. Reads `props` reactively (the Vue
 * reactive proxy), so a prop change re-derives exactly the affected computeds.
 */
export function useChoroplethShapes(
    props: ChoroplethProps,
    /** The label faces the stack and the declutter size words by (the SFC's measured faces). */
    labelFaces: () => LabelFaces = () => estimatedLabelFaces(),
) {
    // The viewBox: the US Albers canvas by default, or the caller's NC-fitted viewport.
    const WIDTH = computed(() => props.viewport?.[0] ?? 975);
    const HEIGHT = computed(() => props.viewport?.[1] ?? 610);

    // The path generator. Default = the identity projection (the Albers file is already screen-space
    // y-down, so we must NOT re-flip Y — reflectY(true) is for Cartesian y-up data). A caller (NC)
    // supplies a bbox-cropped identity so the region fills the frame.
    const path = computed(() =>
        geoPath(props.projection ?? geoIdentity().reflectY(false)),
    );

    const drawOn = computed(() => props.rank != null);

    /** The per-feature fill — the coordinated categorical quad stop (`category` WINS for a key it
        indexes), else the caller's magnitude `fill`. Index-bound to the SAME quad the ranked-bar
        reads. */
    function fillOf(key: EntityKey): string {
        const k = props.category?.(key);
        if (k != null) return categoryVar(k);
        return props.fill(key);
    }

    const shapes = computed<Shape[]>(() => {
        // An explicit `features` subset (NC's 100 counties) wins; else extract every feature from the
        // topology object (the full us-atlas collection).
        const features =
            props.features ??
            (
                feature(
                    props.topology,
                    props.topology.objects[props.object ?? "states"] as GeometryCollection,
                ) as unknown as {
                    features: Feature<Geometry, Record<string, unknown>>[];
                }
            ).features;
        const keyOf = props.keyField ?? defaultKeyField;
        const nameOf = props.nameField ?? defaultNameField;
        const draw = path.value;
        const rankOf = props.rank;
        const valueOf = props.value;
        // O-A22 — the on-mark WORD source UNIFIES the two label props: the explicit `valueLabel`
        // WINS, else the per-key `valueFormat` EVERY data plate already supplies (the offscreen a11y
        // table's formatter). Deriving the word from `valueLabel ?? valueFormat` lets a plate that
        // wires ONLY `value-format` inherit the redundant word channel with ZERO per-plate wiring.
        const wordOf = props.valueLabel ?? props.valueFormat;
        // K-D-GEO §4.B · THE LOAD-BEARING (topology,projection,viewport) COHERENCE BACKSTOP. A
        // DEV-only diagnostic (dead-code-eliminated in the prod build): the WHOLE feature COLLECTION's
        // UNION centroid + bounds (NOT features[0], which false-REDs the speedtest H3 slivers). Reuses
        // the gate's ONE `isCoherent` predicate (no drift). A `console.error` — NOT a `throw` (a
        // half-render is more diagnostic than a white screen).
        if (import.meta.env.DEV && features.length) {
            const collection = {
                type: "FeatureCollection",
                features,
            } as unknown as GeoPermissibleObjects;
            const [scx, scy] = draw.centroid(collection);
            const [[x0, y0], [x1, y1]] = draw.bounds(collection);
            const sample: GeoCoherenceSample = {
                consumer: props.ariaLabel ?? "Geographic choropleth",
                viewport: { width: WIDTH.value, height: HEIGHT.value },
                unionCentroid: [scx, scy],
                unionBBox: [x0, y0, x1, y1],
            };
            if (!isCoherent(sample)) {
                console.error(
                    "[geo-coherence] the (topology, projection, viewport) triple is INCOHERENT — the " +
                        "union centroid/bounds fall outside the viewport or mis-scale it",
                    sample,
                );
            }
        }
        return features.map((f) => {
            const key = keyOf(f);
            // GAP-5 — the centroid the value LABEL is seated at, measured off the SAME path generator
            // the fill draws through (one projection, one coordinate frame), whenever a WORD source
            // exists (`valueLabel` OR `valueFormat`) OR the D-02 magnitude-ring channel needs an
            // anchor (`symbolR` — the ring seats at the same centroid the label would) OR the A-28
            // place-label augment channel seats its bold letters here (`placeLabel`).
            const [cx, cy] =
                wordOf || props.symbolR || props.placeLabel ? draw.centroid(f) : [0, 0];
            // X10-LIB — the region's bounding-box minor axis, measured off the SAME path generator.
            // Measured for EVERY feature (A-04): the label size-gate reads it, and so does the
            // aggregated-cell tap floor below — which must judge a field carrying no word source.
            const [[x0, y0], [x1, y1]] = draw.bounds(f);
            const minorAxis = Math.min(x1 - x0, y1 - y0);
            // O-A22 — the per-cell word, computed ONCE (the redundant channel + the fill read one truth).
            const word = wordOf ? wordOf(key) : "";
            const place = props.placeLabel ? props.placeLabel(key) || "" : "";
            return {
                key,
                d: draw(f) ?? "",
                name: nameOf(f),
                // The draw rank is read off the STORE-STABLE order the caller supplies — never the
                // hover set — so the draw identity is invariant on hover (the frozen-rank invariant).
                rank: rankOf ? rankOf(key) : undefined,
                cx,
                cy,
                label: word,
                place,
                minorAxis,
                fill: fillOf(key),
                ordinal: ordinalOf(valueOf?.(key)),
                // THE ABSENCE ORACLE — a cell is DATA unless the word carries the GAP-5 "" no-data
                // sentinel. A formatter that renders no-data as "" marks the cell ABSENT: it mints NO
                // tier bin AND shows NO word. A GLYPH no-data face ("—") carries no "" oracle, so its
                // cells read as data (the honest fallback).
                hasValue: wordOf == null || word !== "",
            };
        });
    });

    // ── O-A22 · THE SIGHTED-COLORBLIND REDUNDANT CHANNEL (a11y P3) ──────────────────────────────
    // The redundant NON-hue channel keyed off the ONE shared bin source — the RESOLVED data fill
    // colour (`shapes[].fill`). Distinct data colours are ordered into tier bins; `auto` resolves per
    // density: few colour bins → a tier TEXTURE, many bins → the on-mark VALUE-LABEL.

    /** The data (fill, ordinal) entries (absence cells excluded — they mint no bin). */
    const dataFills = computed<DataFillEntry[]>(() =>
        shapes.value
            .filter((s) => s.hasValue)
            .map((s) => ({ fill: s.fill, ordinal: s.ordinal })),
    );

    /** The distinct-DATA-fill → UNIQUE tier-bin map. Its SIZE is the density signal. */
    const fillBins = computed(() => buildDataFillBins(dataFills.value));

    /** Whether an on-mark WORD channel is available — `valueLabel` OR `valueFormat`. */
    const hasLabelSource = computed(
        () => props.valueLabel != null || props.valueFormat != null,
    );

    /** The channel `redundantChannel` resolves to for this frame — the density decision's output. */
    const resolvedChannel = computed<ResolvedChannel>(() =>
        resolveRedundantChannel(
            props.redundantChannel ?? "auto",
            fillBins.value.size,
            hasLabelSource.value,
        ),
    );

    // ── X10-LIB · THE PER-REGION LABEL GATE (the label-vs-A22 reconcile) ────────────────────────
    // An in-map label renders at rest ONLY where it clears a SIZE floor (its region's minor axis) AND
    // a WCAG CONTRAST floor against its own fill; a region failing either does NOT go blank — it
    // falls back to the PATTERN texture, so O-A22's "every data region carries a non-hue channel at
    // rest" invariant survives declutter.

    /** The settle-epoch tick the label-ink read keys reactivity on, so a theme flip re-derives the
        contrast gate post-settle. */
    const paletteEpoch = useGeoPaletteEpoch();
    /** The label ink (`--foreground`, the SAME ink `.geo-value-label` paints), resolved per theme. */
    const labelInk = computed<Oklab>(() => {
        void paletteEpoch.value;
        return readLabelInk();
    });

    /** Per-shape label-gate results — a `key → clears-both-gates` map, evaluated ONLY under the
        `value-label` channel and ONLY for `hasValue` cells. An unparseable fill resolves its contrast
        against `labelInk` itself (contrast 1 — a guaranteed FAIL, the conservative default). */
    const labelGateResults = computed<Map<string, boolean>>(() => {
        const out = new Map<string, boolean>();
        if (resolvedChannel.value !== "value-label") return out;
        const ink = labelInk.value;
        for (const s of shapes.value) {
            if (!s.hasValue) continue;
            const contrast = wcagContrast(ink, cssColorToOklab(s.fill, ink));
            out.set(s.key, regionClearsLabelGate(s.minorAxis, contrast));
        }
        return out;
    });

    /** Whether `s`'s label clears BOTH the X10 size/contrast gates. */
    function shapeClearsLabelGate(key: string): boolean {
        return labelGateResults.value.get(key) ?? false;
    }

    // ── X10 · THE DETERMINISTIC LABEL-COLLISION DECLUTTER (the pairwise-overlap leg) ───────────
    // The resting value-label words seated at region centroids overlap pairwise on a dense
    // choropleth. Only the gate-CLEARING words compete for space (a gate-failing region already shows
    // a texture, not a word). Priority order: the LARGER region keeps its word (minorAxis DESC),
    // key ASC as the deterministic tiebreak, so the suppressed set is frozen per frame.
    const collisionSuppressed = computed<Set<string>>(() => {
        if (resolvedChannel.value !== "value-label") return new Set<string>();
        const faces = labelFaces();
        const boxes: LabelBox[] = shapes.value
            .filter((s) => s.hasValue && s.label !== "" && shapeClearsLabelGate(s.key))
            .sort((a, b) => b.minorAxis - a.minorAxis || (a.key < b.key ? -1 : 1))
            .map((s) => {
                const k = labelStack(s, faces);
                return { key: s.key, cx: s.cx, cy: k.valueY, w: k.valueW, h: k.valueH };
            });
        // A place word always draws (A-28: it augments, never yields), so its box is reserved. A
        // region's own name sits above its own value by construction, so it never counts against it.
        const reserved = shapes.value
            .filter((s) => s.place !== "")
            .map((s) => {
                const k = labelStack(s, faces);
                return { key: s.key, cx: s.cx, cy: k.placeY, w: k.placeW, h: k.placeH };
            });
        return resolveLabelCollisions(boxes, reserved);
    });

    /** THE UNIFIED SUPPRESSION TEST — a value-label region loses its resting word when it fails the
        size/contrast gate OR collides with a higher-priority word. Either way it routes to the
        pattern texture (below), so the redundant channel changes FORM, never drops. */
    function labelSuppressed(key: string): boolean {
        return !shapeClearsLabelGate(key) || collisionSuppressed.value.has(key);
    }

    function isDimmed(key: string): boolean {
        return props.dimmedKeys?.has(key) ?? false;
    }

    /** Whether `s` renders through the PATTERN texture rather than its plain resolved fill: the whole
        frame under `pattern`, OR — the X10-LIB fallback — a `value-label` region whose word is
        SUPPRESSED (gate-fail or collision). A DIMMED or ABSENT cell is excluded (the disjointness
        law: a receded cell keeps the plain fill so the reserved dim/absence hatch reads on it). */
    function usesPatternFill(s: Shape): boolean {
        if (!s.hasValue || isDimmed(s.key)) return false;
        if (resolvedChannel.value === "pattern") return true;
        if (resolvedChannel.value === "value-label") return labelSuppressed(s.key);
        return false;
    }

    /** The PATTERN-channel bin map — the distinct data fills collapsed into ≤PATTERN_TIER_MAX texture
        buckets (an IDENTITY when the set fits, the >8 quantize safety-net otherwise). Keyed off the
        SAME `buildDataFillBins` rank source, so tier-k-texture == tier-k-colour. */
    const patternBins = computed(() =>
        buildDataFillBins(dataFills.value, PATTERN_TIER_MAX),
    );

    /** The tier TEXTURE `<pattern>` defs — built whenever SOME shape renders through the pattern
        channel: the whole frame under `pattern`, or the suppressed subset under `value-label`. ONE
        INK-ONLY def per tier BIN (U·B3 M-1): no background rect, so no bin representative colour can
        stand in for a region's own fill (the dark /usf inversion). */
    const patternDefs = computed<PatternDefEmit[]>(() => {
        const needed =
            resolvedChannel.value === "pattern" ||
            (resolvedChannel.value === "value-label" && shapes.value.some(usesPatternFill));
        if (!needed) return [];
        const used = [...new Set(patternBins.value.values())].sort((a, b) => a - b);
        return used.map((bin) => ({
            id: patternIdForBin(bin),
            geom: DATA_PATTERNS[bin % DATA_PATTERNS.length],
        }));
    });

    /** The per-shape tier TEXTURE overlay (`url(#…)`) wherever `usesPatternFill` says so, else null.
        The region itself always paints `s.fill`; this ink layer sits over it. */
    function textureFor(s: Shape): string | null {
        if (!usesPatternFill(s)) return null;
        const bin = patternBins.value.get(s.fill);
        return bin != null ? `url(#${patternIdForBin(bin)})` : null;
    }

    // ── GAP-5 · THE FORCED-COLORS TEXT CHANNEL + its O-F10 on-demand mount ──────────────────────
    // The per-feature value words are a forced-colors-ONLY channel at rest (opacity ~0.04, the colour
    // ramp is the resting magnitude channel) — so the whole `<text>` layer has NO resting purpose and
    // is MOUNTED only when needed: forced-colors is live, OR the redundant channel resolved to
    // `value-label` (where the words ARE the resting sighted-colorblind channel). GAP-5 completeness
    // holds — a mounted layer keeps EVERY feature's word (never windowed / collision-skipped there).
    const hasLabels = hasLabelSource;
    const forcedColorsActive = useMediaQuery("(forced-colors: active)");
    const labelsMounted = computed(
        () =>
            (hasLabels.value && forcedColorsActive.value) ||
            resolvedChannel.value === "value-label",
    );
    /** O-A22 — the layer is the resting SIGHTED-colorblind channel (visible at rest) exactly when the
        density decision routed this frame to value-label. */
    const labelsRedundant = computed(() => resolvedChannel.value === "value-label");
    /** X10-LIB — within a redundant frame, whether `s`'s word is SUPPRESSED (gate-fail or collision)
        and so must NOT inherit the group's resting-visible lift — its region carries the pattern
        texture instead. Unaffected under `forced-colors: active` (the CSS `@media not (…)` guard),
        so GAP-5 completeness holds: every feature keeps its word there. */
    function labelGateFails(s: Shape): boolean {
        return labelsRedundant.value && s.hasValue && labelSuppressed(s.key);
    }

    return {
        WIDTH,
        HEIGHT,
        shapes,
        drawOn,
        resolvedChannel,
        patternDefs,
        textureFor,
        labelsMounted,
        labelsRedundant,
        labelGateFails,
    } as {
        WIDTH: ComputedRef<number>;
        HEIGHT: ComputedRef<number>;
        shapes: ComputedRef<Shape[]>;
        drawOn: ComputedRef<boolean>;
        resolvedChannel: ComputedRef<ResolvedChannel>;
        patternDefs: ComputedRef<PatternDefEmit[]>;
        textureFor: (s: Shape) => string | null;
        labelsMounted: ComputedRef<boolean>;
        labelsRedundant: ComputedRef<boolean>;
        labelGateFails: (s: Shape) => boolean;
    };
}
