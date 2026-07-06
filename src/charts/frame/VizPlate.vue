<script setup lang="ts">
// VizPlate.vue — THE HOST THAT REPLACES ChartFrame (I2.a · BIG-BANG keystone, DESIGN §3.7).
//
// A viz is declared ONCE (a `VizContract`) and rendered WHOLE here: the title-rung, the E1
// axis-coloured description band, the B4 key-stat strip, the E5 compact legend, the E2 options
// trigger (default-on), the E3 export glyph, the E8 designed-void-on-empty, and the audacious
// figure — all from one declaration, in fixed slots.
//
// THE COMPOSE-NOT-REIMPLEMENT LAW (I2 Hard Gate 2): VizPlate MOUNTS <ChartFrame> internally for the
// engraved frame, the URL-addressable `?fig=` expand, the per-plate error boundary, the headline-
// straddle, and the legend-dock that ChartFrame already owns — so NO behaviour is lost and NO
// consumer mounts ChartFrame directly. ChartFrame becomes a private implementation detail of
// VizPlate. The §E verbs land ONCE in this host; the 21 feature plates shrink to "declare the
// contract + provide the chart body."
//
// THE PRIMITIVES IT COMPOSES (never absorbs — DESIGN §6.4 COMPOSE-not-absorb):
//   • ChartFrame      — the frame / expand / error-boundary / straddle / legend-dock.
//   • DockIconButton/DockDropdownTrigger/Badge — the J-VIZDOCK per-viz controls cluster (the
//     filter-toggle + folded download + enlarge + applied-filters summary, from the dock register).
//   • useVizOptions + VizFilterDock — the URL-backed options engine + the inline per-viz filter dock
//     the filter-toggle raises (E2 options + J-FRAME's filterDimensions facet; the VizOptions POPOVER
//     is RETIRED — its dials re-homed into the inline dock, a TOGGLE not a transient popover).
//   • ChartLegend     — the compact top-right / stepped / rail legend (E5).
//   • ChartDataTable  — the a11y rows that ARE the export payload (E3, off the contract).
//   • VizDescription / VizKeyStats / PlateVoid — the new furniture rungs (E1 / B4 / E8).
//   • vizExport       — the getDataURL / DOM-snapshot / CSV serializers (E3, ZERO heavy dep).
import { computed, inject, onMounted, onUnmounted, ref, useSlots, watchEffect } from "vue";
import { Download, SlidersHorizontal, Maximize2, Minimize2 } from "@lucide/vue";
import { DockIconButton, DockDropdownTrigger } from "@mkbabb/glass-ui/dock";
import { Badge } from "@mkbabb/glass-ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@mkbabb/glass-ui/dropdown-menu";
import ChartFrame from "@/charts/frame/ChartFrame.vue";
import { BEAT_TITLE_KEY } from "@/charts/legend/beat-title";
import VizDescription from "@/charts/legend/VizDescription.vue";
import VizKeyStats from "@/charts/legend/VizKeyStats.vue";
import ChartLegend from "@/charts/legend/ChartLegend.vue";
import ChartDataTable from "@/charts/legend/ChartDataTable.vue";
import PlateVoid from "@/charts/frame/PlateVoid.vue";
import PlateSkeleton from "@/charts/frame/PlateSkeleton.vue";
import PlateError from "@/charts/frame/PlateError.vue";
import { useOptionalVizContext } from "@/platform/context/hub";
import type { Readiness } from "@/platform/context/readiness";
import {
    keyStep,
    ariaLiveSentence,
    initialNavState,
    type KeyboardNavSpec,
    type NavState,
} from "@/interaction/keyboard";
import { parseSelKey } from "@/charts/contract/selection-contract";
import { useVizOptions } from "@/charts/composables/useVizOptions";
import {
    useFilterDimensions,
    type DimDeclaration,
    type RouteUniverse,
} from "@/filter/composables/useFilterDimensions";
import { useFilterPane } from "@/filter/composables/useFilterPane";
import { useFilterPanel } from "@/filter/composables/useFilterPanel";
import { useVizRegistry, type VizToken } from "@/charts/composables/useVizRegistry";
import {
    exportCsv,
    exportImage,
    type DataUrlSource,
} from "@/charts/lib/vizExport";
import type { VizContract } from "@/charts/contract/viz-contract";
import { useSelection } from "@/platform/stores/useSelection";
import { useSelectionStat } from "@/platform/stores/useSelectionStat";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import { useViewParams } from "@/platform/stores/useViewParams";

const props = withDefaults(
    defineProps<{
        /** The viz declared once — the title, the E1 dek, the B4 stats, the E2 options, the E5
            legend, the E3 export, the render kind, the E8 empty signal. */
        contract: VizContract;
        /** The live ECharts instance (for the E3 canvas PNG via `getDataURL`) — the consumer
            passes its `chart` ref when `render:"echarts"`. SVG/geo plates omit it (the host
            DOM-snapshots the body instead). */
        chart?: DataUrlSource | null;
        /** N.WD1 §4.D1.5 — the OPT-IN keyboard nav contract (role=application, ONE tab stop). When a
            plate declares one, the host becomes keyboard-operable: arrows emit `inspect`, Enter emits
            `pin` — the SAME store verbs the pointer machine drives (the unification thesis). Omit ⇒ the
            reading path (role=img + the off-screen table) stands alone, unchanged. */
        nav?: KeyboardNavSpec<unknown> | null;
    }>(),
    { chart: null, nav: null },
);

const slots = useSlots();

