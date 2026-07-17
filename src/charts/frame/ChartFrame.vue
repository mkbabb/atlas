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
    inject,
    nextTick,
    onErrorCaptured,
    provide,
    ref,
    useSlots,
    watch,
} from "vue";
import { ExpandableContainer } from "@mkbabb/glass-ui/expandable-container";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import { EXPAND_SETTLE_KEY } from "../scene/expand-settle.js";
import PlateError from "./PlateError.vue";
import { STORY_CARD_KEY } from "./story-card-context.js";
import { useHeadlineLift } from "./useHeadlineLift.js";

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
            · `foot`   — the legend seats BENEATH THE BODY (the R3 beneath-the-map seat): the
              frame renders NO header KEY column and NO side rail, freeing the masthead, and the
              HOST (VizPlate) lays the `#legend` content in the plate-body foot flow — between the
              figure and the provenance foot — so a tall identity-glyph lockup never crams the
              header. Any register (not hero-only). The seat is placed by the host inside the body
              region the frame renders (the frame's job here is to VACATE the header/rail);
            · `none`   — no KEY zone (a plate whose key lives in the viz itself). */
        legendDock?: "inline" | "rail" | "foot" | "none";
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
const cardContained = inject(STORY_CARD_KEY, null) !== null;

/** The hero plate reads the `text-headline` title rung + the more generous gutter (K3). */
const isHero = computed(() => props.size === "hero");

/** The host's layout resolver owns the rail clamp; ChartFrame only renders its decision. */
const dock = computed(() => props.legendDock);
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

const { headlineEl, headlineLift } = useHeadlineLift(hasHeadline, straddling);

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
            { 'plate--straddle': straddling, 'plate--card-contained': cardContained },
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
             render the body alone (byte-identical to before). The FOOT dock renders no rail here
             and no header KEY column either — the beneath-body seat lives in the DEFAULT SLOT flow
             the host lays (VizPlate seats `#legend` between the figure and the provenance foot), so
             the frame only VACATES the header/rail for it (a tall lockup never crams the masthead). -->
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
                    <template #expand-trigger />
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

<style scoped src="./ChartFrame.css"></style>
