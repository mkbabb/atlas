<script setup lang="ts">
// platform/charts/StickyScene.vue — THE STICKY-SCENE HOST (K-SCENE · K-EXPRESS L-S3, the pinned-
// graphic stepped narrative). A graphic PINS (plain `position:sticky`, scoped CSS — NOT a JS pin: a
// CONSTANT pin is plain CSS, the heavy `pinCSS()` engine is the wrong tool) while N narrated STEPS
// scroll past. The ACTIVE step is the one whose block crosses a viewport-CENTRE BAND — a PRM-SAFE
// IntersectionObserver read (wayfinding INFORMATION, fired on SCROLL, not a motion clock). When the
// active step CHANGES on a GENUINE crossing the host runs the consumer's discrete `apply` effect
// (e.g. drive the global ?year). ONE graphic, N states, ONE observer, bi-directional by construction.
// NO scroll timeline, NO `--scroll-tl` host, NO per-frame poll — the DISCRETE-FIRST design (the named
// consumer is a stepped year-walk / CSS re-tint, not a scrubbed blend). The scrubbed continuous `t`
// is the OPT-IN richer-graphic FUTURE (Open Q5), added with the timeline THEN.
//
// PRM (trivially satisfied): the IO fires on SCROLL, so under reduced-motion the year still advances
// and the rim still tracks; only the CSS opacity/rim EASE between steps is removed (the graded-PRM
// "scale-down don't delete" law). There is no motion clock to freeze.
import {
    computed, onBeforeUnmount, onMounted, provide, ref,
    type Component, type VNodeChild,
} from "vue";
import { useViewParams } from "@/platform/stores/useViewParams";
import { useActiveDashboard } from "@/platform/stores/useActiveDashboard";
import type { YearScope } from "@/data/useYearScope";
import VizPlate from "@/charts/frame/VizPlate.vue";
import { isVizContract } from "@/charts/contract/viz-contract"; // the ONE promoted guard (S6)
import type { VizContract } from "@/charts/contract/viz-contract";
import {
    SCENE_KEY,
    type ChapterScene,
    type ChapterTitle,
    type SceneAnchor,
    type SceneRuntime,
} from "@/charts/contract/scene-contract";

const props = defineProps<{
    /** The declared scene (the archetype). */
    scene: ChapterScene;
    /** The chapter index — drives the D2 auto-zebra side when `scene.side` is 'auto'/omitted. */
    index?: number;
}>();

const view = useViewParams();
const active = useActiveDashboard();

// Scenes are STATIC declarations (a route's context.ts declares them once) — read once at setup, the
// SAME pattern DashboardEssay uses for `props.chapters.map(...)`. No reactivity loss in practice.
const steps = props.scene.steps;
const N = steps.length;
const stepEls = steps.map(() => ref<HTMLElement | null>(null));
function setStepEl(el: HTMLElement | null, i: number): void {
    if (stepEls[i]) stepEls[i].value = el;
}

// ── THE PINNED SIDE (D2 auto-zebra) — declared side, else zebra by chapter index. ──
const side = computed<"left" | "right">(() => {
    const s = props.scene.side ?? "auto";
    if (s === "left" || s === "right") return s;
    return (props.index ?? 0) % 2 === 0 ? "left" : "right";
});

// ── THE RUNTIME the consumer's `apply` drives (the platform stores the scene writes). `setYear` is a
// no-op before the active feed loads (`yearScope` null → the optional-chain guard). ──
const runtime: SceneRuntime = {
    setYear: (year) => view.yearScope?.setSingle(year),
    view,
    active,
};

// ── THE ACTIVE STEP (the INFORMATION tier — a PRM-SAFE IntersectionObserver at a viewport-CENTRE
// BAND). The active step is WAYFINDING (which year), not motion — it MUST survive reduced-motion, so
// it reads from the IO (event-driven at band crossings; cheap — ONE observer over N targets, not a
// per-frame poll). The band is a small NON-ZERO slab (`-50%/-50%` collapses to a 0px LINE some
// engines never report `isIntersecting` for). The band is `anchor`-keyed. ──
const ANCHOR_BAND: Record<SceneAnchor, string> = {
    centre: "-46% 0px -46% 0px", // an ~8% slab at viewport centre — the active step is the one over it
    entry: "-12% 0px -70% 0px", // an upper-third trigger (the active step settles on entry)
};

const activeIndex = ref(0);
let appliedIndex = -1; // the last step `apply` ran for — the BOUNDARY dedupe. -1 ⇒ never applied (so
//                       the FIRST genuine crossing applies even on step 0). NEVER mount-fired.