// ── K-F — THE TITLE-DEDUP INJECT (the BEAT_TITLE_KEY seam) ────────────────────────────────────
// A figure inside a title-owning beat must NOT re-paint the chapter <h2> in ChartFrame's masthead.
// The wrapping <Beat> PROVIDES its ownership; we INJECT it (OPTIONAL — the teleported ?fig= expand
// + the gallery preview inject nothing ⇒ undefined ⇒ they paint their own title, degrading right).
// `contract.title` STAYS the aria/export/caption/expand source; only the painted RUNG is suppressed.
const beatTitle = inject(BEAT_TITLE_KEY, undefined);
const showOwnTitle = computed(() => !beatTitle?.owned);

// ── E5 — THE LEGEND DOCK (the contract's default policy mapped onto ChartFrame) ──────────────
const legend = computed(() => props.contract.legend);
/** ChartFrame's `legendDock` reads the contract: a `rail` dock on a hero, else inline. A consumer
    `#legend` slot wins (a bespoke legend); else the contract's `LegendSpec` drives a ChartLegend. */
const legendDock = computed<"inline" | "rail" | "none">(() => {
    if (!legend.value && !slots.legend) return "none";
    return legend.value?.dock === "rail" ? "rail" : "inline";
});
/** The ChartLegend mode from the contract's `LegendMode` (the §E5 default: stepped for N≥7,
    rail/inline otherwise). `rail`/`inline` map onto ChartFrame's dock; the BAR mode is continuous
    (a ramp) for stepped/inline-with-a-colorKind, else discrete chips. */
const legendIsStepped = computed(() => legend.value?.mode === "stepped");

// ── E2 — THE OPTIONS ENGINE (composed, default-on whenever `options` is present) ─────────────
// The contract requires every plate to declare `options` (or `options: []`); the host builds the
// proven useVizOptions controller whenever the spec is non-empty. The dials are no longer hosted by
// the retired VizOptions POPOVER — they re-home into the inline VizFilterDock the filter-toggle
// raises (J-VIZDOCK · §approach-3), so no option is orphaned by the popover retirement.
const optionSpecs = computed(() => props.contract.options ?? []);
const hasOptions = computed(() => optionSpecs.value.length > 0);
const optionsController = useVizOptions(props.contract.id, optionSpecs.value);

// ── E3 — THE EXPORT (wired ONCE in the host from the contract's ExportSpec) ──────────────────
const renderKind = computed(() => props.contract.render ?? "echarts");

/** The figure body element — the host's chart-slot host (for the SVG/geo DOM-snapshot). The
    consumer wraps its chart in a `data-viz-body` host so the export can find the SVG to snapshot. */
function bodyEl(): Element | null {
    return document.querySelector(`[data-viz-body="${props.contract.id}"]`);
}

/** Export the CSV (the a11y rows ARE the payload, one source). */
function onExportCsv(): void {
    const rows = props.contract.export.rows();
    exportCsv(
        rows,
        props.contract.export.rowHeader,
        props.contract.export.valueHeader,
        `${props.contract.id}.csv`,
    );
}

/** Export the figure image — getDataURL for canvas, DOM-snapshot for svg/geo (ZERO heavy dep). */
function onExportImage(): void {
    exportImage(renderKind.value, `${props.contract.id}`, props.chart, bodyEl());
}

// ── E8 — THE DESIGNED-VOID SWAP (the empty-data signal) ──────────────────────────────────────
const isEmpty = computed(() => props.contract.isEmpty?.() ?? false);

// ── N.WD1 §4.D1.2 — THE READINESS LADDER (the host branches; plates do not) ────────────────────
// The host injects the viz-context hub OPTIONALLY (a gallery preview / story harness / SSR mount has
// none — the Law-2 pair's silent half), reads THIS plate's readiness (the primary feed, or a declared
// secondary `sourceId`), and branches the body onto a 4-rung ladder: loading → PlateSkeleton (the
// CLS-reserved box), error → PlateError (feed-error card + retry), ready∧isEmpty → PlateVoid (the E8
// designed void, M canon unchanged), ready → the figure. THE COMPOSITION LAW: `isEmpty()` is read
// ONLY at ready — so a `rows:[]` mid-load reads as `loading` (the skeleton), never as a flashed void
// (the live VizPlate void/loading conflation, cured structurally). No hub ⇒ the legacy behaviour
// (isEmpty ? void : figure) so every out-of-route mount reads exactly as before.
const viz = useOptionalVizContext(props.contract.id, { sourceId: props.contract.sourceId });
const readiness = computed<Readiness | null>(() => viz?.readiness.value ?? null);
const platePhase = computed<"loading" | "error" | "empty" | "figure">(() => {
    const r = readiness.value;
    if (r === "loading") return "loading";
    if (r === "error") return "error";
    // ready OR no-hub (legacy): isEmpty is evaluated ONLY here (the composition law).
    return isEmpty.value ? "empty" : "figure";
});
function onRetry(): void {
    viz?.retry();
}

// ── N.WD1 §4.D1.5 — THE KEYBOARD HOST (opt-in per figure; the intent bus keyboard sink) ────────
// A declared `nav` makes the figure body an application-mode tab stop. `keyStep` folds each key into
// { the next nav state, an intent, the focused mark }; the intents are the SAME union the pointer
// machine emits (arrows → inspect, Enter → pin) dispatched onto the SAME store verbs through the hub's
// origin-stamped selection facet — the unification thesis (End → Enter → ArrowLeft == a mouse click).
// The aria-live sentence serializes from the focused mark's label (the reading path stays role=img).
const hasNav = computed(() => props.nav != null);
const navState = ref<NavState>(initialNavState());
const liveSentence = ref("");
/** The focus rim's live viewport anchor (the platform overlay ring seats here on every move). */
const focusRim = ref<{ visible: boolean; x: number; y: number }>({
    visible: false,
    x: 0,
    y: 0,
});

