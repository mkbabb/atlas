<script setup lang="ts">
// GeoChoropleth.vue — the THIN, geometry-agnostic choropleth (the projection + paths primitive). It
// owns ONLY the SVG: project the topology, draw a path per feature, fill each by the caller's
// `fill(key)` function, emit `hover(key)` / `select({key,multi})`. It imports NO geometry and NO data
// — the `topology` is a PROP, so the same component serves USF net-retention, ECF import-gradient,
// and any other pre-projected atlas.
//
// THE DERIVATION IS LIFTED (the useXOption mirror): the projected shapes, the DEV coherence backstop,
// the O-A22 redundant channel (tier textures vs value-label), the X10-LIB per-region label gate, and
// the deterministic label-collision declutter all live in `useChoroplethShapes`. This SFC keeps only
// its INTERACTION seams (the pointer/touch select producer, the hover linked-highlight) and the
// template — the props contract + the derivation read ONE source (`useChoroplethShapes`), no drift.
//
// The dim/raise/frame styling rides the `@custom-variant raised:/dimmed:/selected:` hooks (data-*
// attributes) — no inline `:class="{ 'opacity-30' }"` object. `dimmed` keys carry a hatch overlay so
// the de-emphasis is never colour-only.
import { computed, ref } from "vue";
import { useElementSize } from "@vueuse/core";
import {
    isMultiSelect,
    type SelectionEmits,
} from "../contract/selection-contract.js";
import { DATA_PATTERN_TILE } from "./redundant-channel.js";
import ChartDataTable from "../legend/ChartDataTable.vue";
import {
    useChoroplethShapes,
    cellFloorScale,
    type ChoroplethProps,
    type Shape,
} from "./useChoroplethShapes.js";

const props = withDefaults(
    defineProps<
        ChoroplethProps & {
            /**
             * CD-09 (PA-9) — the DECLARED source-grid capability. When the hosting plate wires a
             * reachable, windowed `role="grid"` data affordance (the SourceDataBrowser class), the
             * caller passes that grid REGION id here. Its presence SUPPRESSES the always-mounted
             * passive off-screen table below — the grid is now the per-datum read, so the O(rows)
             * `<table>` is redundant DOM. Omit (the default) and the passive table stays — the
             * small/no-grid plate's a11y path.
             */
            sourceGridId?: string;
            /**
             * CD-09 (PA-9 · CHALLENGE-3 A1) — whether that grid region is OPEN in the DOM right now.
             * The host raises it true ONLY while the `sourceGridId` region is mounted; the figure then
             * binds `aria-details` to `sourceGridId`, associating the picture with its full data
             * (SC 1.1.1). Gated so the IDREF never points at an unmounted region at rest (the passive
             * table stays suppressed by the capability above regardless — no resurrection).
             */
            sourceGridOpen?: boolean;
        }
    >(),
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
        symbolR: undefined,
        placeLabel: undefined,
        ariaLabel: "Geographic choropleth",
        sourceGridId: undefined,
        sourceGridOpen: false,
    },
);

const emit = defineEmits<SelectionEmits>();

// THE LIFTED DERIVATION — the projected shapes, the O-A22 channel, the label gate + collision
// declutter, and the GAP-5 label mount, all read reactively off `props`.
const {
    WIDTH,
    HEIGHT,
    shapes,
    drawOn,
    patternDefs,
    fillFor,
    labelsMounted,
    labelsRedundant,
    labelGateFails,
} = useChoroplethShapes(props);

