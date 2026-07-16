<script setup lang="ts">
// HoverCard.vue — the ONE platform-owned entity hover card (FD1 §6.2; INV-6 — this Vue
// card IS the hover, every ECharts tooltip is OFF; D1.2 — the singleton transposition).
//
// THE TRANSPOSITION (D1.2 · D14 · D22). The card no longer takes a per-viz `open`/payload
// through props — it reads the ONE `useHoverReadout` platform store. The platform mounts
// exactly ONE of these at the app chrome (DashboardView); the pointer-owning viz PUBLISHES
// its payload, every other viz reads only `hoveredKey` for the linked raise. `open` is a
// derived `payload != null`, so two cards can NEVER be visible at once: there is one
// payload, one card. The N per-viz teleported shells, the global-`open` stacking, and the
// local-vs-store split (SchoolMap vs SciScatter) all dissolve into this one seam. The
// CONTENT swaps inside the one card (a payload change re-renders the facts) — the card
// itself is never mounted/unmounted per entity, so the cross-mark transit has no churn
// (the D12 "do not animate the swap" half: one eased presence, content swaps inside it).
//
// One card renders the facts grammar for any dashboard: USF's stateFacts, SCI's leaFacts,
// ECF's entityFacts all flow through the same `facts` row grid + an optional `breakdown`
// list (the per-program / per-tier bars, now STRUCTURED data in the payload, not per-viz
// markup — the publisher hands `{label,value,share,color}` bars, the card draws them).
//
// It floats on glass-ui's `<Surface tier="floating">` — the `floating` rung of the
// canonical 5-rung tier ladder (C.W6.b2 / AS-8 · cap-glass-ui §6). The transient hover card
// reads as "above" by its TIER NAME, not a hand-tuned blur. The card is body-teleported,
// viewport-clamped, lifted above the resting panels, pointer-events OFF (so it never steals
// the hover that spawned it).
//
// D2 (C.W5.3 de-storm) — the teleported subtree is kept MOUNTED across the whole session;
// `open` toggles `visibility`/`opacity` (a paint-only flip), NOT a `v-if` teardown.
//
// D3 / D1-AUGMENT-5 — the card anchors to the hovered DATUM geometry (the mark's bbox
// centroid, in `readout.anchor`), recomputed ONCE per ENTITY change by the publishing viz,
// NOT chased per mousemove off the cursor. ONE anchoring law lives in this store/card seam.
//
// THE TRANSIENT-HOVER DECOUPLE (J-FILTER C32 · J-FEEDBACK-4 §4 · the clean SUBTRACTION). The card
// surface is LIVE-HOVER-ONLY: it renders ONLY the transient tier (driven by `hoveredKey`/`hoverOrigin`
// via the store's `readout`), and VANISHES on `mouseleave` (`hoverOrigin→null` → the card unmounts;
// `document.querySelector('[data-testid=hover-card]')` is `null`). The committed `{transient}∪{pinned}`
// union (the old `HoverCard.vue:371-394`) is RETIRED — the PERSISTENT readout tier MIGRATES to the
// FilterView card (`[data-testid=filter-view]`), sourced from `useSelection.selectedKeys` (already the
// single source of truth — the store's `pinnedReadouts` eviction off `selectedKeys` is unchanged). So
// the hover "doesn't disappear" defect is cured by construction: there is no pinned tier on this
// live-hover surface to linger after the pointer leaves; a deep-linked / keyboard selection renders the
// persistent FilterView card with NO hover at all (touch/keyboard/deep-link are STRENGTHENED).
//
// J-ABSORB re-open→re-close stanza (the keep-local ledger, C22/DEP-3): HoverCard re-opened@J-FILTER (the
// transient-hover decouple — the union split, the live-hover surface now transient-ONLY) → re-closed@
// J-FILTER (HoverCard STAYS atlas-local + transient-only; the persistent tier MIGRATES to the FilterView
// facility, sourced from `selectedKeys`; the J-ABSORB MetricStack-absorption residual is UNCHANGED).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Surface } from "@mkbabb/glass-ui/surface";
import ReadoutFacts from "../charts/readout/ReadoutFacts.vue";
import { useHoverReadout, type HoverReadout } from "../platform/stores/useHoverReadout.js";
import { useAffordanceHint } from "./useAffordanceHint.js";
import { MQ } from "../design/foundations/breakpoints.js";
import { transientSeat } from "./useCardPlacement.js";
import { useDismissArbiter } from "../platform/interaction/useDismissArbiter.js";
import { createHoverBridge } from "./hover-bridge.js";