/** The safe viewport band the focused mark must clear (N.WD1 §4.D1.5 / WCAG 2.4.11 — Focus Not
    Obscured). The 112px dock gutter de-conflicts the left rail; the same margin reserves top/bottom
    so a keyboard-focused mark never sits under the fixed dock or off-screen. */
const FOCUS_SAFE_MARGIN = 112;

/** THE FOCUS-RIM SCROLL-INTO-VIEW (2.4.11). On every keyboard move, if the focused mark's anchor
    falls outside the safe vertical band, scroll the page just enough to reveal it — never more (the
    `scrollIntoViewIfNeeded` semantic: a mark already in-band never scrolls). PRM repositions INSTANTLY
    (`behavior:"auto"`), parity not absence of meaning; SSR/no-window is a silent no-op. */
function scrollAnchorIntoView(y: number): void {
    if (typeof window === "undefined") return;
    const vh = window.innerHeight;
    const prm =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const behavior: ScrollBehavior = prm ? "auto" : "smooth";
    if (y < FOCUS_SAFE_MARGIN) {
        window.scrollBy({ top: y - FOCUS_SAFE_MARGIN, behavior });
    } else if (y > vh - FOCUS_SAFE_MARGIN) {
        window.scrollBy({ top: y - (vh - FOCUS_SAFE_MARGIN), behavior });
    }
}

function onFigureKey(e: KeyboardEvent): void {
    const spec = props.nav;
    if (!spec) return;
    const res = keyStep(spec, navState.value, { key: e.key, shift: e.shiftKey });
    navState.value = res.state;
    if (res.intent.verb === "none") return;
    e.preventDefault();
    if (res.focused) {
        liveSentence.value = ariaLiveSentence(spec.labelOf(res.focused), []);
        const a = spec.anchorOf(res.focused);
        focusRim.value = { visible: true, x: a.x, y: a.y };
        // 2.4.11 — keep the focused mark out from under the fixed dock / off-screen on every move.
        scrollAnchorIntoView(a.y);
    }
    switch (res.intent.verb) {
        case "inspect":
            viz?.selection.hover(res.intent.key);
            break;
        case "pin": {
            const parsed = parseSelKey(res.intent.key);
            if (parsed) viz?.selection.select(parsed.kind, parsed.id, { additive: res.intent.additive });
            break;
        }
        case "exit":
            // The FIRST Esc exits nav (consumed) — drop the rim + restore focus to the document flow.
            focusRim.value = { ...focusRim.value, visible: false };
            liveSentence.value = "";
            break;
        case "clear":
            // The SECOND Esc rides the global clear (the field-scope precedent).
            viz?.selection.clear();
            break;
    }
}

// ── UX-S2 — THE FOCUSED KEY-STAT VARIANT (I-UX.a · the `keyStats` slot's second face) ────────
// When a selection is FOCUSED (`primaryKey` set), the key-stat rung gains a FOCUSED band: THAT
// entity's value BESIDE the fleet aggregate ("<entity>: X · fleet: Y"). It reads through the I5
// `useSelectionStat` registry — the SAME registry the I5 preview card reads (a SECOND consumer,
// NOT a second registry; the per-route beat RESOLVERS are I11–I15's). The contract SHAPE is
// unchanged: this is a RENDER VARIANT of the B4 strip, not a new `VizContract` field — the fleet
// `keyStats()` still renders; the focused band rides ABOVE it only while a primary is live.
//
// FACTUAL, NOT EDITORIAL (D1/D6): the band shows the resolver's own numbers (its `label` + its
// `facts[]`), never an adjective. When no resolver answers the active beat for this entity the
// band is ABSENT (the fleet strip stands alone) — the focused variant is purely additive.
const selection = useSelection();
const selectionStat = useSelectionStat();

/** The focused entity's contextual stat, resolved through the I5 registry — or null when no
    selection is focused / no resolver answers the active beat for this entity. The PARSED primary
    item (`primaryItem`) is the registry's `statFor(sel, grain)` input; a focus on a key the route
    cannot resolve simply yields null (the band omits, never errors). */
const focusedStat = computed(() => {
    const item = selection.primaryItem;
    if (!item) return null;
    return selectionStat.statFor(item, item.kind);
});

// ── J-FRAME — THE PER-VIZ HOST-READ SEAM (C36 · §approach-1,4) ────────────────────────────────
// The platform host READS the five declared framework facets off the ONE contract and routes each
// to its OWNING-WAVE implementation through ONE declarative seam — NEVER a per-viz inline fork (a
// viz hand-rolling a filter-set / reveal / stats block inline is the parallel-layer anti-pattern
// J-FEEDBACK-5 §2 forbids). J-FRAME renders NOTHING here: it reads the contract's facets and hands
// each to its owning-wave seam (a scoped slot the owning wave fills — `reveal` → J-SCROLL,
// `glyphs` → J-GLYPH, `aggregateStats` → J-STORY, `provenance` → J-VOICE, `filterDimensions` →
// J-WORKBOOK/J-VIZDOCK). The seam is PURELY declarative — every facet OPTIONAL, so a viz that
// declares none reads exactly as today (the clean-extension make-or-break, J-FEEDBACK-5 §8 D1).

/** FACET 1 — the declared filter dimensions (or [] when undeclared). The state model (arm b) keys
    each dim by its `key` to ONE shared cell; J-WORKBOOK renders the rails. The host READS the
    declaration, it does NOT render the dials. */
