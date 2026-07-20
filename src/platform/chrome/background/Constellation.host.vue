<script setup lang="ts">
// platform/chrome/Constellation.host.vue — the gallery's branded constellation HOST
// (C.W6.b Scope 5 / AT-3). A THIN consumer of glass-ui's shipped <Constellation> for the
// seeded lattice, PLUS the ONE pinned NCSU-red anomaly fleck — the slides red-anomaly
// idiom (the emergent-tricolor red leg), reproduced as a recessive brand watermark on the
// gallery's NON-data cover. NEVER the slides 527-line re-vendor (a hand-roll of a shipped
// primitive IS the H5/G1 defect; the no-re-vendor grep over `src/` stays 0 — we CONSUME the
// shipped lattice, the fleck is a hairline of our own brand chrome over it).
//
// ── THE OVERLAY SEAM, RE-SEATED ONTO A 2D LAYER (J-CLOSE re-gate · the GPU-substrate truth) ──
// glass-ui's <Constellation> shipped a Canvas2D `drawOverlay(ctx, field, now)` skin seam at
// HEAD; the host pinned the red anomaly through it. The I1 glass-ui 4.0.1 bump moved the
// lattice onto the GPU substrate (`backend(): "webgpu" | "webgl2"` — there is NO Canvas2D
// substrate anymore), so the <Constellation> canvas is a WebGL/WebGPU context: `getContext("2d")`
// on it returns null and the Canvas2D `drawOverlay` seam never paints. The brand fleck
// therefore moves to its OWN thin 2D overlay canvas, layered OVER the lattice within the host
// box — the ONE saturated red mark, painted where it reads, on a context the brand chrome (and
// the gate that samples it) can actually reach. The lattice stays the shipped GPU primitive
// (CONSUMED), the fleck stays a single deft hairline of OUR brand ink.
//
// ── THE COVER IS STATIC-BAKED (O-F3 · idle-burn fix 2 of 3 · motion-arch §2.1 MOVE 2/3 · §2.4) ──
// The gallery/brand route USED to keep a WebGPU render loop alive forever for a recessive
// watermark (`/` idle 2016 ms/3 s, ~67% of a core; glass-ui KEEPS PRESENTING ~431/3 s even under
// `:freeze` — freeze halts the sim `stepField` but NOT the present loop, the O-F4 probe measured
// it). A per-frame GPU program painting a near-static, sub-perceptual (`visibleFrac ≈ 0.007`)
// image is a category error. So the lattice is BAKED, not driven:
//   • ONE deterministic frozen frame of the shipped <Constellation> is rendered (`:freeze` = the
//     reproducible, seed-stable static layout), captured to a static 2D `<canvas>` via `drawImage`,
//     and the live lattice UNMOUNTS. The render loop DIES; the static raster is what remains — 0
//     live WebGPU context, 0 present, ~0 idle main-thread at rest.
//   • The bake is a DIRTY-FLAG render with a small explicit input set (mount · debounced resize ·
//     theme flip) — O(handful/session), never per-frame (MOVE 3). A CSS gradient cannot replicate
//     a lattice, so we BAKE not degrade (MOVE 2): the LOOK is byte-preserved, the cost is gone.
//   • The capture is DPR-aware + async-safe: the WebGPU substrate acquires its device
//     asynchronously, so the transient lattice is polled per-rAF until its canvas has actually
//     PAINTED (`hasContent`), only then committed — a mid-flight re-bake never clobbers the
//     standing raster with a blank frame.
//   • PRM shows the SAME static bake — the frozen frame IS the reduced-motion one-static-frame the
//     engine would resolve, so the vestibular floor is preserved AND PRM users now pay 0 WebGPU too
//     (the L10 "reduced-motion is half-wired" arm is closed on the brand route).
//
// ── THE O-F4 ACTIVITY BELT, COMPOSED (motion-arch §2.1 MOVE 4) ───────────────────────────────
// The belt (`useAtmosphereActivity`) parks per-frame motion when the tab is hidden / idle > 4 s /
// under PRM. Post-bake the LATTICE has no loop to park (it is a static raster), so the belt's only
// live consumer here is the brand fleck's own 2D rAF: `active` gates it — parks the breath when
// nobody is watching, keeps the last frame painted (never a cleared canvas). The static bake canvas
// is cheap either way (a cached raster, 0 idle cost), so it simply stays mounted; the belt no longer
// needs to unmount the lattice to zero the present loop — the bake already did (O-F3 supersedes the
// O-F4 `latticeLive` unmount lever on this host).
//
// RECESSIVE BY DEFAULT (D2.d / ds2-motion-field M10). The lattice reads its legibility off the
// `--constellation-*` token set; this host does NOT override `--constellation-alpha` (the cover
// scope's recession dial is GalleryView's job, ≤0.9 by the PRM/PRT test cap), so the field stays
// watermark fibers behind the ink. The brand mount seeds the field DENSITY to the civic scalar
// (NC's counties). The ONE red fleck is the legal exception: decorative brand chrome on a NON-data
// surface, NO live data binding — the three-red NCSU law holds (FD1 §4.1/§4.4; emergent-tricolor
// RED → --ncsu-red).
//
// THE RED — resolved, not a string. A Canvas2D context cannot parse `var(--ncsu-red)`; the fleck
// resolves `--ncsu-red` off the live overlay canvas via `getComputedStyle` (so a dark-mode flip /
// token override re-tints it — the theme watcher forces the re-read even when the breath is parked).
// The `#cc0000` fallback is the HEAD token value.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Constellation } from "@mkbabb/glass-ui/constellation";
import type { ConstellationField } from "@mkbabb/glass-ui/constellation";
import { useDebounceFn } from "@vueuse/core";
import { useAtmosphereActivity } from "./composables/useAtmosphereActivity.js";
import {
    constellationShouldRun,
    nextConstellationPhase,
    WAKE_CROSSFADE_MS,
    type ConstellationPhase,
    type ConstellationRegister,
} from "./composables/constellation-register.js";
import { useAtmosphereTier } from "./composables/useAtmosphereTier.js";
import { useThemeKey } from "../../composables/useThemeKey.js";

