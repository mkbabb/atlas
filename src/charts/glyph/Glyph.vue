<script setup lang="ts">
// Glyph.vue — the ONE geo-identity primitive (DESIGN §3.4 EntityGlyph, BUILT). A state,
// a county, an NC district renders through ONE `<Glyph grain id label>`: the entity's TRUE
// silhouette (the I-GLYPH committed registry feature `GeoChoropleth` already draws) plus its
// collision-free abbreviation. This component is the state-grain entry of the `grain`-dispatched
// superset — `EntityGlyph` was a SIGNED-BUT-UNBUILT spec with no call sites, so there is no shim
// and no migration; `Glyph` is the one component, state the first grain it serves, county +
// true-district the others (resolved by `entityGeometry.ts`, the I4.a resolver, read-only here).
//
// THE CHANNELS (the PRESENCE ≠ ENCODING law, BreakEvenScatter §channel-separation):
//   • the SILHOUETTE is the identity channel — `<path :d>` (the byte-identical I-GLYPH feature);
//   • the FILL is the data channel — the data-keyed `makeDivergingScale({markSafe:true})` verdict
//     colour the disc wore, handed in by the consumer (the glyph never re-derives a scale);
//   • PRESENCE is a hairline `--foreground` stroke — a mark exists whether or not it carries data,
//     so the stroke (presence) is NEVER the fill (encoding);
//   • the ABBREVIATION is the label channel — a mono `<text>` with INK = chrome (`--foreground`,
//     the ramp-ink law: NEVER the data colour), `paint-order: stroke` + a paper halo so it survives
//     over any fill, placed INSIDE a blocky silhouette / BESIDE a thin one (per the build-time
//     `aspect` + path slightness) — a two-letter code on a circle becomes a SHAPE that reads.
//
// THE REGISTERS ride the SAME `data-raised`/`data-dimmed`/`data-selected` attributes +
// `#geo-dim-hatch` pattern `GeoChoropleth` carries (no forked dim/register CSS object): "filtered,
// not gone" reads identically across the map and the glyph field. The county-proxy FLOOR (the
// THREE LEA-null DoDEA/reservation districts) renders the dashed "approximate — county outline"
// presence-hint — distinct from a true silhouette, NEVER a bare disc.
//
// THE GLASS SEAMS (CONSUMED on the published 4.1.0 cut): `metal` applies the glass-ui
// W-METAL-SHIMMER rim (`.metal-{gold,silver,bronze}`, the MEDAL-SCARCITY one-gilt law) — the
// published cut ships the family, so the rim runs the live shimmer. `accent` threads the data hue to the published
// W-GLASS-ACCENT seam (`--glass-accent`); the `--glyph-accent` `<feDropShadow>` inner-glow is the
// SVG-native glow channel a `<path>` needs (a backdrop-filter glass tier cannot light an SVG
// silhouette), bound to the SAME hue so the two read as one. Both INERT / byte-identical at rest
// when `metal`/`accent` are omitted. The shimmer/glow keyframes are NOT authored here
// (root-repo-law): the glyph only CONSUMES the facilities.
import { computed, useId } from "vue";
import type { GlyphGeom, GlyphSize } from "../../data/entityGeometry.js";

/** The entity grain the glyph identifies — drives nothing in render (the `geom` is pre-resolved by
    `entityGeometry`), carried so the consumer/contract declares its key grain on the mark. */
export type GlyphGrain = "state" | "county" | "district";

/** Where the abbreviation seats. `auto` reads the build-time `aspect` + path slightness; `none`
    suppresses the in-glyph label entirely (the RankedStrip case — the abbr is already the axis
    category, so the glyph renders the silhouette only). */
export type GlyphLabelMode = "auto" | "inside" | "beside" | "none";

/** The named figure-primacy rung (C3 / E7) — the SAME four tokens `entityGeometry`'s `GlyphSize`
    exposes. Kept LOCAL to the render so the arbitrary-size path (a numeric `size`) does not couple
    `Glyph.vue` to the resolver's LOD policy — a number is an explicit px BOX, a string is a rung. */
type NamedGlyphSize = "sm" | "md" | "lg" | "hero";
const NAMED_SIZES: readonly NamedGlyphSize[] = ["sm", "md", "lg", "hero"];
function isNamedSize(s: GlyphSize | number): s is NamedGlyphSize {
    return typeof s === "string" && (NAMED_SIZES as readonly string[]).includes(s);
}