// A-04 · THE AGGREGATED-CELL TAP FLOOR — the field's own rendered measure (the `viewBox` scales the
// user-space geometry to this box, so `width / WIDTH` is the px-per-unit the floor is judged in).
// The clamp arms ONLY for an under-floor congruent CELL field (`cellFloorScale`); every
// administrative geography reads 1 and is never touched.
const field = ref<SVGSVGElement | null>(null);
const { width: fieldWidth } = useElementSize(field);
const cellFloor = computed<number>(() =>
    cellFloorScale(shapes.value, fieldWidth.value / WIDTH.value),
);

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
// A `@click` does NOT reliably fire on a touch tap of an SVG `<path>` (the synthetic click dies
// before it reaches the producer), so the touch/pen select rides a DELEGATED `@pointerup` on the
// `<svg>` root: it hit-tests the bubbled `data-key` and emits `select`. The synthetic FOLLOW-ON click
// a touch may still emit is de-duped by a DELTA guard — `lastTouchSelect` stamps the pointerup's
// `timeStamp`, and `onSelect` early-returns when it fires within 700ms AFTER that stamp.
// `lastTouchSelect` starts at −Infinity so the first FINE click is never swallowed.
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

/** The producer (S1): a click pins the key, the modifier read at the DOM edge. A synthetic touch
    follow-on click (within 700ms of the real touch-select) is swallowed so a tap selects once. */
function onSelect(s: Shape, ev: MouseEvent) {
    if (ev.timeStamp - lastTouchSelect.value < 700) return;
    emit("select", { key: s.key, multi: isMultiSelect(ev) });
}

// D-02 — THE GRADUATED-SYMBOL MAGNITUDE RINGS: one centre-anchored ring per feature whose
// `symbolR` returns a positive radius, seated at the same centroid the value label uses. The
// caller owns the √-area scaling; this only projects the placements (null/0 ⇒ no ring).
const magnitudeRings = computed(() => {
    const fn = props.symbolR;
    if (!fn) return [];
    return shapes.value.flatMap((s) => {
        const r = fn(s.key);
        return r != null && r > 0 ? [{ key: s.key, cx: s.cx, cy: s.cy, r }] : [];
    });
});

// A-28 (dial 5 — bold state letters AUGMENT, never replace) · THE PLACE-LABEL LETTERS: one bold
// place word per feature whose `placeLabel` returns a non-empty string, seated at the SAME centroid
// the value label uses. It AUGMENTS the value-label channel below (never replaces it); omit the
// prop ⇒ no layer, byte-identical render.
const placeLabels = computed(() => {
    const fn = props.placeLabel;
    if (!fn) return [];
    return shapes.value.flatMap((s) => {
        const text = fn(s.key);
        return text ? [{ key: s.key, cx: s.cx, cy: s.cy, text }] : [];
    });
});

// The PHONE counter-scale: the viewBox scales the letters with the geometry, so a narrow render
// shrinks the 11px word below legibility (~4px at 390). When the field renders UNDER user scale
// (`fieldWidth / WIDTH < 1`) the letters counter-scale toward their CSS size, CAPPED at 2× so the
// ratified desktop geometry is the identity and centroid crowding stays bounded. Desktop renders
// (scale ≥ 1) bind no style — the resting render is unchanged.
const placeLetterScale = computed<number>(() => {
    const s = fieldWidth.value / WIDTH.value;
    return s > 0 && s < 1 ? Math.min(1 / s, 2) : 1;
});

const hasTable = computed(() => props.valueFormat != null);
const tableRows = computed(() =>
    shapes.value.map((s) => ({
        key: s.key,
        name: s.name,
        value: props.valueFormat ? props.valueFormat(s.key) : "",
    })),
);
</script>