// ── THE READER's YEAR — the SNAPSHOT/RESTORE guard (the year-hijack fix). A scene's `apply` writes
// the GLOBAL year dial on every crossing, so a reader who deep-linked `?year=2022` would have it
// hijacked (→ frozen at the scene's last step). We snapshot the reader's scope the MOMENT BEFORE the
// scene's FIRST `apply` writes it, and RESTORE it whenever the scene fully leaves the viewport (BOTH
// directions) and onBeforeUnmount — so the dial is the scene's only WHILE the scene is on-screen, the
// reader's again the moment it is not.
//
// THE SNAPSHOT IS LAZY — taken at the first crossing, NOT at mount. The scene mounts below the fold
// during route hydration, BEFORE the feed has loaded (`yearScope` is still null then — `?year` is not
// yet folded into a live scope), so a mount-time snapshot captured null and the restore was a no-op.
// At the first genuine crossing the feed is loaded and the URL year IS the live scope, so the capture
// is the reader's true pre-hijack intent. The full discriminated scope is captured (mode + years), so
// a reader in range/aggregate is restored faithfully, not flattened to single. ──
const enteredScope = ref<YearScope | null>(null);
let scopeCaptured = false;

function activate(i: number): void {
    activeIndex.value = i; // drives the rim + SCENE_KEY (cheap, idempotent)
    if (i === appliedIndex) return; // re-entering the SAME step on a wobble → no re-apply
    // Snapshot the reader's scope ONCE, the instant before the FIRST apply writes the dial (the feed
    // is loaded by now — a step is crossing — so `?year` IS a live scope, not the null mount window).
    if (!scopeCaptured && props.scene.apply) {
        enteredScope.value = view.yearScope?.scope.value ?? null;
        scopeCaptured = true;
    }
    appliedIndex = i;
    props.scene.apply?.(steps[i]!, runtime); // the DISCRETE step → world effect, GENUINE crossing only
}

function restoreReaderScope(): void {
    const s = enteredScope.value;
    const ys = view.yearScope;
    if (!s || !ys) return;
    if (s.mode === "single") ys.setSingle(s.year);
    else if (s.mode === "range") ys.setRange(s.years);
    else ys.setAggregate(s.years);
    appliedIndex = -1; // a re-entry from a restored state re-applies step 0 (no stale dedupe)
}

// The set of step elements currently crossing the active band — the GEOMETRIC pick reads it live.
const intersecting = new Set<Element>();
// The scene-root element — its viewport presence gates the exit-restore (both-directions).
const sceneRootEl = ref<HTMLElement | null>(null);

let io: IntersectionObserver | null = null;
let sceneIo: IntersectionObserver | null = null;
onMounted(() => {
    io = new IntersectionObserver(
        (entries) => {
            // Maintain the live intersecting set, then pick the GEOMETRICALLY-NEAREST step to the
            // viewport centre — NOT the last array-order intersecting entry (the wrong-year flicker:
            // the IO delivers entries in registration order, so the old `for`-loop's last-write kept
            // whichever step happened to sort last, not the one actually centred). Two steps can
            // straddle the centre band at once (the slab is ~8% tall); the nearest-centre tiebreak is
            // the canonical scrollytelling pick.
            for (const e of entries) {
                if (e.isIntersecting) intersecting.add(e.target);
                else intersecting.delete(e.target);
            }
            if (intersecting.size === 0) return; // between bands → hold the last active step
            const mid = window.innerHeight / 2;
            let bestEl: Element | null = null;
            let bestDist = Infinity;
            for (const el of intersecting) {
                const r = el.getBoundingClientRect();
                const dist = Math.abs((r.top + r.bottom) / 2 - mid);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestEl = el;
                }
            }
            const i = stepEls.findIndex((r) => r.value === bestEl);
            if (i >= 0) activate(i);
        },
        { rootMargin: ANCHOR_BAND[props.scene.anchor ?? "centre"], threshold: 0 },
    );
    for (const r of stepEls) if (r.value) io.observe(r.value);

    // The EXIT-RESTORE observer — watches the WHOLE scene root. When the scene leaves the viewport
    // entirely (scrolled past below OR back above — both directions), restore the reader's scope.
    if (sceneRootEl.value) {
        sceneIo = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (!e.isIntersecting) restoreReaderScope();
                }
            },
            { threshold: 0 },
        );
        sceneIo.observe(sceneRootEl.value);
    }
});
onBeforeUnmount(() => {
    io?.disconnect();
    sceneIo?.disconnect();
    restoreReaderScope(); // route-away / unmount → hand the dial back to the reader
});