const filterDimensions = computed(() => props.contract.filterDimensions ?? []);
/** FACET 2 — the declared scroll-reveal facet (null when undeclared). J-SCROLL §9 renders it. */
const reveal = computed(() => props.contract.reveal ?? null);
/** FACET 3 — the declared entity-glyph grain (null when undeclared). J-GLYPH resolves it. */
const glyphs = computed(() => props.contract.glyphs ?? null);
/** FACET 4 — the declared aggregate stats (or [] when undeclared). J-STORY places them OUTSIDE the
    grid. The host READS the thunk's face; J-STORY owns the placement. */
const aggregateStats = computed(() => props.contract.aggregateStats?.() ?? []);
/** FACET 5 — the declared provenance lockup (null when undeclared). J-VOICE renders it. */
const provenance = computed(() => props.contract.provenance ?? null);

// ── K-ARCHETYPE — THE ARCHETYPE INTENT READ (D5 · NOT a framework facet) ───────────────────────
// `archetype` is read EXACTLY as the J-FRAME facets above, but it is NOT a framework facet (§2): it
// routes to NO renderer — it feeds a pure archetype→defaults merger. NO new slot, NO new wave renderer.
// Ships THIS wave (it reads an existing optional field, vue-tsc-clean).

/** K-ARCHETYPE — the declared archetype intent (undefined when omitted). It names the data
    RELATIONSHIP this viz expresses, never the picture; it drives DEFAULTS + AFFORDANCES only. */
const archetype = computed(() => props.contract.archetype);

/** Expose the resolved intent on the host instance — the INERT host read (no slot, no render branch,
    no DOM change: declaring an archetype changes NO render). It ships the read THIS wave; the D4 drawIn
    merger + the D1 `useVizRegistry` resting-dim consumer read it through this seam, NEVER a renderer. */
defineExpose({ archetype });

// ── J-VIZDOCK — THE STANDARDIZED PER-VIZ CONTROLS CLUSTER (C38 · §approach-1,2,3) ───────────────
// The #actions rung carries ONE small <DockIconButton compact> cluster (consume the dock-control
// register, never hand-roll): a filter-TOGGLE + ONE folded download + an enlarge, with a COLLAPSED
// applied-filters summary Badge. The three loose loose nodes (the dual export <button>s + the
// VizOptions popover) are GONE — the export handlers re-homed onto the download fold's menu, the
// options dials re-homed into the inline filter dock the toggle raises.

// ── (1) THE FILTER-TOGGLE → the ONE unified filter panel (K-FILTER-UNIFIED §4.H) ─────────────────
// The 3-item dock STAYS (the charter §II-D1); only its filter-toggle re-points: from the RETIRED
// inline per-viz dock to the ONE global panel. It PINS the panel to THIS viz (the panel-LOCAL pin,
// `useFilterPanel().pin`) + opens the shared filter Drawer (`useFilterPane().open`) — NEVER a write
// to the K-ACTIVE `activeVizId` signal (the single-writer law, the `k0-active-viz-single-writer`
// gate). Re-clicking the SAME viz's toggle closes the panel (the drawer-close edge clears the pin).
const filterPane = useFilterPane();
const panel = useFilterPanel();
/** This plate's dock toggle reads EXPANDED iff the panel is open AND pinned to THIS viz. */
const filterDockOpen = computed(
    () => filterPane.open.value && panel.pinnedVizId.value === props.contract.id,
);
function toggleFilterDock(): void {
    if (filterDockOpen.value) {
        filterPane.open.value = false;
    } else {
        panel.pin(props.contract.id);
        filterPane.open.value = true;
    }
}

// ── THE SELF-REGISTER (K-FILTER-UNIFIED §4.D · the Component-altitude seam) ──────────────────────
// Each mounted plate self-registers its `filterDimensions` facet (+ its E2 options controller + the
// cross-HIGHLIGHT veil policy) so the unified panel can PROJECT it off the K-ACTIVE active viz-set —
// the contract is invisible at the chapter `<component :is>` altitude. A per-MOUNT token guards the
// HMR / keep-alive double-mount (the deregister deletes ONLY this instance's key).
const vizRegistry = useVizRegistry();
let vizToken: VizToken | null = null;
onMounted(() => {
    vizToken = vizRegistry.register({
        vizId: props.contract.id,
        dims: filterDimensions.value,
        crossHighlight: props.contract.crossHighlight ?? true,
        optionsController: hasOptions.value ? optionsController : null,
    });
});
onUnmounted(() => {
    if (vizToken) vizRegistry.deregister(props.contract.id, vizToken);
});

// ── (2) THE APPLIED-FILTERS SUMMARY — the COLLAPSED readout of the active J-FRAME dials ──────────
// When the filter dock is CLOSED, a Badge reports the active `filterDimensions` count (N filters).
// The count is STATE-DERIVED off the live J-FRAME cells (NOT a hard-coded label) — EMPTY/absent when
// no dial is active. It reads the SAME per-DIMENSION state the inline dock binds to (one source).
const DEFAULT_FILTER_UNIVERSE: RouteUniverse = "sci-lea";
const dimDeclarations = computed<DimDeclaration[]>(() =>
    filterDimensions.value.map((d) => ({
        key: d.key,
        arity: d.arity,
        universe: (d.universe as RouteUniverse | undefined) ?? DEFAULT_FILTER_UNIVERSE,
        selectionKind: d.selectionKind,
        label: d.label,
    })),
);
const { cellFor } = useFilterDimensions(dimDeclarations);
/** The active dimension keys — a dim whose ONE shared cell carries a constraint (a non-null
    scalar/interval or a non-empty set). The summary count + the chip labels derive off this. */
