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
    /** O-A22 — the RESOLVED data fill (computed once) — the ONE shared bin source the redundant
        tier-texture keys off (tier k's texture carries tier k's colour). */
    fill: string;
    /** X10-LIB — the region's bounding-box MINOR AXIS (SVG user-space px, the SAME space `cx`/`cy`
        are measured in) — the label-declutter SIZE gate's input. 0 when no word source exists. */
    minorAxis: number;
    /** O-A22 — whether this feature carries a DATA value (vs a no-data absence cell). Keys off the
        GAP-5 empty-`valueLabel` convention ("" ⇒ no-data). An absence cell mints NO tier bin. */
    hasValue: boolean;
}

/** The emitted tier-texture `<pattern>` descriptor (the SFC renders it into `<defs>`). */
export interface PatternDefEmit {
    id: string;
    fill: string;
    geom: PatternDef;
}

/** The value-label box metrics — a mono word's advance-width per char + line height, in SVG
    user-space (the `cx`/`cy` frame). The `.geo-value-label` face is 9px mono (GeoChoropleth.css); a
    monospace advance is ≈0.6em, so a char is ≈5.4 user units wide. The declutter box is an estimate
    (a de-clutter heuristic needs the same coordinate frame, not sub-pixel accuracy). */
const LABEL_ADVANCE_PX = 5.4;
const LABEL_LINE_PX = 9;

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
 * THE CHOROPLETH DERIVATION — `props → { shapes, resolvedChannel, patternDefs, fillFor, labels… }`.
 * The reactive orchestration the SFC braided inline, lifted once. Reads `props` reactively (the Vue
 * reactive proxy), so a prop change re-derives exactly the affected computeds.
 */
export function useChoroplethShapes(props: ChoroplethProps) {
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
            // exists (`valueLabel` OR `valueFormat`).
            const [cx, cy] = wordOf ? draw.centroid(f) : [0, 0];
            // X10-LIB — the region's bounding-box minor axis, measured off the SAME path generator
            // whenever a word source exists (the ONLY time the size gate is consulted).
            let minorAxis = 0;
            if (wordOf) {
                const [[x0, y0], [x1, y1]] = draw.bounds(f);
                minorAxis = Math.min(x1 - x0, y1 - y0);
            }
            // O-A22 — the per-cell word, computed ONCE (the redundant channel + the fill read one truth).
            const word = wordOf ? wordOf(key) : "";
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
                minorAxis,
                fill: fillOf(key),
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

    /** The DISTINCT data fills (absence cells excluded — they mint no bin). */
    const dataFills = computed(() =>
        shapes.value.filter((s) => s.hasValue).map((s) => s.fill),
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
        const boxes: LabelBox[] = shapes.value
            .filter((s) => s.hasValue && s.label !== "" && shapeClearsLabelGate(s.key))
            .sort((a, b) => b.minorAxis - a.minorAxis || (a.key < b.key ? -1 : 1))
            .map((s) => ({
                key: s.key,
                cx: s.cx,
                cy: s.cy,
                w: Math.max(1, s.label.length) * LABEL_ADVANCE_PX,
                h: LABEL_LINE_PX,
            }));
        return resolveLabelCollisions(boxes);
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
        def per tier BIN, its background rect the tier colour + the bin's hue-independent ink. */
    const patternDefs = computed<PatternDefEmit[]>(() => {
        const needed =
            resolvedChannel.value === "pattern" ||
            (resolvedChannel.value === "value-label" && shapes.value.some(usesPatternFill));
        if (!needed) return [];
        const byBin = new Map<number, string>();
        for (const [color, bin] of patternBins.value) {
            if (!byBin.has(bin)) byBin.set(bin, color);
        }
        return [...byBin.entries()].map(([bin, color]) => ({
            id: patternIdForBin(bin),
            fill: color,
            geom: DATA_PATTERNS[bin % DATA_PATTERNS.length],
        }));
    });

    /** The per-shape fill — through its tier texture (`url(#…)`) wherever `usesPatternFill` says so,
        else the plain resolved fill. */
    function fillFor(s: Shape): string {
        if (usesPatternFill(s)) {
            const bin = patternBins.value.get(s.fill);
            if (bin != null) return `url(#${patternIdForBin(bin)})`;
        }
        return s.fill;
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
        fillFor,
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
        fillFor: (s: Shape) => string;
        labelsMounted: ComputedRef<boolean>;
        labelsRedundant: ComputedRef<boolean>;
        labelGateFails: (s: Shape) => boolean;
    };
}