const activeStep = computed(() => steps[activeIndex.value]!);
// A DISCRETE wayfinding scalar (the scene has no continuous clock in the MVP).
const progress = computed(() => (N > 1 ? activeIndex.value / (N - 1) : 1));

// ── THE SCENE CONTEXT (provide/inject). A graphic that reads the scene DIRECTLY injects SCENE_KEY;
// outside a scene the inject default is null (byte-unchanged standalone). ──
provide(SCENE_KEY, {
    activeIndex: computed(() => activeIndex.value),
    activeStep,
    count: N,
    progress,
});

// Route the type-free graphic (Component vs VizContract — the D5 no-overfit, no picture branch).
const graphicComponent = computed<Component | null>(() =>
    isVizContract(props.scene.graphic) ? null : (props.scene.graphic as Component),
);

/** Render a step's prose — a plain string OR a render-slot factory (the `ChapterTitle` carrier). The
    SAME function-as-functional-component pattern DashboardEssay's `TitleSlot` uses. */
function Prose(p: { prose: ChapterTitle }): VNodeChild {
    return typeof p.prose === "function" ? p.prose() : p.prose;
}
</script>

<template>
    <div
        ref="sceneRootEl"
        class="sticky-scene"
        :class="scene.focal ? 'sticky-scene--focal' : `sticky-scene--pin-${side}`"
        :data-anchor="scene.anchor ?? 'centre'"
    >
        <!-- THE PINNED GRAPHIC — plain position:sticky (scoped CSS). A type-free VizContract routes
             through VizPlate; a Component mounts directly. -->
        <div class="sticky-scene__graphic">
            <VizPlate
                v-if="!graphicComponent"
                :contract="(scene.graphic as VizContract)"
            />
            <component :is="graphicComponent" v-else />
        </div>

        <!-- THE NARRATED STEPS — each a block that scrolls past; the active one wears the D3 gold rim
             AND `aria-current` (the state-change AT readers otherwise miss). DOM order is the logical
             order ALWAYS (the D2 a11y keystone: the visual side-flip is a grid-area swap that never
             reorders the DOM). -->
        <ol class="sticky-scene__steps">
            <li
                v-for="(step, i) in scene.steps"
                :key="step.id"
                :ref="(el: any) => setStepEl(el?.$el ?? el ?? null, i)"
                class="sticky-scene__step"
                :data-active-step="i === activeIndex ? '' : undefined"
                :aria-current="i === activeIndex ? 'true' : undefined"
            >
                <!-- The prose CHIP. Non-focal: `display:contents` — no box, the prose lays out exactly
                     as before (byte-identical). Focal: the floating scrim-chip card (O-A17). -->
                <div class="sticky-scene__chip">
                    <Prose :prose="step.prose" />
                </div>
            </li>
        </ol>
    </div>
</template>

<style scoped>
/* THE TWO-COLUMN SCENE — the graphic pins in one track, the steps stack in the other. The pinned
   track is SHORTER than the steps track (the steps span N viewports), so position:sticky holds the
   graphic while the steps scroll past — the canonical sticky-graphic geometry. */
.sticky-scene {
    display: grid;
    gap: clamp(2rem, 6vw, 6rem);
    align-items: start;
    --scene-pin-top: 24px; /* clears the route chrome top inset; the phone block OVERRIDES the var
                              (an inline JS pin could not — inline beats a media query) */
}
@media (min-width: 1024px) {
    .sticky-scene {
        grid-template-columns: 1fr 1fr;
    }
    /* The DATA column (the graphic) is the STABLE anchor; only the FURNITURE swings (the D2 a11y
       keystone — grid placement never reorders the DOM). Both tracks share grid-row 1: the row is as
       TALL as the steps, so the graphic sticks for the whole steps transit. */
    .sticky-scene--pin-left .sticky-scene__graphic {
        grid-column: 1;
        grid-row: 1;
    }
    .sticky-scene--pin-left .sticky-scene__steps {
        grid-column: 2;
        grid-row: 1;
    }
    .sticky-scene--pin-right .sticky-scene__graphic {
        grid-column: 2;
        grid-row: 1;
    }
    .sticky-scene--pin-right .sticky-scene__steps {
        grid-column: 1;
        grid-row: 1;
    }
}
/* THE PIN — plain `position: sticky` (declared as STATIC CSS; no transform-pin to ever break it). The
   graphic sticks at `--scene-pin-top` for the scene's whole transit and un-sticks as the host bottom
   passes; it caps at the viewport so a tall hero map never overflows the pin. */
