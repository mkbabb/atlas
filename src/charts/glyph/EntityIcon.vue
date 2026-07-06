<script setup lang="ts">
// charts/glyph/EntityIcon.vue — @mkbabb/atlas · THE GENERALIZED ENTITY-ICON FACADE (O-A12).
//
// THE OWNER'S ASK (icon-facility, 2026-07-04 addendum): "the icons for each district, school, county,
// state, etc — these should all be svgs (districts, too) and be fully generalized." ONE component
// renders every grain's icon — the two-step `stateGlyph(fips) → <Glyph grain id geom fill>` collapses
// to one `<EntityIcon grain :id :size fill-policy>`. It resolves the grain (Class A/B/C) through
// `resolveEntityIcon` and DISPATCHES the render: a Class-A silhouette paints through the unchanged
// `<Glyph>`; the three abstract grains paint the DESIGNED primitives this facade owns — a hex
// `<polygon>` (Class B), a point-in-district composite (Class C school), a hub-and-spoke node (Class C
// consultant). NONE is a Lucide pictogram or a bare pin: the form encodes what the entity IS.
//
// THE fill-policy KNOB (icon-facility §2.3) decouples the identity mark from the data mark — `identity`
// (the default) is an OUTLINE (a "state as an icon" in a dropdown carries no datum), `data`/`accent`/
// `tier` carry a colour. So a bare `<EntityIcon grain :id>` renders a clean outline with NO `fill` and
// NO console error (the retired void-ring friction).
//
// NEVER-INCRIMINATE (dashboard-facing): the consultant hub seats a de-identified LETTER pseudonym only
// — never `building-2`, never a real firm name (the resolver coerces the token; this render draws it).
import { computed } from "vue";
import Glyph from "@/charts/glyph/Glyph.vue";
import {
    resolveEntityIcon,
    type EntityGrain,
    type FillPolicy,
    type EntityStroke,
    type ResolveEntityIconOptions,
} from "@/charts/glyph/resolveEntityIcon";
import {
    ICON_VIEWBOX,
    hexPolygonPoints,
    hubGeometry,
    type IconPoint,
} from "@/charts/glyph/iconPrimitives";
import type { GlyphSize, GlyphGeom } from "@/data/entityGeometry";

const {
    entityKey,
    grain,
    size = "md",
    fillPolicy = "identity",
    fill = undefined,
    accent = undefined,
    stroke = "presence",
    labelMode = "auto",
    raised = false,
    dimmed = false,
    selected = false,
    label = undefined,
    cellLabel = undefined,
    schoolPoint = undefined,
    districtOf = undefined,
    pseudonym = undefined,
} = defineProps<{
    /** The byte-identity key — FIPS / GEOID / LEA / H3 cell id / consultant pseudonym. */
    entityKey: string;
    /** The entity grain — `state`|`county`|`district`|`charter`|`school`|`hex`|`consultant`. */
    grain: EntityGrain;
    /** A named `GlyphSize` rung, or an arbitrary px box (routed to a detail tier). Default `md`. */
    size?: GlyphSize | number;
    /** How the identity mark decouples from the data mark. Default `identity` (an outline). */
    fillPolicy?: FillPolicy;
    /** The data colour — required only for `fill-policy='data'|'tier'` (else ignored). */
    fill?: string;
    /** The route accent hue — used for `fill-policy='accent'` + threaded to Glyph's glow. */
    accent?: string;
    /** The presence-stroke knob. `presence` hairline (default) / `shimmer` opt-in / `none`. */
    stroke?: EntityStroke;
    /** Where the Class-A abbreviation seats (pass-through to Glyph). */
    labelMode?: "auto" | "inside" | "beside" | "none";
    /** RAISE register (hover linked-highlight). */
    raised?: boolean;
    /** DIM register (filter non-match). */
    dimmed?: boolean;
    /** SELECT register (the pinned-mark frame). */
    selected?: boolean;
    /** A friendly label override (the accessible name + caption). */
    label?: string;
    /** A cell's place-name resolver (speedtest `cellPlace`). */
    cellLabel?: (id: string) => string | null | undefined;
    /** A school's interior-coordinate resolver (the O-A14 `school-points.json` supply). */
    schoolPoint?: (id: string) => IconPoint | null | undefined;
    /** A school→district crosswalk (SCI `schoolCode→leaNumber`). */
    districtOf?: (id: string) => string | null | undefined;
    /** A consultant's de-identified letter-pseudonym resolver. */
    pseudonym?: (id: string) => string | null | undefined;
}>();

