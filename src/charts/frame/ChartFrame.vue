<script setup lang="ts">
// ChartFrame.vue — the ONE engraved-plate backplate (FD1 §5.2; B.md INV the
// radial-glow source fix). Every chart mounts on a FLAT warm-paper plate
// (`bg-card`), NEVER a glass lens — that is exactly what kills the glass-ui
// dark-radial-glow at the source, so the data reads clean.
//
// The plate is bordered not by a flat 1px line but a DOUBLE-RULE engraved frame
// (the atlas / banknote signature): an outer hairline, a hair-gap mat in the
// page paper, and a heavier inner rule — rendered as the stacked box-shadow in
// the scoped `.plate` recipe (FD1 §5.2). The small `--radius-plate` (6px) is the
// editorial tell — print plates have crisp corners, not the soft 16px of app
// cards.
//
// Slots: an `eyebrow` kicker, a `title`, a `legend` strip, an `actions` mount (the
// stable top-right rung region, see below), and the default body (the chart). The header
// collapses cleanly when its slots are empty, so a bare `<ChartFrame><MyChart/></ChartFrame>`
// is a flush plate with no chrome.
//
// THE PER-VIZ EXPAND SEAM (HD-E5 — C2-owned seam, C3.4 mounts the expand). ChartFrame is the
// REAL chart-body plate, so it is where the per-viz EXPAND affordance lands — NOT on
// FigureInitial (the dropped-cap SVG glyph, which has no chart body). C2 landed the STABLE
// `.plate`/title-rung contract; C3.4 mounts the glass-ui <ExpandableContainer> ON it:
//   • the chart body is wrapped in <ExpandableContainer> (the glass-ui primitive, CONSUMED
//     not hand-rolled): it ships the quiet corner expand/collapse buttons, the ref-counted
//     body-overflow lock (so the page cannot scroll behind the fullscreen plate), the
//     Escape-to-close shortcut, the Teleport-to-body fullscreen layer, and the two-way
//     `open` model — all from the library, never re-derived;
//   • the expand is URL-ADDRESSABLE: a `figId` opens a `?fig={figId}` deep-link via
//     useUrlState, so a copied fullscreen URL reconstructs the expanded plate on reload
//     and closing it clears the param (the round-trip is one codec);
//   • the trigger is QUIET-BY-DEFAULT (opacity 0), revealing only on plate hover/focus,
//     engraved into the plate corner so a plate at rest is byte-identical to the C2 plate;
//   • return-focus: the primitive handles Escape + overflow-lock but NOT focus return, so
//     the frame captures the trigger on open and restores it on close (the AX contract the
//     hand-roll lacked).
// Every chart that routes through ChartFrame gets the expand from this ONE seam — the only
// known bypasser is the USF RankedStrip companion (a sibling strip whose root is a bare
// <div>, not a ChartFrame), which is intentionally frame-less and carries no expand.
// A plate without a `figId` still gets the local corner expand (the primitive default), it
// just is not deep-linkable — the URL addressing is opt-in per consumer.
//
// ── I2.a — ChartFrame IS NOW A PRIVATE VizPlate INTERNAL (the BIG-BANG compose-into-host) ─────
// VizPlate.vue (the unified Viz-contract host) MOUNTS this component internally to inherit the
// engraved frame, the `?fig=` URL-addressable expand, the per-plate error boundary, the headline-
// straddle, and the legend-dock — and lays the §E/§B furniture (the E1 description, the B4
// key-stats, the E2 options trigger, the E3 export glyph, the E8 designed-void swap) AROUND the
// body via the existing slots (`#title`, `#legend`, `#actions`, the `{fullscreen}` default body).
// Those slot seams are UNCHANGED (every not-yet-migrated plate that still mounts ChartFrame this
// wave keeps working byte-for-byte); the compose-into-host is achieved by VizPlate driving those
// SAME slots, never by re-implementing the frame. The `#actions` rung now carries the export glyph
// + the options trigger (VizPlate-supplied) beside the expand seam, and the default body is where
// VizPlate swaps the designed-void in on the empty-data signal — the chart-slot void swap lives in
// the CONSUMING host (VizPlate), the frame just renders whatever the slot yields (a chart OR a
// <PlateVoid>), so the swap needs no frame change. No consumer mounts ChartFrame directly anymore.
//
// The `size` selects the plate's register (K3). `default` is the modest 460px-scatter
// frame — the workhorse, unchanged. `hero` is the FLAGSHIP plate (the SCI band-cake, the
// ECF choropleth, the USF hero): a more generous gutter, the print-crisp double-rule made
// heavier, and the inner title set at the `text-hero` (φ²) rung — so the centerpiece is
// visibly the plate the eye lands on first, never identical to a consequence scatter
// (SC-P0-1 / FD1 §5). The host height is the consumer's to set (chart-h-lg+ for a hero);
// the frame just supplies the matching chrome scale.
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onErrorCaptured,
    onMounted,
    provide,
    ref,
    useSlots,
    watch,
} from "vue";
import { ExpandableContainer } from "@mkbabb/glass-ui/expandable-container";
import { useViewParams } from "@/platform/stores/useViewParams";
import { EXPAND_SETTLE_KEY } from "@/charts/scene/expand-settle";
import PlateError from "@/charts/frame/PlateError.vue";