.sticky-scene__graphic {
    position: sticky;
    top: var(--scene-pin-top);
    align-self: start;
    max-block-size: calc(100svh - 2 * var(--scene-pin-top));
    overflow: clip; /* `clip` caps the axis WITHOUT establishing a scroll container (the SCROLL-ENGINE
                       ban idiom — never `overflow:hidden/auto`, which would re-misbind the scroll) */
}
.sticky-scene__steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}
/* THE PROSE CHIP WRAPPER — `display: contents` generates NO box, so a non-focal scene's prose lays out
   exactly as it did before (byte-identical). The focal path (below) turns it into the scrim-chip card. */
.sticky-scene__chip {
    display: contents;
}
.sticky-scene__step {
    min-block-size: 72svh; /* ~one viewport per step — one idea per scroll. svh (the STATIC small-
       viewport unit) not dvh: a pinned scroll-story step measured against the DYNAMIC viewport
       reflows every time the mobile URL bar shows/hides mid-scroll (WebKit-266835 jank); svh is
       bar-visible-stable, so the pin holds steady across the scroll transit (N.WF1 A5). */
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1.5rem;
    /* O-DIR-2 — the owner's radius directive: the step's own rim (and the chip card below) read
       the PLATE register (--radius-plate, 6px), not glass-ui's --radius-card (16px, unset in
       atlas). The step's border-radius shapes the [data-active-step] gilt rim's box-shadow inset
       corner even off the focal path, so this stays in lockstep with the chip's own radius. */
    border-radius: var(--radius-plate, 6px);
    /* the recessive → active ramp — non-active steps dim, the active reads full. ONE 320ms ease on
       opacity + the rim box-shadow (NO `--step-t` scrub — the MVP transition is discrete). */
    opacity: 0.35;
    transition:
        opacity 320ms var(--ease-out-expo, ease-out),
        box-shadow 320ms var(--ease-out-expo, ease-out);
}
/* ── THE D3 ACTIVE-STEP RIM (the deft golden affordance — D3 at step grain), CONSUMING K-ACTIVE's ONE
   gilt home (A3). The rim alpha has ONE home — `--active-gilt`/`--active-glow`/`--active-rim-width`
   (tokens.css) — so a :5173/:4319 retune re-tunes BOTH the K-ACTIVE plate rim AND this step rim at
   once; `--sel-primary-ring` (= the shipped `--gold-ink`) is the gilt, no new hue. The IO singleton
   guarantees ONE rim on screen (the gold-scarcity / one-gilt-at-a-time law, BY CONSTRUCTION). KEPT
   under PRM (it is wayfinding INFORMATION) but DE-ANIMATED (the transition drops below). ── */
.sticky-scene__step[data-active-step] {
    opacity: 1;
    box-shadow:
        inset 0 0 0 var(--active-rim-width, 1.5px)
            color-mix(in oklab, var(--sel-primary-ring) var(--active-gilt, 38%), transparent),
        0 0 18px -6px
            color-mix(in oklab, var(--sel-primary-ring) var(--active-glow, 22%), transparent);
}
@media (prefers-reduced-motion: reduce) {
    .sticky-scene__step {
        transition: none; /* the rim + dim hard-set; no ease (scale-down, don't delete) */
    }
}
/* ── PHONE — the graphic pins to the TOP, the steps scroll beneath (the unified-chrome mobile sticky
   scene; no bottom/horizontal fork). The pin top is the OVERRIDABLE CSS VAR. ── */
@media (max-width: 1023px) {
    .sticky-scene {
        grid-template-columns: 1fr;
        --scene-pin-top: 8px;
    }
    .sticky-scene__graphic {
        z-index: 1;
        max-block-size: 56svh; /* the pinned map caps at ~half the fold; the steps read beneath (svh:
           the stable small-viewport unit — no reflow when the mobile bar toggles, N.WF1 A5) */
    }
    .sticky-scene__step {
        min-block-size: 64svh;
    }
}

/* ── THE MAP-PRIMACY FOCAL STAGE (O-A17 · the owner Map-primacy law, ruling 2) ─────────────────────
   The focal viz takes the FULL stage — a SINGLE track, the 50/50 split-pane is BANNED — and the steps
   STEP OVER the map as floating scrim-chips (Q-29: one at a time, hugging a dead-space corner, never a
   reserved side column). Purely ADDITIVE: every rule is under `.sticky-scene--focal`; a non-focal scene
   is byte-identical. The pin stays plain `position: sticky` (the shared `.sticky-scene__graphic` rule —
   NO JS pin-spacer). The `--pin-left/right` side register never applies (the host emits no pin class). */