/** A single labelled fact in the grid (the universal fact-row). */
export interface Fact {
    label: string;
    value: string;
    /** Optional accent dot colour (e.g. a tier hue or the net-direction pole). */
    accent?: string;
    /** When true, a hairline rule precedes this row — the tier divider (e.g. ECF's spine →
        credentials boundary, d-hover-ecf Move 1). Optional + additive; default no rule. */
    divider?: boolean;
}

// The ONE platform readout store — the surface renders ONLY the TRANSIENT tier now (the union is
// retired, J-FILTER C32). `readout` is the cursor-chasing register; the PERSISTENT/pinned set is no
// longer rendered here — it migrated to the FilterView card, sourced from `selectedKeys`. There are
// no payload props (the per-viz mounts are gone — D1.2).
const store = useHoverReadout();
const sourceReadout = computed(() => store.readout);
const bridgedReadout = ref<HoverReadout | null>(null);
const readout = computed(() => bridgedReadout.value ?? sourceReadout.value);

// ── THE FIRST-VIZ AFFORDANCE MICRO-LIFT (I-UX.b · UX-D1) ───────────────────────────────────────
// The one-time, PRM-fenced, session-once micro-lift on the first interactive viz's first scroll-into-
// view — the discoverability hint that teaches "these marks move" without a modal/coachmark. Mounted
// HERE on the app-singleton readout surface so there is exactly ONE observer for the whole app (it
// co-locates with the other discoverability surfaces); the composable owns its own IO + latch + fence.
useAffordanceHint();
// The transient card renders only when a hover is live AND it has a MEASURED datum anchor AND its
// The card opens when a hover is LIVE and it has a MEASURED datum anchor (J-FILTER C32 — the
// transient-only register; the pinned tier is retired). The `anchor != null` clause is the
// Anchor|null contract's paint guard (H.W1.a): a payload with no settled geometry (the unmeasured
// `{0,0}` floor the store nulls) carries `anchor: null` and is therefore UNREPRESENTABLE as a
// painted card — the at-rest (16,16) sentinel ghost is gone at the source.
// `!tapPeek.value` is the I-MOBILE §V suppression: on the coarse-pointer PHONE register the
// transient card must NOT paint — the platform ReadoutSheet (a bottom sheet) takes over the
// mobile readout, so the old right-margin tapPeek fork is retired by keeping the card HIDDEN
// there. The DESKTOP pointer path is byte-unchanged (`tapPeek` is false off the coarse-phone media).
const transientOpen = computed(
    () =>
        readout.value !== null && readout.value.anchor !== null && !tapPeek.value,
);

// The card element — clamped to its OWN measured footprint, never a magic 280 (H-5/B2).
// The ref lands on the <Surface> COMPONENT (single-root), so we read its `$el` for the
// rect (a component ref is the instance, whose `$el` is the rendered root div). `measureEl`
// resolves either a raw element or the instance's `$el` so the measure stays robust.
const card = ref<{ $el?: HTMLElement } | HTMLElement | null>(null);
const footprint = ref({ w: 320, h: 200 }); // a sane pre-measure default (max-w-xs ≈ 320)

/** The TRANSIENT card's template ref (the single live-hover card — the pinned tier is retired). */
function setCardRef(el: unknown): void {
    card.value = (el as { $el?: HTMLElement } | HTMLElement | null) ?? null;
}

/** Resolve the measurable DOM node from the Surface component ref (its `$el`). */
function measureEl(): HTMLElement | null {
    const c = card.value;
    if (!c) return null;
    if (c instanceof HTMLElement) return c;
    return (c.$el as HTMLElement | undefined) ?? null;
}