const props = withDefaults(
    defineProps<{
        /** The figure number / kicker, set in mono caps above the title. */
        eyebrow?: string;
        /** Accessible label for the figure region. */
        ariaLabel?: string;
        /** The plate register — `default` (the 460px workhorse) or `hero` (the flagship
            plate: a larger gutter + the `text-headline` inner title). Default `default`, so
            every existing plate is byte-identical. */
        size?: "default" | "hero";
        /** The per-viz EXPAND deep-link slug (the `?fig=` value). When set, the plate's
            fullscreen state round-trips through the URL: `?fig={figId}` opens this plate
            fullscreen on load, and closing clears the param. When ABSENT the corner expand
            still works (the glass-ui default), it is just not URL-addressable. */
        figId?: string;
        /** The KEY-zone legend policy (the E5a three-zone band — wave F2 §1):
            · `inline` — the legend rides the KEY column of the header grid (the default; the
              byte-identical top-right rung every current consumer reads);
            · `rail`   — the legend docks to a hero-register SIDE RAIL beside the data (the
              7+-chip tower's home: the SCI tier ledger reads down the side of its cake), so a
              tall key never crams the masthead. Hero plates only; folds to inline at ≤640;
            · `none`   — no KEY zone (a plate whose key lives in the viz itself). */
        legendDock?: "inline" | "rail" | "none";
        /** The headline posture (the F6.1 STRADDLE — wave F2 §1):
            · `straddle` — the `#headline` cluster RIDES the plate's top bezel (its midline on
              the rim, half on page paper above, half re-entering below the engraved figure-
              rule), lifted by a MEASURE-DERIVED `--headline-lift` (never a literal — the band's
              own measured half-height). The hero default;
            · `inline`   — the band sits in normal flow at the plate top (the mobile fold, and
              the safe posture for a non-hero headline). The straddle folds to this at ≤640. */
        headline?: "straddle" | "inline";
        /** Render the masthead title RUNG. FALSE when the wrapping beat owns the title (the K-F
            title-dedup seam) — suppresses the `text-panel-title` wrapper itself (NOT just its text),
            so no empty rung reads as a leading ghost. Default TRUE (standalone/?fig=/gallery paint). */
        showTitle?: boolean;
    }>(),
    {
        eyebrow: undefined,
        ariaLabel: "Chart",
        size: "default",
        figId: undefined,
        legendDock: "inline",
        headline: undefined,
        showTitle: true,
    },
);

const slots = useSlots();

/** The hero plate reads the `text-headline` title rung + the more generous gutter (K3). */
const isHero = computed(() => props.size === "hero");

/** The legend's KEY-zone disposition. `rail` is a hero-register affordance only — a workhorse
    plate's key never earns the side rail, so a stray `legendDock="rail"` on a default plate
    falls back to the inline KEY column. */
const dock = computed<"inline" | "rail" | "none">(() =>
    props.legendDock === "rail" && !isHero.value ? "inline" : props.legendDock,
);
/** The legend renders inline in the KEY column (the default) only when it is not railed/none. */
const legendInline = computed(() => !!slots.legend && dock.value === "inline");
/** The legend renders down the side rail (hero-register tall key). */
const legendRailed = computed(() => !!slots.legend && dock.value === "rail");

// ── THE HEADLINE BAND + STRADDLE POSTURE (F6.1 / f6-breakout-titles §2.1 — the keystone) ──
// ChartFrame mints the `headline` BAND zone: a first-class slot rendered in `.plate-headline`,
// its own UN-GRIDDED ground, closed from the data by the engraved figure-rule. The STRADDLE
// posture lifts the band so its vertical midline rides the plate's top bezel — half on the
// page paper above, half re-entering the plate below the rule (INV-F2, "literally sitting on
// top of the container, not in it"). The lift is MEASURE-DERIVED, never a literal: USF's 601px
// cluster vs SCI's 144 vs ECF's 227 proves one literal mis-straddles 2/3 (f6-breakout R-caveat).
//
// The mechanism is a NEGATIVE MARGIN (layout-honest), not a transform: `margin-block-start:
// -50%-of-the-band's-own-height` pulls the band up by half its measure so the midline lands on
// the bezel, AND pulls the following data viewport up under the band's lower half — so the
// plate's height stays honest (a transform would leave a layout ghost). The half-height is the
// `--headline-lift` we measure here and publish to the plate; the grid `::before` reads it to
// FENCE the grid below the band's re-entrant half (the data keeps its graph paper; the band's
// lower half sits on flat --card).
const hasHeadline = computed(() => !!slots.headline);
/** The resolved posture: straddle is the hero default; a non-hero headline (or an explicit
    `headline="inline"`) sits in flow. The ≤640 fold to inline is a CSS container concern. */
const headlinePosture = computed<"straddle" | "inline">(() => {
    if (props.headline) return props.headline;
    return isHero.value ? "straddle" : "inline";
});
const straddling = computed(
    () => hasHeadline.value && headlinePosture.value === "straddle",
);

/** The band element — measured for the straddle lift. */
const headlineEl = ref<HTMLElement | null>(null);
/** Half the band's measured block-size, in px — the straddle lift (`--headline-lift`). The
    band's midline rides the bezel when it is pulled up by exactly this much; the grid fences
    below exactly this much. Zero until measured (so the first paint is in-flow, never a jump
    to a guessed literal — the band measures, then lifts on the next frame). */
const headlineLift = ref(0);
let headlineRO: ResizeObserver | null = null;

function measureHeadline(): void {
    const el = headlineEl.value;
    if (!el) {
        headlineLift.value = 0;
        return;
    }
    // round to a device px so the lift is stable under sub-pixel reflow (no jitter loop).
    headlineLift.value = Math.round(el.getBoundingClientRect().height / 2);
}

onMounted(() => {
    if (!hasHeadline.value) return;
    measureHeadline();
    if (typeof ResizeObserver !== "undefined" && headlineEl.value) {
        headlineRO = new ResizeObserver(() => measureHeadline());
        headlineRO.observe(headlineEl.value);
    }
});
onBeforeUnmount(() => {
    headlineRO?.disconnect();
    headlineRO = null;
});
// Re-measure when the posture flips (straddle ⇆ inline at the mobile fold re-flows the band).
watch(straddling, () => void nextTick(measureHeadline));

/** The plate's straddle CSS vars — only published while straddling (an inline band carries no
    lift, so the in-flow posture is byte-clean). `--headline-lift` drives BOTH the band's
    negative-margin lift AND the grid `::before` top inset (one measured source, two consumers). */
const plateVars = computed<Record<string, string>>(() => {
    const vars: Record<string, string> = {};
    if (straddling.value) vars["--headline-lift"] = `${headlineLift.value}px`;
    return vars;
});

// ── PER-PLATE ERROR ISOLATION (C8.3 / pf-hardening H2) ────────────────────────────────
// A throwing viz must NOT take down the route. Pre-C8 there was NO error boundary
// anywhere — a malformed EChartsOption, a `null.x` in a chart computed, or a failed lazy
// chunk propagated to the route root and WHITE-SCREENED the whole dashboard. ChartFrame is
// the ONE chart-body seam every viz routes through, so the boundary lands HERE: an error
// in the chart slot is CAPTURED, the body swaps to the quiet PlateError fallback card, and
// the throw is stopped (return false) so it never reaches the route. Every sibling plate
// and the chrome keep rendering — the isolation is per-figure.
const errored = ref(false);

