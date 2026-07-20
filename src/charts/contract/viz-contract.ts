// platform/charts/viz-contract.ts — THE VIZ CONTRACT KEYSTONE (I2.a · DESIGN §3.7).
//
// A viz becomes a declared OBJECT, not an assembled template. ONE `VizContract` carries
// every §E / §B affordance — the title, the axis-coloured description (E1), an optional key-stat strip
// (B4), the options spec (E2), the legend policy (E5), the export payload (E3), the body-engine
// selector (the render kind), and the empty-data signal (E8) — and ONE host (`VizPlate.vue`)
// renders the whole furniture from it, COMPOSING `ChartFrame` internally. A plate that omits a
// required field FAILS `tsc` (the affordance is unrepresentable-when-absent).
//
// THE REQUIRED FIELDS (the born-RED coverage law, DESIGN §3.7 / I2 Hard Gate 1):
//   • `description` (E1) — the axis-keyed colour-matched dek. NON-OPTIONAL.
//   • `export`      (E3) — the CSV/PNG payload spec. NON-OPTIONAL.
// `keyStats` (B4), `options` (E2), `legend` (E5), `render`, `isEmpty` (E8) are DECLARED FACETS (optional shape,
// but a plate declares `options: []` explicitly rather than silently omitting — the survey is the
// default, DESIGN §2.2.3).
//
// THE COLOR LAW: every colour a contract names is a CSS-var reference (`var(--viz-…)`, a
// `colorVar` token name, or a `colorKind` selector) — NEVER a hardcoded hex. The data hue flows
// from `colorKind.ts` / `ColorScale.ts` (the keystone), so the description dek, the key stats, and
// the body marks all wear ONE colour locus (i0-colorkind-law).

import { isVNode } from "vue";
import type { EChartsOption } from "echarts";
import type { ColorKind } from "../scale/colorKind.js";
import type { VizOptionSpec } from "../composables/useVizOptions.js";
import type { VizSetContract } from "../viz-set.js";
import type { ChartDataRow } from "../legend/ChartDataTable.vue";
import type { ExportFilterContext } from "../lib/vizExport.js";
import type { SelectionKind } from "./selection-contract.js";
import type { VariantSpec } from "../../motion/variant-spec.js";
import type { ProvenanceFacet } from "../../platform/provenance/provenance-contract.js";
import type { DataScope } from "../../platform/provenance/data-scope.js";
import type { AtlasEventContract, EventScope } from "../../events/index.js";

// ─────────────────────────────────────────────────────────────────────────────
// E1 — THE AXIS-COLOURED DESCRIPTION.
// ─────────────────────────────────────────────────────────────────────────────

/** One axis measure word in the description — a `token` (the word as it appears in the prose
    `template`, e.g. `"contributions"`) tinted to its DATA hue via `colorVar` (a CSS custom-property
    NAME read from the cascade, e.g. `"--viz-diverging-low"`). The `pole`/`colorKind` source the
    same `colorKind.ts` stops the marks wear — NEVER a hardcoded hex. `label` is the human axis
    name for the a11y prose. */
export interface AxisWord {
    /** The word as it appears in `template` (the `{token}` placeholder name). */
    token: string;
    /** The human axis label (the read-aloud name). */
    label: string;
    /** The CSS custom-property NAME the word is tinted with (e.g. `"--viz-diverging-low"`). The
        cascade resolves it late (theme-aware); a literal hex here FAILS the colorkind-law gate. */
    colorVar: string;
}

/** E1 — the axis-keyed colour-matched description. `prose` is a short SENTENCE with `{token}`
    placeholders that the host tints to each `axes` entry's `colorVar`. It travels WITH the plate
    into expand AND export (it is contract DATA, not free body prose). */
export interface AxisDescription {
    /** The sentence with `{token}` placeholders, e.g. `"How {y} tracks {x} across the decade."` */
    prose: string;
    /** The axis words, each tinted to its data hue from the ONE colour registry. */
    axes: AxisWord[];
}

// ─────────────────────────────────────────────────────────────────────────────
// B4 — THE KEY-STAT STRIP.
// ─────────────────────────────────────────────────────────────────────────────