const props = withDefaults(
    defineProps<{
        /** The entity grain (state | county | district) — the declared mark key grain. */
        grain: GlyphGrain;
        /** The feature key (state FIPS / county FIPS5 / district GEOID) — the byte-identity SoR. */
        id: string;
        /** The human label for the accessible name (e.g. "California"). Falls back to `geom.name`. */
        label?: string;
        /** The pre-resolved silhouette (from `stateGlyph`/`countyGlyph`/`districtGlyph`). When null
            the glyph paints a no-data placeholder (the consumer resolved no geometry for the key). */
        geom: GlyphGeom | null;
        /** The DATA-keyed verdict colour — the SAME `makeDivergingScale({markSafe:true})` the disc
            wore (the consumer hands it in; the glyph never re-derives a scale). */
        fill: string;
        /** The figure-primacy TOKEN rung (C3 / E7) — NOT a magic px — OR an arbitrary px BOX.
            A NAMED rung (`sm` strip/dot · `md` scatter · `lg` legend chip · `hero` the I5 card
            silhouette) drives the painted scale AND (via the resolver) the LOD tier; a NUMBER
            (the J-GLYPH arbitrary-size API) sizes the silhouette box directly in px — the
            generalized facility serving any size from a tiny strip mark up to a hero stage, the
            named rungs STILL the figure-primacy tokens for the call sites that want them. */
        size?: GlyphSize | number;
        /** The DOTS-AS-GLYPHS path (J-GLYPH §4 · the OD-7/perf bound) — render the silhouette as a
            scatter DOT mark: a compact, perf-safe coarse-LOD silhouette standing in for a bare disc
            (a state-/county-/district-shaped point). The chrome the inline glyph carries — the
            abbreviation, the dim-hatch overlay, the presence/register strokes — is SUPPRESSED so a
            dense dot-cloud stays a cheap silhouette field (the consumer requests the `coarse` LOD on
            its side; the glyph paints the dot). The `fill` is the data channel exactly as a disc. */
        dot?: boolean;
        /** Where the abbreviation seats (default `auto` — the build-time `aspect` + slightness). */
        labelMode?: GlyphLabelMode;
        /** RAISE register (hover linked-highlight) — the choropleth's `data-raised`. */
        raised?: boolean;
        /** DIM register (filter non-match) — the choropleth's `data-dimmed` + `#geo-dim-hatch`. */
        dimmed?: boolean;
        /** SELECT register (the pinned-mark FRAME) — the choropleth's `data-selected`. */
        selected?: boolean;
        /** The I1 glass-ui W-METAL-SHIMMER rim (the MEDAL-SCARCITY one-gilt law) — the I5 awarded
            member only. INERT on the BA base (no rim when omitted). */
        metal?: "gold" | "silver" | "bronze";
        /** The W-GLASS-ACCENT data-hue glow — threads `--glass-accent` (and the `--glyph-accent`
            `<feDropShadow>` fallback). Omit ⇒ no glow (byte-identical at rest). */
        accent?: string;
    }>(),
    {
        label: undefined,
        size: "md",
        dot: false,
        labelMode: "auto",
        raised: false,
        dimmed: false,
        selected: false,
        metal: undefined,
        accent: undefined,
    },
);

// ── The label-mode resolution (the inside↔beside threshold, per the build-time geometry) ───────
//
// A blocky silhouette can host a horizontal 2–3 char abbr INSIDE; a thin or slight one cannot, so
// the label seats BESIDE it (the §3.4 RI/DC/DE case). The only geometry the registry carries is the
// aspect-true [0,100] box (`aspect = w/h`) + the path itself (every feature is size-normalized, so
// absolute geographic area is NOT a signal). Two build-time signals decide:
//   • a TALL-THIN sliver (low `aspect`) — NJ/NH/VT — has no horizontal room INSIDE;
//   • a SLIGHT silhouette (a short, simple `d`) — RI/DC/DE, the tiny coastal states — has little
//     interior to seat legible text, even at a moderate aspect (RI's box is 0.70 wide but its outline
//     is a 327-char sliver). A large complex shape (CA, `d` ≈ 1900 chars) keeps the label INSIDE.
// The thresholds are the geometry-derived label contract, not a per-call magic.

/** Below this `aspect` (w/h) the silhouette is too narrow to seat horizontal text inside. */
const SLIVER_ASPECT = 0.5;
/** A `d` shorter than this is a SLIGHT outline (RI/DC/DE) — too little interior for legible text. */
const SLIGHT_PATH_LEN = 360;

