<script setup lang="ts">
// platform/story/StoryCorridor.vue — THE BETWEEN-BEAT DOM-CLONE OVERLAY (SVG/DOM path · N.WB1 §3.3).
//
// The document-space clone overlay the director drives across a shared-element edge (measurement-
// vindicated by P2-A; NOT View Transitions, NOT flipShared-at-scale). At 0<t<1 the participating marks
// hide and their CLONES interpolate rect + rx + OKLab-fill between the two stages' geometries (object
// constancy); at the poles the overlay releases and the stages own their marks. This is the SVG/DOM
// (DOM-clone) renderer — the DENSE canvas morph is N.WP-sci's (the `markCapacity:"canvas"` branch is
// declared here + deferred to it, chart-type-blind).
//
// THE CACHE DISCIPLINE (LAW · §3.4): `markRects()` is snapshotted ONCE per edge activation (into
// CONTAINER-RELATIVE coordinates, so the scroll offset cancels — the marks + the overlay scroll
// together in the essay's flow, so the cached relative positions are scroll-INVARIANT; no second
// scroll reader, D1.1 held). Per-frame work = `resolveCloneFrame(cached endpoints)` + a compositor
// transform ONLY — NEVER a re-measure. Re-cache only on host resize.

import {
    computed,
    ref,
    shallowRef,
    watch,
    watchEffect,
    onBeforeUnmount,
    type CSSProperties,
} from "vue";
import { useResizeObserver } from "@vueuse/core";
import { lerp } from "@mkbabb/value.js";
import {
    pickMarkCapacity,
    resolveCloneFrame,
    sharedFlightKeys,
    validateFlightEndpoints,
    lerpRect,
    lerpRx,
    oklabFillLerp,
    type FlightRect,
    type FlightEndpoint,
    type Rgb255,
} from "@/story/clone-overlay";
import type { StoryDirectorContext } from "@/story/useStoryDirector";
import type {
    MarkStageHandle,
    StoryChapter,
} from "@/story/story-contract";

const props = defineProps<{
    director: StoryDirectorContext;
    chapters: StoryChapter[];
}>();

/** The overlay container — `position:absolute; inset:0` inside the staged essay wrapper. Its own
    bounding rect is the origin the cached mark rects are made RELATIVE to (the scroll-cancel origin). */
const root = ref<HTMLElement | null>(null);

/** The DENSE-tier draw surface (N.WP-sci · the sci-equity canvas morph). A single canvas carries the
    full mark set when `pickMarkCapacity` picks `"canvas"` (> the DOM-clone ceiling — the 3243-mark
    all-year overlay); the per-frame work is `lerp(cached endpoints) + one canvas draw` ONLY (P2-A:
    2.0ms/frame, 0 janky at 6×). Idle (cleared) at the DOM tier / off a shared-element edge. */
const canvasEl = ref<HTMLCanvasElement | null>(null);

/** A throwaway 2D probe that NORMALISES any CSS fill (hex, rgb(), oklch, named) to concrete rgb255
    ONCE per beat — the canvas 2D `fillStyle` cannot read a CSS var and the mark fills arrive as
    resolved strings, so the endpoint colours are pre-parsed at cache time and the per-frame draw only
    OKLab-lerps the two rgb triples (`oklabFillLerp`), never re-parses. */
const colorProbe: CanvasRenderingContext2D | null =
    typeof document !== "undefined"
        ? document.createElement("canvas").getContext("2d")
        : null;