/** B4 — one key stat: the per-viz thesis as a number, colour-matched to the data. `value` is the
    formatted face (routed through the format law, never a raw float); `caption` names it; the
    optional `colorVar` tints the figure to its data hue (a CSS-var NAME, never a hex); `unit` /
    `sign` ride the FigureSlug sub-rungs; `record` gilds the ONE superlative per view (gold-scarcity). */
export interface KeyStat {
    /** The formatted figure face (e.g. `"$8.92B"`, `"52.7%"`). */
    value: string;
    /** The stat's caption (e.g. `"total disbursed"`). */
    caption: string;
    /** The CSS-var NAME tinting the figure (e.g. `"--viz-diverging-low"`); omit for chrome ink. */
    colorVar?: string;
    /** An optional unit suffix at the FigureSlug `.unit` sub-rung (e.g. `"B"`). */
    unit?: string;
    /** An optional leading sign at the FigureSlug pole sub-rung (e.g. `"−"`). */
    sign?: string;
    /** Gild this stat as the view's ONE superlative (the gold `record` pill). At most one true. */
    record?: boolean;
    /** The stat's editorial RANK in its plate's keyStat lockup (the K-C-HIER hierarchy vocabulary,
        shared with `HeroFigure.rank`). `lede` is the plate-thesis figure; omit ⇒ a co-equal member.
        SIZE is governed by `--rank-scale-*` (the host reads this exactly as DashboardHero does).
        Authored as the inert generalization — no live consumer ranks yet (the §7 provisional). */
    rank?: "lede" | "support" | "ancillary";
}

// ─────────────────────────────────────────────────────────────────────────────
// E5 — THE LEGEND DEFAULT POLICY.
// ─────────────────────────────────────────────────────────────────────────────

/** The legend display mode (the §E5 selection rule, carried as the contract DEFAULT):
    · `inline`  — the compact top-right KEY column (≤6-chip identity keys; the resting default);
    · `stepped` — an ordinal ramp with N≥7 tiers collapses to ONE hard-stop spectral BAR (the SCI
      14-row tower killed by contract — the per-tier counts move to the hover);
    · `rail`    — a tall legend rides a SIDE rail beside the data on a HERO plate. */
export type LegendMode = "inline" | "stepped" | "rail";

/** E5 — the legend policy. `mode` is the DEFAULT selection (a `LegendSpec` with `N≥7` ordinal
    stops declares `stepped`; a hero plate declares `rail`; ≤6 chips declare `inline`). `colorKind`
    sources the ramp from `colorKind.ts`; `lowLabel`/`highLabel` are the pole words. */
export interface LegendSpec {
    /** The legend's default display mode. */
    mode: LegendMode;
    /** The legend's dock (maps onto `ChartFrame`'s `legendDock`). `rail` is hero-only; `foot` seats
        the legend BENEATH the plate body (between the figure and the provenance foot) — the home for a
        tall identity-glyph lockup that would otherwise cram the header KEY column (the two USF maps),
        available at any register. */
    dock?: "inline" | "rail" | "foot";
    /** The ramp's colour kind (paints the bar from the `colorKind.ts` stops — never a hex). */
    colorKind?: ColorKind;
    /** The low/high pole words flanking a continuous/stepped bar. */
    lowLabel?: string;
    highLabel?: string;
}

/** Render-ready legend derived from a view's resolved color channel. */
export interface VizLegendSpec {
    mode: "continuous" | "discrete";
    colorKind?: "diverging" | "sequential";
    hinge?: number;
    showHinge?: boolean;
    hingeLabel?: string;
    lowLabel?: string;
    highLabel?: string;
    anchors?: (string | null)[];
    chips?: Array<{ key: string; label: string; color: string }>;
}

/** One styled axis-name lockup seated in a chart gutter. */
export interface AxisLockup {
    measure: string;
    unit?: string;
    pole?: boolean;
}

/** One DOM-over-canvas annotation anchor. */
export interface VizAnnotationPlacement {
    id: string;
    x?: number;
    y?: number;
    align?: "start" | "end" | "top" | "bottom";
    dx?: number;
    dy?: number;
    gutter?: number;
}

/** One renderable view. Its zero-argument option thunk reads the consumer's live state directly. */
export interface VizView {
    id: string;
    label: string;
    option: () => EChartsOption;
    options?: VizOptionSpec[];
    axes?: { x?: AxisLockup; y?: AxisLockup };
    annotations?: VizAnnotationPlacement[];
    legend?: VizLegendSpec;
}