const resolvedLabelMode = computed<GlyphLabelMode>(() => {
    // The DOTS-AS-GLYPHS path is a bare silhouette dot — no abbreviation, ever (a dense
    // dot-cloud must stay a cheap silhouette field; a label per dot would both clutter and
    // pull layout cost). So `dot` forces `none`, overriding `auto`/`inside`/`beside`.
    if (props.dot) return "none";
    if (props.labelMode !== "auto") return props.labelMode;
    const geom = props.geom;
    if (!geom) return "none";
    const slight = geom.d.length < SLIGHT_PATH_LEN;
    const sliver = geom.aspect < SLIVER_ASPECT;
    return slight || sliver ? "beside" : "inside";
});

// ── The size resolution (the named rung CSS class XOR the arbitrary-px box) ─────────────────────
//
// A NAMED rung (`sm`/`md`/`lg`/`hero`) rides the `.glyph--{size}` class (the figure-primacy token
// scale, raised in ONE place — `--glyph-box` per rung). A NUMBER is the J-GLYPH arbitrary-size API:
// it sizes `--glyph-box` DIRECTLY in px inline, so a viz can request any box (a 14px strip mark up
// to a hero stage) without a new named rung — the named rungs stay the tokens, the number is the
// escape hatch the "generalized facility" mandate asks for. Exactly one path is active per call.

/** The named-rung modifier class — present only for a string `size` (a number sizes the box inline). */
const sizeClass = computed<string | null>(() =>
    isNamedSize(props.size) ? `glyph--${props.size}` : null,
);

/** The arbitrary-size inline box override — present only for a NUMERIC `size` (px). The named rungs
    leave `--glyph-box` to the class cascade; a number sets it directly so any size resolves. */
const boxStyle = computed<Record<string, string> | null>(() =>
    typeof props.size === "number" ? { "--glyph-box": `${props.size}px` } : null,
);

const showInside = computed(() => resolvedLabelMode.value === "inside");
const showBeside = computed(() => resolvedLabelMode.value === "beside");
const isProxy = computed(() => props.geom?.fallback === "county-proxy");

const abbr = computed(() => props.geom?.abbr ?? "");
const accessibleName = computed(() => {
    const base = props.label ?? props.geom?.name ?? abbr.value;
    return isProxy.value ? `${base} (approximate — county outline)` : base;
});

// A stable, unique id for the per-instance `<feDropShadow>` accent filter (the shipped
// `--glyph-accent` inner-glow fallback). `useId()` is SSR-safe + collision-free across many marks.
const uid = useId();
const accentFilterId = computed(() => `glyph-accent-${uid}`);

// The `metal` rim class (the BB-5 `.metal-{gold,silver,bronze}` utility) — the published cut ships
// `.metal-*`, so the prop activates the live shimmer rim.
const metalClass = computed(() =>
    props.metal ? `metal-${props.metal}` : null,
);
</script>