let pointer = { x: Number.NaN, y: Number.NaN };
const hoverBridge = createHoverBridge({
    anchor: () => {
        const anchor = bridgedReadout.value?.anchor;
        return anchor
            ? { left: anchor.x - 6, right: anchor.x + 6, top: anchor.y - 6, bottom: anchor.y + 6 }
            : null;
    },
    card: () => measureEl()?.getBoundingClientRect() ?? null,
    onRelease: () => (bridgedReadout.value = null),
});
watch(
    sourceReadout,
    (next) => {
        if (next) {
            if (bridgedReadout.value && hoverBridge.holdsPoint(pointer.x, pointer.y)) return;
            bridgedReadout.value = next;
            hoverBridge.engage();
        } else if (bridgedReadout.value) {
            hoverBridge.release();
        }
    },
    { immediate: true },
);
function trackPointer(event: PointerEvent): void {
    pointer = { x: event.clientX, y: event.clientY };
}
onMounted(() => window.addEventListener("pointermove", trackPointer, true));
onBeforeUnmount(() => {
    window.removeEventListener("pointermove", trackPointer, true);
    hoverBridge.destroy();
});

// Re-measure when the TRANSIENT card opens or its content/position changes (the facts grid
// resizes the card). `nextTick` lets the DOM lay out before `getBoundingClientRect`. The pinned
// cards seat by anchor/rail with their own clamp and do not feed this transient footprint.
watch(
    () =>
        [
            transientOpen.value,
            readout.value?.anchor?.x,
            readout.value?.anchor?.y,
            readout.value?.title,
        ] as const,
    async () => {
        if (!transientOpen.value) return;
        await nextTick();
        const el = measureEl();
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) footprint.value = { w: r.width, h: r.height };
    },
    { immediate: true },
);

// ── C7.c · THE MOBILE TAP REGISTER — SUPPRESS the transient card (J-MOBILE §3) ──────────
// On the desktop pointer register the card hugs the hovered DATUM (clamped to the anchor).
// On the phone there is NO hover — the readout is summoned by a TAP on a map mark, and
// chasing the finger would seat the card UNDER the thumb. The OLD answer was a right-margin
// peek (the forked idiom); J-MOBILE retires that fork: at the coarse-pointer phone register
// the transient card does NOT paint at all (`!tapPeek.value` gates `transientOpen`), and the
// platform `ReadoutSheet` bottom-sheet — the ONE thumb-reach answer, raised from the bottom
// edge — owns the mobile readout. So `tapPeek` is now a pure SUPPRESSION flag (the card is
// hidden on that register), not a placement fork. The desktop pointer path is byte-unchanged.
const tapPeek = ref(false);
let peekMql: MediaQueryList | null = null;
function syncPeek(): void {
    tapPeek.value = peekMql?.matches ?? false;
}
onMounted(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    // the tap register: a narrow phone viewport AND a coarse pointer (the touch device).
    peekMql = window.matchMedia(MQ.phoneTouch);
    syncPeek();
    peekMql.addEventListener("change", syncPeek);
});
onBeforeUnmount(() => {
    peekMql?.removeEventListener("change", syncPeek);
    peekMql = null;
});

// Clamp off the MEASURED footprint: left so `x + pad + w ≤ innerWidth − pad`, top likewise. The
// open/close is now a real `v-if` TEARDOWN on the template (J-FILTER C32 — `mouseleave` vanishes the
// card; `document.querySelector('[data-testid=hover-card]')` is `null`), NOT the old D2 mounted-hidden
// `visibility` paint-flip. So `style` carries ONLY the seat geometry; presence is the `v-if`.
const style = computed(() => {
    const pad = 16;
    // THE Anchor|null PAINT GUARD (H.W1.a) — a null anchor is "no measured datum"; `transientOpen`
    // already AND's in `anchor != null`, so the v-if never mounts the card at the origin floor; we
    // read a zero fallback ONLY to compute a stable position string, never to paint one.
    const anchor = readout.value?.anchor ?? { x: 0, y: 0 };
    const vw =
        typeof window !== "undefined"
            ? window.innerWidth
            : anchor.x + footprint.value.w + 2 * pad;
    const vh =
        typeof window !== "undefined"
            ? window.innerHeight
            : anchor.y + footprint.value.h + 2 * pad;
    // THE TRANSIENT SEAT (the colocated placement geometry, AR-8) — the viewport-clamp, one law in
    // useCardPlacement. The right-margin `tapPeek` fork is REMOVED from the seat math (J-MOBILE §3).
    const { left, top } = transientSeat(anchor, footprint.value, { vw, vh });
    return {
        // `position: fixed` is set inline (it WINS over Surface's root `position: relative`) so
        // the teleported floating card is viewport-clamped, not flow-relative.
        position: "fixed" as const,
        left: `${left}px`,
        top: `${top}px`,
    };
});