// ─────────────────────────────────────────────────────────────────────────────
// E3 — THE EXPORT SPEC.
// ─────────────────────────────────────────────────────────────────────────────

/** E3 — the export payload. `rows` is a thunk returning the `ChartDataTable` a11y rows (the row
    set IS the data payload — ONE source); `rowHeader`/`valueHeader` name the CSV columns; `format`
    selects the image serializer (the canvas path uses ECharts `getDataURL`, svg/geo use a
    DOM-snapshot) — defaulting from the contract's `render` kind. ZERO new heavy dep. */
export interface ExportSpec {
    /** The a11y rows — the CSV payload AND the ChartDataTable source (one set). */
    rows: () => ChartDataRow[];
    /** The CSV row-header column label (e.g. `"State"`). */
    rowHeader: string;
    /** The CSV value-header column label (e.g. `"Net retention"`). */
    valueHeader: string;
    /** PA-6 COLO-3 — the live reproducibility legs a CSV needs so a FILTERED export is
        distinguishable from a full one. The consumer resolves them off its own coordinator predicate
        (`encodeFilter`/`explain`), the drawn-of-total, and the feed vintage (`resolveAsOf`); the host
        threads the result into the CSV preamble. Omit (or return null) ⇒ the export is byte-identical
        to the unfiltered form. */
    filterContext?: () => ExportFilterContext | null;
}

/** The one host-to-source-panel prop contract shared by ordinary plates and persistent stages. */
export interface SourcePanelProps {
    readonly eventHub: AtlasEventContract;
    readonly eventScope: EventScope;
    readonly vizId: string;
}

/** A-33 — the contract seat for a plate's declared `DataScope`. The row type is erased HERE and
    only here: a plate declares its scope over its OWN row, and the host builder that consumes it
    re-infers that row generically. An existential the type system cannot spell (the
    `CSSKeyframesAnimation<any>` precedent). */
export type DeclaredDataScope = DataScope<any, any>;

// ─────────────────────────────────────────────────────────────────────────────
// THE RENDER KIND + THE CONTRACT.
// ─────────────────────────────────────────────────────────────────────────────

/** The body-engine selector — which serializer the export reaches for and which `view-transition`
    the expand uses. `echarts` → ECharts `getDataURL` (the canvas path); `svg`/`geo` → DOM-snapshot
    (the SVG path). */
export type VizRenderKind = "echarts" | "svg" | "geo";

/** THE VIZ ARCHETYPE (K-ARCHETYPE · K-EXPRESS D5) — the optional INTENT hint that names the data
    RELATIONSHIP a viz expresses, NEVER the picture. The 7 canonical relationship families (the FT
    Visual Vocabulary taxonomy, collapsed to the seven that carry a DISTINCT downstream default) + the
    `(string & {})` open escape (the EXACT `RouteUniverse` idiom, the sibling open union below) so a
    NOVEL intent needs no enum edit. It drives DEFAULTS + AFFORDANCES only (a pure archetype→defaults
    merger); it NEVER selects a renderer — the mapping to a Vue plate-component is many-to-many (`ranking` →
    RankedBar OR beeswarm OR dot-plot; `geographic` → choropleth OR point OR hex). A value that NAMES a
    picture FAILS the born-RED `k0-archetype-intent.gate` (the open union forfeits tsc's closed-set
    guard; the gate restores it at the source-census level). THE MAP VERDICT (FB1 §D5): a `geographic`
    INTENT any geo plate declares — the `GeoPlate` host+slot+kind-roster is the reuse template — NEVER a
    `MapViz` type (a projection is a coord transform GoG cannot compose; maps earn a host COMPONENT, not
    a contract TYPE). */
export type VizArchetype =
    | "trajectory" // change over time
    | "ranking" // order / magnitude comparison
    | "distribution" // spread / frequency
    | "part-to-whole" // composition
    | "relationship" // correlation between variables
    | "flow" // movement / transfer between nodes
    | "geographic" // spatial / where
    | (string & {}); // the open escape — a novel intent needs no enum edit (cf. RouteUniverse below)

