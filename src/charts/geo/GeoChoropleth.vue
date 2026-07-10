<script setup lang="ts">
// GeoChoropleth.vue — the THIN, geometry-agnostic choropleth (the projection +
// paths primitive carved from components/viz/Choropleth.vue). It owns ONLY the
// SVG: project the topology, draw a path per feature, fill each by the caller's
// `fill(key)` function, emit `hover(key)`. It imports NO geometry and NO data —
// the `topology` is a PROP, so the same component serves USF net-retention, ECF
// import-gradient, and any other pre-projected atlas.
//
// Rendered with d3-geo `geoIdentity().reflectY(false)`: the us-atlas Albers file
// is PRE-projected to a 975×610 viewport with coordinates already in y-DOWN SVG
// space, so the path generator must NOT re-flip Y — `reflectY(true)` would mirror
// the map off the top of the viewport (the classic blank/flipped-map failure).
//
// The dim/raise/frame styling rides the `@custom-variant raised:/dimmed:/selected:`
// hooks (data-raised / data-dimmed / data-selected attributes) — no inline
// `:class="{ 'opacity-30' }"` object. `dimmed` keys carry a hatch overlay so the
// de-emphasis is never colour-only. A `keyField` getter pulls each feature's join key
// off the topology properties (default the us-atlas zero-padded FIPS id).
//
// THE PRODUCER (C.W4.2 S1): the polygon emits `select({key, multi})` on `@click`, the
// modifier read at the DOM edge — so the `cursor:pointer` stops being a lie (a real
// handler backs it). A `selected:` variant (the framed treatment) rides the SAME
// `@custom-variant` attribute machinery as `raised:`/`dimmed:`, plus a `kbd-active:`
// ring the keyboard region (`SelectionRegion`) drives — no new chrome CSS object.
import { computed, ref } from "vue";
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
import type { FeedMeta } from "@/data/contract";
import {
    isMultiSelect,
    type SelectionEmits,
} from "@/charts/contract/selection-contract";
import ChartDataTable from "@/charts/legend/ChartDataTable.vue";
// K-D-GEO §4.B — the DEV (topology,projection,viewport) coherence backstop reuses the gate's ONE
// pure predicate (no drift). The `import.meta.env.DEV` branch that calls it is tree-shaken out of
// the prod build, so this gate module never ships in the bundle (it is side-effect-free).
import {
    isCoherent,
    type GeoCoherenceSample,
} from "@/charts/geo/geo-coherence";
// O-A22 — the sighted-colorblind redundant channel (the a11y P3 pattern/value-label fallback). The
// PURE mechanism (the tier-bin math + the density decision + the disjointness law) lives beside the
// SFC so the component and the O-A22 gate read ONE source (no drift), the geo-coherence precedent.
import {
    buildDataFillBins,
    resolveRedundantChannel,
    regionClearsLabelGate,
    patternIdForBin,
    DATA_PATTERNS,
    DATA_PATTERN_TILE,
    PATTERN_TIER_MAX,
    type RedundantChannel,
    type ResolvedChannel,
} from "@/charts/geo/redundant-channel";
// X10-LIB — the label-vs-A22 reconcile's CONTRAST leg: resolve the label ink + a region's own
// resolved fill to OKLab and measure WCAG contrast between them (the `regionClearsLabelGate` size
// gate's sibling axis). `useGeoPaletteEpoch` is the SAME settle-epoch seam `GeoPlate.vue` owns
// (idempotent — one subscription per module), so a theme flip re-derives the per-region gate in
// the post-settle task, not the critical flip frame.
import { type Oklab, wcagContrast } from "@/charts/scale/oklab";
import { cssColorToOklab, readLabelInk } from "@/charts/scale/colorRamp";
import { useGeoPaletteEpoch } from "@/charts/composables/useGeoPaletteEpoch";

// The choropleth joins on a feed's entity key — the value under `FeedMeta.keyField`
// (a zero-padded FIPS, an LEA number, an entity id). Binding the type to the
// shared contract is what keeps every dashboard's map keyed on ONE grain.
type EntityKey = FeedMeta["keyField"];