onErrorCaptured((err) => {
    errored.value = true;
    // eslint-disable-next-line no-console
    console.error(
        `[ChartFrame] viz "${props.ariaLabel}" threw — showing fallback`,
        err,
    );
    return false; // stop propagation: the route survives, only this plate degrades.
});

/** Re-attempt the chart render — clears the fallback so the slotted viz re-renders. A
    transient failure (a chunk blip) can recover without a full page reload. */
function retry(): void {
    errored.value = false;
}

// ── The per-viz EXPAND — the TWO-ARM model (CP-8 / A7 · D7) ───────────────────────────
// `open` is ONE two-way computed with TWO backings, chosen by whether the consumer opted
// into URL-addressing:
//
//   • figId SET  → the URL arm. `?fig=` is the document's expanded-plate state (the INV-5
//     URL-as-document principle useUrlState already carries the year-scope through): a plate
//     is fullscreen iff `?fig=` equals its `figId`, so a copied URL reconstructs the
//     expansion and only ONE plate can be expanded at a time (a second plate's `figId`
//     overwrites the param, collapsing the first).
//   • figId NULL → the LOCAL-BOOLEAN arm. No consumer is forced to mint a slug for a plate
//     that need not be deep-linkable — the corner expand still WORKS (a plain `ref(false)`).
//     This is the documented fallback the file header promises; without it (the prior
//     early-return) the primitive's model was bound-but-write-rejected, so every figId-less
//     plate — every plate today — had a DEAD trigger (D7).
//
// The glass-ui primitive owns the body-overflow lock + Escape-to-close + the corner buttons;
// this layer binds the model to its backing and returns focus on collapse.
//
// THE `?fig` ONE-BAG FOLD (K-ANIM A1·§3.C). The expand reads/writes `?fig` off the ONE shared
// `useViewParams` bag — never a private per-component URL-state bag. A private bag replaceStates
// the WHOLE query from its OWN mount-time state (re-syncing only on `popstate`), so it silently
// reverts `?year`/`?sel`/filter cells on an enlarge/collapse (the source-verified whole-query
// clobber). Routing through `view.figId`/`openFig`/`closeFig` leaves `useViewParams.url` the SOLE
// dashboard-query writer, closing the clobber for EVERY param — and the `k0-one-url-bag` gate flips.
const view = useViewParams();

/** The local fullscreen flag — the backing for figId-less plates (the documented fallback). */
const localOpen = ref(false);

// The element focused when the plate expanded — restored when it collapses (the primitive
// locks scroll + handles Escape, but does NOT return focus; this closes that AX gap).
let returnFocusEl: HTMLElement | null = null;

const open = computed<boolean>({
    get() {
        // The LOCAL arm: a figId-less plate reads its own ref (the corner expand fallback).
        if (props.figId == null) return localOpen.value;
        // The URL arm: fullscreen iff `?fig=` names THIS plate (read off the ONE shared bag).
        return view.figId === props.figId;
    },
    set(value) {
        if (value) {
            returnFocusEl = (document.activeElement as HTMLElement | null) ?? null;
            if (props.figId == null) localOpen.value = true;
            else view.openFig(props.figId);
        } else {
            if (props.figId == null) {
                localOpen.value = false;
            } else {
                // `closeFig` carries the own-param guard (clears only when THIS plate owns
                // `?fig=` — never stomps a sibling that re-claimed it in the same tick).
                view.closeFig(props.figId);
            }
            const el = returnFocusEl;
            returnFocusEl = null;
            if (el) void nextTick(() => el.focus?.());
        }
    },
});

// ── THE EXPAND-SETTLE SEAM (E3 §1.3 / e-hovers FIX-3 → J-VIZDOCK C39 — the expand resize) ───
// THE 4.0.1 GROUND TRUTH (J-FEEDBACK-6 §1-D1, dist-verified against expandable-container.js):
// the installed <ExpandableContainer> emits NO `settle` event (`emits:["update:open"]` only) and
// renders its `default` slot at TWO sites — a resting `{fullscreen:!1}` site that is UNCONDITIONAL
// (always mounted) + a fullscreen `{fullscreen:!0}` site inside `Teleport(disabled:!open)`, gated
// `open ? slot : createCommentVNode`. So when OPEN the slot is mounted TWICE simultaneously: the
// resting instance stays mounted INERT under the z-modal overlay (never disposed), and the
// teleported fullscreen slot is a FRESH SECOND mount of the chart subtree — its useEChart runs a
// brand-new `init()` against the fullscreen host, which is sized to nothing until it is resized.
// (The prior 3.11 premise — a SINGLE-SURFACE re-parent of ONE canvas + a native `settle` emit —
// is the J-GLASS-ROOT `j0-glass-expand-reparent` root fix, a LIVE root ask NOT yet shipped; the
// pinned 4.1.0 added only the re-skin half, the double-mount + no-settle structure persists.)
//
// We PROVIDE the settle beat to the chart(s) this frame wraps: a monotonic `tick` bumped on each
// settle (open AND close), plus the live fullscreen state. Each useEChart instance (resting AND
// the fresh fullscreen mount) injects this and `resize()`s ITS instance on each tick — so the
// fullscreen canvas re-lays-out from its zero/unsized first paint to the real expanded box, and
// the hover hit-test / `convertToPixel` anchor are correct in BOTH states. (A declarative SVG
// chart ignores the signal; it carries live Vue handlers in either DOM position already.)
//
// THE ATLAS INTERIM (J-VIZDOCK C39, Phase A — retired on the Phase-C re-pin once the J-GLASS-ROOT
// reparent + native `settle` ship). Because the container emits NO `settle`, the `watch(open)`
// below IS the trigger (there is no event to consume): on the `open` flip we drive the EXISTING
// `onSettle` after the Teleport has settled (a `nextTick` past the slot mount + a `rAF` fence past
// the fullscreen-surface layout pass), so the freshly-mounted fullscreen instance resizes to its
// real box. On the Phase-C re-pin this `watch(open)` drive retires and `onSettle` re-homes onto
// the now-native `@settle` (a clean swap, the existing tick/provide/useEChart consumer unchanged).
const settleTick = ref(0);
const settleFullscreen = ref(false);
provide(EXPAND_SETTLE_KEY, { tick: settleTick, fullscreen: settleFullscreen });