const activeDimChips = computed(() =>
    dimDeclarations.value
        .map((d) => ({ dim: d, cell: cellFor(d.key) }))
        .filter(({ cell }) => {
            if (!cell) return false;
            if (cell.arity === "set") return cell.value.size > 0;
            if (cell.arity === "multi") return cell.value.length > 0;
            return cell.value != null;
        })
        .map(({ dim }) => dim.label ?? dim.key),
);
const activeFilterCount = computed(() => activeDimChips.value.length);
/** The summary is present ONLY when ≥1 dial is active AND the dock is closed (the resting readout). */
const showAppliedSummary = computed(
    () => !filterDockOpen.value && activeFilterCount.value > 0,
);

// ── (3) THE ENLARGE — the `?fig=` expand seam ChartFrame owns, driven from the cluster ───────────
// The enlarge DockIconButton toggles the URL-backed `?fig=` state ChartFrame reads (it CONSUMES the
// expand state — it does NOT re-own the `?fig=`/`open` codec). A plate is fullscreen iff `?fig=`
// names its id, so the button reflects + flips that one document state. It reads/writes off the ONE
// shared `useViewParams` bag (the `?fig` one-bag fold, K-ANIM A1·§3.C) — never a private
// per-component URL-state bag that would whole-query-clobber `?year`/`?sel` on an enlarge.
const view = useViewParams();
const isFullscreen = computed(() => view.figId === props.contract.id);
function toggleEnlarge(): void {
    if (isFullscreen.value) view.closeFig(props.contract.id);
    else view.openFig(props.contract.id);
}

// N.WD1 §4.D1.1 — REPORT the `?fig=` expansion UP to the hub (the SOLE expansion writer; read DOWN
// via `viz.isExpanded`). VizPlate composes ChartFrame internally AND owns the `?fig=` read, so it is
// the single-writer registry for expansion — a plate reads `isExpanded` off the hub with NO
// descendant inject (the expand-inject direction problem dissolves).
watchEffect(() => {
    viz?.reportExpanded(isFullscreen.value);
});

// ── THE FRAME PASS-THROUGHS ──────────────────────────────────────────────────────────────────
const ariaLabel = computed(() => props.contract.ariaLabel ?? props.contract.title);
const size = computed(() => props.contract.size ?? "default");

// ── K-ACTIVE — THE DEFT GOLDEN-RIM STAMP (the centre-grain active-viz medal) ───────────────────
// When THIS plate is the viz nearest viewport-centre (the `activeViz.ts` registry's argmin singleton
// === this contract's id), it wears the gilt `.plate-active-rim` ChartFrame owns. The stamp is
// IMPERATIVE — `data-active-viz` is toggled on the ChartFrame figure's `$el` OFF THE VDOM — because a
// scroll-rate signal must NEVER re-render the plate (the VDOM diff on every frame is the exact churn
// the registry's commit-dedupe avoids). `ChartFrame` is a SINGLE-ROOT figure, so `frameRef.$el`
// resolves to that figure DOM node (the same node the `data-viz-plate`/`:data-viz-id` fallthrough
// land on). The `watchEffect` re-runs only on the boolean EDGE, never per frame.
const activeBeat = useActiveBeat();
const frameRef = ref<{ $el: HTMLElement } | null>(null);
const isActiveViz = computed(() => activeBeat.activeVizId === props.contract.id);
watchEffect(() => {
    const el = frameRef.value?.$el;
    if (el) el.toggleAttribute("data-active-viz", isActiveViz.value);
});
</script>