const props = withDefaults(
    defineProps<{
        /** A pre-projected TopoJSON topology (e.g. us-atlas states-albers-10m). */
        topology: Topology;
        /** The topology object name to render (default "states"). */
        object?: string;
        /**
         * An explicit feature subset to draw, overriding the topology extraction —
         * e.g. `loadNcGeometry().ncCounties` so the map renders ONLY NC's 100
         * counties (not all 3,141 US counties), NC-filling. When omitted, every
         * feature in `topology.objects[object]` is drawn.
         */
        features?: Feature<Geometry, Record<string, unknown>>[];
        /**
         * The projection the paths draw through. Default = `geoIdentity().reflectY(false)`
         * (the us-atlas files are pre-projected screen-space). NC supplies its
         * bbox-cropped identity (`loadNcGeometry().projection`) so the state fills the frame.
         */
        projection?: GeoProjection;
        /** The SVG viewBox the projection fits into. Default the US Albers canvas. */
        viewport?: readonly [number, number];
        /** Fill colour for a feature, keyed by its feed entity key. */
        fill: (key: EntityKey) => string;
        /**
         * J-COLOR §5.1 — THE COORDINATED CATEGORICAL FILL (the VC ranked-bar↔choropleth pair).
         * The 1:1 categorical-hue coordination the most-transferable VC move asks for: a feature's
         * territory fills by the SAME `--viz-category-{k}` quad stop a `<RankedBar>` row fills its
         * bar with, so the reader's eye binds bar→territory by COLOUR, not by re-reading the label.
         * Supply a per-key INDEX into the quad (1..4); the choropleth emits `var(--viz-category-{k})`
         * — the cascade-resolved quad stop. Bound by INDEX through the caller's ONE shared scale (the
         * J-ARCH GeoPlate shared-scale seam), never a private palette that could drift from the bar's.
         * When BOTH `category` and `fill` are given, `category` WINS for a key it resolves (the
         * coordinated hue is the loud channel); a key it returns `null/undefined` for falls back to
         * `fill` (a region outside the categorical set keeps the magnitude fill). Omit ⇒ `fill` alone
         * (the legacy magnitude posture). The quad is CHROME-distinct + JND-clear on cream — the
         * `j0-color-category-coherence` gate proves it; this primitive only CONSUMES the stop by index.
         */
        category?: (key: EntityKey) => number | null | undefined;
        /**
         * Pull a feature's join key. Default = the zero-padded us-atlas id (FIPS).
         * Override for atlases that carry their key in a properties field.
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
         * The per-feature DRAW-ON rank (C.W4.3) — the extremes-first stagger index the
         * `.geo-shape--draw` keyframe reads as `--rank`. Producer-time and FROZEN: derive it
         * from a STORE-STABLE order (`deepPoleFirstRanks`/`extremesFirstRanks`), NEVER from the
         * hover-sorted set, so a hover can never re-key the draw. Omit ⇒ no draw markup (the
         * feature renders plain, the legacy posture).
         */
        rank?: (key: EntityKey) => number | undefined;
        /** The key under the roving keyboard cursor (a ring), or null. */
        kbdActiveKey?: string | null;
        /** Formats a key's value for the offscreen table. */
        valueFormat?: (key: string) => string;
        /**
         * GAP-5 — the FORCED-COLORS TEXT CHANNEL (I9.c, the H7 ContractCliff precedent extended to
         * the color-only choropleth). A short per-feature value LABEL (the magnitude as a WORD) drawn
         * at each shape's centroid so a `forced-colors: active` / colour-blind user reads the
         * magnitude even when the OS palette override flattens the fill — meaning survives as text,
         * not COLOUR ALONE. Returns "" to omit a feature's label (no-data cells). Omit the prop ⇒ no
         * text channel (the legacy posture). The label is hidden at rest (a quiet engraved overlay)
         * and made visible under `forced-colors: active` where the colour fails.
         */
        valueLabel?: (key: string) => string;
        /**
         * O-A22 — THE SIGHTED-COLORBLIND REDUNDANT CHANNEL (a11y P3). A data fill encodes its tier in
         * HUE ALONE; this adds a redundant NON-hue channel so a colour-blind reader tells the tiers
         * apart without hue discrimination. `'auto'` (the DEFAULT — the O-A7 inheritance-breadth law:
         * EVERY choropleth inherits it, no per-plate wiring) chooses by density: a tiered / dense grid
         * (few distinct fill colours) gets a tier-indexed TEXTURE (an SVG `<pattern>` per tier, its
         * background the tier colour + a hue-independent ink), a continuous / sparse district set (many
         * distinct colours) gets the on-mark VALUE-LABEL (the `valueLabel` word, made legible at rest).
         * `'pattern'` / `'value-label'` force a channel; `'none'` disables it (colour-only — the NEG).
         * The texture set is visually DISJOINT from the reserved absence/dim hatch, and tier k's texture
         * carries tier k's colour (the pattern's own background), so the two channels can never disagree.
         */
        redundantChannel?: RedundantChannel;
        ariaLabel?: string;
    }>(),
    {
        object: "states",
        features: undefined,
        projection: undefined,
        viewport: undefined,
        category: undefined,
        keyField: undefined,
        nameField: undefined,
        raisedKeys: undefined,
        dimmedKeys: undefined,
        selectedKeys: undefined,
        rank: undefined,
        kbdActiveKey: null,
        valueFormat: undefined,
        valueLabel: undefined,
        redundantChannel: "auto",
        ariaLabel: "Geographic choropleth",
    },
);