/** The plate settled into (or out of) fullscreen — bump the tick so each wrapped chart resizes
    its instance (the fresh fullscreen mount fits the expanded box; the resting one re-fits at rest). */
function onSettle(fullscreen: boolean): void {
    settleFullscreen.value = fullscreen;
    settleTick.value += 1;
}

// THE INTERIM DRIVE (J-VIZDOCK C39, Phase A). 4.0.1 emits no `settle`, so synthesize the beat
// from the `open` flip: after the model flips, the teleported fullscreen slot mounts on the next
// flush (`nextTick`); a `requestAnimationFrame` then fences past the browser's layout pass on the
// teleported `.fixed.inset-0` surface so the fullscreen host has its real expanded box BEFORE the
// settle fires — only then does the fresh fullscreen instance's `resize()` read the true bounds
// (a `nextTick` alone can land before the teleported surface lays out, leaving the canvas unsized).
watch(open, (value) => {
    void nextTick(() => {
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => onSettle(value));
        } else {
            onSettle(value);
        }
    });
});
</script>

<template>
    <figure
        class="plate paper-grain-overlay"
        :class="[
            isHero ? 'plate--hero p-6 sm:p-8' : 'p-4 sm:p-5',
            { 'plate--straddle': straddling },
        ]"
        :style="plateVars"
        role="group"
        :aria-label="ariaLabel"
        data-chart-frame
        :data-straddling="straddling ? '' : undefined"
    >
        <!-- SINGLE-ROOT CONTRACT (load-bearing) — this `<figure>` MUST be ChartFrame's ONE root
             node, with NO sibling at the TEMPLATE root (not even a comment), so every descriptive
             comment lives INSIDE it (children are harmless). A DEV build PRESERVES template
             comments (`comments:true`), so a root-LEVEL comment compiles to a sibling comment
             vnode → the component renders a multi-root Fragment → `instance.$el` resolves to the
             Fragment's empty text anchor, NOT the figure. VizPlate reads `frameRef.$el` for its
             K-ACTIVE gilt-rim stamp (`el.toggleAttribute(…)`, documenting "ChartFrame is a
             SINGLE-ROOT figure"), so a text-anchor `$el` throws `toggleAttribute is not a function`
             and trips the route error boundary — a crash a PROD build HIDES (prod strips comments
             → single root). Keep the root unambiguously single: comments stay below this line. -->
        <!-- `paper-grain-overlay` (the glass-ui per-surface grain `@utility`) renders the felt
             paper tooth via an `::after`, reading `--paper-grain-opacity` for its strength. glass-ui
             4.2.0 defaults that var LOUD (0.22/0.16, page-underpaint calibration); the platform §GRAIN
             block (tokens.css) scopes a felt-floor override (0.038/0.028) to THIS overlay class, so
             the plate grain reads as paper, never TV-static. The scoped `--paper-grain-mask` fences
             the grain off the DATA viewport (see `.plate` below). -->


        <!-- K-ACTIVE — THE DEFT GOLDEN RIM (the centre-grain active-viz medal). A DEDICATED child,
             NEVER a pseudo-element: the `.plate` figure ALREADY owns BOTH its pseudos (the §GRID
             underlay `::before` + the glass-ui `paper-grain-overlay` felt grain `::after`), so a
             `[data-viz-plate]::after` rim would CLOBBER the paper grain (one element, one `::after`).
             The rim carries its OWN box-shadow + its OWN opacity, so the fade is a pure COMPOSITOR
             opacity transition (no shadow repaint). It lights when `data-active-viz` lands on this
             figure (the VizPlate imperative stamp). aria-hidden: decorative reinforcement — the dock's
             `activeBeatId` owns SR/keyboard wayfinding. The recipe + the gilt tokens live in the
             UNSCOPED chrome-overlays.css (the rim lights off the global `[data-viz-plate][data-active-viz]`
             attributes, which a scoped rule could not key on). -->
        <div class="plate-active-rim" aria-hidden="true" />

        <!-- THE HEADLINE BAND ZONE (F6.1 / f6-breakout-titles §2.1 — the keystone). The
             `#headline` slot's cluster (the audacious thesis figure + its title) renders here,
             on the band's OWN un-gridded `--card` ground, closed from the data by the engraved
             figure-rule (`.plate-headline`'s `:deep(> *)` border-block-end — the FRAME owns the
             rule, the consumer never hand-rolls it). When `straddling`, the band is the FIRST
             child of `.plate` and lifted by the MEASURE-DERIVED `--headline-lift` (half its own
             height) so its midline rides the plate's top bezel — half on the page paper above,
             half re-entering below. The grid `::before` reads the same lift to FENCE the grid
             off the band's re-entrant half. Renders nothing (no scar, no reserved box) when no
             consumer mounts `#headline` — the empty hero is byte-identical to a bare plate. -->
        <div
            v-if="hasHeadline"
            ref="headlineEl"
            class="plate-headline"
            :class="{ 'plate-headline--straddle': straddling }"
        >
            <slot name="headline" />
        </div>

        <!-- THE THREE-ZONE HEADER GRID (E5a §1 · d-header-legend M1–M7 — re-landed under the
             new zone model). One named grid: MASTHEAD (the eyebrow + title, `minmax(0,1fr)`) ·
             KEY (the legend when docked inline, `auto`) · CONTROL (the `#actions` cluster — the
             options trigger + the expand affordance, `auto`/`shrink-0`). It collapses entirely
             when every zone is empty. The legend's seat is the `legendDock` policy: `inline`
             rides the KEY column here (the default, byte-identical to the old top-right rung);
             `rail` docks it to the SIDE RAIL beside the data (below); `none` omits the KEY zone. -->
        <header
            v-if="eyebrow || (showTitle && slots.title) || legendInline || slots.actions"
            class="plate-header"
            :class="isHero ? 'mb-5' : 'mb-3'"
        >
            <div class="plate-header__masthead min-w-0">
                <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
                <div
                    v-if="showTitle && slots.title"
                    :class="isHero ? 'text-headline mt-1' : 'text-panel-title mt-0.5'"
                >
                    <slot name="title" />
                </div>
            </div>
            <!-- KEY zone — the inline legend (the default dock). -->
            <div v-if="legendInline" class="plate-header__key min-w-0">
                <slot name="legend" />
            </div>
            <!-- CONTROL zone — the quiet `#actions` cluster (options trigger + expand seam, the
                 stable top-right rung the C3 per-viz expand lands in, HD-E5). -->
            <div v-if="slots.actions" class="plate-header__control">
                <slot name="actions" />
            </div>
        </header>

        <!-- THE BODY REGION. When the legend is RAILED (E5a §1, hero-register only) the data
             viewport + the side rail sit in ONE flex row — the literal "legend on the side of
             the viz": a tall tier ledger reads DOWN the rail beside its cake instead of cramming
             the masthead. The rail is opaque resting-tier, top-aligned, one engraved hairline
             off the data; it folds UNDER the body at ≤640 (the mobile stack). Inline/none docks
             render the body alone (byte-identical to before). -->
        <div class="plate-body" :class="{ 'plate-body--railed': legendRailed }">
            <!-- The chart body sits directly on flat paper — no glass material. The glass-ui
                 <ExpandableContainer> wraps it (CONSUMED, never hand-rolled): the quiet corner
                 expand/collapse buttons, the ref-counted body-overflow lock, the Escape-close,
                 and the Teleport-to-body fullscreen layer all come from the primitive. `open`
                 is the two-way `?fig=` URL model; the chart slot is passed THROUGH unchanged so
                 every existing chart renders byte-identically at rest (the trigger is quiet —
                 opacity 0 — until the plate is hovered/focused). -->
            <div class="frame-expand relative">
                <!-- EXPAND-AS-MORPH (D7.c M7a / ds2-motion-field M7). `view-transition-name="chart"`
                 opts the plate↔fullscreen swap into the glass-ui `gl-expand` shared-element morph
                 (the 3.10.0 prop): the inline plate and the teleported fullscreen surface share ONE
                 view-transition-name (the library suffixes it with `useId()` so two plates on a page
                 never collide their groups), and the open/close toggle is wrapped in
                 `startViewTransition` INSIDE the primitive — so the plate's rect MORPHS to the
                 fullscreen rect (and Esc morphs it back) instead of jump-cutting. The library owns
                 the wrap + the PRM/unsupported instant fallback (the open/close ALWAYS runs —
                 information parity); the morph LOOK rides view-transition.css's `.gl-expand` recipe.
                 NO `view-transition-name` is placed on a `<canvas>` (the anti-move): the name lands
                 on the primitive's own plate/surface DIVs, never the chart canvas inside the slot. -->
                <!-- NOTE: no `@settle` binding — the installed 4.0.1 ExpandableContainer emits
                     NO `settle` event (`emits:["update:open"]` only, dist-verified). The settle
                     beat is synthesized from the `open` flip (the `watch(open)` interim above,
                     J-VIZDOCK C39 Phase A); on the Phase-C re-pin a native `@settle="onSettle"`
                     replaces that drive once the J-GLASS-ROOT reparent ships. -->
                <ExpandableContainer
                    v-model:open="open"
                    view-transition-name="chart"
                    :expand-label="`Expand ${ariaLabel}`"
                    :collapse-label="`Collapse ${ariaLabel}`"
                >
                    <template #default="{ fullscreen }">
                        <!-- The body wrapper. The published 4.1.0 cut exposes stable `data-part`
                         hooks (`panel`/`overlay`/`trigger`) on the primitive's own surfaces, but the
                         CONTENT box still has no consumer-marked class, so we keep marking OUR OWN
                         expanded body off the slot's `fullscreen` flag — the documented API. When
                         fullscreen the wrapper fills the surface (`frame-expand__body--fullscreen`:
                         h/w 100% + centered) so the chart grows to the teleported plate, and the
                         class is the stable selector the page can measure the expansion against. -->
                        <div
                            class="frame-expand__body"
                            :class="{ 'frame-expand__body--fullscreen': fullscreen }"
                        >
                            <!-- PER-PLATE ISOLATION (H2): a throwing viz degrades to the quiet
                             fallback card; the route + every sibling plate survive. The slot is
                             keyed so `retry` re-mounts it cleanly. -->
                            <PlateError
                                v-if="errored"
                                :label="ariaLabel"
                                :on-retry="retry"
                            />
                            <slot v-else :fullscreen="fullscreen" />
                        </div>
                    </template>
                </ExpandableContainer>
            </div>

            <!-- THE SIDE RAIL (E5a §1) — the docked legend's hero-register column. Opaque
                 resting-tier, one engraved hairline off the data, top-aligned; the tall tier
                 ledger reads down it beside the viz it explains. Folds under the body at ≤640. -->
            <aside v-if="legendRailed" class="plate-rail">
                <slot name="legend" />
            </aside>
        </div>
    </figure>
</template>

<style scoped>
/* The atlas-plate recipe (FD1 §5.2): flat --card paper bordered by the engraved
   double rule — an outer hairline, a hair-gap mat in the page paper, and the
   heavier inner rule, all as one stacked box-shadow. Print-crisp --radius-plate
   corners. NOT a glass lens (the radial-glow source fix).

   THE `resting` TIER (C.W6.b2 / AS-8 · cap-glass-ui §6). The plate IS the platform's
   `resting`-rung surface — the canonical in-flow content plate the Aurora field reads
   *behind* (the §1 z-ladder: dock/filter/hover float ABOVE on the `floating`/`overlay`
   rungs; the chart plate rests at the bottom rung). It expresses that tier as the FLAT
   engraved-paper plate, NOT a `<GlassPanel>` lens — wrapping the plate in a glass material
   is exactly the dark-radial-glow source the C2 doctrine kills, so the `resting` rung here
   is the OPAQUE engraved plate (the field is felt through the grain/grid, never sampled by
   a backdrop-filter on the data). One vocabulary, the deft expression of its rung. */
.plate {
    /* `position: relative` + `isolation: isolate` makes the plate the SELF-CONTAINED
       painting root for the z:-3 grid `::before`: a new stacking context whose negative-z
       child paints ABOVE the plate's own `--card` background but BELOW the in-flow chart
       body — so the grid shows on the paper and the data rides ON TOP. `isolate` (not an
       explicit z-index) forms the context WITHOUT re-ordering the plate against its
       siblings, so the C3 expand seam + the hero box-shadow stacking are untouched. */
    position: relative;
    isolation: isolate;
    background: var(--card);
    /* THE ENGRAVED-FRAME HAIRLINE wears the SILVER finish (H.W4.b · §SILVER). The bezel ink
       stays its --engrave rung; --silver-hairline mixes a faint brushed-metal tint ON TOP, so
       the hairline reads as machined-metal rather than flat ink. ADDITIVE: the --engrave
       fallback keeps the bare ink if silver is ever unset. Not loud — a subtle steel whisper. */
    border: 1px solid color-mix(in oklab, var(--engrave), var(--silver-hairline) 45%);
    border-radius: var(--radius-plate, 6px);
    box-shadow:
        0 0 0 4px var(--background),
        0 0 0 5px color-mix(in oklab, var(--engrave), var(--silver-hairline) 45%),
        /* the specular catch-light edge — a hairline of lit metal at the top rim (the
           engraved-instrument register; the same ivory whisper --cp-glass-rim carries). */
            inset 0 1px 0 var(--silver-specular),
        0 1px 3px oklch(0 0 0 / 0.08);

    /* §GRID register (AS-4 / atmosphere-aesthetic P0·3 → I8.b §1.5) — the plate-grid pitch +
       line + opacity are now ONE platform token each in `tokens.css §GRID` (`--plate-grid-pitch`
       at the larger 24px monograph register, `--plate-grid-line`, and `--plate-grid-opacity:
       light-dark(0.5, 0.35)` collapsing the old hand-coded dark split). The grid stays SCOPED to
       this `.plate::before` (the token promotion does NOT mount it page-wide — the documented XOR
       against the aurora is preserved); the `::before` below CONSUMES those tokens. No `.plate`-
       local grid declaration remains (the 16px literal + the `--plate-grid-opacity-dark`
       companion are retired — fb-backgrounds §1.5/P4). */

    /* THE DATA-REGION MASK (ds2-medium M5 — the data-fence, the BINDING LAW). The library's
       `paper-grain-overlay` `::after` reads `--paper-grain-mask` to carve the grain. Grain on
       the FRAME, NEVER under the FIGURE: a fleck over a choropleth reads as a data artifact; on
       the plate margin it reads as paper. This radial mask is OPAQUE only toward the plate edge
       (the bezel/margin ring, where the data never sits) and TRANSPARENT across the whole
       interior (the data viewport), so no grain fleck can land on a tier fill or a map cell. It
       mirrors the grid's collision-guard fence inverted: the GRID owns the interior, the GRAIN
       owns the margin — one delineation each. The grain `::after` is felt at rest, never seen. */
    --paper-grain-mask: radial-gradient(
        130% 130% at 50% 50%,
        transparent 0%,
        transparent 72%,
        #000 100%
    );
}

/* THE E8 PLATE-GRID — the faint figure-on-graph-paper underlay (C.W6.b2 · Scope 6 / AS-4;
   atmosphere-aesthetic P0·3/P2·3; D1 §1). The atlas lineage is the scientific monograph:
   a chart is "a plotted figure on graph paper." A sub-grain 16px graph-paper tile INSIDE
   the plate (z:-3, behind the chart body, BENEATH the data ink) earns its keep by
   reinforcing the plate-is-a-figure metaphor — the one grid role that is deft, not noise.
   The page-wide blueprint grid (it would fight the Aurora — two fields) and the gallery
   grid (it would duplicate the constellation) are DECLINED — the documented XOR; this grid
   lives ONLY inside ChartFrame, NEVER page-wide.

   THE COLLISION GUARD (P2·3). The engraved `--engrave` double-rule bezel already delineates
   the plate edge (the working atlas idiom, preserved above). The grid must NOT collide with
   it: the `mask-image` radial fades the grid to transparent toward the bezel, so the
   ENGRAVED FRAME owns the boundary and the GRID owns the interior — one delineation, never
   two. `pointer-events: none` keeps it inert; it sits below the body on the z:-3 rung. */
.plate::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: var(--z-atmosphere-grid, -3);
    pointer-events: none;
    border-radius: inherit;
    /* CONSUME the §GRID platform tokens (tokens.css §GRID). The light/dark split rides the
       grid INK color (`--plate-grid-ink` — the `--plate-grid-line` dialed to the
       `--plate-grid-opacity` strength, baked into the color's alpha via `light-dark()`, which
       is valid only in `<color>` context). Painting that themed color at element `opacity: 1`
       renders the grid at 0.5 light / 0.35 dark in every engine — the ONE `light-dark()` token,
       no `:where(.dark) .plate::before` override, no `-dark` companion (the §1.5 collapse).
       The pitch is the larger 24px monograph register. */
    opacity: 1;
    background-image:
        linear-gradient(var(--plate-grid-ink) 1px, transparent 1px),
        linear-gradient(90deg, var(--plate-grid-ink) 1px, transparent 1px);
    background-size: var(--plate-grid-pitch) var(--plate-grid-pitch);
    /* fade the grid toward the plate edges so it never collides with the engraved bezel —
       the engraved frame OWNS the boundary, the grid OWNS the interior (P2·3). */
    -webkit-mask-image: radial-gradient(
        120% 120% at 50% 50%,
        #000 60%,
        transparent 100%
    );
    mask-image: radial-gradient(120% 120% at 50% 50%, #000 60%, transparent 100%);
}
/* The dark-stock grid recession (the engraved bezel is the louder mark on graphite, the grid
   only the faintest tooth) is now carried by the ONE `--plate-grid-opacity: light-dark(0.5,
   0.35)` token in tokens.css §GRID — the hand-coded `:where(.dark) .plate::before` opacity
   override is RETIRED (I8.b §1.5/§6). */

/* THE STRADDLE GRID-FENCE (F6.1 / f6-breakout-titles §2.1 Gate D). When the headline band
   STRADDLES, its lower half re-enters the plate's top region — that re-entrant half must sit
   on FLAT --card, NEVER on graph paper (a thesis figure on grid reads as plotted data, not the
   argument). So the grid `::before` starts BELOW the band's lower half: its `inset-block-start`
   becomes the MEASURED `--headline-lift` (the band's own half-height — the same source that
   lifts the band). The grid OWNS the interior below the band; the band OWNS the flat lip above.
   One measured source, two consumers (the lift + the fence). */
.plate--straddle::before {
    inset-block-start: var(--headline-lift, 0px);
}

/* The HERO register (K3): the flagship plate's double-rule is HEAVIER — a wider mat in the
   page paper and a deeper drop, so the engraved frame reads as a presentation plate, not a
   consequence card. The eye lands here first. Same warm-paper ground + print-crisp corners. */
.plate--hero {
    box-shadow:
        0 0 0 6px var(--background),
        0 0 0 8px var(--engrave),
        0 3px 12px oklch(0 0 0 / 0.1);
}

/* ── THE THREE-ZONE HEADER GRID (E5a §1 · d-header-legend M1–M7) ─────────────────────────────
   The single header is a named three-column grid: MASTHEAD (the eyebrow + title) takes the
   flexible measure; KEY (the inline legend) + CONTROL (the `#actions` cluster) take their
   intrinsic widths and never crowd the title. The KEY/CONTROL zones are absent from the grid
   when their slot is empty (the template `v-if`s), so a title-only plate is a single-column
   masthead — byte-identical to the old `flex justify-between` header at rest. The zones align
   to the masthead's top (a tall ledger or a tall title never vertically centres the control). */
.plate-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: start;
    gap: 1rem;
}
.plate-header__masthead {
    grid-column: 1;
}
.plate-header__key {
    grid-column: 2;
    display: flex;
    align-items: flex-start;
}
.plate-header__control {
    grid-column: 3;
    display: flex;
    flex: none;
    align-items: flex-start;
    gap: 0.75rem;
}