<template>
    <!-- VizPlate COMPOSES ChartFrame internally — the frame / `?fig=` expand / error boundary /
         headline-straddle / legend-dock all come from the mounted <ChartFrame> below. No consumer
         mounts ChartFrame directly; the §E verbs land ONCE here. -->
    <ChartFrame
        ref="frameRef"
        :eyebrow="contract.eyebrow"
        :aria-label="ariaLabel"
        :size="size"
        :fig-id="contract.id"
        :legend-dock="legendDock"
        :show-title="showOwnTitle"
        data-viz-plate
        :data-viz-id="contract.id"
    >
        <!-- THE TITLE RUNG (the title TEXT alone — the E1 dek relocated to #default below, D5). The
             slot text is gated on `showOwnTitle` so the contract title string is never emitted under
             beat-ownership; `:show-title` ALSO drops ChartFrame's RUNG wrapper (the double-gate: the
             slot gate keeps the DOM clean, the RUNG gate kills the empty-`text-panel-title` ghost). -->
        <template #title>
            <div class="viz-plate__title-zone">
                <slot v-if="showOwnTitle" name="title">{{ contract.title }}</slot>
            </div>
        </template>

        <!-- THE LEGEND (E5) — a consumer `#legend` slot wins; else the contract's LegendSpec drives
             a ChartLegend at the §E5 default mode (stepped for N≥7, else continuous/inline). -->
        <template v-if="legend || slots.legend" #legend>
            <slot name="legend">
                <ChartLegend
                    v-if="legend"
                    :mode="legendIsStepped ? 'stepped' : 'continuous'"
                    :color-kind="legend.colorKind"
                    :low-label="legend.lowLabel"
                    :high-label="legend.highLabel"
                    :testid="`viz-legend-${contract.id}`"
                    :aria-label="`${contract.title} legend`"
                />
            </slot>
        </template>

        <!-- THE #actions RUNG — J-VIZDOCK's ONE standardized <DockIconButton compact> cluster (C38).
             The three loose nodes (the dual export <button>s + the VizOptions popover) are GONE: a
             filter-TOGGLE + ONE folded download (the CSV/image choice behind a DockDropdownTrigger) +
             an enlarge, sourced from @mkbabb/glass-ui/dock (the dock-control register — rounded,
             ≥44px hitbox). A COLLAPSED applied-filters summary Badge rides the cluster when dials are
             active + the dock is closed. The expand seam ChartFrame owns rides the enlarge button. -->
        <template #actions>
            <slot name="actions" />
            <div class="viz-dock" role="group" :aria-label="`${contract.title} controls`">
                <!-- (1) THE FILTER-TOGGLE — raises the inline per-viz filter dock (a TOGGLE, the open
                     state persisting until re-toggled; NOT a click-away popover). Bound to the viz's
                     `filterDimensions` (J-FRAME's facet, CONSUMED). A Badge count-pip rides it when
                     ≥1 dial is active + the dock is closed (the applied-filters summary). -->
                <span class="viz-dock__filter-slot">
                    <DockIconButton
                        compact
                        :aria-label="`Filters — ${contract.title}`"
                        :aria-expanded="filterDockOpen"
                        aria-haspopup="true"
                        :title="`Filters · ${contract.title}`"
                        :data-testid="`viz-dock-filter-toggle-${contract.id}`"
                        data-viz-dock-filter-toggle
                        @click="toggleFilterDock"
                    >
                        <SlidersHorizontal class="viz-dock__glyph" aria-hidden="true" />
                    </DockIconButton>
                    <!-- THE COLLAPSED APPLIED-FILTERS SUMMARY — a state-derived count pip reading the
                         live active `filterDimensions` dials; present-when-active + dock-closed,
                         absent when no dial is active. The full chip-list rides the title. -->
                    <Badge
                        v-if="showAppliedSummary"
                        variant="secondary"
                        size="sm"
                        class="viz-dock__applied"
                        :title="`${activeFilterCount} filter(s): ${activeDimChips.join(', ')}`"
                        :data-testid="`viz-applied-summary-${contract.id}`"
                        data-viz-applied-summary
                        :data-filter-count="activeFilterCount"
                    >
                        {{ activeFilterCount }}
                    </Badge>
                </span>

                <!-- (2) THE FOLDED DOWNLOAD — ONE control, the CSV/image choice behind a
                     DockDropdownTrigger (the two export handlers `onExportCsv`/`onExportImage`
                     re-homed onto the menu, never re-authored). The image export is no longer hidden
                     in an sr-only twin; both exports stay reachable behind the one visible control. -->
                <DropdownMenu>
                    <DockDropdownTrigger
                        :aria-label="`Download ${contract.title} — CSV or image`"
                        :title="`Download · ${contract.title}`"
                        :data-testid="`viz-dock-download-${contract.id}`"
                        data-viz-dock-download
                    >
                        <Download class="viz-dock__glyph" aria-hidden="true" />
                        <span class="sr-only">Download · CSV or image</span>
                    </DockDropdownTrigger>
                    <DropdownMenuContent align="end" :side-offset="6">
                        <DropdownMenuItem
                            :data-testid="`viz-export-csv-${contract.id}`"
                            @select="onExportCsv"
                        >
                            Download CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            :data-testid="`viz-export-image-${contract.id}`"
                            @select="onExportImage"
                        >
                            Download image
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <!-- (3) THE ENLARGE — the `?fig=` expand seam ChartFrame owns, driven from the
                     cluster (CONSUMED, not re-owned). Toggles this plate's fullscreen `?fig=` state. -->
                <DockIconButton
                    compact
                    :aria-label="
                        isFullscreen
                            ? `Collapse ${contract.title}`
                            : `Enlarge ${contract.title}`
                    "
                    :aria-pressed="isFullscreen"
                    :title="isFullscreen ? 'Collapse' : 'Enlarge'"
                    :data-testid="`viz-dock-enlarge-${contract.id}`"
                    data-viz-dock-enlarge
                    @click="toggleEnlarge"
                >
                    <Minimize2
                        v-if="isFullscreen"
                        class="viz-dock__glyph"
                        aria-hidden="true"
                    />
                    <Maximize2 v-else class="viz-dock__glyph" aria-hidden="true" />
                </DockIconButton>
            </div>

            <!-- THE INLINE PER-VIZ FILTER DOCK IS RETIRED (K-FILTER-UNIFIED §4.H). The filter-toggle
                 above now PINS + opens the ONE unified panel (`UnifiedFilterPanel`); the viz's
                 `filterDimensions` dials + the re-homed E2 options render THERE, projected off the
                 K-ACTIVE active viz-set (the self-register seam). The 3-item dock chrome STAYS — only
                 the filter-toggle's TARGET changed (the two-filter fork collapses into the one panel). -->
        </template>

        <!-- J-FRAME · FACET 1 + FACET 4 (TOP) — the per-viz host-read seam, OUTSIDE the chart body.
             The host READS the declared facets and ROUTES each to its OWNING-WAVE renderer through a
             scoped slot (J-FRAME renders NOTHING — a viz hand-rolling a facet inline is the
             parallel-layer anti-pattern J-FEEDBACK-5 §2 forbids). `filterDimensions` → J-WORKBOOK/
             J-VIZDOCK rails; `aggregateStats` (top) → J-STORY's outside-the-grid placement (the
             viz-area-is-viz-only law). Each slot is guarded ABSENT when its facet is undeclared. -->
        <template v-if="filterDimensions.length" #filter-dimensions>
            <slot
                name="filter-dimensions"
                :dimensions="filterDimensions"
                :contract-id="contract.id"
            />
        </template>
        <template v-if="aggregateStats.length" #aggregate-stats-top>
            <slot
                name="aggregate-stats"
                :stats="aggregateStats"
                placement="top"
                :contract-id="contract.id"
            />
        </template>

        <!-- THE CHART BODY — the consumer's figure, wrapped in a `data-viz-body` host so the E3
             DOM-snapshot can find its SVG. On the empty-data signal (E8) the body swaps for the
             designed <PlateVoid> — a blank render is unrepresentable from the host. -->
        <template #default="{ fullscreen }">
            <!-- THE E1 DEK (D5) — UNCONDITIONAL, decoupled from the masthead RUNG: the dek is NO
                 LONGER in the #title slot ChartFrame gates, so the title-dedup rung guard never drops
                 it and the per-plate axis-keyed-description census stays GREEN (the dek remains in the
                 beat subtree). It reads beneath the <h2>, above the chart body, and travels cleanly
                 into the ?fig= expand + export. -->
            <VizDescription :description="contract.description" />
            <!-- J-FRAME · FACET 2 (`reveal` → J-SCROLL §9) + FACET 3 (`glyphs` → J-GLYPH) — the host
                 hands each declared facet to its owning-wave renderer via a scoped slot. J-FRAME
                 READS the declaration (the grain / the reveal steps), it RESOLVES nothing: J-SCROLL
                 orchestrates the reveal over the ONE page-clock, J-GLYPH resolves the grain to a REAL
                 silhouette (NO void-ring, NO proxy). Absent when the facet is undeclared. -->
            <slot v-if="reveal" name="reveal" :reveal="reveal" :contract-id="contract.id" />
            <slot v-if="glyphs" name="glyphs" :glyphs="glyphs" :contract-id="contract.id" />

            <!-- N.WD1 §4.D1.2 — THE 4-RUNG READINESS LADDER. The HOST branches (plates do not): the
                 hub's pure readiness fold picks the rung, and `isEmpty()` is read ONLY at the `figure`/
                 `empty` split (the composition law — a mid-load `rows:[]` reads as `loading`, never a
                 flashed void). No hub ⇒ the legacy `empty`/`figure` split, unchanged. -->
            <PlateSkeleton v-if="platePhase === 'loading'" :label="contract.title" />
            <PlateError
                v-else-if="platePhase === 'error'"
                :label="contract.title"
                :on-retry="onRetry"
            />
            <PlateVoid
                v-else-if="platePhase === 'empty'"
                :reason="contract.voidReason"
                :label="contract.title"
            />
            <!-- THE FIGURE (ready). When a `nav` is declared it is the OPERATING tab stop
                 (role=application, opt-in — SR-mode-changing, so opt-in only; the reading path role=img
                 on the inner host is untouched). The aria-live region serializes the SAME readout the
                 HoverCard renders; the focus rim seats the platform overlay ring at the focused mark. -->
            <div
                v-else
                class="viz-plate__body"
                :data-viz-body="contract.id"
                :tabindex="hasNav ? 0 : undefined"
                :role="hasNav ? 'application' : undefined"
                :aria-roledescription="hasNav ? 'interactive chart' : undefined"
                :aria-label="hasNav ? ariaLabel : undefined"
                @keydown="onFigureKey"
            >
                <slot :fullscreen="fullscreen" />
                <div v-if="hasNav" aria-live="polite" class="sr-only" data-testid="viz-aria-live">
                    {{ liveSentence }}
                </div>
                <div
                    v-if="hasNav && focusRim.visible"
                    class="viz-plate__focus-rim"
                    aria-hidden="true"
                    data-testid="viz-focus-rim"
                    :style="{ left: `${focusRim.x}px`, top: `${focusRim.y}px` }"
                />
            </div>

            <!-- UX-S2 — THE FOCUSED KEY-STAT BAND. While a selection is FOCUSED (primaryKey set)
                 and the active beat resolves a stat for THAT entity, the rung shows the focused
                 entity's value BESIDE the fleet aggregate below — "<entity>: X · fleet: Y", read
                 through the I5 useSelectionStat registry. Factual numbers only (D1/D6). Absent when
                 no primary is focused or no resolver answers (the fleet strip stands alone). -->
            <dl
                v-if="platePhase === 'figure' && focusedStat"
                class="viz-plate__focus-stat"
                data-testid="viz-focus-stat"
            >
                <dt class="viz-plate__focus-label">{{ focusedStat.label }}</dt>
                <div
                    v-for="(f, i) in focusedStat.facts"
                    :key="i"
                    class="viz-plate__focus-fact"
                >
                    <span class="viz-plate__focus-fact-label">{{ f.label }}</span>
                    <dd class="viz-plate__focus-fact-value">{{ f.value }}</dd>
                </div>
            </dl>

            <!-- THE B4 KEY-STAT STRIP — the per-viz thesis as numbers, off the contract reducers,
                 colour-matched to the data. Mounts at the plate footer (travels into expand). The
                 FLEET aggregate the focused band above reads "beside". -->
            <VizKeyStats
                v-if="platePhase === 'figure'"
                class="viz-plate__keystats"
                :stats="contract.keyStats()"
            />

            <!-- THE EXPORT / a11y PAYLOAD (E3, one source) — the off-screen ChartDataTable IS the
                 CSV payload AND the screen-reader data table. Mounted here so the rows travel with
                 the plate into expand + export. -->
            <ChartDataTable
                :rows="contract.export.rows()"
                :caption="contract.title"
                :row-header="contract.export.rowHeader"
                :value-header="contract.export.valueHeader"
            />

            <!-- J-FRAME · FACET 4 (BOTTOM) + FACET 5 — the host-read seam BELOW the grid (the
                 outside-the-viz placement). `aggregateStats` (bottom) → J-STORY's top/bottom-
                 alternating outside-the-grid placement; `provenance` → J-VOICE's source lockup +
                 x-vs-y declaration. The host READS the declarations and ROUTES each to its owning
                 wave via a scoped slot — J-FRAME renders NOTHING. Absent when undeclared. -->
            <slot
                v-if="aggregateStats.length"
                name="aggregate-stats"
                :stats="aggregateStats"
                placement="bottom"
                :contract-id="contract.id"
            />
            <slot
                v-if="provenance"
                name="provenance"
                :provenance="provenance"
                :contract-id="contract.id"
            />
        </template>
    </ChartFrame>