<template>
    <div class="relative w-full">
        <svg
            ref="field"
            :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
            class="h-auto w-full"
            :style="cellFloor > 1 ? { '--cell-floor': cellFloor } : undefined"
            role="img"
            :aria-label="ariaLabel"
            :aria-details="sourceGridOpen ? sourceGridId || undefined : undefined"
            data-testid="geo-choropleth-svg"
            @pointerup="onFieldPointerUp"
        >
            <defs>
                <!-- The dim hatch: filtered-out shapes carry it so the de-emphasis is never signalled
                     by colour/opacity alone. The 0.1 wash keeps the receded fill present (not washed
                     to paper) while the deepened hatch lines read as a DELIBERATELY HATCHED region;
                     paired with the lifted dim-opacity floor, the dimmed state clears the filter-
                     perceptibility floor while staying clearly recessive vs the raised match. -->
                <pattern
                    id="geo-dim-hatch"
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
                <!-- O-A22 · THE TIER TEXTURES (the sighted-colorblind data channel). One `<pattern>`
                     per distinct DATA tier: its background rect IS the tier colour, a hue-independent
                     ink drawn over it — so a colour-blind reader tells the tiers apart by TEXTURE, and
                     tier k's texture literally carries tier k's colour. The set is DISJOINT from the
                     45° absence hatch above. -->
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
                    <!-- Pointer affordance only; the screen-reader path is the offscreen table (a
                         50-shape tab order would be hostile and interactive roles inside role="img"
                         violate WCAG 4.1.2). -->
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
                        :class="{
                            'geo-shape--draw': drawOn,
                            'geo-shape--cell-floor': cellFloor > 1,
                        }"
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
                        :class="{ 'geo-shape--cell-floor': cellFloor > 1 }"
                        aria-hidden="true"
                    />
                </template>
            </g>
            <!-- D-02 · THE MAGNITUDE RINGS (the graduated-symbol channel) — ring AREA carries the
                 caller's second quantity over the hue-borne first; hairline foreground ink,
                 pointer-transparent, above the fills and below the value labels. -->
            <g
                v-if="magnitudeRings.length"
                class="geo-magnitude-rings"
                aria-hidden="true"
                data-testid="geo-magnitude-rings"
            >
                <circle
                    v-for="ring in magnitudeRings"
                    :key="`ring-${ring.key}`"
                    :cx="ring.cx"
                    :cy="ring.cy"
                    :r="ring.r"
                    class="geo-magnitude-ring"
                />
            </g>
            <!-- GAP-5 · THE FORCED-COLORS TEXT CHANNEL (I9.c). A per-feature value WORD seated at each
                 shape's centroid: the magnitude as text, so a `forced-colors: active` / colour-blind
                 reader keeps the meaning the colour ramp carries even when the OS palette flattens
                 every fill. Near-invisible at rest; the `forced-colors` rule makes it legible exactly
                 when the colour fails. Mounted only when a word source exists AND (forced-colors is
                 live OR the redundant channel resolved to value-label). -->
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
            <!-- A-28 (dial 5 — bold state letters AUGMENT, never replace) · THE PLACE-LABEL LETTERS.
                 Bold PLACE words seated at each declaring feature's centroid, drawn ON TOP of the
                 value-label channel above so the letters AUGMENT the map (they never replace its
                 labels). Pointer-transparent; mounted only when a route wires `placeLabel` — omit ⇒
                 no layer, the resting map is unchanged for every route that does not declare it. -->
            <g
                v-if="placeLabels.length"
                class="geo-place-labels"
                :style="placeLetterScale > 1 ? { '--geo-place-letter-scale': placeLetterScale } : undefined"
                aria-hidden="true"
                data-testid="geo-place-labels"
            >
                <text
                    v-for="p in placeLabels"
                    :key="`place-${p.key}`"
                    :x="p.cx"
                    :y="p.cy"
                    class="geo-place-label"
                    text-anchor="middle"
                    dominant-baseline="central"
                >
                    {{ p.text }}
                </text>
            </g>
        </svg>

        <!-- Offscreen accessible data table (the chart fallback). The ONE table-aware primitive
             block-wraps the `<table>` so the `.sr-only` clamp lands on a host that respects it.
             CD-09 (PA-9): SUPPRESSED when the plate declares a `sourceGridId` — the reachable windowed
             grid is the per-datum read then, and the `aria-details` above associates it, so the passive
             O(rows) table is redundant DOM. The passive table stays for every small / no-grid plate. -->
        <ChartDataTable
            v-if="hasTable && !sourceGridId"
            :rows="tableRows"
            :caption="ariaLabel"
            row-header="Area"
            value-header="Value"
        />
    </div>
</template>

<style scoped src="./GeoChoropleth.css"></style>