/* ── THE HEADLINE BAND ZONE + STRADDLE POSTURE (F6.1 / f6-breakout-titles §2.1) ──────────────
   The band is the `#headline` cluster's host: its OWN un-gridded ground. The FRAME owns the
   engraved figure-rule that closes the band from the data — applied to the band's slotted child
   (`:deep(> *)`), never hand-rolled by the consumer (the consumers' comments say so: "the
   ChartFrame band owns the engraved figure-rule + the post-band spacing"). The grain mask + the
   grid fence keep the band on flat --card; the rule is the seam to the gridded data below. */
.plate-headline {
    position: relative;
    /* the band sits above the data on the in-flow z-order (the grid `::before` is z:-3 below
       it); its OWN ground is the flat --card the plate already paints, no extra fill needed. */
    margin-block-end: 1.25rem;
}
/* The engraved figure-rule (the band's foot — the FRAME's seam, F6.1 Gate D). The consumer's
   band cluster is the slot's direct child; the rule rides ITS lower edge so the cluster is
   delineated from the data viewport by the same `--engrave` hairline the plate bezel wears.
   This is the one place the frame styles the slotted content — the rule is the band's, not the
   cluster's (INV-F4: the consumer mounts the figure, the frame owns the band's grammar). */
.plate-headline :deep(> *) {
    border-block-end: 1px solid var(--engrave);
    padding-block-end: 1rem;
}