<template>
    <span
        class="glyph"
        :class="[
            sizeClass,
            dot ? 'glyph--dot' : null,
            resolvedLabelMode === 'beside' ? 'glyph--beside' : 'glyph--inside',
            metalClass,
        ]"
        :data-grain="grain"
        :data-glyph-id="id"
        :data-dot="dot ? 'true' : undefined"
        :data-raised="raised ? 'true' : undefined"
        :data-dimmed="dimmed ? 'true' : undefined"
        :data-selected="selected ? 'true' : undefined"
        :data-fallback="isProxy ? 'county-proxy' : undefined"
        role="img"
        :aria-label="accessibleName"
        :style="[
            boxStyle,
            accent ? { '--glass-accent': accent, '--glyph-accent': accent } : null,
        ]"
    >
        <!-- The silhouette. The viewBox is the entry's own aspect-true [0,100]-ish box, so the path
             fits the frame with TRUE proportions (no square-warp). The fill is the data channel; the
             hairline `--foreground` stroke is PRESENCE (never the encoding). The county-proxy floor
             draws the dashed + low-opacity "approximate — county outline" hint (data-fallback drives
             the styling) — distinct from a true silhouette, NEVER a bare disc. -->
        <svg
            v-if="geom"
            class="glyph__svg"
            :viewBox="geom.viewBox"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <!-- The dim hatch — the SAME `#geo-dim-hatch` pattern GeoChoropleth carries, so a
                     dimmed glyph reads "filtered, not gone" identically to a dimmed map shape (no
                     forked dim CSS object; the pattern is local to the inline SVG, byte-equal stops). -->
                <pattern
                    :id="`glyph-dim-hatch-${uid}`"
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
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
                <!-- The SVG-native accent inner-glow (`--glyph-accent` feDropShadow) — the glow
                     channel an SVG `<path>` needs (the published W-GLASS-ACCENT `--glass-accent` seam
                     is a backdrop-filter glass tier that cannot light a silhouette path, so the glyph
                     keeps its own filter, bound to the SAME hue). Rendered ONLY when `accent` is set
                     (byte-identical at rest otherwise — no filter node, no glow). -->
                <filter
                    v-if="accent"
                    :id="accentFilterId"
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                >
                    <feDropShadow
                        dx="0"
                        dy="0"
                        stdDeviation="2.5"
                        flood-color="var(--glyph-accent)"
                        flood-opacity="0.55"
                    />
                </filter>
            </defs>
            <!-- The TRUE silhouette path (the byte-identical I-GLYPH feature). -->
            <path
                class="glyph__path"
                :d="geom.d"
                :fill="fill"
                :filter="accent ? `url(#${accentFilterId})` : undefined"
                :data-fallback="isProxy ? 'county-proxy' : undefined"
            />
            <!-- The dim overlay: the hatch fill on a second copy, so the de-emphasis is never
                 colour/opacity alone (the GeoChoropleth idiom). -->
            <path
                v-if="dimmed && !dot"
                class="glyph__dim"
                :d="geom.d"
                :fill="`url(#glyph-dim-hatch-${uid})`"
            />
            <!-- The INSIDE abbreviation — chrome ink, paint-order:stroke paper halo, centred in the
                 silhouette box. Seated only for blocky shapes (the auto threshold) and never when
                 `labelMode='none'`. -->
            <text
                v-if="showInside && labelMode !== 'none' && abbr"
                class="glyph__abbr glyph__abbr--inside"
                x="50%"
                y="50%"
                text-anchor="middle"
                dominant-baseline="central"
            >
                {{ abbr }}
            </text>
        </svg>

        <!-- The no-data placeholder — the consumer resolved no geometry for this key (a territory
             absent from the feed frame). A neutral hairline ring + the abbr, NEVER a filled disc
             masquerading as a silhouette. -->
        <svg
            v-else
            class="glyph__svg glyph__svg--void"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x="6"
                y="6"
                width="88"
                height="88"
                rx="8"
                fill="none"
                class="glyph__void-ring"
            />
        </svg>

        <!-- The BESIDE abbreviation — a mono chrome-ink span set alongside the thin/slight
             silhouette (RI/DC/DE), since the interior cannot host legible horizontal text. Suppressed
             under `labelMode='none'`. -->
        <span
            v-if="showBeside && labelMode !== 'none' && abbr"
            class="glyph__abbr glyph__abbr--beside"
            aria-hidden="true"
            >{{ abbr }}</span
        >
    </span>
</template>

<style scoped>
/* ── The host + the size rungs (C3 / E7) ──────────────────────────────────────────────────────
   `size` is a NAMED rung tied to the figure-primacy scale (`--type-display-audacious`), raised in
   ONE place — the chronic "make the dots bigger" becomes a token, not another per-viz `symbolSize`
   bump. The glyph box is a fraction of the audacious register so the family scales together; the
   beside-label flows inline (the silhouette + the abbr read as one lockup). */
.glyph {
    --glyph-box: calc(var(--type-display-audacious) * 0.18);
    display: inline-flex;
    align-items: center;
    gap: 0.28em;
    line-height: 1;
    vertical-align: middle;
}
.glyph--inside {
    /* the abbr lives inside the SVG — the host is just the silhouette box. */
    gap: 0;
}
.glyph--sm {
    --glyph-box: calc(var(--type-display-audacious) * 0.11);
}
.glyph--md {
    --glyph-box: calc(var(--type-display-audacious) * 0.18);
}
.glyph--lg {
    --glyph-box: calc(var(--type-display-audacious) * 0.26);
}
.glyph--hero {
    /* the I5 card STAGE silhouette (DESIGN.md §2.3.2) — the shape reads as a stage SUBJECT
       (~120px), not an inline icon. A direct stage rung (the §2a hard-gate ~120px target):
       ~120px on desktop, floored at ~80px on a tight phone card — independent of the audacious
       figure clamp which floors too small in the card's narrow container. */
    --glyph-box: clamp(5rem, 14vw, 7.5rem);
}