</template>

<style scoped>
/* The title zone holds the question-title + the E1 dek under it (the dek recedes below the title). */
.viz-plate__title-zone {
    display: flex;
    flex-direction: column;
}
/* The chart body host — a plain wrapper carrying the `data-viz-body` snapshot hook; it adds no box
   (display: contents would hide it from the DOM-snapshot query, so it stays a block that fills). */
.viz-plate__body {
    inline-size: 100%;
}
.viz-plate__keystats {
    margin-block-start: 1.25rem;
}

/* N.WD1 §4.D1.5 — THE KEYBOARD FOCUS RIM (the platform overlay ring at the focused mark's anchor).
   var(--ring) at 2.5px, ≥2px perimeter, seated in VIEWPORT space (position:fixed — the nav anchor is
   viewport-projected). It TRAVELS on the glass-ui SPATIAL spring and repositions INSTANTLY under PRM
   (parity, not absence of meaning). REGISTER (N5 design consult, signed): 2.5px var(--ring) stands
   (glass-ui's theme-resolved near-ink/near-ivory ring — ≥3:1 on both stocks); the travel rides
   `--spring-snappy` (the scheme-spring table's position-movement register — a ~3% overshoot that
   settles by a third of the beat), so each arrow-step ARRIVES with a felt spring, never a float. */