/* THE STRADDLE LIFT (the negative-margin, NOT a transform — layout-honest, f6-breakout §2.1
   mechanism #2). The band is pulled UP by HALF its own MEASURED height (`--headline-lift`), so
   its vertical midline lands on the plate's top bezel: half on the page paper above (breaching
   the frame), half re-entering below the figure-rule. The negative margin ALSO pulls the
   following data viewport up under the band's lower half, so the plate's height stays honest (a
   transform would leave a layout ghost reserving full height below an empty top). `overflow:
   visible` on the plate (already the default — G1.3) lets the band's top half render OUTSIDE the
   bezel, un-clipped. Before the band measures (`--headline-lift:0`), the band sits in flow — it
   lifts on the next frame, never jumping to a guessed literal. */
.plate-headline--straddle {
    margin-block-start: calc(-1 * var(--headline-lift, 0px));
    /* the band's top half breaches the plate; let its overshoot paint past the bezel. */
    overflow: visible;
}
/* The straddle plate keeps room for the band's re-entrant LOWER half at its top, so the data
   viewport never collides with the band foot. The lower half is exactly `--headline-lift`; the
   plate's existing top padding (p-6/p-8) plus this reserve clears the rule + its breathing gap. */
.plate--straddle {
    /* the data tucks below the band's lower half — the band's negative margin already pulls the
       following content up, so no extra body padding is needed; this marker is the gate's hook
       + the `::before` fence selector (above). */
}