const emit = defineEmits<SelectionEmits>();

// The viewBox: the US Albers canvas by default, or the caller's NC-fitted viewport.
const WIDTH = computed(() => props.viewport?.[0] ?? 975);
const HEIGHT = computed(() => props.viewport?.[1] ?? 610);

// The path generator. Default = the identity projection (the Albers file is already
// screen-space y-down, so we must NOT re-flip Y — reflectY(true) is for Cartesian
// y-up data). A caller (NC) supplies a bbox-cropped identity so the region fills the frame.
const path = computed(() => geoPath(props.projection ?? geoIdentity().reflectY(false)));

const defaultKeyField = (f: Feature<Geometry, Record<string, unknown>>): string =>
    String(f.id ?? "").padStart(2, "0");
const defaultNameField = (f: Feature<Geometry, Record<string, unknown>>): string =>
    String(f.properties?.name ?? "");

interface Shape {
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
    /** O-A22 — the RESOLVED data fill (the `fillOf` result, computed once) — the ONE shared bin
        source the redundant tier-texture keys off (tier k's texture carries tier k's colour). */
    fill: string;
    /** X10-LIB — the region's bounding-box MINOR AXIS (SVG user-space px, the SAME space `cx`/`cy`
        are measured in) — the label-declutter SIZE gate's input. 0 when no word source exists (the
        gate is never consulted then). */
    minorAxis: number;
    /** O-A22 — whether this feature carries a DATA value (vs a no-data absence cell). Keys off the
        GAP-5 empty-`valueLabel` convention ("" ⇒ no-data); with no `valueLabel` every cell is data.
        An absence cell mints NO tier bin + gets NO redundant channel (it reads as ABSENT). */
    hasValue: boolean;
}

const drawOn = computed(() => props.rank != null);

const shapes = computed<Shape[]>(() => {
    // An explicit `features` subset (NC's 100 counties) wins; else extract every
    // feature from the topology object (the full us-atlas collection).
    const features =
        props.features ??
        (
            feature(
                props.topology,
                props.topology.objects[props.object] as GeometryCollection,
            ) as unknown as { features: Feature<Geometry, Record<string, unknown>>[] }
        ).features;
    const keyOf = props.keyField ?? defaultKeyField;
    const nameOf = props.nameField ?? defaultNameField;
    const draw = path.value;
    const rankOf = props.rank;
    // O-A22 — the on-mark WORD source UNIFIES the two label props: the explicit `valueLabel` WINS,
    // else the per-key `valueFormat` EVERY data plate already supplies (the offscreen a11y table's
    // formatter). Deriving the word from `valueLabel ?? valueFormat` is what lets a plate that wires
    // ONLY `value-format` inherit the redundant word channel with ZERO per-plate wiring (the O-A7
    // inheritance-breadth law) — a `value-format`-only continuous frame resolves to the value-label
    // channel instead of colour-only `none` (the O-A22 RED, closed at the library root).
    const wordOf = props.valueLabel ?? props.valueFormat;
    // K-D-GEO §4.B · THE LOAD-BEARING (topology,projection,viewport) COHERENCE BACKSTOP. A DEV-only
    // diagnostic (dead-code-eliminated in the prod build) evaluated ONCE per geometry change: the
    // WHOLE feature COLLECTION's UNION centroid + bounds — d3-geo's geoPath accepts a
    // FeatureCollection directly, so this is ONE centroid/bounds pair on the collection, NOT a
    // per-feature loop and NOT `features[0]` (D7: a `features[0]` span check false-REDs the speedtest
    // H3 slivers, whose COLLECTION union spans the state). It reuses the gate's ONE `isCoherent`
    // predicate so the assertion and the gate share ONE law (no drift). A `console.error` — NOT a
    // `throw` (a half-render is more diagnostic than a white screen) — that the e2e backstop reads.
    if (import.meta.env.DEV && features.length) {
        const collection = {
            type: "FeatureCollection",
            features,
        } as unknown as GeoPermissibleObjects;
        const [scx, scy] = draw.centroid(collection);
        const [[x0, y0], [x1, y1]] = draw.bounds(collection);
        const sample: GeoCoherenceSample = {
            consumer: props.ariaLabel,
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
        // GAP-5 — the centroid the value LABEL is seated at, measured off the SAME path generator the
        // fill draws through (one projection, one coordinate frame). O-A22 needs the centroid whenever
        // a channel MAY seat a value-label there, so it is measured whenever a WORD source exists
        // (`valueLabel` OR `valueFormat`), not only under the resting forced-colors posture.
        const [cx, cy] = wordOf ? draw.centroid(f) : [0, 0];
        // X10-LIB — the region's bounding-box minor axis, measured off the SAME path generator (one
        // coordinate frame) whenever a word source exists (the ONLY time the size gate is consulted —
        // mirrors the centroid's own guard, so a label-less choropleth pays nothing extra).
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
            // sentinel. A formatter that renders no-data as "" (formatHhi / a custom valueLabel)
            // marks the cell ABSENT: it mints NO tier bin AND shows NO word (v-show gates on the "").
            // This decouples absence from what the ramp painted; a formatter with a GLYPH no-data
            // face ("—") carries no "" oracle, so its cells read as data (the honest fallback).
            hasValue: wordOf == null || word !== "",
        };
    });
});