const props = withDefaults(
    defineProps<{
        /** Node count — passed through to the shipped engine. Default 100 (NC's counties —
            the civic-scalar density the brand mount seeds; D2.d / M10). */
        count?: number;
        /** The reproducible field seed — same lattice every load, capture-stable. REQUIRED: the
            artwork belongs to the surface that shows it, and the prior library default was named
            for a route that no longer exists (dial 6 — the seed is PINNED at the mount, redrawn on
            a theme flip only, never per load). */
        seed: number | string;
        /** `live` while visible, static `bake`, or belt-gated `auto` (default). */
        register?: ConstellationRegister;
    }>(),
    {
        count: 100,
        register: "auto",
    },
);

// The host box (for a querySelector fallback to the substrate canvas), the 2D fleck overlay, and
// the STATIC BAKE canvas — the frozen lattice raster that replaces the live present loop (O-F3).
const hostEl = ref<HTMLElement | null>(null);
const overlay = ref<HTMLCanvasElement | null>(null);
const bakeCanvas = ref<HTMLCanvasElement | null>(null);

// THE O-F5 DEVICE-TIER LADDER (motion-arch §2.3). The shared `useAtmosphereTier` selector is the ONE
// source of the atmosphere ladder; the brand cover reads it for the fleck's MOTION: `tide` is `true`
// only at tier A (the fleck breathes), `false` at B/C (a device that gets a static field — a
// low-core / save-data / PRM device) so the fleck freezes. This FOLDS the prior `useReducedMotion`
// fence (PRM lands tier C) into the SAME ladder the aurora rides, and composes with the O-F4 belt
// (`active` parks the loop on hidden/idle; `tide` freezes the breath on the low tier). `tier` is
// surfaced on the host for the standing gate. The static lattice bake (O-F3) stands at EVERY tier —
// it is already a 0-cost static raster (the discrepancy with §2.3's "tier C = no lattice": O-F3
// supersedes it — dropping a free static raster gains nothing and loses the brand identity).
const { tier, tide } = useAtmosphereTier();

// THE O-F4 ACTIVITY BELT (motion-arch §2.1 MOVE 4). Post-bake the brand cover carries ONE idle loop
// — the fleck's own 2D rAF (the lattice is now a static raster, no loop). The belt parks the fleck
// when the tab is hidden / idle > 4 s / under PRM; `active` folds PRM so it composes with the
// engine's reduced-motion fence, never replaces it.
const { active, hidden, reduced } = useAtmosphereActivity();
const shouldRun = computed<boolean>(() =>
    constellationShouldRun(props.register, {
        active: active.value,
        hidden: hidden.value,
        reduced: reduced.value,
    }),
);

