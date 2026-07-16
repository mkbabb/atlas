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
import {
    isMultiSelect,
    type SelectionEmits,
} from "../contract/selection-contract.js";
import { DATA_PATTERN_TILE } from "./redundant-channel.js";
import ChartDataTable from "../legend/ChartDataTable.vue";
import {
    useChoroplethShapes,
    type ChoroplethProps,
    type Shape,
} from "./useChoroplethShapes.js";

const props = withDefaults(defineProps<ChoroplethProps>(), {
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
});

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
        </svg>

        <!-- Offscreen accessible data table (the chart fallback). The ONE table-aware primitive
             block-wraps the `<table>` so the `.sr-only` clamp lands on a host that respects it. -->
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