// ── O-A22 · THE SIGHTED-COLORBLIND REDUNDANT CHANNEL (a11y P3) ──────────────────────────────────
// The redundant NON-hue channel keyed off the ONE shared bin source — the RESOLVED data fill colour
// (`shapes[].fill`). Distinct data colours are ordered into tier bins (`buildDataFillBins`); the
// channel `auto` resolves to per density: a tiered / dense grid (few colour bins) → a tier TEXTURE,
// a continuous / sparse district set (many bins) → the on-mark VALUE-LABEL. Because a tier's texture
// is a `<pattern>` whose OWN background rect is that tier's colour, tier k's texture literally
// carries tier k's colour — the two channels can never disagree (the O-A22 agreement, by construction).

/** The DISTINCT data fills (absence cells excluded — they mint no bin), the shared source for BOTH
    the density signal and the pattern-bin map (one filter/map, no double traversal). */
const dataFills = computed(() =>
    shapes.value.filter((s) => s.hasValue).map((s) => s.fill),
);

/** The distinct-DATA-fill → UNIQUE tier-bin map. Its SIZE is the density signal the resolve
    decision reads (raw distinct colour count — NOT the quantized count). */
const fillBins = computed(() => buildDataFillBins(dataFills.value));

/** Whether an on-mark WORD channel is available — `valueLabel` OR `valueFormat` (the two are ONE
    label source, O-A22): every data plate supplies at least `valueFormat` (the a11y-table formatter),
    so `hasLabelSource` is true wherever a redundant word can be seated. */
const hasLabelSource = computed(
    () => props.valueLabel != null || props.valueFormat != null,
);

/** The channel `redundantChannel` resolves to for this frame — the density decision's output. */
const resolvedChannel = computed<ResolvedChannel>(() =>
    resolveRedundantChannel(props.redundantChannel, fillBins.value.size, hasLabelSource.value),
);

// ── X10-LIB · THE PER-REGION LABEL GATE (the label-vs-A22 reconcile) ────────────────────────────
// The owner's X10 declutter rule (design-usf-sci-ecf.md §X10): an in-map label renders at rest ONLY
// where it clears a SIZE floor (its region's minor axis) AND a WCAG CONTRAST floor against its own
// fill; a region failing either does NOT go blank — it falls back to the PATTERN texture (below),
// so O-A22's "every data region carries a non-hue channel at rest" invariant survives declutter.

/** The settle-epoch tick (GeoPlate's own seam, `useGeoPaletteEpoch` — idempotent per module) the
    label-ink read keys reactivity on, so a theme flip re-derives the contrast gate post-settle. */
const paletteEpoch = useGeoPaletteEpoch();
/** The label ink (`--foreground`, the SAME ink `.geo-value-label` paints), resolved once per theme. */
const labelInk = computed<Oklab>(() => {
    void paletteEpoch.value;
    return readLabelInk();
});