// ── The resolved descriptor (ONE resolver governs both the component + the imperative paths) ──────
const resolverOpts = computed<ResolveEntityIconOptions>(() => ({
    size,
    label,
    cellLabel,
    schoolPoint,
    districtOf,
    pseudonym,
}));
const descriptor = computed(() => resolveEntityIcon(entityKey, grain, resolverOpts.value));

// ── The fill resolution (the policy → colour map) ────────────────────────────────────────────────
// `identity` is an OUTLINE (fill:none + presence hairline); `data`/`tier` carry the ramp colour;
// `accent` carries the route hue. This is the ONE place the policy resolves to a paint.
const isIdentity = computed(() => fillPolicy === "identity");
const regionFill = computed(() => {
    if (fillPolicy === "identity") return "none";
    if (fillPolicy === "accent") return accent ?? fill ?? "var(--primary)";
    return fill ?? "var(--foreground)"; // data | tier
});
// The hub node + the school dot are FILLED marks even under `identity` (a hollow node/dot reads as
// missing, not as an outline) — they seat a neutral `--foreground` under identity, the accent/tier
// colour otherwise.
const nodeFill = computed(() =>
    isIdentity.value ? "var(--foreground)" : (accent ?? fill ?? "var(--primary)"),
);
const dotFill = computed(() =>
    isIdentity.value ? "var(--foreground)" : (fill ?? accent ?? "var(--foreground)"),
);

// ── Sizing (a named rung rides the box token; a px number sets the box inline) ────────────────────
const sizeClass = computed<string | null>(() =>
    typeof size === "string" ? `entity-icon--${size}` : null,
);
const boxStyle = computed<Record<string, string> | null>(() =>
    typeof size === "number" ? { "--entity-box": `${size}px` } : null,
);

// The icon-scale degrade threshold (icon-facility §1 C1): a ≤18px school shows the seed-dot alone (its
// district outline is illegible at that box), a larger box shows the full point-in-district composite.
const isIconScale = computed(() =>
    typeof size === "number" ? size <= 18 : size === "sm",
);

// ── The abstract-primitive geometry (constants — hex + hub are pure math, computed once) ──────────
const HEX_POINTS = hexPolygonPoints();
const HUB = hubGeometry();

// The stroke hooks: `none` drops the presence hairline; `shimmer` keeps the hairline as its at-rest
// floor + flags the gold-outline sweep (glass WG-E·SHIMMER, rendered when that cut lands — graceful).
const strokeData = computed(() => (stroke === "shimmer" ? "shimmer" : undefined));
const showPresence = computed(() => stroke !== "none");

const accessibleName = computed(() => descriptor.value.label);

// Narrowing helpers for the template (the descriptor is a discriminated union).
const pointGeom = computed<GlyphGeom | null>(() =>
    descriptor.value.mark === "point" ? descriptor.value.geom : null,
);
const pointAnchor = computed<IconPoint | null>(() =>
    descriptor.value.mark === "point" ? descriptor.value.point : null,
);
// The seed-dot abbr (the school's district code) at icon-scale degrade.
const pointAbbr = computed(() =>
    descriptor.value.mark === "point" ? (descriptor.value.geom?.abbr ?? "") : "",
);
</script>