const phase = ref<ConstellationPhase>("asleep");
const liveMounted = ref(false);
const liveVisible = ref(false);
const captureKind = ref<"seed" | "sleep" | null>(null);
const latticeMounted = computed(() => liveMounted.value || captureKind.value !== null);
const latticeFrozen = computed(() => captureKind.value === "seed");

// ── THE STATIC-TEXTURE BAKE (O-F3) ───────────────────────────────────────────────────────────
// `baking` mounts the transient live <Constellation> (frozen, opacity:0 — it GPU-renders its
// backing store, never shows on screen) ONLY for the capture window; once its canvas has painted a
// deterministic frame we `drawImage` it onto the static bake canvas and set `baking = false`, which
// UNMOUNTS the live lattice → the render loop dies. Between bakes: 0 draws, 0 WebGPU context.
/** The transient live lattice's imperative handle — `field.canvas` is the substrate canvas we bake
    (the WebGPU/WebGL2 surface; a 2D `drawImage` source once the async device has painted). */
const latticeRef = ref<{ field: ConstellationField } | null>(null);

/** The DPR clamp — mirror the fleck (2 is the retina ceiling; higher DPR is imperceptible here and
    doubles the raster cost). */
const dprOf = (): number => Math.min(window.devicePixelRatio || 1, 2);

/** Resolve the live substrate canvas — the expose is the clean path; the host query is the belt. */
function latticeCanvas(): HTMLCanvasElement | null {
    const c = latticeRef.value?.field?.canvas;
    if (c) return c;
    return hostEl.value?.querySelector<HTMLCanvasElement>("canvas.constellation-canvas") ?? null;
}

// A tiny read-back scratch — `getContext("2d", { willReadFrequently })` on a small canvas is the
// cheap way to ask "has the async WebGPU substrate actually PAINTED yet?" without stalling the GPU.
// Created lazily (SSR-safe); reused across the O(handful/session) bakes.
let scratch: HTMLCanvasElement | null = null;
const SCRATCH = 128;
/** True once the substrate canvas holds a rendered frame (any non-zero alpha) — before the async
    device settles the canvas is fully transparent, so this is the clean cold-paint gate. */
function hasContent(src: HTMLCanvasElement): boolean {
    if (typeof document === "undefined") return true;
    if (!scratch) {
        scratch = document.createElement("canvas");
        scratch.width = SCRATCH;
        scratch.height = SCRATCH;
    }
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    if (!sctx) return true; // cannot read back → assume ready, let the draw proceed
    sctx.clearRect(0, 0, SCRATCH, SCRATCH);
    try {
        sctx.drawImage(src, 0, 0, SCRATCH, SCRATCH);
    } catch {
        return false; // a not-yet-configured GPU canvas can throw as a draw source
    }
    const { data } = sctx.getImageData(0, 0, SCRATCH, SCRATCH);
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
    return false;
}

/** The bake box (in device px), the standing raster's last-baked CSS size (the resize dirty check). */
let lastCssW = 0;
let lastCssH = 0;

/**
 * Draw ONE frozen lattice frame onto the static bake canvas (DPR-aware). Skips (returns false) until
 * the async substrate has painted — so a re-bake never clobbers the standing raster with a blank —
 * unless `force` (the timeout guard, the WebGL2-fallback edge). This is the whole per-session GPU
 * cost of the field: a handful of `drawImage`s, each < 1 frame [motion-arch §2.4].
 */
function bakeFrame(force = false): boolean {
    const dst = bakeCanvas.value;
    const src = latticeCanvas();
    if (!dst || !src || !src.width || !src.height) return false;
    if (!force && !hasContent(src)) return false;
    const dpr = dprOf();
    const cssW = dst.clientWidth || 1;
    const cssH = dst.clientHeight || 1;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (dst.width !== w || dst.height !== h) {
        dst.width = w;
        dst.height = h;
    }
    const ctx = dst.getContext("2d");
    if (!ctx) return false;
    ctx.clearRect(0, 0, w, h);
    try {
        ctx.drawImage(src, 0, 0, w, h);
    } catch {
        return false;
    }
    lastCssW = cssW;
    lastCssH = cssH;
    return true;
}