/* ── The DOTS-AS-GLYPHS rung (J-GLYPH §4 · the OD-7/perf bound) ────────────────────────────────
   A scatter dot rendered as a coarse-LOD silhouette rather than a bare disc. The mark is the
   silhouette ALONE — no abbreviation (forced `none`), no inline gap, a HAIRLINE presence stroke
   so a dense dot-cloud reads as a field of tiny shapes, not as chrome. The box defaults to the
   strip/dot `sm` rung so a plain `<Glyph dot>` (no `size`) is already dot-scaled; an explicit
   `size` (rung or px) still wins. The fill is the data channel exactly as a disc would carry. */
.glyph--dot {
    --glyph-box: calc(var(--type-display-audacious) * 0.11);
    gap: 0;
}
.glyph--dot .glyph__path {
    /* a point mark, not a chrome silhouette — a hairline presence stroke that does not thicken on
       the dot's registers (a dot-cloud must not flicker its 1000 strokes on a single hover). */
    stroke-width: 0.4;
}

.glyph__svg {
    display: block;
    width: var(--glyph-box);
    height: var(--glyph-box);
    overflow: visible;
}

/* ── The silhouette path (PRESENCE ≠ ENCODING) ────────────────────────────────────────────────
   The fill is the data channel (bound inline). PRESENCE is the hairline `--foreground` stroke — a
   mark exists independent of its datum, so the stroke is never the fill. */
.glyph__path {
    stroke: var(--foreground);
    stroke-width: 0.6;
    stroke-linejoin: round;
    paint-order: stroke;
    transition:
        opacity 200ms ease,
        stroke-width 160ms ease;
}
/* The county-proxy FLOOR (§C2 honesty): a dashed outline + low fill-opacity "approximate — county
   outline" presence-hint — the reader SEES this district is floored, not true-resolved. NEVER a
   bare disc (the path is still the county silhouette, only dashed + faint). */
.glyph__path[data-fallback="county-proxy"] {
    stroke-dasharray: 3 2.5;
    fill-opacity: 0.4;
}

.glyph__dim {
    pointer-events: none;
}

/* ── The abbreviation (the label channel — INK = CHROME, never the ramp) ───────────────────────
   Mono (Fira Code), `--foreground` ink, `paint-order: stroke` with a paper (`--background`) halo so
   the code survives over ANY fill (the low pole, the deep pole). This is the ramp-ink law: the
   label NEVER wears the data colour. */
.glyph__abbr {
    font-family: var(--font-mono);
    font-weight: 600;
    fill: var(--foreground);
    color: var(--foreground);
    font-feature-settings:
        "tnum" 1,
        "lnum" 1;
}
.glyph__abbr--inside {
    /* the in-silhouette code: a fraction of the box, paper-haloed for legibility over the fill. */
    font-size: 38px;
    paint-order: stroke;
    stroke: var(--background);
    stroke-width: 3px;
    stroke-linejoin: round;
}
.glyph__abbr--beside {
    /* the alongside code (thin/slight silhouettes): sized off the box so the lockup scales as one. */
    font-size: calc(var(--glyph-box) * 0.66);
    line-height: 1;
    letter-spacing: 0.01em;
    paint-order: stroke;
    -webkit-text-stroke: 0; /* the span halo is a text-shadow (paint-order is SVG-only) */
    text-shadow:
        0 0 2px var(--background),
        0 0 2px var(--background);
}

.glyph__svg--void {
    opacity: 0.55;
}
.glyph__void-ring {
    stroke: var(--muted-foreground);
    stroke-width: 2;
    stroke-dasharray: 4 3;
}

/* ── The three registers (the SAME data-* attributes GeoChoropleth carries — no forked CSS) ─────
   raised (hover) = full presence + a heavier presence stroke; dimmed (filter) = recessive + the
   hatch overlay (painted above); selected (pin) = the foreground FRAME. The hooks mirror the
   choropleth's `dimmed:opacity-70 raised:opacity-100 selected:[stroke-width]` exactly. */
.glyph[data-raised="true"] .glyph__path {
    stroke-width: 1.4;
    stroke: var(--foreground);
}
.glyph[data-dimmed="true"] {
    opacity: 0.7;
}
.glyph[data-selected="true"] .glyph__path {
    stroke-width: 2;
    stroke: var(--foreground);
}

@media (prefers-reduced-motion: reduce) {
    .glyph__path {
        transition: none;
    }
}
</style>