<template>
    <!-- Class A — the baked silhouette paints through the unchanged Glyph render primitive. Under
         `identity` policy the fill is `none` (an outline mark), so no data colour is required. -->
    <Glyph
        v-if="descriptor.mark === 'glyph'"
        :grain="descriptor.grain"
        :id="descriptor.id"
        :geom="descriptor.geom"
        :label="descriptor.label"
        :fill="regionFill"
        :size="size"
        :label-mode="labelMode"
        :raised="raised"
        :dimmed="dimmed"
        :selected="selected"
        :accent="accent"
        :data-entity-grain="grain"
        :data-stroke="strokeData"
    />

    <!-- Class B / C — the designed abstract primitives. A shared host span carries the box, the
         registers, and the accessible name; the inner SVG dispatches on the mark. -->
    <span
        v-else
        class="entity-icon"
        :class="[sizeClass]"
        :data-grain="grain"
        :data-mark="descriptor.mark"
        :data-stroke="strokeData"
        :data-raised="raised ? 'true' : undefined"
        :data-dimmed="dimmed ? 'true' : undefined"
        :data-selected="selected ? 'true' : undefined"
        role="img"
        :aria-label="accessibleName"
        :style="boxStyle"
    >
        <!-- Class B · hex — a regular flat-top hexagon polygon, tier-fillable in the data channel
             exactly as a county polygon; a hairline presence stroke (PRESENCE ≠ ENCODING). -->
        <svg
            v-if="descriptor.mark === 'hex'"
            class="entity-icon__svg"
            :viewBox="ICON_VIEWBOX"
            aria-hidden="true"
            focusable="false"
        >
            <polygon
                class="entity-icon__mark entity-icon__hex"
                :points="HEX_POINTS"
                :fill="regionFill"
                :stroke="showPresence ? 'var(--foreground)' : 'none'"
            />
        </svg>

        <!-- Class C · school — the point-in-district composite: the district silhouette drawn as a
             faint context outline (fill:none, 20% opacity) + a filled tier-coloured point-dot at the
             school's interior coordinate. Degrades at icon-scale (≤18px) / when the district did not
             resolve to a bare seed-dot + the district abbr — never a floating pin. -->
        <svg
            v-else-if="descriptor.mark === 'point'"
            class="entity-icon__svg"
            :viewBox="pointGeom && !isIconScale ? pointGeom.viewBox : ICON_VIEWBOX"
            aria-hidden="true"
            focusable="false"
        >
            <template v-if="pointGeom && !isIconScale">
                <!-- the district context outline (20% opacity, hairline, fill:none) -->
                <path
                    class="entity-icon__district-context"
                    :d="pointGeom.d"
                    fill="none"
                    :stroke="showPresence ? 'var(--foreground)' : 'none'"
                />
                <!-- the school point-dot at its interior coordinate (the data/tier channel) -->
                <circle
                    v-if="pointAnchor"
                    class="entity-icon__mark entity-icon__dot"
                    :cx="pointAnchor.x"
                    :cy="pointAnchor.y"
                    r="6"
                    :fill="dotFill"
                    :stroke="showPresence ? 'var(--background)' : 'none'"
                />
            </template>
            <template v-else>
                <!-- the seed-dot degrade: the point IS the school's identity at icon scale -->
                <circle
                    class="entity-icon__mark entity-icon__dot entity-icon__dot--seed"
                    cx="50"
                    cy="50"
                    r="26"
                    :fill="dotFill"
                    :stroke="showPresence ? 'var(--background)' : 'none'"
                />
                <text
                    v-if="pointAbbr"
                    class="entity-icon__seed-abbr"
                    x="50"
                    y="50"
                    text-anchor="middle"
                    dominant-baseline="central"
                >
                    {{ pointAbbr }}
                </text>
            </template>
        </svg>

        <!-- Class C · consultant — the hub node + radiating stubs + the de-identified letter pseudonym
             inside the node (the visual sibling of the Ch V radial hub). NEVER `building-2`, never a
             real-firm affordance: the node seats a LETTER only. -->
        <svg
            v-else-if="descriptor.mark === 'hub'"
            class="entity-icon__svg"
            :viewBox="ICON_VIEWBOX"
            aria-hidden="true"
            focusable="false"
        >
            <line
                v-for="(s, i) in HUB.spokes"
                :key="i"
                class="entity-icon__mark entity-icon__spoke"
                :x1="s.x1"
                :y1="s.y1"
                :x2="s.x2"
                :y2="s.y2"
                :stroke="showPresence ? 'var(--foreground)' : 'var(--muted-foreground)'"
            />
            <circle
                class="entity-icon__hub-node"
                :cx="HUB.node.cx"
                :cy="HUB.node.cy"
                :r="HUB.node.r"
                :fill="nodeFill"
                :stroke="showPresence ? 'var(--background)' : 'none'"
            />
            <text
                class="entity-icon__pseudonym"
                :x="HUB.node.cx"
                :y="HUB.node.cy"
                text-anchor="middle"
                dominant-baseline="central"
            >
                {{ descriptor.mark === "hub" ? descriptor.pseudonym : "" }}
            </text>
        </svg>

        <!-- The NEG floor — an unknown grain / an unresolved Class-A silhouette: a DESIGNED neutral
             rounded-square outline + abbr. Never a crash, never a Lucide pin, never the void-ring. -->
        <svg
            v-else
            class="entity-icon__svg entity-icon__svg--unknown"
            :viewBox="ICON_VIEWBOX"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                class="entity-icon__mark entity-icon__unknown"
                x="10"
                y="10"
                width="80"
                height="80"
                rx="14"
                fill="none"
                :stroke="showPresence ? 'var(--muted-foreground)' : 'none'"
            />
        </svg>
    </span>