let bakeRaf = 0;
let bakeFrames = 0;
// True once the first bake has committed — until then the ResizeObserver's OWN mount-time fire is
// ignored (the mount `startBake` already owns the first pass; letting the observer also fire would
// spin up a redundant transient GPU context for the identical box).
let bakedOnce = false;
// ~2 s @60fps: a generous ceiling on the async device acquire before the timeout guard force-commits
// (and unmounts the live lattice regardless — we NEVER leave the present loop running).
const BAKE_MAX_FRAMES = 120;

/** Poll per-rAF until the frozen frame paints, then commit + unmount; guard-force at the ceiling. */
function pollBake(): void {
    bakeRaf = 0;
    bakeFrames++;
    if (bakeFrame(false)) return finishBake();
    if (bakeFrames < BAKE_MAX_FRAMES) {
        bakeRaf = requestAnimationFrame(pollBake);
        return;
    }
    bakeFrame(true); // ceiling reached — commit whatever the substrate has, then tear the loop down
    finishBake();
}

/** Arm a bake pass: mount the transient hidden live lattice, then poll it to a static capture. */
function startBake(): void {
    if (bakeRaf || liveMounted.value) return; // a pass is already in flight — coalesce
    bakeFrames = 0;
    captureKind.value = "seed";
    bakeRaf = requestAnimationFrame(pollBake);
}

/** Capture the exact on-screen live frame, then swap to that raster with no visual dissolve. */
function sleepFromLive(): void {
    if (!liveMounted.value || bakeRaf) return;
    phase.value = nextConstellationPhase(phase.value, "sleep");
    captureKind.value = "sleep";
    bakeFrames = 0;
    bakeRaf = requestAnimationFrame(pollBake);
}

/** Mount the live field and cross-dissolve the standing raster into it. */
async function wakeLive(): Promise<void> {
    if (liveMounted.value || reduced.value) return;
    if (bakeRaf) {
        cancelAnimationFrame(bakeRaf);
        bakeRaf = 0;
    }
    captureKind.value = null;
    phase.value = nextConstellationPhase(phase.value, "wake");
    liveVisible.value = false;
    liveMounted.value = true;
    await nextTick();
    await nextTick();
    if (shouldRun.value) liveVisible.value = true;
}

function onWakeTransitionEnd(event: TransitionEvent): void {
    if (
        event.target !== event.currentTarget ||
        event.propertyName !== "opacity" ||
        phase.value !== "waking"
    )
        return;
    phase.value = nextConstellationPhase(phase.value, "woke");
}

/** Commit terminus: stop polling and UNMOUNT the live lattice — the render loop dies, the raster
    stands. Idempotent. */
function finishBake(): void {
    if (bakeRaf) {
        cancelAnimationFrame(bakeRaf);
        bakeRaf = 0;
    }
    const completed = captureKind.value;
    captureKind.value = null;
    liveVisible.value = false;
    liveMounted.value = false;
    if (completed === "sleep") {
        phase.value = nextConstellationPhase(phase.value, "slept");
    } else {
        phase.value = "asleep";
    }
    bakedOnce = true;
    if (shouldRun.value) void wakeLive();
}

/** Re-bake on the small explicit input set (MOVE 3), debounced so a resize drag coalesces to ONE
    bake at rest (O(handful/session), never per-frame). */
const rebake = useDebounceFn(() => {
    if (!shouldRun.value) startBake();
}, 200);

// The resolved NCSU-red, cached (the breath re-paints every frame; the getComputedStyle probe must
// not). Re-resolved on mount + on every theme flip (the watcher forces the re-read).
let resolvedRed = "#cc0000"; // the HEAD --ncsu-red token value (the fallback)

/** Resolve --ncsu-red off the live overlay canvas — the legal place red exceeds a hairline. */
function anomalyRed(canvas: HTMLCanvasElement): string {
    const v = getComputedStyle(canvas).getPropertyValue("--ncsu-red").trim();
    if (v) resolvedRed = v;
    return resolvedRed;
}

/**
 * Paint the ONE red anomaly fleck onto the 2D overlay: a BREATHING ring + a saturated red
 * core (the slides idiom). Pinned to a stable point in the field (≈38% / 42% of the box —
 * within the lattice, clear of the masthead's upper-left lockup). Off tier A (`tide` false —
 * a low-core / save-data / PRM device) the breath is frozen (the `now`-driven radius resolves
 * to its resting value), so the fleck is a static mark.
 */