// ── J-FILTER C43 · CLICK-AWAY DISMISS (parity with Esc) ──────────────────────────────────────────
// The transient surface is pointer-events:NONE (the live-hover register), so a click on a datum / the
// page chrome never lands on the card. A document-level outside-click dismisses the transient readout
// with the SAME contract as Esc — `store.clear(origin)` (the readout-clear, NEVER a scroll reset, C43
// esc-no-scroll parity). Guarded so a click on a producer's own mark (which selects + re-publishes)
// does not race the clear: we only clear when the click landed OUTSIDE any interactive viz plate.
useDismissArbiter().claim(() =>
    readout.value
        ? {
              id: "hover-card",
              priority: 10,
              outsidePointer: true,
              escape: true,
              within: (path) => path.some((node) => node instanceof HTMLElement && Boolean(node.closest("[data-testid='hover-card']"))),
              guards: (path) => path.some((node) => node instanceof HTMLElement && Boolean(node.closest("[data-viz-plate],[data-testid='filter-view']"))),
              onDismiss: () => store.clearAll(),
          }
        : null,
);

// ── THE LIFECYCLE — Esc=clearAll (kills the ghost) + route-change clears (H.W1.a · §3) ─────────
// Both gestures are PLATFORM dismissals (not a producer's leave), so they route through the store's
// origin-agnostic `clearAll()` (blanks the transient + the pin tier). They live HERE — co-located
// with the one platform card, inside this app-singleton component — so the card facility owns its
// own lifecycle without reaching into the chrome shell or the route view (the unit stays disjoint).
//
// ESC: a free Escape clears any visible readout (the at-rest ghost too — it has no selection for the
// shell's selection-Esc to clear). We DEFER to a higher-priority overlay or an editable field (their
// own Escape owns that keystroke) so this never double-handles a popover/drawer/input dismiss. The
// shell's selection-Esc clears `selectedKeys` on the same keystroke; the pin tier is a projection of
// that set, so the two stay in lockstep — `clearAll()` is the belt that also drops the transient ghost.

// ROUTE-CHANGE: the readout store is an app-singleton (NOT route-scoped like `selectedKeys`'s
// `?sel=` codec), so a navigation must explicitly drop any stale card/pin before the next dashboard
// paints — otherwise a card from /sci could ride into /ecf. The card is mounted inside the router,
// so `useRoute().path` is reactive; clearing on path change is the route-scoped dismiss. This is a
// store-only `clearAll()` — it carries NO scroll seek (C43 esc-no-scroll parity on the route path).
const route = useRoute();
watch(
    () => route.path,
    () => store.clearAll(),
);

// THE LONG-NAME RECONCILIATION (G-NAME-RECONCILE) — the transient card is TERSE (a long title clamps
// to 2 lines); the full string rides the native `title`. The marquee is REJECTED (§5 R-3); the reveal
// is clip + the native tooltip (zero rAF, G-NO-MARQUEE-MOTION). The fact-value half lives in
// `<ReadoutFacts>`. The PINNED-complete relax now lives on the FilterView card (the persistent tier).
</script>