/** THE EVIDENCE TIER (X3-2 — the FACT/HYPOTHESIS/SPECULATION home). SPEC §2.7 / §4 require an evidence
    tag "in every caption" but no `VizContract` field carried it (`types.ts` has only the unrelated
    reveal `tier`). A `FACT` caption states the adjudicated record; a `HYPOTHESIS`/`SPECULATION` caption
    is a pattern that "warrants review" and (per the W3 lint, C5 §3 row 4) must carry the not-proof
    clause. It mirrors the figure-document `FindingRow.factTag` (the `factTag`↔`evidenceTier` bridge,
    T0.5) — a W2 contract sets `evidenceTier` FROM the finding it renders. */
export type EvidenceTier = "FACT" | "HYPOTHESIS" | "SPECULATION";

// ═════════════════════════════════════════════════════════════════════════════
// J-FRAME — THE FIVE FRAMEWORK FACETS (C36 · the lifted VizContract spine).
//
// The atlas is a GENERALIZED data-viz framework, and the framework is the CONTRACT — NOT a
// parallel layer beside the chart engines (the anti-pattern J-FEEDBACK-5 §2 forbids). A viz
// DECLARES its framework intent on the SAME I2 `VizContract` the `ScatterPlate`/`GeoPlate` thin
// declarations already carry, and the platform `VizPlate` host READS each declared facet and
// routes it to its OWNING-WAVE implementation through ONE declarative seam. J-FRAME owns ONLY the
// FIELD-SET + the host-read policy; it names ZERO renderers — each facet's render is the owning
// wave's (J-SCROLL=`reveal`, J-STORY=`aggregateStats`, J-VOICE=`provenance`,
// J-WORKBOOK consumes `filterDimensions`). The facets are OPTIONAL fields, so the shipped
// `ScatterPlate`/`GeoPlate` thin declarations compile BYTE-UNCHANGED (a viz that declares none of
// the five reads exactly as today — the clean-extension make-or-break, J-FEEDBACK-5 §8 Decision 1).
// ═════════════════════════════════════════════════════════════════════════════

// ── FACET 1 — `filterDimensions` (C37 · the per-viz contextual filter-set) ────────────────────
//
// The TYPE shape only — arm b authors the per-DIMENSION STATE model (the `filter-dimensions.ts`
// module: ONE cell per dimension, NOT per viz, so "shared attributes persist across like vizzes"
// falls out and the N×M panel explosion is dodged). This facet declares WHAT a viz filters by;
// the state model resolves each declared `key` to ONE shared cell, the per-dim ARITY drives the
// algebra (the `set` arity resolves the cross-viz set-semantics through the SHIPPED `{kind}:{id}`
// codec over `useSelection.selectedIdsOf`; `single`/`range` carry a scalar/interval, never a
// forced set), and the ROUTE-UNIVERSE tag namespaces a SCI `district:{lea}` apart from an ECF
// `district:{lea}` so the two do not silently co-filter (the collision guard, arm c).

/** A filter dimension's ARITY — its shape on the contract, declared per dimension (never inferred,
    Open Question 2). `single` is a categorical pick / a scalar (USF flow, an ECF categorical);
    `multi` is the within-OR categorical (USF `regions` — the symmetric sibling of `single`, reads a
    `listParam`; DISTINCT from `set` which is selection-grain-bound, K-FILTER-UNIFIED §4.B); `range` is
    an interval slider (USF popMin/Max); `set` is a multi-member selection-grain dim whose cross-viz
    set-algebra resolves ONLY through the `{kind}:{id}` codec over `useSelection.selectedIdsOf` (the
    selection-grain tractability boundary, J-FEEDBACK-5 §2/§7-C37). */
export type FilterArity = "single" | "multi" | "range" | "set";

/** A filter dimension's SCOPE (K-FILTER-UNIFIED §4.B — the Tableau context-filter, declarative). A
    `view` dim dims/encodes AFTER the compute (the post-context predicate — `flag`/`nslp`/`tier`); a
    `context` dim narrows the DOMAIN the rank/Top-N/aggregate compute over, applied BEFORE the view
    fold, route-wide (SCI `adm` = "compare schools of THIS size"). The line: `context` = which rows
    EXIST for the compute; `view` = dims/encodes after. Default `view` when omitted. */
export type FilterScope = "view" | "context";