/** Per-shape label-gate results — a `key → clears-both-gates` map, evaluated ONLY under the
    `value-label` channel (the SOLE mode a resting label is ever a candidate) and ONLY for `hasValue`
    cells (an absence cell carries no word to gate). Memoized so the fill + label-visibility bindings
    below share ONE contrast evaluation per shape rather than re-deriving it per template access. An
    unparseable fill resolves its contrast against `labelInk` itself (contrast 1 — a guaranteed FAIL,
    the conservative default: an unresolvable colour never gets the benefit of the doubt). */
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

/** Whether `s`'s label clears BOTH the X10 gates (false for anything not evaluated above — a
    `pattern`/`none` frame, or an absence cell, where the question never arises). */
function shapeClearsLabelGate(key: string): boolean {
    return labelGateResults.value.get(key) ?? false;
}

/** Whether `s` renders through the PATTERN texture rather than its plain resolved fill: the whole
    frame under the `pattern` channel, OR — the X10-LIB fallback — a `value-label` region whose own
    label FAILS the size/contrast gate (the channel changes form for that region, it never drops). A
    DIMMED or ABSENT cell is excluded (the disjointness law: a receded cell keeps the plain fill so
    the reserved dim/absence hatch reads on it, never a data texture). */
function usesPatternFill(s: Shape): boolean {
    if (!s.hasValue || isDimmed(s.key)) return false;
    if (resolvedChannel.value === "pattern") return true;
    if (resolvedChannel.value === "value-label") return !shapeClearsLabelGate(s.key);
    return false;
}

/** The PATTERN-channel bin map — the distinct data fills collapsed into ≤PATTERN_TIER_MAX texture
    buckets: an IDENTITY (one bin per colour) when the set already fits the 8 textures, the >8
    quantize SAFETY-NET otherwise (so a label-less continuous frame can texture rather than go colour-
    only). Keyed off the SAME `buildDataFillBins` rank source, so tier-k-texture == tier-k-colour. */
const patternBins = computed(() =>
    buildDataFillBins(dataFills.value, PATTERN_TIER_MAX),
);

/** The tier TEXTURE `<pattern>` defs — built whenever SOME shape renders through the pattern channel:
    the whole frame under `pattern`, or the size/contrast-FAILING subset under `value-label` (X10-LIB).
    ONE def per tier BIN, its background rect the tier colour + the bin's hue-independent ink on top.
    In the ≤8 case every distinct colour is its own bin (its exact colour); in the >8 quantize case the
    bin is a bucket and the FIRST colour that lands in it is the tier representative — so the defs stay
    ≤PATTERN_TIER_MAX with NO duplicate id. Emitted into `<defs>` and referenced by
    `url(#geo-data-pattern-{bin})`; the agreement source is the pattern ITSELF (its background is the
    tier fill). */
