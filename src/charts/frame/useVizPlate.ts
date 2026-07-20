// charts/frame/useVizPlate.ts — the VizPlate HOST LOGIC (O-B4R god-split of `VizPlate.vue`,
// §A.9 · the B4 wave's named host+composable split). The whole §E/§B/§J host verb-set — the
// title-dedup, legend-dock, options engine, export, the readiness ladder, the keyboard host,
// the focused key-stat, the J-FRAME facet reads, the J-VIZDOCK controls cluster + self-register,
// and the active-rim stamp — moved verbatim off the SFC. The `.vue` keeps only the props macro,
// the destructure, `defineExpose({archetype})`, and the template. Zero behaviour change.

import {
    computed,
    inject,
    onMounted,
    onUnmounted,
    ref,
    useSlots,
    watch,
    watchEffect,
} from "vue";
import { BEAT_TITLE_KEY } from "../legend/beat-title.js";
import { useOptionalStageEventHub } from "../contract/scene-contract.js";
import { useOptionalVizContext } from "../../platform/context/hub.js";
import type { Readiness } from "../../platform/context/readiness.js";
import {
    keyStep,
    ariaLiveSentence,
    initialNavState,
    type KeyboardNavSpec,
    type NavState,
} from "../../interaction/keyboard.js";
import { parseSelKey } from "../contract/selection-contract.js";
import { useVizOptions } from "../composables/useVizOptions.js";
import {
    useFilterDimensions,
    type DimDeclaration,
    type RouteUniverse,
} from "../../filter/composables/useFilterDimensions.js";
import { createBrowserFromScope } from "../../filter/engine/browser-from-scope.js";
import { useFilterPane } from "../../filter/composables/useFilterPane.js";
import { useFilterPanel } from "../../filter/composables/useFilterPanel.js";
import { useVizRegistry, type VizToken } from "../composables/useVizRegistry.js";
import { exportCsv, exportImage, type DataUrlSource } from "../lib/vizExport.js";
import type { VizContract, LegendSpec } from "../contract/viz-contract.js";
import { useSelection } from "../../platform/stores/useSelection.js";
import { useSelectionStat } from "../../platform/stores/useSelectionStat.js";
import { useActiveBeat } from "../../platform/stores/useActiveBeat.js";
import { useViewParams } from "../../platform/stores/useViewParams.js";
import { useFreshness } from "../../platform/chrome/freshness.js";
import { createAtlasEventHub } from "../../events/index.js";

/** VizPlate's props — the declared `VizContract` + the optional live chart + keyboard nav.
    The SFC applies the `{chart:null, nav:null}` withDefaults; the composable reads the resolved
    proxy reactively. */
export interface VizPlateProps {
    contract: VizContract;
    chart?: DataUrlSource | null;
    nav?: KeyboardNavSpec<unknown> | null;
}

/** E5 — the legend-dock resolution (EXPLICIT opt-in — no magic), pure so the seat is unit-assertable
    off a bare contract. A `foot` dock seats the legend BENEATH the body (any register); a `rail` dock
    rides the hero SIDE rail (hero register only); else the inline header KEY column; `none` when
    neither a `LegendSpec` nor a `#legend` slot is present. The declared `LegendSpec.dock` drives the
    seat — a bespoke-`#legend` plate opts into the foot by declaring `legend: { …, dock: "foot" }`. */
export function resolveLegendDock(
    legend: LegendSpec | undefined,
    size: VizContract["size"],
    hasLegendSlot: boolean,
): "inline" | "rail" | "foot" | "none" {
    if (!legend && !hasLegendSlot) return "none";
    if (legend?.dock === "foot") return "foot";
    return legend?.dock === "rail" && size === "hero" ? "rail" : "inline";
}