/** A filter dimension's ROUTE-UNIVERSE — the namespace the dimension's composite keys live in (the
    collision guard, §approach-3 · Open Question 3). A dataset-universe id (NOT a route name), so a
    SCI `district:{lea}` resolved in the `sci-lea` universe does NOT match the SAME composite key
    minted by an ECF viz in the `ecf-district` universe — a SCI LEA is not an ECF district even when
    the `{kind}:{id}` string aliases. The state-model set-algebra (arm b) is universe-SCOPED, never a
    bare global Set lookup. Open to a viz's own universe string; the named members are the live two. */
export type RouteUniverse = "sci-lea" | "ecf-district" | (string & {});

/** FACET 1 — one declared filter dimension. The viz NAMES the dimension by its stable `key` (the
    per-DIMENSION state cell arm b keys by — so two like vizzes that declare the SAME `key` read ONE
    cell, and the shared attribute persists across them); the `arity` declares its shape; a `set`-arity
    dim NAMES its `selectionKind` (the `{kind}:{id}` grain it resolves through) + its `universe` (the
    collision-guard namespace). The `single`/`range` dims carry no selection grain (they are
    `useViewParams` scalars/intervals). J-FRAME declares this TYPE; arm b's state model + J-WORKBOOK's
    SCI/ECF filter rails CONSUME it. */
export interface FilterDimension {
    /** The dimension's stable KEY — the per-DIMENSION state cell (e.g. `"region"`, `"year"`,
        `"nslp"`). Two like vizzes declaring the SAME key read ONE shared cell (the persist relation);
        a key declared by only one viz holds its own cell (no cross-bleed onto a non-declaring viz). */
    key: string;
    /** The dimension's per-dim ARITY — `single`/`range`/`set` (never a uniform set-algebra). */
    arity: FilterArity;
    /** The human label for the filter dial (the affordance copy J-WORKBOOK/J-VIZDOCK render). */
    label: string;
    /** A `set`-arity dim's selection GRAIN — the `{kind}:{id}` kind it resolves through
        `useSelection.selectedIdsOf` (the selection-grain tractability boundary). REQUIRED-in-spirit for
        `set`; ABSENT for `single`/`range` (which carry a scalar/interval, never a selection set). */
    selectionKind?: SelectionKind;
    /** A `set`-arity dim's ROUTE-UNIVERSE — the collision-guard namespace (`sci-lea` vs `ecf-district`).
        The state-model set-algebra is scoped to it, so a like-keyed `district:{lea}` in one universe is
        not a member in the other. ABSENT for non-selection dims (they cannot collide across routes). */
    universe?: RouteUniverse;
    /** K-FILTER-UNIFIED §4.B — the within-OR row accessor folded by the normalized query.
        Omit for a panel-only dimension. */
    field?: (row: never) => string | number | null;
    /** K-FILTER-UNIFIED §4.B — the dim's `view`/`context` SCOPE (default `view`). A `context` dim
        narrows the rank/aggregate DOMAIN before the view fold; a `view` dim dims/encodes after. */
    scope?: FilterScope;
    /** K-G fold (K-FILTER-UNIFIED §4.B — RANGE-ARITY ONLY) — the distribution thunk the unified
        `DimDial`'s `PercentileRangeSlider` reads (the `keyStats`/`aggregateStats` thunk convention).
        ABSENT for non-range dims. */
    dataValues?: () => number[];
    /** K-G fold (RANGE-ARITY ONLY) — the slider readout formatter (a data-space value → its label). */
    format?: (v: number) => string;
    /** K-G fold (RANGE-ARITY ONLY) — the slider step granularity. */
    step?: number;
}

/** FACET 1 — the per-viz `filterDimensions` facet: the ORDERED set of dimensions a viz declares it
    filters by. The platform reads it (the per-viz host-read seam), the state model (arm b) resolves
    each `key` to its ONE shared cell, and J-WORKBOOK renders the SCI/ECF filter rails from it. */
export type FilterDimensions = FilterDimension[];

// ── FACET 2 — `reveal` (the per-viz scroll-reveal facet · IMPL is the KEPT reveal register) ────────

