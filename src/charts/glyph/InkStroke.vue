<script setup lang="ts">
// charts/glyph/InkStroke.vue — the hand pen over a mark that has NO WORD: a divider rule, an
// ornament ring, a callout leader.
//
// glass-ui 9.0.0 re-cut `<HandMark>` into one pen that marks SLOTTED TEXT (it measures the word's
// line rects and draws nothing without them), and retired the brush continuum, `shape="path"`, and
// the free-standing rule. Its barrel ships the pen itself — `handLine` · `handRing` ·
// `strokeRibbon` — for exactly this case ("a caller who owns its own path inks it with the same
// pen"). So this component authors NO stroke: it measures its own box, asks glass for the hand's
// centreline (or takes the caller's polyline), fits it to the box, and inks it with glass's ribbon.
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { handLine, handRing, strokeRibbon, type Point } from "@mkbabb/glass-ui/handmark";

const props = withDefaults(
    defineProps<{
        /** `line` — a hand-drawn rule across the box; `ring` — the hand's ring inside the box;
            `path` — the caller's polyline (`points`, normalized 0..1 on each axis of the box). */
        kind: "line" | "ring" | "path";
        points?: readonly Point[];
        /** The ink (any CSS colour). */
        color?: string;
        /** The nib as a dimensionless multiple (glass's `weight`: 1 is the pen). */
        weight?: number;
        /** The hand's seed — same seed ⇒ the same stroke on every reload. */
        seed?: number;
        /** `scroll` draws the ink on under a `view()` timeline (bidirectional); `static` rests drawn. */
        clock?: "static" | "scroll";
    }>(),
    { points: undefined, color: "currentColor", weight: 1, seed: 1, clock: "static" },
);

const root = ref<SVGSVGElement | null>(null);
const box = ref({ width: 0, height: 0, fs: 16 });
let ro: ResizeObserver | null = null;

function measure(): void {
    const el = root.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    box.value = {
        width: r.width,
        height: r.height,
        fs: parseFloat(getComputedStyle(el).fontSize) || 16,
    };
}
onMounted(() => {
    measure();
    if (typeof ResizeObserver !== "undefined" && root.value) {
        ro = new ResizeObserver(() => measure());
        ro.observe(root.value);
    }
});
onBeforeUnmount(() => ro?.disconnect());

/** Densify a polyline so the ribbon's taper profile has interior samples on a straight run. */
function densify(points: Point[], step = 4): Point[] {
    const out: Point[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
        for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    if (points.length) out.push(points[points.length - 1]);
    return out;
}

/** Fit the hand's centreline into the box: span the width, centre vertically. A rule keeps its
    natural wobble amplitude (never stretched taller); a ring fills the box on both axes. */
function fit(points: Point[], width: number, height: number, pad: number, fill: boolean): Point[] {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const bw = Math.max(Math.max(...xs) - x0, 1e-6);
    const bh = Math.max(Math.max(...ys) - y0, 1e-6);
    const sx = Math.max(width - 2 * pad, 0) / bw;
    const room = Math.max(height - 2 * pad, 0) / bh;
    const sy = fill ? room : Math.min(1, room);
    const oy = (height - bh * sy) / 2;
    return points.map((p) => ({ x: pad + (p.x - x0) * sx, y: oy + (p.y - y0) * sy }));
}

const d = computed(() => {
    const { width, height, fs } = box.value;
    if (width <= 0 || height <= 0) return "";
    // glass's L1 nib law (`nib(weight, fs) = weight · 0.2 · fs^0.75`), so a rule inks at the
    // same nib the text marks beside it do.
    const nib = props.weight * 0.2 * Math.pow(fs, 0.75);
    const frame = { x: 0, y: 0, width, height: fs * 1.25 };
    if (props.kind === "path") {
        const pts = (props.points ?? []).map((p) => ({ x: p.x * width, y: p.y * height }));
        return pts.length >= 2 ? strokeRibbon(densify(pts), nib) : "";
    }
    const line =
        props.kind === "ring"
            ? handRing(frame, { fs, seed: props.seed })
            : handLine(frame, { fs, seed: props.seed, kind: "strike" });
    return strokeRibbon(fit(line, width, height, nib / 2, props.kind === "ring"), nib);
});
</script>

<template>
    <svg
        ref="root"
        class="ink-stroke"
        :data-clock="clock"
        aria-hidden="true"
        focusable="false"
    >
        <path v-if="d" :d="d" :fill="color" />
    </svg>
</template>

<style scoped>
.ink-stroke {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;
    pointer-events: none;
}
/* The scroll draw — the atlas `crayon-wipe` clip (map-draw.css) on the mark's own `view()`
   timeline, bidirectional; the host tunes the window with `--ink-scrub-range`. Under PRM or a
   non-supporting engine the wipe never attaches and the ink rests drawn. */
@media (prefers-reduced-motion: no-preference) {
    @supports ((animation-timeline: view()) and (animation-range: entry)) {
        .ink-stroke[data-clock="scroll"] {
            animation: crayon-wipe auto linear both;
            animation-timeline: view(block);
            animation-range: var(--ink-scrub-range, entry 0% entry 26%);
        }
    }
}
</style>