/* ── THE SIDE RAIL (E5a §1 — the docked legend's hero column) ────────────────────────────────
   When the legend is RAILED, the body is a flex row: the data viewport grows, the rail takes a
   hero-register fixed measure beside it (the literal "legend on the side of the viz"). Opaque
   resting-tier, top-aligned, one engraved hairline off the data. Inline/none docks render the
   body alone (this flex collapses to a single grow child — byte-identical to before). */
.plate-body {
    display: flex;
    flex-direction: column;
}
.plate-body--railed {
    flex-direction: row;
    align-items: flex-start;
    gap: 1.25rem;
}
.plate-body--railed > .frame-expand {
    flex: 1 1 auto;
    min-inline-size: 0;
}
.plate-rail {
    flex: none;
    inline-size: clamp(7rem, 14cqi, 11rem);
    align-self: stretch;
    padding-inline-start: 1.25rem;
    border-inline-start: 1px solid var(--engrave);
}

/* ── THE MOBILE FOLD (≤640 — the band UN-straddles, the rail stacks under) ───────────────────
   At the narrow register the straddle would push the cluster off the top of the viewport, so the
   band folds to the in-flow posture (the lift zeroes — the band re-enters normal flow ABOVE the
   data, the f-breakout in-flow band). The grid-fence + figure-rule still delineate it. The
   header grid collapses to a single column (masthead → key → control stack), and the side rail
   folds UNDER the body (a horizontal key strip below the viz). One zone model, two postures. */
@media (--compact) {
    .plate-headline--straddle {
        margin-block-start: 0;
    }
    .plate--straddle::before {
        inset-block-start: 0;
    }
    .plate-header {
        grid-template-columns: minmax(0, 1fr);
    }
    .plate-header__key,
    .plate-header__control {
        grid-column: 1;
    }
    .plate-body--railed {
        flex-direction: column;
    }
    .plate-rail {
        inline-size: auto;
        align-self: stretch;
        padding-inline-start: 0;
        padding-block-start: 1rem;
        margin-block-start: 0.5rem;
        border-inline-start: 0;
        border-block-start: 1px solid var(--engrave);
    }
}