/** FACET 2 — the per-viz scroll-reveal declaration. The viz declares its reveal INTENT — the ordered
    `steps` + the wipe `direction` — and the KEPT reveal register renders it: the scroll-driven.css
    compositor system (`data-reveal-*` + `--scroll-tl`, zero JS per frame) for the host reveal, and a
    declared `MotionDeclaration` on the motion director for the per-mark/number tiers (RevealUp/CountDial
    off the cover scalar). The per-mark gesture sub-facets (the inert K-arc catalog tree) were PURGED in
    N.WC1 — a per-mark gesture is now a `MotionSegment` on the director, not a facet on the contract. */
export interface RevealFacet {
    /** The ordered reveal STEP keys the host reveals through (each a `data-reveal-*` marker the
        scroll-driven.css compositor keys a reveal band on). The viz declares the sequence. */
    steps: string[];
    /** Opt the viz OUT of reveal under reduced-motion (the reveal collapses to the settled end-state).
        Defaults to the platform reduced-motion policy when omitted. */
    respectReducedMotion?: boolean;
    /** The drawIn wipe-axis (K-B-MOTION §4.3): 'ltr' (reading direction, the default, reveals L→R) |
        'rtl' (horizontal-bar argument, reveals R→L) | 'center' (centre-out, a diverging viz). Omit for
        the reading-direction default. */
    direction?: "ltr" | "rtl" | "center";
    /** A3 (K-ANIM) — the per-viz reveal variant DEFAULT (merged by `resolveVariant`). All-optional; a
        viz declaring none renders the register defaults. */
    variant?: VariantSpec;
}

// ── FACET 4 — `aggregateStats` (the outside-the-grid stats · IMPL is J-STORY) ─────────────────

/** ONE high-level aggregate stat a viz declares for OUTSIDE-the-grid placement (the viz-area-is-viz-only
    law, J-FEEDBACK-5 §6/§7-C44). A thunk off the store reducers (the live face), a `caption`, and an
    optional `colorVar` tinting it to its data hue (a CSS-var NAME, never a hex — the color law). J-FRAME
    declares the TYPE; J-STORY PLACES it outside the graph-paper (top/bottom alternating). */
export interface AggregateStat {
    /** The formatted figure face, off the store reducers (e.g. `"$8.92B"`). */
    value: string;
    /** The stat's caption (e.g. `"total disbursed across the decade"`). */
    caption: string;
    /** The CSS-var NAME tinting the figure (e.g. `"--viz-diverging-low"`); omit for chrome ink. */
    colorVar?: string;
}

/** FACET 4 — the per-viz `aggregateStats` facet: the high-level stats a viz declares for placement
    OUTSIDE the viz/grid. A thunk (the live numbers off the store reducers). J-FRAME declares the TYPE;
    J-STORY's outside-the-grid placement renders it (the viz-area-is-viz-only law — the stats never
    crowd the graph-paper). */
export type AggregateStatsFacet = () => AggregateStat[];

/** Whether route filters alter this figure. Omission is responsive: static is an explicit
    exception, never inferred from an empty per-viz dimension list. */
export type FilterResponse = "responsive" | "static";

// ── FACET 5 — `provenance` (the per-viz source lockup) — LIFTED to `provenance/` at O-B7 ─────────

/** FACET 5 — the per-viz `provenance` facet. The declared-provenance SHAPE was LIFTED out of this
    keystone to its first-class home (`platform/provenance/provenance-contract.ts`) at O-B7 — the
    oldest unserved seam (L7 / CD-10) finally has a module. Re-exported HERE as a type-only shim so
    the `charts` subpath + every `VizContract.provenance`-typing consumer resolves `ProvenanceFacet`
    unchanged. The RENDER primitive is the NAMED WG-A successor (`ProvenanceBar`/`ProvenanceChip`/
    `useProvenance`); this wave claims NO render [src-rearchitecture §A.4; provenance-surface §3; CD-10]. */
export type { ProvenanceFacet };