const patternDefs = computed(() => {
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

/** The per-shape fill — through its tier texture (`url(#…)`, the colour + ink) wherever
    `usesPatternFill` says so (the whole `pattern` frame, or an X10-LIB gate-failing `value-label`
    region), else the plain resolved fill. */
function fillFor(s: Shape): string {
    if (usesPatternFill(s)) {
        const bin = patternBins.value.get(s.fill);
        if (bin != null) return `url(#${patternIdForBin(bin)})`;
    }
    return s.fill;
}

/** GAP-5 — whether the forced-colors per-feature TEXT channel is available (a WORD source is
    supplied — `valueLabel` OR `valueFormat`, the O-A22 unified label source). When true, each shape
    with a non-empty label paints a centroid `<text>` so the magnitude survives a `forced-colors:
    active` / colour-blind user as a WORD (not COLOUR ALONE) — the H7 ContractCliff text-channel
    precedent extended to the choropleth (and now inherited by `value-format`-only plates). */
const labelsOn = hasLabelSource;

// O-F10 (virtualization §3 R2-c · the dense-`<text>` retirement) — THE GAP-5 LAYER, RETIRED TO
// ON-DEMAND. The per-feature value words are a forced-colors-ONLY channel: at rest they sit at
// opacity 0.04 (invisible — the colour ramp is the resting magnitude channel) and only become
// legible under `forced-colors: active` where the fill flattens. So the whole `<text v-for>` layer
// (~118 nodes on /sci, one per district — the last resident dense-`<text>` layer after the
// GeoPointLayer `dot-value-label` field was retired 2,374→1) has NO resting purpose: it is pure DOM
// weight the L11 census counts and the `:root`-invalidation reflow pays for. This mirrors that exact
// house precedent — MOUNT the channel ONLY when it is needed, i.e. when forced-colors is live — so
// the resting document drops the layer to ZERO while a forced-colors / high-contrast reader still
// gets the complete, per-feature word channel (GAP-5 completeness KEPT — a SR/forced-colors channel
// is never windowed or collision-skipped; every feature keeps its word). A live `matchMedia` (the
// useReducedMotion idiom) so an OS contrast toggle mounts/unmounts the channel reactively.
const forcedColorsActive = useMediaQuery("(forced-colors: active)");
// O-A22 extends the mount trigger: the layer also mounts when the redundant channel RESOLVES to
// `value-label` (a continuous / sparse district set the density decision routes to the word channel)
// — there the words are the SIGHTED-colorblind channel and must be legible AT REST (not only under
// forced-colors), so the layer carries the `--redundant` rest visibility below. The GAP-5
// completeness law is unchanged: a mounted layer keeps EVERY feature's word (never windowed).
const labelsMounted = computed(
    () =>
        (labelsOn.value && forcedColorsActive.value) ||
        resolvedChannel.value === "value-label",
);
/** O-A22 — the layer is the resting SIGHTED-colorblind channel (visible at rest), not the quiet
    forced-colors-only overlay, exactly when the density decision routed this frame to value-label. */
const labelsRedundant = computed(() => resolvedChannel.value === "value-label");
/** X10-LIB — within a redundant (value-label-channel) frame, whether `s` FAILS its own size/contrast
    gate and so must NOT inherit the group's resting-visible lift: its region carries the pattern
    texture instead (`usesPatternFill`), so a label that would be "texture noise wearing data's
    clothes" never paints at rest — it stays at the base near-invisible GAP-5 opacity (unaffected
    under `forced-colors: active`, which the CSS `@media not (…)` guard leaves untouched — GAP-5
    completeness holds: every feature keeps its word there). */
function labelGateFails(s: Shape): boolean {
    return labelsRedundant.value && s.hasValue && !shapeClearsLabelGate(s.key);
}

// K-D-GEO §4.A — THE STATIC-DASH MIGRATION. The polygon-life draw-in rides a STATIC `pathLength="1"`
// literal (on the `.geo-shape` <path>) so the dash math collapses to the constants
// `stroke-dasharray:1; stroke-dashoffset:1→0` (map-draw.css) — INDEPENDENT of `d` by the SVG-spec
// guarantee. The `--len` getTotalLength/`measureLengths`/`nextTick` measure apparatus is RETIRED: it
// went stale under a Vue 3.5 re-projection (the `--len` map zeroed against the new geometry → the
// live HALF-OUTLINE defect). With no runtime length left to read, the half-outline cannot recur.

// J-COLOR §5.1 — THE COORDINATED CATEGORICAL QUAD (the VC bar↔map pair). The quad is FOUR stops
// (`--viz-category-1..4`, the RWB-emergent-plus-one — data-red/blue/gold/green); an index outside
// 1..4 is clamped into the quad (a categorical encoding needing >4 classes is the band-cake
// rainbow's role, not this quad's — §5.4 role-separation keeps it at four). The stop is emitted as a
// cascade-resolved `var(--…)` reference (an SVG fill the theme retunes from the design locus, the
// SAME late-resolution `colorKind.ts` uses) — NEVER an OKLab-blended rgb here (the SVG owns no canvas
// string). A ranked-bar fills bar k and this map fills its territory with the SAME `--viz-category-{k}`,
// index-bound 1:1 through the caller's one shared scale.
const VIZ_CATEGORY_STOPS = 4;
function categoryVar(idx: number): string {
    const k = Math.min(VIZ_CATEGORY_STOPS, Math.max(1, Math.round(idx)));
    return `var(--viz-category-${k})`;
}

/** The per-feature fill — the coordinated categorical quad stop (`category` WINS for a key it
    indexes), else the caller's magnitude `fill`. Index-bound to the SAME quad the ranked-bar reads. */
function fillOf(key: EntityKey): string {
    const k = props.category?.(key);
    if (k != null) return categoryVar(k);
    return props.fill(key);
}

function isRaised(key: string): boolean {
    return props.raisedKeys?.has(key) ?? false;
}
function isDimmed(key: string): boolean {
    return props.dimmedKeys?.has(key) ?? false;
}
function isSelected(key: string): boolean {
    return props.selectedKeys?.has(key) ?? false;
}

const hovered = ref<Shape | null>(null);

function onEnter(s: Shape) {
    hovered.value = s;
    emit("hover", s.key);
}
function onLeave() {
    hovered.value = null;
    emit("hover", null);
}

// ── J-MOBILE (the reach-idiom touch seam) — a COARSE TAP must select ───────────────────
// A `@click` does NOT reliably fire on a touch tap of an SVG `<path>` (the synthetic click
// is as unreliable on the choropleth shape as it was on the GeoPointLayer `<circle>`; the
// phone tap dies before it reaches the producer, so a plain finger tap on a /usf
// NetRetentionMap state or an /ecf district raises NOTHING). So the touch/pen select rides a
// DELEGATED `@pointerup` on the `<svg>` root: it hit-tests the bubbled `data-key` (the shapes
// already carry `:data-key="s.key"`) and emits `select` — mirroring GeoPointLayer's
// `onFieldPointerUp` verbatim. The synthetic FOLLOW-ON click a touch may still emit is
// de-duped by a DELTA guard — `lastTouchSelect` stamps the pointerup's `timeStamp`, and
// `onSelect`/the click producer early-returns when it fires within 700ms AFTER that stamp (a
// delta off the real prior touch-select, NOT a wall-clock). `lastTouchSelect` starts at
// −Infinity so the first FINE click is never swallowed (the delta is +Infinity).
const lastTouchSelect = ref<number>(-Infinity);

function keyFromEvent(ev: Event): string | null {
    const t = ev.target as Element | null;
    return t?.closest?.("[data-key]")?.getAttribute("data-key") ?? null;
}

function onFieldPointerUp(ev: PointerEvent) {
    if (ev.pointerType !== "touch" && ev.pointerType !== "pen") return;
    const key = keyFromEvent(ev);
    if (!key) return;
    lastTouchSelect.value = ev.timeStamp;
    emit("select", { key, multi: isMultiSelect(ev) });
}

/** The producer (S1): a click pins the key, the modifier read at the DOM edge. A synthetic
    touch follow-on click (within 700ms of the real touch-select handled by `onFieldPointerUp`)
    is swallowed so a tap selects exactly ONCE. */
function onSelect(s: Shape, ev: MouseEvent) {
    if (ev.timeStamp - lastTouchSelect.value < 700) return;
    emit("select", { key: s.key, multi: isMultiSelect(ev) });
}

const hasTable = computed(() => props.valueFormat != null);
const tableRows = computed(() =>
    shapes.value.map((s) => ({
        name: s.name,
        value: props.valueFormat ? props.valueFormat(s.key) : "",
    })),
);
</script>

<template>
    <div class="relative w-full">
        <svg
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            class="h-auto w-full"
            role="img"
            :aria-label="ariaLabel"
            data-testid="geo-choropleth-svg"
            @pointerup="onFieldPointerUp"
        >
            <defs>
                <!-- The dim hatch: filtered-out shapes carry it so the de-emphasis
                     is never signalled by colour/opacity alone. -->
                <pattern
                    id="geo-dim-hatch"
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <!-- THE DIM HATCH (F-2 · f-filters §3 — the USF dim-lift). The 0.55 paper
                         wash dragged the receded state back to ≈ the cream ground (rendered-
                         pixel contrast ~1.05:1 — "dimmed" and "absent" read identical, so the
                         reader saw no filter act). The wash drops to 0.1 (the receded fill keeps
                         its presence, no longer washed to paper) and the hatch lines deepen +
                         densify (the receded state reads as a DELIBERATELY HATCHED region, not
                         gone). Paired with the lifted dim-opacity floor below (0.30 → 0.70), the
                         dimmed state clears the filter-perceptibility floor (deliberately
                         receded ≠ invisible) while staying clearly recessive vs the raised
                         (opacity-100) match — a 30% delta the eye reads as "filtered, not gone". -->
                    <rect width="6" height="6" fill="var(--background)" opacity="0.1" />
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke="var(--muted-foreground)"
                        stroke-width="1.6"
                        opacity="0.7"
                    />
                </pattern>
                <!-- O-A22 · THE TIER TEXTURES (the sighted-colorblind data channel). One `<pattern>`
                     per distinct DATA tier: its background rect IS the tier colour, a hue-independent
                     ink (dots / lines / grid / checker / chevron / rings / cross-mesh) drawn over it —
                     so a colour-blind reader tells the tiers apart by TEXTURE, and tier k's texture
                     literally carries tier k's colour (the agreement is the pattern itself). The set
                     is DISJOINT from the 45° absence hatch above. Built only under the pattern channel;
                     a continuous / sparse map uses the value-label layer instead. -->
                <pattern
                    v-for="p in patternDefs"
                    :key="p.id"
                    :id="p.id"
                    :width="DATA_PATTERN_TILE"
                    :height="DATA_PATTERN_TILE"
                    patternUnits="userSpaceOnUse"
                >
                    <rect
                        :width="DATA_PATTERN_TILE"
                        :height="DATA_PATTERN_TILE"
                        :fill="p.fill"
                    />
                    <line
                        v-for="(l, i) in p.geom.lines ?? []"
                        :key="`ln-${i}`"
                        :x1="l.x1"
                        :y1="l.y1"
                        :x2="l.x2"
                        :y2="l.y2"
                        class="geo-data-stroke"
                    />
                    <circle
                        v-for="(c, i) in p.geom.circles ?? []"
                        :key="`ci-${i}`"
                        :cx="c.cx"
                        :cy="c.cy"
                        :r="c.r"
                        :class="c.ring ? 'geo-data-stroke' : 'geo-data-fill'"
                    />
                    <rect
                        v-for="(r, i) in p.geom.rects ?? []"
                        :key="`re-${i}`"
                        :x="r.x"
                        :y="r.y"
                        :width="r.width"
                        :height="r.height"
                        class="geo-data-fill"
                    />
                </pattern>
            </defs>
            <g>
                <template v-for="s in shapes" :key="s.key">
                    <!-- Pointer affordance only; the screen-reader path is the
                         offscreen table (a 50-shape tab order would be hostile and
                         interactive roles inside role="img" violate WCAG 4.1.2). -->
                    <path
                        :d="s.d"
                        pathLength="1"
                        :fill="fillFor(s)"
                        :data-key="s.key"
                        :data-raised="isRaised(s.key) ? 'true' : undefined"
                        :data-dimmed="isDimmed(s.key) ? 'true' : undefined"
                        :data-selected="isSelected(s.key) ? 'true' : undefined"
                        :data-kbd-active="kbdActiveKey === s.key ? 'true' : undefined"
                        aria-hidden="true"
                        class="geo-shape stroke-background outline-none transition-opacity duration-200 dimmed:opacity-70 raised:opacity-100 selected:[stroke-width:2.5]"
                        :class="{ 'geo-shape--draw': drawOn }"
                        :style="drawOn ? { '--rank': s.rank ?? 0 } : undefined"
                        :stroke-width="isRaised(s.key) ? 2 : 0.5"
                        @mouseenter="onEnter(s)"
                        @mouseleave="onLeave"
                        @click="onSelect(s, $event)"
                    />
                    <path
                        v-if="isDimmed(s.key)"
                        :d="s.d"
                        fill="url(#geo-dim-hatch)"
                        class="pointer-events-none"
                        aria-hidden="true"
                    />
                </template>
            </g>
            <!-- GAP-5 · THE FORCED-COLORS TEXT CHANNEL (I9.c — the H7 ContractCliff precedent).
                 A per-feature value WORD seated at each shape's centroid: the magnitude as text, so
                 a `forced-colors: active` / colour-blind reader keeps the meaning the colour ramp
                 carries even when the OS palette flattens every fill. The labels are an engraved
                 overlay, near-invisible at rest (the colour ramp is the resting channel); the
                 `forced-colors` rule below makes them fully legible exactly when the colour fails.
                 Drawn ONLY when the caller supplies `valueLabel` (the legacy posture has no text). -->
            <g
                v-if="labelsMounted"
                class="geo-value-labels"
                :class="{ 'geo-value-labels--redundant': labelsRedundant }"
                aria-hidden="true"
            >
                <text
                    v-for="s in shapes"
                    v-show="s.label"
                    :key="`label-${s.key}`"
                    :x="s.cx"
                    :y="s.cy"
                    class="geo-value-label"
                    :class="{ 'geo-value-label--gate-fail': labelGateFails(s) }"
                    text-anchor="middle"
                    dominant-baseline="central"
                >
                    {{ s.label }}
                </text>
            </g>
        </svg>

        <!-- Offscreen accessible data table (the chart fallback). The ONE table-aware primitive
             block-wraps the `<table>` so the `.sr-only` clamp lands on a host that respects it
             (f6-sci-broken-overscroll §2.2 — the overscroll-tail root; the latent twin of the
             SCI detonator). -->
        <ChartDataTable
            v-if="hasTable"
            :rows="tableRows"
            :caption="ariaLabel"
            row-header="Area"
            value-header="Value"
        />
    </div>
</template>

<style scoped src="./GeoChoropleth.css"></style>