@media (min-width: 1024px) {
    /* KILL the desktop `grid-template-columns: 1fr 1fr` — one track, the map owns the whole width. */
    .sticky-scene--focal {
        grid-template-columns: 1fr;
    }
    /* STACK the graphic + the steps in ONE cell (grid-row/column 1) so the chips OVERLAY the pinned
       map — never a beside-it column. The graphic is the stable full-stage anchor beneath; the steps
       float above (z-index), and the steps lane lets scroll+hover pass THROUGH to the live map. */
    .sticky-scene--focal .sticky-scene__graphic,
    .sticky-scene--focal .sticky-scene__steps {
        grid-column: 1;
        grid-row: 1;
    }
    .sticky-scene--focal .sticky-scene__graphic {
        z-index: 0;
        /* the map takes the FULL stage (the pin caps it at the viewport via the shared graphic rule). */
        max-inline-size: none;
    }
    .sticky-scene--focal .sticky-scene__steps {
        z-index: 1;
        /* the scrim-chip LANE hugs the dead-space corner — a contained width, never the half-stage. */
        justify-self: end;
        inline-size: min(30rem, 38vw);
        padding-inline-end: clamp(1rem, 3vw, 3rem);
        pointer-events: none; /* the map beneath stays interactive; the active chip re-enables below */
    }
}
/* THE SCRIM-CHIP (both viewports). The `<li>` step stays a TALL, TRANSPARENT scroll block (it keeps
   its scroll height so the IO still fires the active-step crossing — no JS pin-spacer) and merely
   CENTRES its chip; the visible card is the inner `.sticky-scene__chip`. The step's own dim/rim
   affordance (the base `opacity: 0.35` + the `[data-active-step]` rim) is NEUTRALIZED here — the focal
   register speaks through the chip's opacity instead. */
.sticky-scene--focal .sticky-scene__step {
    opacity: 1;
    padding: 0;
    box-shadow: none;
}
/* THE CHIP CARD — a floating scrim over the map's dead space, backdrop blur so the prose reads over ANY
   map tint. Q-29 ONE AT A TIME: recessive chips go FULLY transparent (step-over, NOT the ambient 0.35
   dim); the active chip alone reads. The 320ms opacity ease (inherited from the step transition, and
   dropped under PRM by the shared rule) carries the swap. */
.sticky-scene--focal .sticky-scene__chip {
    display: block;
    opacity: 0; /* one at a time — a recessive focal chip is GONE, not merely dimmed */
    pointer-events: none;
    padding: 1.25rem 1.5rem;
    /* O-DIR-2 — align the scrim-chip to the plate register (--radius-plate, 6px): the chip floats
       ON the plate frame, so it reads ONE corner register with it (was --radius-card, 16px — the
       owner-flagged mismatch). */
    border-radius: var(--radius-plate, 6px);
    background: color-mix(in oklab, var(--surface-card, Canvas) 82%, transparent);
    backdrop-filter: blur(10px) saturate(1.1);
    -webkit-backdrop-filter: blur(10px) saturate(1.1);
    box-shadow: 0 8px 28px -12px color-mix(in oklab, CanvasText 40%, transparent);
    border: 1px solid color-mix(in oklab, CanvasText 12%, transparent);
    transition: opacity 320ms var(--ease-out-expo, ease-out);
}
.sticky-scene--focal .sticky-scene__step[data-active-step] .sticky-scene__chip {
    opacity: 1;
    pointer-events: auto; /* the LIVE chip re-enables interaction; the map owns the rest of the stage */
}
@media (prefers-reduced-motion: reduce) {
    .sticky-scene--focal .sticky-scene__chip {
        transition: none; /* de-animate the chip swap under PRM (scale-down, don't delete) */
    }
}
/* ── FOCAL PHONE — the map still owns the full stage; the chip overlays anchored to the BOTTOM (the
   legible mobile map-scrolly position), one at a time. Single-column already; force the OVERLAY. ── */
@media (max-width: 1023px) {
    .sticky-scene--focal .sticky-scene__graphic,
    .sticky-scene--focal .sticky-scene__steps {
        grid-column: 1;
        grid-row: 1;
    }
    .sticky-scene--focal .sticky-scene__graphic {
        z-index: 0;
        max-block-size: calc(100svh - 2 * var(--scene-pin-top)); /* the FULL phone stage, not 56svh */
    }
    .sticky-scene--focal .sticky-scene__steps {
        z-index: 1;
        padding-inline: 1rem;
        pointer-events: none;
    }
    .sticky-scene--focal .sticky-scene__step {
        justify-content: flex-end; /* the chip rides the map's FOOT — the thumb-safe mobile read band */
        padding-block-end: 10svh;
    }
}
</style>