/* THE ASPECT-BOX RESERVE — the CLS skeleton (C8.5 / MX-5 · pf-lighthouse O-CLS · Scope 10a).
   The §20 RR7-3 row puts the WHOLE aspect-box reserve here, on ChartFrame, not split across
   waves. The CLS risk is a chart body that paints at 0-height then REFLOWS to its real height
   when the data lands (the ECF treemap/choropleth's 0.175 baseline CLS). Most plates already
   reserve via a fixed `chart-h-*` host (340/460/640px) on the slotted chart — that consumer
   reserve is why ECF CLS is already < 0.02 — but a content-driven host (no `chart-h-*`) would
   collapse to 0 pre-data and reflow in. So `.frame-expand` (the ONE real box every chart body
   routes through — the slotted host is its child) carries a `min-block-size` FLOOR: a pre-data
   plate reserves at least this much vertical space, so the body never paints at 0 and then jumps.
   The floor (200px) sits BELOW the smallest real chart host (chart-h-sm = 340px), so a plate
   that DOES set a fixed host is byte-identical (its host out-measures the floor — the floor is
   inert there); only a not-yet-sized / content-driven body is held off 0. The fullscreen body
   is TELEPORTED to <body> (`.fixed.inset-0`), so this in-flow wrapper keeps the reserve at rest
   regardless of expand state — no fullscreen carve needed (the teleported surface owns its own
   layout, this box stays the resting plate behind it).

   T-PERF-4 (I-PERF-DATA.c) — THIS reserve is what makes `useEChart({ lazyMount: true })` CLS-safe.
   A lazyMounted below-fold chart does NOT init its canvas at hydration; it inits on scroll-into-
   view. Without a reserved box the deferred canvas would mount into a 0-height slot and SHIFT the
   layout as it scrolled in. The `chart-h-*` host on every lazyMounted consumer (StackedBar/
   TimeSeries/Treemap = chart-h-lg; BreakEvenScatter/SciScatter = chart-h-md) reserves the full box
   up-front, and THIS `min-block-size` floor backstops any content-driven host — so the lazy canvas
   mounts into an already-sized slot and the GREEN ≤0.038 CLS holds. The box reservation is the
   PAIR to the lazyMount opt-in (the wave's CLS floor), root-homed here on the ONE frame. */
.frame-expand {
    min-block-size: 200px;
}

/* THE EXPANDED BODY (D7). glass-ui's teleported fullscreen surface is a bare `.fixed.inset-0`
   <div> with no stable class hook, so ChartFrame marks its OWN body off the slot's `fullscreen`
   flag (the documented slot API). At rest the wrapper is inert (display:contents — it adds NO
   box, so every plate is byte-identical to before). When fullscreen it BECOMES the layout box:
   it fills the teleported surface (the .fixed.inset-0 parent) and centers the chart, so the
   expanded viz grows to the full-viewport plate (not stuck at its resting size). */
.frame-expand__body {
    display: contents;
}
.frame-expand__body--fullscreen {
    /* The fullscreen PRESENTATION surface (D7). A column stack that fills the teleported
       `.fixed.inset-0` width and is AT LEAST viewport-tall (`min-block-size: 100%`), growing
       with its content so a rich plate (hero readout + prose + chart) scrolls inside the
       fixed surface rather than being clipped. The chart host (the last child) is the GROW
       child — it claims the remaining room (`flex: 1`) at a generous presentation floor, so
       the expanded chart genuinely USES the screen (the resting `chart-h-lg` host is far
       smaller). Centered horizontally with a comfortable gutter. */
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    box-sizing: border-box;
    /* The PRESENTATION surface is taller than one viewport (a generous 1.2× floor) so the
       expanded plate is a true ZOOM that scrolls inside the fixed `.inset-0` surface — never a
       viewport-letterboxed thumbnail. The floor is content-independent: even a short single-
       chart plate clears the viewport, so the expand always grows the figure well past its
       resting footprint (the D7 contract). The body still GROWS past 120vh when its content
       (a tall hero readout + prose + chart) needs more. */
    min-block-size: 120vh;
    inline-size: 100%;
    padding: clamp(1rem, 3vw, 3rem);
}
/* The chart host claims the remaining fullscreen height — the expand's whole point is the
   chart BIGGER. The resting `chart-h-*` fixed-height utility is overridden HERE (the only
   place ChartFrame overrides a consumer's host size, and only in the fullscreen branch) so
   the host grows to fill the tall presentation surface. */
.frame-expand__body--fullscreen > :last-child {
    flex: 1 1 auto;
    min-block-size: 60vh;
    block-size: auto;
    inline-size: 100%;
}
/* Every child fills the column width (the chart goes from its resting ~460px to the full
   presentation width — the expand reads as a true zoom, not a centered thumbnail). */
.frame-expand__body--fullscreen > * {
    inline-size: 100%;
    max-inline-size: 100%;
}

/* THE EXPAND TRIGGER — QUIET BY DEFAULT, ENGRAVED INTO THE PLATE CORNER (A7).
   The glass-ui <ExpandableContainer> ships its corner trigger always-visible; the atlas register
   wants it QUIET — invisible at rest so a plate reads as pure data, revealing only when the plate
   is hovered or holds focus (the engraved corner affordance that "appears under the hand").
   THE RE-SKIN REACH (arm b · the published 4.1.0 cut): the trigger no longer carries the legacy
   `.expandable-container__trigger` class — the published cut exposes the stable `data-part='trigger'`
   attribute on BOTH the inline trigger and the fullscreen collapse button. We pierce with `:deep()`
   onto `[data-part='trigger']` and scope to the INLINE trigger (a descendant of `.plate`); the
   FULLSCREEN collapse button is teleported to <body>, OUTSIDE `.plate`, so it is unaffected and stays
   visible. Reduced-motion drops the opacity transition (the reveal is instant, never animated). */
.frame-expand :deep([data-part="trigger"]) {
    opacity: 0;
    transition: opacity 0.18s ease;
}
.plate:hover .frame-expand :deep([data-part="trigger"]),
.plate:focus-within .frame-expand :deep([data-part="trigger"]) {
    opacity: 1;
}
/* Keyboard reach: when the quiet trigger itself takes focus it MUST become visible (so a
   keyboard user can see what they are about to activate), independent of plate hover. */
.frame-expand :deep([data-part="trigger"]:focus-visible) {
    opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
    .frame-expand :deep([data-part="trigger"]) {
        transition: none;
    }
}
</style>