function paintFleck(now: number): void {
    const canvas = overlay.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = dprOf();
    const cssW = canvas.clientWidth || 1;
    const cssH = canvas.clientHeight || 1;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    ctx.clearRect(0, 0, w, h);

    const red = anomalyRed(canvas);
    // Pin the fleck to a stable interior point (a resonance, not a chart — no live value).
    const x = w * 0.38;
    const y = h * 0.42;
    const k = dpr; // scale the mark with DPR so it reads consistently across displays
    const core = 5.6 * k; // the slides H.W4 core radius
    // The gentle breath: ±1.2k around the resting radius on a slow ~3.7s period — frozen at
    // its mean off tier A (the low-tier / PRM static-frame floor; O-F5 folds the PRM fence).
    const breath = tide.value ? 1.2 * Math.sin(now / 590) : 0;
    const ring = core + (2.4 + breath) * k;

    // 1) the focal ring (the slides anomaly halo — the breathing mark).
    ctx.save();
    ctx.strokeStyle = red;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath();
    ctx.arc(x, y, ring, 0, 2 * Math.PI);
    ctx.stroke();
    // 2) the red core (the single anchored brand fleck — the one non-hairline red).
    ctx.fillStyle = red;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x, y, core, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

let raf = 0;
function loop(now: number): void {
    paintFleck(now);
    // Continue the breath ONLY while the belt is active (O-F4) AND the tier animates (O-F5: `tide` is
    // false off tier A — a low-core / save-data / PRM device). When either parks (hidden / idle / low
    // tier) the loop ends but the last frame stays painted — a frozen fleck, never a cleared canvas.
    raf = active.value && tide.value ? requestAnimationFrame(loop) : 0;
}

/** Re-sync the fleck rAF to the belt + the tier: repaint the resting/last frame, then run or park the
    loop to match `active && tide`. Idempotent — starts the loop only when it should run and is not
    already running, cancels it only when it should not and is running. Drives mount + the live
    `active` (belt) and `tide` (tier) transitions. */
function syncFleck(): void {
    paintFleck(performance.now());
    if (active.value && tide.value) {
        if (!raf) raf = requestAnimationFrame(loop);
    } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
    }
}

let ro: ResizeObserver | null = null;
onMounted(() => {
    // Paint the resting fleck frame immediately, then run/park to the belt (O-F4; PRM folded into
    // `active`). Then bake the lattice to its static raster (O-F3) — the first and, absent a
    // resize/theme flip, ONLY GPU pass of the session.
    paintFleck(0);
    syncFleck();
    if (shouldRun.value) void wakeLive();
    else startBake();
    if (bakeCanvas.value && typeof ResizeObserver !== "undefined") {
        // ONE observer: the fleck follows the box immediately (cheap), the lattice re-bakes only on
        // a REAL size change, debounced (the standing raster is DPR/size-locked to the box).
        ro = new ResizeObserver(() => {
            paintFleck(performance.now());
            const c = bakeCanvas.value;
            if (!c || !bakedOnce) return; // the mount bake owns the first pass; ignore its RO echo
            if (c.clientWidth === lastCssW && c.clientHeight === lastCssH) return;
            if (!liveMounted.value) rebake();
        });
        ro.observe(bakeCanvas.value);
    }
});

// The belt + tier edge — park the fleck rAF when the tab hides / goes idle (belt) OR the device drops
// off tier A (tier: low-core / save-data / PRM), resume on return to tier A + an active reader.
watch([active, tide], syncFleck);

watch(shouldRun, (run) => {
    if (run) void wakeLive();
    else if (liveMounted.value) sleepFromLive();
    else if (!bakedOnce) startBake();
});

// THE THEME FLIP (motion-arch §2.4 "explicit moment"). A dark/light flip re-tints the lattice tokens
// AND the fleck red; re-bake the lattice (debounced) at the new palette + force an immediate fleck
// re-read (the breath may be parked, so the watcher repaints it directly).
const themeKey = useThemeKey();
watch(themeKey, () => {
    resolvedRed = ""; // drop the cache so anomalyRed re-reads the flipped token
    paintFleck(performance.now());
    if (!liveMounted.value) rebake();
});