<template>
    <Teleport to="body">
        <!-- THE TRANSIENT-ONLY CARD (J-FILTER C32 — the decouple). The card is LIVE-HOVER-ONLY: a real
             `v-if="transientOpen"` TEARDOWN, so on `mouseleave` (`hoverOrigin→null` → `readout` clears)
             the node UNMOUNTS — `document.querySelector('[data-testid=hover-card]')` is `null`. The
             committed `{transient}∪{pinned}` union v-for is RETIRED; the PERSISTENT tier migrated to the
             FilterView card (sourced from `selectedKeys`). The card is pointer-events:NONE (the cursor-
             chasing register never steals the hover that spawned it) — dismissal is Esc / a click-away.

             THE FLOATING TIER (AS-8) — glass-ui's <Surface tier="floating">. The card takes the
             measure ref; the seat geometry rides `style` (presence is the `v-if`, not a visibility flip). -->
        <Surface
            v-if="transientOpen && readout"
            :ref="(el) => setCardRef(el)"
            tier="floating"
            class="hover-card-readout z-hovercard pointer-events-auto max-w-xs px-3 py-2.5 transition-opacity duration-100"
            :style="style"
            role="tooltip"
            data-testid="hover-card"
            :data-readout-origin="readout.origin || undefined"
        >
            <!-- THE TWO-TIER HEAD (d-hover-* M2): the eyebrow is the LEDE (the verdict word /
                 the entity kind), the subhead its CONTEXT (the plate's own question). The card-
                 level `accent` (the verdict/category pole) tints the eyebrow + the title's
                 leading hairline ONE place, never threaded per-fact. Both tiers optional. -->
            <p
                v-if="readout.eyebrow"
                class="eyebrow mb-0.5"
                :class="{ 'readout-eyebrow--ink': readout.accent }"
                :style="readout.accent ? { '--readout-accent': readout.accent } : undefined"
            >
                {{ readout.eyebrow }}
            </p>
            <p v-if="readout.subhead" class="hover-card-readout__subhead">
                {{ readout.subhead }}
            </p>
            <!-- THE LONG-NAME RECONCILIATION (G-NAME-RECONCILE) — the title CLAMPS to 2 lines at
                 rest (the transient register). The full string is on `title=` at all times so the
                 name is never lost; the persistent-complete relax lives on the FilterView card. -->
            <p
                class="text-panel-title hover-card-readout__title"
                :class="{ 'hover-card-readout__title--accented': readout.accent }"
                :style="
                    readout.accent ? { '--title-accent': readout.accent } : undefined
                "
                :title="readout.title"
            >
                {{ readout.title }}
            </p>

            <!-- THE SHARED FACT GRAMMAR (I5 §6 · DRY) — the `<dl>` fact grid + the breakdown bars,
                 extracted to `<ReadoutFacts>` so the hover card + the FilterView card render ONE
                 fact language. The markup/classes/skin are byte-identical to the prior inline blocks. -->
            <ReadoutFacts
                :facts="readout.facts"
                :density="readout.density"
                :breakdown="readout.breakdown"
                :breakdown-label="readout.breakdownLabel"
            />
        </Surface>
    </Teleport>
</template>

<style scoped>
/* O-DIR-2 — the owner's radius directive: the cursor-chasing hover card floats ON the plate, so it
   reads the PLATE register (--radius-plate, 6px) — was Tailwind `rounded-lg` (glass-ui's --radius,
   0.625rem = 10px, a THIRD register). Scoped + unlayered, so this beats glass-ui's layered utility. */
.hover-card-readout {
    border-radius: var(--radius-plate);
}

/* O-C7 D5 — the eyebrow tints to the hovered datum's fill as a READABLE INK (the ecf-readout
   disease cure): hue survives, L clamps to the contrast band per theme. The template sets the raw
   datum fill on --readout-accent (a NON-text carrier that still tints the title's leading hairline);
   the words go readable. Scoped, so this beats the global .eyebrow base color. */
.readout-eyebrow--ink {
    color: light-dark(
        oklch(from var(--readout-accent) min(l, 0.52) min(c, 0.17) h),
        oklch(from var(--readout-accent) max(l, 0.75) min(c, 0.15) h)
    );
}
/* ── THE TWO-TIER HEAD (d-hover-* M2) — the subhead + the accented title hairline ─────────
   The eyebrow (the recipe's red-ruled label) carries the VERDICT/KIND lede; the subhead is the
   recessive CONTEXT line beneath it (the plate's question), in the muted caption voice; the
   title's leading hairline wears the card-level `accent` (the verdict/category pole) so the
   spine read is one engraved rule, not a per-fact dot. All additive — a payload with no
   subhead/accent renders neither rule. */
.hover-card-readout__subhead {
    margin-block: -0.05rem 0.15rem;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.01em;
    line-height: 1.25;
    color: var(--muted-foreground);
}
.hover-card-readout__title--accented {
    /* the verdict/category pole as a short leading hairline before the name — the spine read */
    border-inline-start: 2px solid var(--title-accent, transparent);
    padding-inline-start: 0.45rem;
    margin-inline-start: -0.45rem;
}

/* ── THE LONG-NAME RECONCILIATION (F6.10 §2.2 / G-NAME-RECONCILE) — clip-at-rest / full-on-pin ──
   The user's "names cutoff": at REST (the transient card) a long TITLE CLAMPS to 2 lines + ellipsis
   so a long firm name never detonates the card height while chasing the cursor (the HEAD defect:
   it wrapped to 3 lines / a 545px-tall card). The full string lives on `title=` always. The PINNED
   card (the persistent, no-longer-chasing register) lifts the clamp → the title reads in full,
   room to breathe. ONE law: transient-terse / pinned-complete. The marquee is REJECTED (§5 R-3) —
   the reveal is clip→full-on-pin + the native tooltip, ZERO rAF (the G-NO-MARQUEE-MOTION control). */
.hover-card-readout__title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
}
/* THE FACT VALUE + THE TIER DIVIDER skins MOVED to `<ReadoutFacts>` (I5 §6 · DRY) — the value-clip
   reconciliation (`overflow: visible` + the `:deep(.figure-slug-card)` fit/wrap) and the hairline
   divider ride WITH the extracted fact grammar, so both surfaces (this card + the FilterView card) read
   one fact skin. The mobile readout floors below still reach the FigureSlug via the descendant
   `:deep` off `.hover-card-readout`, unchanged. The PINNED register + the pin-pip skins are RETIRED
   (J-FILTER C32 — the persistent/compare tier migrated to the FilterView card). */

