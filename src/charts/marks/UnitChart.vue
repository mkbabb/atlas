<script setup lang="ts">
// UnitChart.vue — U/B8 A3, THE UNIT MARK: one canvas mark per record (a school, a visit, a filing),
// morphing between arrangements the consumer hands it as data (`unit-layouts.ts`). The marks never
// cross-fade: each one flies from where it is to its slot in the next layout, staggered by that
// layout's rank, and a change mid-flight leaves from the current positions (`unit-engine.ts`).
//
// The component owns the Vue edges only: the host width (emitted, so the consumer rebuilds its
// layouts at the new size and the chart lands on them without a morph), the palette (CSS custom
// properties resolved through `readVar`, re-read on the post-settle theme epoch), the device pixel
// ratio (a display move or a zoom resizes the backing store), reduced motion (every change snaps,
// and turning it on lands a flight), and the pointer and keyboard (hit test or the rank walk →
// `hover`/`select`, and the hovered mark's group stays lit while the rest dim). The canvas is
// `role="img"`; `summary` is its accessible text, and `unitSummary` writes one from a layout. A mark
// the keyboard walks to is announced through a polite live line (`markLabel`); a pointer hover is
// never announced (the pointer user sees the mark, and a sweep across the cloth would read a stream).
// A figure's table twin carries the same counts.
//
// The chart draws only a frame it can see: while the host measures 0 px wide (a first mount before
// layout, a hidden tab) or no layout is given yet (`null`: the consumer builds one on the first
// `resize`, since every layout builder refuses a frame under `MIN_UNIT_PITCH` with a RangeError), it
// holds its draw, and the layout it holds lands once the host has a width.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useDevicePixelRatio, useElementSize } from "@vueuse/core";
import { useReducedMotion } from "../../motion/useReducedMotion.js";
import { useThemeReactiveOption } from "../composables/useThemeReactiveOption.js";
import { readVar } from "../scale/colorRamp.js";
import { UnitCanvas, type UnitMorphOptions, type UnitSpriteFactory } from "./unit-engine.js";
import { unitStep, type UnitLayout } from "./unit-layouts.js";

const props = withDefaults(
    defineProps<{
        /**
         * The arrangement to show. A new layout of the same count morphs; another count remounts the
         * marks. `null` until the consumer has a frame to build one at (the first `resize`).
         */
        layout: UnitLayout | null;
        /** The palette: CSS custom property names (`--viz-category-1`) or literal colors. */
        colors: readonly string[];
        /** Each mark's palette entry. Defaults to the layout's group. */
        colorOf?: ArrayLike<number>;
        /** The accessible text for the whole figure (see `unitSummary`). */
        summary: string;
        /** A group to keep lit while the rest dim, from outside the chart (a legend hover). */
        focusGroup?: number | null;
        /** The live text for a hovered or keyboard-focused mark. Defaults to its place in the rank. */
        markLabel?: (index: number) => string;
        /** Dim every other group while a mark is hovered. */
        dimOnHover?: boolean;
        /** Draws each mark from an image in place of a flat fill. */
        sprite?: UnitSpriteFactory;
        motion?: UnitMorphOptions;
    }>(),
    {
        colorOf: undefined,
        markLabel: undefined,
        focusGroup: null,
        dimOnHover: true,
        sprite: undefined,
        motion: undefined,
    },
);

const emit = defineEmits<{
    /** The mark under the pointer, or -1 when it leaves the marks. */
    hover: [index: number];
    select: [index: number];
    /** The host's width, CSS px: rebuild the layouts at this size. */
    resize: [width: number];
}>();

const host = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const engine = shallowRef<UnitCanvas>();
/** The layout on the canvas: the last one drawn, held while the host has no width. */
const shown = shallowRef<UnitLayout | null>(null);
const hovered = ref(-1);
/** The mark the keyboard last walked to, for the live line; -1 once the pointer takes over. */
const walked = ref(-1);
const reduced = useReducedMotion();
const { width: hostWidth } = useElementSize(host);
const { pixelRatio } = useDevicePixelRatio();