onBeforeUnmount(() => {
    if (raf) cancelAnimationFrame(raf);
    if (bakeRaf) cancelAnimationFrame(bakeRaf);
    if (ro) ro.disconnect();
});
</script>

<template>
    <!-- THE HOST — the single brand field. It carries `.constellation-host` + `.constellation`
         (the arbiter's `:scope > .atmosphere__field` kind-tag reads `.constellation`; i8 reads
         `[class*="constellation"]` + a `canvas` descendant; the gate reads `--constellation-alpha`
         off `.constellation-host`). Inside: the 2D fleck overlay FIRST (so `.constellation-host
         canvas` first-match is the readable 2D layer carrying the red), then the STATIC BAKE canvas
         (the frozen lattice raster), then — ONLY during a bake pass — the transient live
         <Constellation> we capture from (opacity:0, off-screen to the eye). -->
    <div
        ref="hostEl"
        class="constellation constellation-host"
        :data-atmosphere-tier="tier"
        :data-register="props.register"
        :data-phase="phase"
        :style="{ '--constellation-wake': `${WAKE_CROSSFADE_MS}ms` }"
    >
        <!-- The brand fleck's own 2D layer, OVER the lattice raster (the readable red the gate
             samples; a Canvas2D fleck cannot share the GPU substrate canvas). -->
        <canvas ref="overlay" class="constellation-anomaly" aria-hidden="true"></canvas>

        <!-- THE STATIC-TEXTURE BAKE (O-F3): the frozen lattice, `drawImage`-captured once and held.
             This is what remains after the live lattice unmounts — 0 WebGPU context, 0 present, ~0
             idle cost. Re-baked only on debounced resize + theme flip. -->
        <canvas ref="bakeCanvas" class="constellation-lattice" aria-hidden="true"></canvas>

        <!-- The transient CAPTURE source — the shipped <Constellation>, mounted ONLY during a bake
             pass and always `:freeze` (the deterministic, seed-stable static frame; the same
             one-static-frame PRM would resolve). It GPU-renders its backing store which we bake, then
             UNMOUNTS (`v-if="baking"` flips false) so the render loop DIES. `opacity:0` keeps it off
             the eye during the sub-second capture window; `warp-on-click` stays OFF (a cover plate is
             not a toy). The recessive `--constellation-alpha` default is NOT overridden here
             (GalleryView's cover scope owns the recession dial). -->
        <div
            v-if="latticeMounted"
            class="constellation-live-shell"
            :class="{ 'constellation-live-shell--visible': liveVisible }"
            @transitionend="onWakeTransitionEnd"
        >
            <Constellation
                ref="latticeRef"
                :count="count"
                :seed="seed"
                :warp-on-click="false"
                :wander="!latticeFrozen"
                :freeze="latticeFrozen"
                class="constellation-lattice-live"
            />
        </div>
    </div>
</template>

<style scoped>
/* The host fills its positioning box (the gallery scopes it behind the cover). Both layers are
   full-bleed within; this lets the parent place + inert it. */
.constellation-host {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

/* The layers stack full-bleed within the host: the baked lattice raster (and, transiently, the live
   capture source) beneath, the fleck over them. */
.constellation-host > .constellation-lattice,
.constellation-host > .constellation-live-shell,
.constellation-host > .constellation-anomaly {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

/* The transient capture source never shows on the eye — it GPU-renders its backing store (which the
   bake reads) while invisible, then unmounts. */
.constellation-host > .constellation-live-shell {
    opacity: 0;
}

.constellation-host > .constellation-live-shell--visible {
    opacity: 1;
}

.constellation-host[data-phase="waking"] > .constellation-live-shell,
.constellation-host[data-phase="waking"] > .constellation-lattice {
    transition: opacity var(--constellation-wake) var(--ease-engrave);
}

.constellation-host[data-phase="waking"] > .constellation-lattice,
.constellation-host[data-phase="live"] > .constellation-lattice,
.constellation-host[data-phase="sleeping"] > .constellation-lattice {
    opacity: 0;
}

.constellation-live-shell > .constellation-lattice-live {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
}

@media (prefers-reduced-motion: reduce) {
    .constellation-host {
        --constellation-wake: 0ms !important;
    }
}

/* The fleck rides ABOVE the lattice (a single recessive brand mark, never a competitor). */
.constellation-host > .constellation-anomaly {
    z-index: 1;
}
</style>