export function useVizPlate(props: VizPlateProps) {
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
/** ChartFrame's `legendDock` — the `resolveLegendDock` policy over the declared `LegendSpec` + the
    live `#legend` slot. A consumer `#legend` slot wins (a bespoke legend); else the contract's
    `LegendSpec` drives a ChartLegend at the resolved seat (the slot still renders the bespoke content
    when present; the facet drives the seat). */
const legendDock = computed<"inline" | "rail" | "foot" | "none">(() =>
    resolveLegendDock(legend.value, props.contract.size, !!slots.legend),
);
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

/** Export the CSV (the a11y rows ARE the payload, one source). The declared provenance AND the
    live filter context (PA-6 COLO-3 — the round-trip query, drawn-of-total, and as-of vintage the
    consumer resolves off its coordinator) lead as the reproducibility preamble; absent ⇒ byte-
    identical to the unfiltered form. */
function onExportCsv(): void {
    const rows = props.contract.export.rows();
    exportCsv(
        rows,
        props.contract.export.rowHeader,
        props.contract.export.valueHeader,
        `${props.contract.id}.csv`,
        props.contract.provenance,
        props.contract.export.filterContext?.() ?? null,
    );
}

/** Export the figure image — getDataURL for canvas, DOM-snapshot for svg/geo (ZERO heavy dep). */
function onExportImage(): boolean {
    return exportImage(renderKind.value, `${props.contract.id}`, props.chart ?? null, bodyEl());
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

// ── O-D16 — THE ERROR RUNG'S PlateVoid PROPS (the ladder's error face, ONE family with `empty`) ──
// The readiness `"error"` rung now renders `<PlateVoid>` (retired `PlateError` from the LADDER only
// — `PlateError` still stands as `ChartFrame`'s own onErrorCaptured exception-boundary card, a
// separate, narrower job). Every pre-O-D16 route keeps its DEFAULT copy unchanged (label = title,
// caption = the prior generic line, action = "Try again"); a route may now declare
// `errorLabel`/`errorReason`/`retryLabel` for a bespoke face (speedtest's "The live speed feed
// didn't answer.").
//
// O-D24/EX-65 (v1.0.29) — `retryable: false` SUPPRESSES the action outright (`undefined`, not a
// disabled button — `PlateVoid`'s own `v-if="action"` gate then renders nothing), for a
// rejection-terminal plate whose designed error face has no retry mechanism to wire the button to
// (a permanently-resolved secondary source, e.g. the vft fault-beat ladder — retrying would just
// re-resolve the same bundled model). Default (undeclared/`true`) is byte-identical to before.
const errorAction = computed(() =>
    props.contract.retryable === false
        ? undefined
        : { label: props.contract.retryLabel ?? "Try again", onClick: onRetry },
);

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
            viz?.selection.select(parsed.kind, parsed.id, { additive: res.intent.additive });
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
// `aggregateStats` → J-STORY, `provenance` → J-VOICE, `filterDimensions` →
// J-WORKBOOK/J-VIZDOCK). The seam is PURELY declarative — every facet OPTIONAL, so a viz that
// declares none reads exactly as today (the clean-extension make-or-break, J-FEEDBACK-5 §8 D1).

/** FACET 1 — the declared filter dimensions (or [] when undeclared). The state model (arm b) keys
    each dim by its `key` to ONE shared cell; J-WORKBOOK renders the rails. The host READS the
    declaration, it does NOT render the dials. */
const filterDimensions = computed(() => props.contract.filterDimensions ?? []);
const filterResponse = computed(() => props.contract.filterResponse ?? "responsive");
/** FACET 2 — the declared scroll-reveal facet (null when undeclared). J-SCROLL §9 renders it. */
const reveal = computed(() => props.contract.reveal ?? null);
/** FACET 4 — the declared aggregate stats (or [] when undeclared). J-STORY places them OUTSIDE the
    grid. The host READS the thunk's face; J-STORY owns the placement. */
const aggregateStats = computed(() => props.contract.aggregateStats?.() ?? []);
/** B4 — the optional compact crown. An aggregate-only card has no empty foot furniture. */
const keyStats = computed(() =>
    platePhase.value === "figure" ? (props.contract.keyStats?.() ?? []) : [],
);
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

// ── J-VIZDOCK — THE STANDARDIZED PER-VIZ CONTROLS CLUSTER (C38 · §approach-1,2,3) ───────────────
// The #actions rung carries ONE small <DockControl compact> cluster (consume the dock-control
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
// Each mounted plate self-registers its `filterDimensions` facet (+ its E2 options controller) so
// the unified panel can PROJECT it off the K-ACTIVE active viz-set —
// the contract is invisible at the chapter `<component :is>` altitude. A per-MOUNT token guards the
// HMR / keep-alive double-mount (the deregister deletes ONLY this instance's key).
const vizRegistry = useVizRegistry();
let vizToken: VizToken | null = null;
onMounted(() => {
    vizToken = vizRegistry.register({
        vizId: props.contract.id,
        dims: filterDimensions.value,
        filterResponse: filterResponse.value,
        optionsController: hasOptions.value ? optionsController : null,
        imageExport: {
            format: renderKind.value === "echarts" ? "png" : "svg",
            export: onExportImage,
        },
    });
});
watch([filterDimensions, filterResponse], ([dims, response]) => {
    if (vizToken)
        vizRegistry.updateFilterFacet(props.contract.id, vizToken, {
            dims,
            filterResponse: response,
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
// The enlarge DockControl toggles the URL-backed `?fig=` state ChartFrame reads (it CONSUMES the
// expand state — it does NOT re-own the `?fig=`/`open` codec). A plate is fullscreen iff `?fig=`
// names its id, so the button reflects + flips that one document state. It reads/writes off the ONE
// shared `useViewParams` bag (the `?fig` one-bag fold, K-ANIM A1·§3.C) — never a private
// per-component URL-state bag that would whole-query-clobber `?year`/`?sel` on an enlarge.
const view = useViewParams();
view.registerKeys(["browse", "grain"]);
const isFullscreen = computed(() => view.figId === props.contract.id);
const stageEventContext = useOptionalStageEventHub();
const sourceEventHub =
    stageEventContext?.hub ??
    (props.contract.sourceData ? createAtlasEventHub() : null);
/** A-33 — the declared scope folded into the ONE generic browser's props (null when the plate
    declares no scope, or when a persistent stage owns the source seat). The as-of the export stamps
    is the plate's RESOLVED vintage — read off the active feed, never hand-typed and never copied
    into a registry, so a downloaded CSV names the bake it actually came from. */
const freshness = useFreshness();
const sourceData = computed(() =>
    stageEventContext || !props.contract.sourceData
        ? null
        : createBrowserFromScope(props.contract.sourceData, () => freshness.label.value),
);
if (sourceEventHub) {
    if (!stageEventContext)
        watch(
            () => props.contract.id,
            (vizId) =>
                sourceEventHub.emit({
                    type: "active-viz",
                    scope: { grain: "viz", vizId },
                    vizId,
                    beat: { id: vizId, label: props.contract.title },
                }),
            { immediate: true },
        );
    watch(
        [() => selection.primaryKey, () => [...selection.selectedKeys]],
        ([primaryKey, selectedKeys]) => {
            const vizId = stageEventContext?.scope.stageId ?? props.contract.id;
            sourceEventHub.emit({
                type: "selected-viz",
                scope: stageEventContext?.scope ?? { grain: "viz", vizId },
                vizId,
                primaryKey,
                selectedKeys,
            });
        },
        { immediate: true },
    );
}
const sourceDataOpen = computed(
    () => sourceData.value != null && view.param("browse") === props.contract.id,
);
/** CD-11 — THE SELECTION DRILL-DOWN, as one more DOOR rather than one more table. A latched
    selection opens the SAME viewer at the `selection` grain, so the rows a reader gets are the rows
    they picked; with nothing latched the door opens on the whole dataset. The narrowing itself is
    the scope's own `filterPredicate` ∩ the route's selected keys, which `createRowsReader` already
    performs — there is no second projection here, only the grain this opening asks for. */
function openSourceData(): void {
    if (!sourceData.value) return;
    view.setParam("browse", props.contract.id);
    view.setParam("grain", selection.selectedKeys.size > 0 ? "selection" : undefined);
}
function closeSourceData(): void {
    if (view.param("browse") === props.contract.id) view.setParam("browse", undefined);
    view.setParam("grain", undefined);
}
/** CD-09 (PA-9) — the STABLE region id of this plate's source-data grid (the SourceDataBrowser
    aside). The figure binds `aria-details` to this id ONLY while the grid is OPEN (`sourceDataOpen`) —
    the aside that carries the id renders only then, so binding at rest would dangle the IDREF at a
    non-existent element (CHALLENGE-3 A1). Open, the picture is programmatically associated with its
    full, reachable data (SC 1.1.1); at rest the reachable "Browse source data" control is the path.
    A per-contract slug so two plates on a page never collide their grid regions. */
const sourceDataRegionId = computed(() => `viz-source-data-${props.contract.id}`);
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

    return {
        slots,
        showOwnTitle,
        legend,
        legendDock,
        legendIsStepped,
        onExportCsv,
        onExportImage,
        isEmpty,
        viz,
        readiness,
        platePhase,
        onRetry,
        errorAction,
        hasNav,
        liveSentence,
        focusRim,
        onFigureKey,
        focusedStat,
        filterDimensions,
        reveal,
        aggregateStats,
        keyStats,
        provenance,
        archetype,
        panel,
        filterDockOpen,
        toggleFilterDock,
        activeDimChips,
        activeFilterCount,
        showAppliedSummary,
        sourceData,
        sourceEventHub,
        sourceDataOpen,
        sourceDataRegionId,
        openSourceData,
        closeSourceData,
        isFullscreen,
        toggleEnlarge,
        ariaLabel,
        size,
        frameRef,
        selection,
    };
}