.viz-plate__focus-rim {
    position: fixed;
    z-index: 40;
    inline-size: 1.75rem;
    block-size: 1.75rem;
    border: 2.5px solid var(--ring, var(--route-accent));
    border-radius: var(--radius-pill);
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition:
        left var(--duration-normal, 0.3s) var(--spring-snappy, cubic-bezier(0.22, 1, 0.36, 1)),
        top var(--duration-normal, 0.3s) var(--spring-snappy, cubic-bezier(0.22, 1, 0.36, 1));
}
@media (prefers-reduced-motion: reduce) {
    .viz-plate__focus-rim {
        transition: none;
    }
}

/* UX-S2 — THE FOCUSED KEY-STAT BAND. Rides ABOVE the fleet strip while a primary is focused: a
   quiet labelled band reading the focused entity's resolved numbers, so "<entity>: X" sits beside
   the fleet "Y" below. It wears the GILT focus tier (the one-gilt-at-a-time law — a hairline gold
   rim + a faint gold wash, the same register the §key-stat record pill carries) so the focused
   subject reads ONE rung above the resting fleet strip. Factual numbers; no editorial chrome. */
.viz-plate__focus-stat {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 1.25rem;
    margin: 1.25rem 0 0;
    padding: 0.5rem 0.75rem;
    border: 1px solid
        var(--sel-primary-ring, color-mix(in oklab, var(--foreground), transparent 70%));
    border-radius: var(--radius-control, 0.4rem);
    background: color-mix(in oklab, var(--sel-primary-ring, #b8860b) 7%, transparent);
}
.viz-plate__focus-label {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--sel-primary-ring, var(--foreground));
}
.viz-plate__focus-fact {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
    min-inline-size: 0;
}
.viz-plate__focus-fact-label {
    font-size: 0.75rem;
    color: var(--muted-foreground);
}
.viz-plate__focus-fact-value {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--foreground);
}

/* J-VIZDOCK — THE STANDARDIZED PER-VIZ CONTROLS CLUSTER. ONE small row of <DockIconButton compact>
   controls (filter-toggle · download · enlarge) from the dock-control register, sourced from
   @mkbabb/glass-ui/dock — rounded, ≥44px hitbox (the register paints the chrome; the cluster only
   lays the row). Recessive at rest, full ink on plate hover/focus (the expand-trigger doctrine);
   always-visible on touch (the C7 first-class-mobile law — a hover-gated affordance is undiscoverable
   on a coarse pointer). */
.viz-dock {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    opacity: 0.62;
    transition: opacity 0.18s ease;
}
:where([data-chart-frame]:hover) .viz-dock,
:where([data-chart-frame]:focus-within) .viz-dock {
    opacity: 1;
}
@media (--no-hover) {
    .viz-dock {
        opacity: 1;
    }
}
@media (prefers-reduced-motion: reduce) {
    .viz-dock {
        transition: none;
    }
}
.viz-dock__glyph {
    width: 1rem;
    height: 1rem;
}
/* The filter-toggle + its applied-summary pip share one positioned slot so the count rides the
   control's corner. */
.viz-dock__filter-slot {
    position: relative;
    display: inline-flex;
}
.viz-dock__applied {
    position: absolute;
    top: -0.25rem;
    inset-inline-end: -0.25rem;
    min-width: 1.05rem;
    height: 1.05rem;
    padding: 0 0.3rem;
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
}
/* The inline `.viz-dock__panel` rule is RETIRED with the inline VizFilterDock mount (K-FILTER-UNIFIED
   §4.H) — the filter-toggle now opens the ONE unified panel, so no inline dock breaks the control row. */
</style>