const resolve = (c: string) => (c.startsWith("--") ? readVar(c, readVar("--foreground", "#000")) : c);
const palette = useThemeReactiveOption(() => props.colors.map(resolve));

function mount(layout: UnitLayout) {
    engine.value?.destroy();
    const u = new UnitCanvas(canvas.value!, layout.count, {
        morph: props.motion,
        sprite: props.sprite,
        reduced: reduced.value,
    });
    u.setSize(layout.width, layout.height, pixelRatio.value);
    u.setPalette(palette.value, props.colorOf ?? layout.group);
    u.snap(layout);
    u.focus(lit.value);
    engine.value = u;
}

/** The layout to draw now: none while there is no layout or the host measures 0 px wide. */
const drawable = computed(() => (props.layout && hostWidth.value > 0 ? props.layout : null));

function draw(next: UnitLayout | null) {
    const prev = shown.value;
    if (!next || next === prev) return;
    shown.value = next;
    const u = engine.value;
    if (!u || !prev || next.count !== u.count) return mount(next);
    // A new frame size is a rebuilt layout: land on it. A new arrangement morphs.
    const resized = next.width !== prev.width || next.height !== prev.height;
    u.setSize(next.width, next.height, pixelRatio.value);
    if (resized) u.snap(next);
    else u.show(next);
    if (!props.colorOf) u.setPalette(palette.value, next.group);
}

onMounted(() => draw(drawable.value));
onBeforeUnmount(() => engine.value?.destroy());

watch(drawable, draw);
watch([palette, () => props.colorOf], ([colors]) => {
    if (shown.value) engine.value?.setPalette(colors, props.colorOf ?? shown.value.group);
});
watch(pixelRatio, (dpr) => {
    if (shown.value) engine.value?.setSize(shown.value.width, shown.value.height, dpr);
});
watch(reduced, (r) => {
    if (engine.value) engine.value.reduced = r;
});
watch(hostWidth, (w) => {
    if (w > 0) emit("resize", Math.round(w));
});

const lit = computed(() => {
    if (props.focusGroup !== null) return props.focusGroup;
    if (!props.dimOnHover || hovered.value < 0) return null;
    return shown.value?.group[hovered.value] ?? null;
});
watch(lit, (g) => engine.value?.focus(g));

function at(e: MouseEvent) {
    const r = canvas.value!.getBoundingClientRect();
    return engine.value?.hit(e.clientX - r.left, e.clientY - r.top) ?? -1;
}
function hover(i: number, byKey = false) {
    walked.value = byKey ? i : -1;
    if (i === hovered.value) return;
    hovered.value = i;
    emit("hover", i);
}
const onMove = (e: PointerEvent) => hover(at(e));
const onLeave = () => hover(-1);
function onClick(e: MouseEvent) {
    const i = at(e);
    if (i >= 0) emit("select", i);
}
function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") return hover(-1, true);
    if ((e.key === "Enter" || e.key === " ") && hovered.value >= 0) {
        e.preventDefault();
        return emit("select", hovered.value);
    }
    if (!shown.value) return;
    const i = unitStep(shown.value, hovered.value, e.key);
    if (i === hovered.value) return;
    e.preventDefault();
    hover(i, true);
}

const announce = computed(() => {
    const i = walked.value;
    const l = shown.value;
    if (!l || i < 0 || i >= l.count) return "";
    return props.markLabel?.(i) ?? `${l.rank[i] + 1} of ${l.count}`;
});
</script>

<template>
    <div ref="host" class="w-full" data-testid="unit-chart">
        <canvas
            ref="canvas"
            class="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-color)"
            role="img"
            tabindex="0"
            :aria-label="summary"
            :style="{ width: `${shown?.width ?? 0}px`, height: `${shown?.height ?? 0}px` }"
            @pointermove="onMove"
            @pointerleave="onLeave"
            @click="onClick"
            @keydown="onKey"
            @blur="onLeave"
        />
        <p class="sr-only" aria-live="polite">{{ announce }}</p>
    </div>
</template>