</template>

<style scoped>
/* ── The host + the size rungs (mirroring Glyph's box tokens so the family scales together) ──────
   `--entity-box` is a fraction of the audacious figure register, raised in ONE place per rung — the
   SAME formula Glyph.vue uses, so an EntityIcon abstract mark seats interchangeably beside a Glyph
   silhouette at the same rung. A numeric `size` sets `--entity-box` inline. */
.entity-icon {
    --entity-box: calc(var(--type-display-audacious) * 0.18);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    vertical-align: middle;
}
.entity-icon--sm {
    --entity-box: calc(var(--type-display-audacious) * 0.11);
}
.entity-icon--md {
    --entity-box: calc(var(--type-display-audacious) * 0.18);
}
.entity-icon--lg {
    --entity-box: calc(var(--type-display-audacious) * 0.26);
}
.entity-icon--hero {
    --entity-box: clamp(5rem, 14vw, 7.5rem);
}

.entity-icon__svg {
    display: block;
    width: var(--entity-box);
    height: var(--entity-box);
    overflow: visible;
}

/* ── The presence stroke (PRESENCE ≠ ENCODING — the hairline is identity, the fill is data) ──────
   A mark exists whether or not it carries a datum, so the presence stroke is NEVER the fill. The
   registers bump the stroke exactly as Glyph's do (no forked register CSS). */
.entity-icon__mark {
    stroke-width: 1.5;
    stroke-linejoin: round;
    paint-order: stroke;
    transition:
        opacity 200ms ease,
        stroke-width 160ms ease;
}
.entity-icon__hex {
    stroke-width: 1.6;
}
.entity-icon__spoke {
    stroke-width: 2.6;
    stroke-linecap: round;
}
.entity-icon__district-context {
    stroke-width: 0.9;
    opacity: 0.2; /* the faint context outline — geographic where real, the school's PLACE not identity */
}
.entity-icon__dot {
    stroke-width: 1.4;
}

/* ── The hub node + the pseudonym / seed abbr (INK = chrome, never the data colour) ──────────────
   The pseudonym seats a LETTER inside the node — the never-incriminate mark. A paper halo so it
   survives over the node fill; mono chrome ink (the ramp-ink law). */
.entity-icon__hub-node {
    stroke-width: 1.4;
}
.entity-icon__pseudonym,
.entity-icon__seed-abbr {
    font-family: var(--font-mono);
    font-weight: 600;
    font-size: 22px;
    fill: var(--background);
    paint-order: stroke;
    stroke: none;
}
.entity-icon__seed-abbr {
    font-size: 26px;
}

/* ── The three registers (the SAME data-* attrs Glyph carries — no forked CSS) ───────────────────
   raised (hover) = heavier presence; dimmed (filter) = recessive; selected (pin) = the frame. */
.entity-icon[data-raised="true"] .entity-icon__mark {
    stroke-width: 2.6;
}
.entity-icon[data-raised="true"] .entity-icon__spoke {
    stroke-width: 3.4;
}
.entity-icon[data-dimmed="true"] {
    opacity: 0.7;
}
.entity-icon[data-selected="true"] .entity-icon__mark {
    stroke-width: 3;
}

/* ── The shimmer opt-in (glass WG-E·SHIMMER 4.4.0-line) — presence hairline is the at-rest floor ──
   `stroke="shimmer"` flags the gold-outline sweep; until that glass cut lands the mark renders the
   plain presence hairline (graceful, no fence). The class name is the glass utility the cut supplies. */
.entity-icon[data-stroke="shimmer"] .entity-icon__mark {
    /* the gold-outline sweep is glass-rendered when the 4.4.0-line utility lands; at-rest = presence */
    stroke: var(--foreground);
}

@media (prefers-reduced-motion: reduce) {
    .entity-icon__mark {
        transition: none;
    }
}
</style>