function toRgb255(css: string): Rgb255 {
    if (!colorProbe) return [0, 0, 0];
    colorProbe.fillStyle = "#000";
    colorProbe.fillStyle = css; // an invalid value leaves the prior #000 (a safe floor)
    const s = colorProbe.fillStyle as string; // normalised to #rrggbb or rgba(r, g, b, a)
    if (s.startsWith("#")) {
        const n = parseInt(s.slice(1), 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
        const [r, g, b] = m[1].split(",").map((v) => parseFloat(v));
        return [r | 0, g | 0, b | 0];
    }
    return [0, 0, 0];
}

/** The declared shared-element edges' arriving chapter ids (the only edges the overlay flies). */
const sharedEdgeIds = props.chapters
    .filter((c) => c.transition?.kind === "shared-element")
    .map((c) => c.id);

/** The arriving-edge states, resolved ONCE (static per route). */
const edgeStates = sharedEdgeIds
    .map((id) => ({ id, state: props.director.edgeFor(id) }))
    .filter((e): e is { id: string; state: NonNullable<typeof e.state> } => e.state !== null);

/** The edge whose corridor is live (0<t<1), or null (settled / PRM). */
const activeEdge = computed(
    () => edgeStates.find((e) => e.state.active.value) ?? null,
);

/** A canvas-tier endpoint — the pre-parsed geometry + rgb255 inks the per-frame draw lerps (no
    re-parse, no re-measure: the cache discipline at the dense tier). The optional rim/opacity pairs
    carry the mark's RENDERED ink (the N5 flight-ink fidelity — the pole hand-off stays invisible). */
interface CanvasEndpoint {
    from: FlightRect;
    to: FlightRect;
    fromRx: number;
    toRx: number;
    fromRgb: Rgb255;
    toRgb: Rgb255;
    /** The rim rgb pair, present iff either endpoint declares a stroke (rimless side ⇒ its fill). */
    strokeRgb?: [Rgb255, Rgb255];
    fromStrokeW: number;
    toStrokeW: number;
    fromOpacity: number;
    toOpacity: number;
}

interface CachedFlight {
    edgeId: string;
    endpoints: Map<string, FlightEndpoint>;
    capacity: "dom" | "canvas";
    /** The canvas-tier draw endpoints (rgb-parsed once), present ONLY when `capacity === "canvas"`. */
    canvasEps?: Map<string, CanvasEndpoint>;
    /** The devicePixelRatio the canvas backing store was sized at (canvas tier only). */
    dpr: number;
    hidden: { handle: MarkStageHandle; keys: readonly string[] }[];
    /** THE PRE-WARM HANDSHAKE (N.WP-sci · RC3-RM1): false ⇒ the arriving figure's `markRects()` are
        still cold (a lazyMounted canvas plate not yet settled), so the flight is DEFERRED — the
        originals stay owned by their stages (crossfade) and buildCache re-asks on the arriving stage's
        settled (re)registration. A warm cache is the only one that hides originals + flies clones. */
    warm: boolean;
}

/** The per-edge endpoint cache (built once per activation — the §3.4 discipline). */
const cache = shallowRef<CachedFlight | null>(null);

/** Reduce a mark's viewport `DOMRect` to a container-RELATIVE `FlightRect` (the scroll-cancel). */
function relRect(r: DOMRect, cont: DOMRect): FlightRect {
    return { x: r.x - cont.x, y: r.y - cont.y, w: r.width, h: r.height };
}

/** Release the hidden originals of the last cached edge (the constancy hand-back at the poles). */
function releaseHidden(): void {
    const c = cache.value;
    if (!c) return;
    for (const h of c.hidden) h.handle.setMarksHidden(false, h.keys.length ? h.keys : undefined);
}

/** Snapshot the from/to endpoints for an edge into the cache (ONCE per activation / resize). */
function buildCache(edgeId: string): void {
    const contEl = root.value;
    const st = edgeStates.find((e) => e.id === edgeId);
    if (!contEl || !st) {
        cache.value = null;
        return;
    }
    const edge = st.state.edge;
    const fromH = props.director.stageFor(edge.from);
    const toH = props.director.stageFor(edge.to);
    // A shared-element edge whose ARRIVING plate lacks a handle degrades to crossfade (declared intent
    // degrades, never breaks) — the corridor recede (owned by DashboardEssay) is then the whole effect.
    // A missing handle is the lazyMount COLD state too: `!warm`, so the watcher re-asks once it registers.
    if (!fromH || !toH) {
        cache.value = { edgeId, endpoints: new Map(), capacity: "dom", dpr: 1, hidden: [], warm: false };
        return;
    }
    const cont = contEl.getBoundingClientRect();
    const fromRects = fromH.markRects();
    const toRects = toH.markRects();
    const keys = sharedFlightKeys(fromRects.keys(), new Set(toRects.keys()), edge.spec.kind === "shared-element" ? edge.spec.marks : "all");
    // Snapshot the raw shared endpoints (container-relative), THEN run the pre-warm handshake guard: a
    // lazyMounted canvas plate whose `markRects()` start empty/0×0 must never launch a flight from the
    // origin, so `validateFlightEndpoints` drops any un-resolved (zero/NaN/Inf) endpoint and reports
    // whether the arriving figure is warm (settled) yet.
    const raw = new Map<string, FlightEndpoint>();
    for (const k of keys) {
        const fr = fromRects.get(k);
        const tr = toRects.get(k);
        if (!fr || !tr) continue;
        // The WHOLE MarkStyle is carried (fill + rx + the optional rim/opacity fidelity fields), so
        // the clone flies in the mark's RENDERED ink — the pole hand-off is invisible on the object.
        raw.set(k, {
            from: { rect: relRect(fr, cont), ...fromH.markStyle(k) },
            to: { rect: relRect(tr, cont), ...toH.markStyle(k) },
        });
    }
    const { endpoints, warm } = validateFlightEndpoints(raw);
    const capacity = pickMarkCapacity(endpoints.size);
    // Hide the originals ONLY for the resolved keys, and ONLY once warm — a cold/deferred pass keeps the
    // originals visible so the reader never sees a hole where an un-flown clone would be (the handshake).
    // SPLIT BY INTENT (§3.4): a `marks:"all"` edge hides with `undefined` (the handle's ~0ms CSS host
    // toggle); a `marks:[…]` subset hides the explicit keys (the handle's deferred per-key setOption).
    const hidden: CachedFlight["hidden"] = [];
    const flyKeys = [...endpoints.keys()];
    const marksSpec = edge.spec.kind === "shared-element" ? edge.spec.marks : undefined;
    const allIntent = marksSpec === undefined || marksSpec === "all";
    const hideKeys = allIntent ? undefined : flyKeys;
    if (warm && flyKeys.length) {
        fromH.setMarksHidden(true, hideKeys);
        toH.setMarksHidden(true, hideKeys);
        hidden.push(
            { handle: fromH, keys: hideKeys ?? [] },
            { handle: toH, keys: hideKeys ?? [] },
        );
    }
    // THE DENSE TIER (N.WP-sci) — above the DOM-clone ceiling the single canvas carries the flight.
    // Pre-parse each endpoint's fills to rgb255 ONCE (the per-frame draw only OKLab-lerps them) and
    // size the backing store to the container at the device pixel ratio (re-run on resize).
    let canvasEps: Map<string, CanvasEndpoint> | undefined;
    let dpr = 1;
    if (capacity === "canvas" && warm) {
        dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvasEps = new Map();
        for (const [k, ep] of endpoints) {
            const hasStroke =
                ep.from.stroke !== undefined || ep.to.stroke !== undefined;
            canvasEps.set(k, {
                from: ep.from.rect,
                to: ep.to.rect,
                fromRx: ep.from.rx,
                toRx: ep.to.rx,
                fromRgb: toRgb255(ep.from.fill),
                toRgb: toRgb255(ep.to.fill),
                // The rim pair mirrors resolveCloneFrame: a rimless side contributes its FILL, so
                // the rim fades toward the body ink instead of popping at the pole.
                ...(hasStroke
                    ? {
                          strokeRgb: [
                              toRgb255(ep.from.stroke ?? ep.from.fill),
                              toRgb255(ep.to.stroke ?? ep.to.fill),
                          ] as [Rgb255, Rgb255],
                      }
                    : {}),
                fromStrokeW: ep.from.strokeWidth ?? 0,
                toStrokeW: ep.to.strokeWidth ?? 0,
                fromOpacity: ep.from.opacity ?? 1,
                toOpacity: ep.to.opacity ?? 1,
            });
        }
        sizeCanvas(dpr);
    }
    cache.value = { edgeId, endpoints, capacity, canvasEps, dpr, hidden, warm };
}

/** Size the canvas backing store to the container at `dpr` (device pixels), CSS box at logical px. */
function sizeCanvas(dpr: number): void {
    const cv = canvasEl.value;
    const cont = root.value;
    if (!cv || !cont) return;
    const r = cont.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    cv.style.width = `${r.width}px`;
    cv.style.height = `${r.height}px`;
}

/** THE DENSE-TIER DRAW (one canvas, the full mark set) — per frame: `lerp(cached endpoints) + draw`.
    Runs off the SAME reactive scrub `t` the DOM tier reads (no new rAF — the reactive graph is the
    drain). Clears when idle (settled / PRM / DOM tier / cold). Draws each mark as a rect↔circle
    (rounded box, rx lerp) filled by the OKLab-lerped rgb (the perceptual morph fill). */
function drawCanvas(): void {
    const cv = canvasEl.value;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const c = cache.value;
    const st = activeEdge.value;
    if (!c || !st || st.id !== c.edgeId || !c.warm || c.capacity !== "canvas" || !c.canvasEps)
        return;
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    const t = st.state.t.value;
    const canRound = typeof ctx.roundRect === "function";
    for (const ep of c.canvasEps.values()) {
        const r = lerpRect(ep.from, ep.to, t);
        if (r.w <= 0 || r.h <= 0) continue;
        const rx = Math.min(lerpRx(ep.fromRx, ep.toRx, t), r.w / 2, r.h / 2);
        const [rr, gg, bb] = oklabFillLerp(ep.fromRgb, ep.toRgb, t);
        // THE FLIGHT-INK FIDELITY (N5) — the clone paints the mark's RENDERED opacity + rim, lerped
        // like every other channel, so the pole hand-off never steps the cloud's ink-weight.
        ctx.globalAlpha = clampAlpha(lerp(ep.fromOpacity, ep.toOpacity, t));
        ctx.fillStyle = `rgb(${rr}, ${gg}, ${bb})`;
        ctx.beginPath();
        if (canRound) ctx.roundRect(r.x, r.y, r.w, r.h, rx);
        else ctx.rect(r.x, r.y, r.w, r.h);
        ctx.fill();
        if (ep.strokeRgb) {
            const w = lerp(ep.fromStrokeW, ep.toStrokeW, t);
            if (w > 0) {
                const [sr, sg, sb] = oklabFillLerp(ep.strokeRgb[0], ep.strokeRgb[1], t);
                ctx.strokeStyle = `rgb(${sr}, ${sg}, ${sb})`;
                ctx.lineWidth = w;
                ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1;
}

/** Clamp a lerped opacity to the canvas' legal 0..1 (a defensive floor — handles report 0..1). */
function clampAlpha(a: number): number {
    return a < 0 ? 0 : a > 1 ? 1 : a;
}

// (RE)BUILD on activation change; RELEASE the hidden originals when the corridor settles.
watch(
    () => activeEdge.value?.id ?? null,
    (id) => {
        releaseHidden();
        if (id) buildCache(id);
        else cache.value = null;
    },
);

// THE PRE-WARM HANDSHAKE re-trigger (N.WP-sci · RC3-RM1): while an edge is live but its cache is
// still COLD (`!warm` — the arriving lazyMounted plate has not registered its settled stage), re-ask
// buildCache the moment the arriving stage (re)registers its handle. `stageFor` reads the director's
// reactive `stages` map, so a canvas plate that hydrates + settles mid-corridor warms the flight
// exactly once, without any per-frame `markRects()` poll (that recompute is BANNED — §3.4).
watch(
    () => {
        const st = activeEdge.value;
        if (!st) return null;
        return props.director.stageFor(st.state.edge.to) ?? null;
    },
    () => {
        const st = activeEdge.value;
        if (st && cache.value && !cache.value.warm) buildCache(st.id);
    },
);

// Re-cache on host resize (the geometry snapshot is invalidated — §3.4).
useResizeObserver(root, () => {
    if (activeEdge.value) buildCache(activeEdge.value.id);
});

// THE DENSE-TIER DRAIN — redraw the canvas whenever the scrub `t` (or the cache / active edge)
// changes. `flush:"post"` so the canvas element exists + is sized before the first draw. This is
// the SAME reactive heartbeat the DOM `clones` computed rides — no second rAF (the drain is the
// reactive graph). A no-op at the DOM tier / off an edge (drawCanvas clears + returns early).
watchEffect(
    () => {
        void cache.value;
        void activeEdge.value?.state.t.value;
        drawCanvas();
    },
    { flush: "post" },
);

onBeforeUnmount(releaseHidden);

/** The per-frame clone frames — PURE lerp of the cached endpoints at the edge scrub `t` (NO measure).
    The DOM tier renders these as compositor-transformed divs; the canvas tier defers to N.WP-sci. */
const clones = computed<{ key: string; style: CSSProperties }[]>(() => {
    const c = cache.value;
    const st = activeEdge.value;
    // `!c.warm` ⇒ the pre-warm handshake has not resolved (a lazyMounted plate still cold): fly NOTHING
    // (the originals were never hidden), so the reader sees the settled stages, never an origin-launched
    // clone. `capacity === "canvas"` is the dense sci-equity path, deferred to N.WP-sci's draw loop.
    if (!c || !st || st.id !== c.edgeId || !c.warm || c.capacity === "canvas") return [];
    const t = st.state.t.value;
    const out: { key: string; style: CSSProperties }[] = [];
    for (const [key, ep] of c.endpoints) {
        const f = resolveCloneFrame(ep.from, ep.to, t);
        out.push({
            key,
            style: {
                transform: `translate3d(${f.rect.x.toFixed(2)}px, ${f.rect.y.toFixed(2)}px, 0)`,
                width: `${f.rect.w.toFixed(2)}px`,
                height: `${f.rect.h.toFixed(2)}px`,
                borderRadius: `${f.rx.toFixed(2)}px`,
                background: f.fill,
                // THE FLIGHT-INK FIDELITY (N5) — the mark's rendered opacity + rim fly with the
                // clone (box-sizing:border-box keeps the rim inside the lerped box), so the pole
                // hand-off never steps the cloud's ink-weight.
                opacity: f.opacity,
                ...(f.stroke && f.strokeWidth
                    ? { border: `${f.strokeWidth.toFixed(2)}px solid ${f.stroke}` }
                    : {}),
            },
        });
    }
    return out;
});
</script>

<template>
    <!-- The flight overlay is SEATED IN THE CONTENT STAGE (it inherits the dock gutter reserve), so
         ZERO clone ink sits left of `--cp-dock-reserve` (the G-N1 occlusion arm b, structural). Clones
         sit ABOVE the plates, BELOW the dock stratum (`--z-overlay`). Pointer-transparent — the marks
         under it stay interactive. -->
    <div ref="root" class="story-corridor" aria-hidden="true">
        <!-- THE DOM TIER (≤ the DOM-clone ceiling) — one compositor-transformed div per mark. -->
        <div
            v-for="clone in clones"
            :key="clone.key"
            class="story-corridor__clone"
            :style="clone.style"
        />
        <!-- THE DENSE (CANVAS) TIER (N.WP-sci · > the ceiling — the 3243-mark all-year overlay) — a
             single canvas carries the full flight (2.0ms/frame at 3243, P2-A). Always present + inert
             (cleared) at the DOM tier / off an edge; the draw loop fills it only on a canvas edge. -->
        <canvas ref="canvasEl" class="story-corridor__canvas" />
    </div>
</template>

<style scoped>
.story-corridor {
    position: absolute;
    inset: 0;
    /* seated IN the content stage: no clone ink in the dock gutter (the occlusion arm b, by
       construction — the overlay inherits the stage's inline gutter reserve). */
    padding-inline-start: max(2rem, var(--cp-dock-reserve, 112px));
    pointer-events: none;
    z-index: var(--z-overlay, 50);
    overflow: clip;
}
.story-corridor__clone {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    /* the N5 flight-ink rim draws INSIDE the lerped box (the geometry stays the cached rect). */
    box-sizing: border-box;
    /* compositor-only: the per-frame write is transform + background (+ opacity/rim, same batch);
       will-change parks it on its own layer for the duration of the flight. */
    will-change: transform;
}
/* THE DENSE-TIER CANVAS (N.WP-sci) — fills the corridor container; its own 0,0 aligns with the
   border-box origin the cached mark rects are relative to (the DOM clones share that origin). The
   backing store is sized in JS at the device pixel ratio; pointer-transparent (the marks under it
   stay interactive). Ignores the container's inline gutter reserve (absolute children position
   against the padding box), so its coordinate space matches the DOM-clone tier byte-for-byte. */
.story-corridor__canvas {
    position: absolute;
    inset: 0;
    pointer-events: none;
}
</style>