/** THE VIZ CONTRACT (DESIGN §3.7). A viz declared once, rendered whole by `VizPlate`. */
export interface VizContract {
    /** The plate's ONE slug — the `?fig=` expand namespace AND the `?viz.<id>.*` options namespace. */
    id: string;
    /** N.WD1 §4.D1.2 — the SECONDARY loadDocument source this plate reads (`sci-schools`,
        `usf-integrity-figures`). Omit ⇒ the plate reads the PRIMARY feed's readiness. The host's
        4-rung readiness ladder folds this source's phase via `hub.readinessOf(sourceId)`, so a
        secondary-doc plate shows its OWN source's loading/error/ready, not the primary's. */
    sourceId?: string;
    /** The plate title — a plain DECLARATIVE statement of what is measured against what (Fraunces);
        NEVER a rhetorical question (J-VOICE §7.2 `i0-voice-riddle-title`, the iter-5 forthright-data-
        analysis reversal). The felt, open question belongs in the chapter dek/eyebrow, not the title. */
    title: string;
    /** E1 — the axis-keyed colour-matched description. REQUIRED (a missing dek FAILS tsc). */
    description: AxisDescription;
    /** B4 — optional per-viz key figures for the compact non-card crown. */
    keyStats?: () => KeyStat[];
    /** E3 — the CSV/PNG payload spec. REQUIRED. */
    export: ExportSpec;
    /** A-33 — the plate's declared DATA SCOPE (source ⊕ query ⊕ columns). The host builds the one
        generic browser from it and opens it at `?browse=<id>`; a plate that declares none has no
        viewer. Declarative — no Component. */
    sourceData?: DeclaredDataScope;
    /** E2 — the options spec. Declare `[]` explicitly rather than omit (no silent omission). */
    options?: VizOptionSpec[];
    /** Alternate views over one mounted chart instance. */
    viewSet?: VizSetContract;
    /** E5 — the legend policy (the default selection rule). Omit for a no-legend plate. */
    legend?: LegendSpec;
    /** The body-engine selector (export serializer + expand transition). Default `"echarts"`. */
    render?: VizRenderKind;
    /** K-ARCHETYPE — the optional ARCHETYPE intent hint: the data RELATIONSHIP this viz expresses
        (`ranking`/`geographic`/…), NEVER the picture. Drives DEFAULTS + AFFORDANCES only (a pure
        archetype→defaults merger); NEVER selects a renderer (it is NOT a framework facet — it is absent from
        `FRAMEWORK_FACETS`, so `j0-frame-facets` is byte-clean). OPTIONAL (omission is purely
        subtractive — the plate keeps its platform defaults; the 25+ shipped contracts compile
        byte-unchanged). A value that names a PICTURE fails the born-RED `k0-archetype-intent.gate`. */
    archetype?: VizArchetype;
    /** The eyebrow kicker above the title (the `figure-no.` / chapter marker). */
    eyebrow?: string;
    /** The plate register — `hero` for the flagship plate, `default` for the workhorse. */
    size?: "default" | "hero";
    /** The accessible region label (defaults to `title`). */
    ariaLabel?: string;
    /** E8 — the empty-data signal. When `isEmpty()` is true the host swaps the chart body for a
        `<PlateVoid>` (no blank render, no two-rules-around-empty-space). A plate that owns a
        BESPOKE multi-face empty state (speedtest's thin-coverage/true-empty split, O-D16) may omit
        this and manage its own empty visual inside the chart body instead — `isEmpty` stays FALSE
        so the body always mounts, and the plate composes `<PlateVoid>` itself where it needs it. */
    isEmpty?: () => boolean;
    /** The void HEADING (Fraunces 26–28px) when `isEmpty()` is true — falls back to `title`. */
    voidLabel?: string;
    /** The void CAPTION when `isEmpty()` is true (DESIGN §3.8; I10 names the reasons). */
    voidReason?: string;
    /** O-D16 — the error rung's HEADING (readiness `"error"`, a feed-load failure) — falls back to
        `title` when undeclared (every pre-O-D16 route keeps its current figure-name heading). */
    errorLabel?: string;
    /** O-D16 — the error rung's CAPTION — falls back to a generic "could not be drawn" line when
        undeclared (every pre-O-D16 route keeps its current copy). */
    errorReason?: string;
    /** O-D16 — the error rung's retry action label — default `"Try again"`. */
    retryLabel?: string;
    /** O-D24/EX-65 (v1.0.29) — suppress the error rung's retry action entirely. The compiled
        ladder used to attach `PlateVoid`'s "Try again" button UNCONDITIONALLY on `error`, with no
        lever to omit it — a rejection-terminal plate (a permanently-registered secondary source
        whose designed error face carries no retry mechanism to wire the button to, e.g. the vft
        fault-beat ladder) could declare bespoke `errorLabel`/`errorReason` prose but never drop
        the dead action beneath it. `false` ⇒ `PlateVoid` receives no `action` at all (the SAME
        "absent, not disabled" contract `PlateVoid`'s own `v-if="action"` gate already honours).
        Default `true` — every existing route keeps its retry, byte-identical. */
    retryable?: boolean;
    /** X3-2 — the evidence tag (FACT/HYPOTHESIS/SPECULATION). OPTIONAL on the base contract so the four
        shipped routes compile unchanged (X3-6 flags backfilling them to a later tranche); REQUIRED for
        the WATCHERS route via `WatchersVizContract` below (born-RED via tsc — a figure that omits its
        evidence tag fails to compile). The W3 lint then asserts a `HYPOTHESIS`/`SPECULATION` caption
        carries the not-proof clause (C5 §3 row 4). */
    evidenceTier?: EvidenceTier;