/* ── THE ECF CARD-CLASS MIN-MEASURE (d-hover-ecf Move 4 · cohesion) ────────────────────────
   The three ECF cards were three hand-set footprints (203–320px); the consultant card was the
   narrowest despite carrying the most rows. A min-inline-size on the ECF cards (keyed off the
   `data-readout-origin` the card now stamps) gives the route's three siblings ONE footprint, so
   they read as one card-language — never a platform default change (USF/SCI cards keep theirs). */
.hover-card-readout[data-readout-origin^="ecf-"] {
    min-inline-size: 300px;
}

/* ── C7.c (FIX 5) · THE MOBILE READOUT FLOORS (the tap-to-explain peek) ────────────────
   At the phone tap register the summoned right-peek readout must stay legible at arm's length:
   the BODY text (the entity title + each fact value) floors at 13px, the LABEL text (the
   eyebrow + each fact label) floors at 11px (the §8 readout floors). These are MOBILE
   PROPERTIES on the SAME card — gated by @media so the desktop hover card is byte-unchanged.
   (The teleported card retains its scope-id attribute, so these scoped rules reach it on body.) */
@media (--phone) {
    /* BODY — the title + the fact-value figures (the card's :deep FigureSlug cell). */
    .hover-card-readout .text-panel-title {
        font-size: max(13px, 1rem);
    }
    .hover-card-readout :deep(.figure-slug-card) {
        font-size: max(13px, var(--type-figure-card));
    }
    /* LABEL — the eyebrow + the subhead + the fact-row labels. */
    .hover-card-readout .eyebrow,
    .hover-card-readout__subhead,
    .hover-card-readout .text-caption {
        font-size: max(11px, 0.75rem);
    }
}
</style>