    // ── J-FRAME — THE FIVE DECLARATIVE FRAMEWORK FACETS (C36/C37) ──────────────────────────────
    // Each an OPTIONAL field a viz DECLARES and the platform `VizPlate` host READS, routing it to
    // its OWNING-WAVE implementation through ONE declarative seam (NEVER a per-viz inline fork —
    // the parallel-layer anti-pattern J-FEEDBACK-5 §2 forbids). All OPTIONAL, so the shipped
    // `ScatterPlate`/`GeoPlate` thin declarations compile BYTE-UNCHANGED. J-FRAME owns ONLY these
    // FIELD shapes; it names ZERO renderers — each facet's render is the owning wave's.

    /** FACET 1 (C37) — the per-viz contextual filter-set. A viz declares WHAT it filters by (each dim
        its `key`/`arity`/`universe`); arm b's state model keys each `key` to ONE shared cell (the
        shared-dim-persists relation), and J-WORKBOOK renders the SCI/ECF filter rails. The `set`-arity
        dims resolve through `useSelection.selectedIdsOf`, universe-scoped (the `district:{lea}` guard). */
    filterDimensions?: FilterDimensions;
    /** Whether route filters alter this figure. Default `"responsive"`; declare `"static"` only
        when the figure deliberately preserves its authored values under route filtering. */
    filterResponse?: FilterResponse;
    /** FACET 2 — the per-viz scroll-reveal declaration. The IMPL is the KEPT reveal register (the
        scroll-driven.css compositor over the ONE page-clock — the `data-reveal-*` bands, NOT a second
        clock) + a declared `MotionDeclaration` on the motion director for the per-mark/number tiers. */
    reveal?: RevealFacet;
    /** FACET 4 — the per-viz aggregate stats placed OUTSIDE the viz/grid. A thunk off the store
        reducers; the IMPL is J-STORY's outside-the-grid placement (the viz-area-is-viz-only law). */
    aggregateStats?: AggregateStatsFacet;
    /** FACET 5 — the per-viz structured provenance lockup + the x-vs-y encoding declaration. The IMPL
        is J-VOICE's lockup (the forthright-data-analysis principle). */
    provenance?: ProvenanceFacet;
}

/** THE WATCHERS / USF-Integrity contract type (X3-2) — a `VizContract` with `evidenceTier` made
    REQUIRED. The new route's contracts are typed as this, so a WATCHERS figure that omits its evidence
    tag FAILS `tsc` (the born-RED coverage law), while the four shipped routes keep the OPTIONAL base
    type and compile unchanged. */
export type WatchersVizContract = VizContract &
    Required<Pick<VizContract, "evidenceTier">>;

/** Is a value a declared `VizContract` (vs a Component, a `ChapterScene`, or a sentinel)? A contract
    is a plain object carrying the required `id` + `description` + `export` fields (NOT a VNode). The
    ONE copy — `DashboardEssay` (the essay route) AND `StickyScene` (the scene host) both import this
    (the S6 promotion: a de-dup from the former `DashboardEssay`-local guard). */
export function isVizContract(v: unknown): v is VizContract {
    return (
        typeof v === "object" &&
        v !== null &&
        !isVNode(v) &&
        "id" in v &&
        "description" in v &&
        "export" in v
    );
}
