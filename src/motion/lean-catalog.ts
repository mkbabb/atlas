// platform/motion/lean-catalog.ts — THE LEAN MOTION CATALOG (N.WC1 · N.md §4.C · KS3 purge-and-replace).
//
// The K-arc motion catalog was 57 inert NAMES across 8 families with ZERO consumers. This is the lean
// successor: 8 render MECHANISMS (each ONE binding to a keyframes.js 5.1.0 engine or the KEPT reveal
// register) + a CLOSED 14-preset roster covering the whole 7-dashboard census. The 57 "names" were
// (mechanism × VariantSpec) all along — the variant bag (direction/ease/intensity/…) carries the
// differentiation the extra 43 names hand-rolled. Every one of the 57 K-names appears in EXACTLY ONE
// `subsumes[]` (total + disjoint — `K_CATALOG_NAMES` freezes the census; the gate proves the cover), so
// NO design vocabulary is silently dropped.
//
// THE `oscillate` MECHANISM IS CUT (N.md §8 · RC3-RM-4): no preset rode it, and the `LeanMechanism`
// union drops it. The ambient breath/pulse vocabulary (MarkBreath/AmbientPulse) is RETIRED-TO-PARKED
// under `ActiveRim.subsumes` — the names are preserved for the cover proof, NEVER folded into a LIVE
// preset (F8 is parked design-gated settle-once, not revived). `path` stays in the union as the
// reserved DrawSVG fold-slot (no preset binds it live — the path-family folds into `draw`, cf.
// `DrawIn.subsumes`).
//
// W-MOTION-CORE (spec-motion §a.2) COMPLETES the catalog with the two spec-C additions and NOTHING
// else: mechanism `breath` (compositor-idle, net-new — never the cut `oscillate` JS loop), preset
// `CurvePersist` (W-64) and preset `Breath` (W-71). 14 → 16 presets, 8 → 9 mechanism names (8 live +
// `path` reserved). The grammar is completed here, never expanded.

import type { MotionTrigger } from "./triggers.js"; // the KEPT closed taxonomy — reused
import { ATMOSPHERE_PRESETS } from "../platform/chrome/background/composables/atmosphere.js";

/** The render MECHANISMS — each ONE binding to a keyframes.js 5.1.0 primitive, the KEPT reveal
    register, or (breath) a pure `@keyframes` register. This is the real cardinality of the product's
    animation vocabulary (the 57 catalog NAMES are (mechanism × VariantSpec), not 57 engines).
    `oscillate` is CUT (parked). */
export type LeanMechanism =
    | "reveal" // css-view fade/lift/blur/scale/clip → the KEPT reveal register (revealHostStyle)
    | "draw" // stroke draw-in → keyframes.js DrawSVG (the single stroke engine; path folds here)
    | "path" // along-a-path trace → keyframes.js MotionPath (reserved fold-slot; no live preset)
    | "type" // per-glyph write / weight → useScrollLettering + font-variation
    | "count" // number dial → keyframes.js NumericAnimation / the KEPT useCountUp (countAt)
    | "morph" // data/shape re-shape → keyframes.js MorphSVG | ECharts setOption
    | "emphasis" // select/hover/active tint → CSS-var treatment + SpringProgress pulse
    | "flip" // layout / shared-element → keyframes.js flip / flipShared
    | "breath"; // idle drift → `breath.css` @keyframes ONLY (compositor-idle; zero JS, zero rAF)

/** The mechanism union as a runtime roster (9 names — 8 live + the reserved `path`; `oscillate` absent). */
export const LEAN_MECHANISMS = [
    "reveal",
    "draw",
    "path",
    "type",
    "count",
    "morph",
    "emphasis",
    "flip",
    "breath",
] as const satisfies readonly LeanMechanism[];

/** THE ONE BREATH LAW (A-21 · β-gate F5 · OPTIONS §4.3). The ornament breath does NOT author its own
    magnitude: it RATIONS against the SAME clamp constants the aurora ground breathes inside. One clamp
    set, two consumers, never a second envelope — a re-tune of the ground moves the ornament with it.

    WHICH RUNG. The ground's envelope became INTENSITY-KEYED (A-36 `ATMOSPHERE_PRESETS`), so the single
    envelope the ration was written against no longer exists; the rung is a choice this preset must
    make. It takes the QUIETEST rung, because an ornament is route-agnostic: a `quiet` route rationed
    against the `data` cap would carry a mark breathing LOUDER than its own ground. Read off the floor,
    the ration holds on every route the table can express.

    THE FOREGROUND RATION. An ornament is a small high-contrast mark on paper; the ground is a
    full-viewport wash, so at equal depth the mark reads far louder. One stated rule closes the gap —
    HALF the quiet rung's amplitude cap, TWICE its period floor — which lands the ornament in the
    sub-perceptual-drift class the ration demands (an idle mark must never outcompete an earned data
    mark). `breath.css` carries the pair as its `var()` fallbacks; a unit test holds the two in
    agreement, and the census there proves no second clamp set exists to drift from. */
const QUIET_GROUND = ATMOSPHERE_PRESETS.quiet.envelope;

export const BREATH_ENVELOPE = {
    /** The scale excursion, 0.015 — half the quiet ground's `breathDepthMax`. */
    depth: QUIET_GROUND.breathDepthMax / 2,
    /** The full breath period in SECONDS, 80 — twice the quiet ground's `breathPeriodMin`. */
    periodS: QUIET_GROUND.breathPeriodMin * 2,
} as const;

/** A lean-catalog PRESET name — the 16 tasteful defaults the 7 dashboards genuinely use (the census's
    14 + the two spec-C completions). A preset resolves to `{ mechanism, on, defaults, subsumes }`; the
    design vocabulary lives here, the engine count stays 8 live. Closed (`satisfies Record<…>`). */
export type LeanPresetName =
    | "RevealUp"
    | "RevealBlur"
    | "RevealScale"
    | "BarRise"
    | "ClipWipe" // reveal family (5)
    | "DrawIn" // draw (1) — lines/geo/axes/rules
    | "CurvePersist" // draw (1) — the traced curve that LATCHES on click (W-64)
    | "Typewriter"
    | "Scramble" // type (2)
    | "CountDial" // count (1)
    | "SeriesMorph" // morph (1)
    | "SelectRing"
    | "HoverRaise"
    | "ActiveRim" // emphasis (3)
    | "Reorder" // flip (1)
    | "Breath"; // breath (1) — the rationed idle drift (W-71)

/** ONE lean preset: mechanism · valid trigger SET · the quiet defaults · the K-name subsumption. No
    `builder` union (the mechanism IS the dispatch key) — the engine binding lives in `buildMarkAnimation`
    / the reveal register. */
export interface LeanPreset {
    /** The render mechanism — the ONE engine binding (the dispatch key). */
    readonly mechanism: LeanMechanism;
    /** The PLURAL valid-trigger set (a segment picks ONE via `MotionSegment.on`; the gate checks
        membership — a segment cannot fire on a trigger its preset does not declare). */
    readonly on: readonly MotionTrigger[];
    /** The quietest tasteful defaults — the variant bag a segment overrides (the P2-D seed values; a
        fable design consult reviews them after this lane — implemented to the seed, flag changes). */
    readonly defaults: {
        readonly direction?: string;
        readonly ease?: string;
        readonly intensity?: number;
        readonly liftEm?: number;
        readonly blurPx?: number;
        readonly fromScale?: number;
        /** `breath` only — the scale excursion + the full breath period (s). Both DERIVE from
            `BREATH_ENVELOPE`; a preset never authors a breath magnitude of its own (the ONE
            breath law). */
        readonly breathDepth?: number;
        readonly breathPeriodS?: number;
    };
    /** Which of the 57 K-catalog names this preset SUBSUMES — the migration map. The gate asserts the
        union of these is TOTAL over `K_CATALOG_NAMES` and DISJOINT (each K-name in exactly one). */
    readonly subsumes: readonly string[];
}

const EXPO = "--ease-expo";
const OVERSHOOT = "--ease-overshoot";

/** THE LEAN CATALOG — 16 presets over 8 live mechanisms. `satisfies Record<LeanPresetName, LeanPreset>`
    keeps it closed (omit a name → tsc RED, the born-RED discipline at 1/4 the surface). */
export const LEAN_CATALOG = {
    // ── REVEAL (the KEPT reveal register — revealHostStyle; scroll/load scrubbed) ────────────────────
    RevealUp: {
        mechanism: "reveal",
        on: ["scroll", "load"],
        defaults: { direction: "up", ease: EXPO, liftEm: 0.5, intensity: 1 },
        subsumes: ["FadeUp", "SlideMask", "UnitReveal", "SlideInFromSide", "AreaRise"],
    },
    RevealBlur: {
        mechanism: "reveal",
        on: ["scroll", "load"],
        defaults: { ease: EXPO, blurPx: 6, intensity: 1 },
        subsumes: ["BlurIn", "GradientSweep", "HighlightWipe"],
    },
    RevealScale: {
        mechanism: "reveal",
        on: ["scroll", "load", "active"],
        defaults: { ease: OVERSHOOT, fromScale: 0.86, intensity: 1 },
        subsumes: ["ScaleIn", "MarkerDrop", "GeoMarkerDrop", "ScatterFan", "BeeswarmSettle"],
    },
    BarRise: {
        mechanism: "reveal",
        on: ["scroll"],
        defaults: { direction: "up", ease: EXPO, intensity: 1 },
        subsumes: ["BarRise", "GeoFillCascade", "HexCascade", "ChartDrawMask"],
    },
    ClipWipe: {
        mechanism: "reveal",
        on: ["scroll"],
        defaults: { direction: "up", ease: EXPO },
        subsumes: ["ClipReveal", "KineticEmphasis"],
    },

    // ── DRAW (keyframes.js DrawSVG — the single stroke engine for EVERY line/outline/rule/axis) ──────
    DrawIn: {
        mechanism: "draw",
        on: ["scroll"],
        defaults: { ease: EXPO },
        subsumes: [
            "LineDraw",
            "UnderlineDraw",
            "GridlineDraw",
            "AxisExtend",
            "ArcSweep",
            "SparklineTrace",
            "GeoOutlineDraw",
            "RegionTrace",
            "BracketDraw",
            "DropRuleExtend",
            "LeaderDraw",
            "ConnectDots",
            "RibbonFlow", // path-family folded into draw (MotionPath is a draw variant)
        ],
    },
    CurvePersist: {
        mechanism: "draw",
        // The W-64 affordance in ONE preset (spec-motion §g): the curve TRACES on scroll
        // (`compileTarget(draw, scroll)` = compositor, bi-directional for free) and LATCHES on
        // click (`compileTarget(draw, select)` = director-spring — the persistent annotated read).
        // Two triggers over one mechanism is why the row's compile target reads "compositor +
        // director-spring"; the declaring segment picks the `compose` policy.
        on: ["scroll", "select"],
        defaults: { ease: EXPO },
        subsumes: [],
    },

    // ── TYPE (useScrollLettering + font-variation — the title/heading tier) ──────────────────────────
    Typewriter: {
        mechanism: "type",
        on: ["scroll", "load"],
        defaults: { direction: "up", ease: EXPO },
        subsumes: ["TitleTypewriter", "WeightMorph"],
    },
    Scramble: {
        mechanism: "type",
        on: ["scroll", "load", "active"],
        defaults: { ease: EXPO },
        subsumes: ["ScrambleDecode"],
    },

    // ── COUNT (keyframes.js NumericAnimation / the KEPT useCountUp — every figure number) ────────────
    CountDial: {
        mechanism: "count",
        on: ["scroll", "load", "select"],
        defaults: { ease: EXPO },
        subsumes: ["CountUp", "OdometerRoll", "Tick", "DecimalSettle", "MagnitudePop", "DeltaSign"],
    },

    // ── MORPH (keyframes.js MorphSVG / ECharts setOption — data/shape re-shape on filter/select) ─────
    SeriesMorph: {
        mechanism: "morph",
        // `pin` rides here (spec-motion §e): the chapter STAGE's scene-to-scene re-encode scrubs off
        // the composed step clock. It is the one preset the earned jack drives — and by the W-50 type
        // key only a `ChapterStage` may declare it.
        on: ["filter", "select", "load", "pin"],
        defaults: {},
        subsumes: ["SeriesMorph", "ProjectionMorph"],
    },

    // ── EMPHASIS (CSS-var treatment + SpringProgress pulse — select/hover/active, the interaction tier)
    SelectRing: {
        mechanism: "emphasis",
        on: ["select"],
        defaults: {},
        subsumes: ["MarkEmphasis", "SelectRing", "PrimaryGilt", "DimVeil", "FocusHalo"],
    },
    HoverRaise: {
        mechanism: "emphasis",
        on: ["hover"],
        defaults: {},
        subsumes: ["HoverTrace", "RaiseOnly", "DragGrip"],
    },
    ActiveRim: {
        mechanism: "emphasis",
        on: ["active"],
        defaults: {},
        // ActiveRim's mechanism is `emphasis` (a settle-once spring on the `active` edge — NOT a loop).
        // MarkBreath/AmbientPulse are RETIRED-TO-PARKED here (the cut `oscillate` mechanism · N.md §8):
        // their names ride the subsumption ONLY so the 57-cover stays total; they are NEVER folded into a
        // LIVE preset (F8 is parked design-gated settle-once, never revived). The new `Breath` preset does
        // NOT claim them: it is net-new compositor idle, not the cut JS loop these two names denote.
        subsumes: ["ActiveRim", "MarkBreath", "AmbientPulse", "AffordanceHint", "DisabledVeil"],
    },

    // ── FLIP (keyframes.js flip / flipShared — filter reorder + shared-element beat morph) ───────────
    Reorder: {
        mechanism: "flip",
        on: ["filter"],
        defaults: {},
        subsumes: ["FlipReorder"],
    },

    // ── BREATH (`breath.css` @keyframes — the rationed idle; NO engine, NO rAF, NO director scalar) ──
    Breath: {
        mechanism: "breath",
        // `load` names the MOUNT edge only — the ornament breathes from the moment its beat mounts.
        // `compileSegment` resolves the mechanism to `compositor-idle` whatever the trigger, so the
        // segment binds no director scalar and never enters the impulse set (the zero-idle-rAF law).
        on: ["load"],
        defaults: { breathDepth: BREATH_ENVELOPE.depth, breathPeriodS: BREATH_ENVELOPE.periodS },
        // The PARKED MarkBreath/AmbientPulse names stay under `ActiveRim` — they are the CUT
        // `oscillate` JS-loop vocabulary, and this mechanism is net-new compositor (spec-motion §j).
        subsumes: [],
    },
} as const satisfies Record<LeanPresetName, LeanPreset>;

/** THE 57 K-CATALOG NAMES (the deleted K-arc catalog's closed name union, inlined as the migration
    census). The gate asserts `⋃ LEAN_CATALOG[*].subsumes === K_CATALOG_NAMES` (total) and that each name
    appears in exactly one `subsumes[]` (disjoint) — so the purge drops the OBJECT, never the vocabulary. */
export const K_CATALOG_NAMES = Object.freeze([
    // TEXT (10)
    "TitleTypewriter", "FadeUp", "BlurIn", "SlideMask", "WeightMorph",
    "GradientSweep", "ScrambleDecode", "UnderlineDraw", "HighlightWipe", "KineticEmphasis",
    // NUMBER (8)
    "CountUp", "OdometerRoll", "Tick", "DecimalSettle", "UnitReveal",
    "DeltaSign", "MagnitudePop", "SparklineTrace",
    // CHART (10)
    "BarRise", "ScatterFan", "LineDraw", "AreaRise", "SeriesMorph",
    "AxisExtend", "GridlineDraw", "ConnectDots", "MarkerDrop", "ArcSweep",
    // GEO (8)
    "GeoOutlineDraw", "GeoFillCascade", "HexCascade", "GeoMarkerDrop",
    "RegionTrace", "ProjectionMorph", "RibbonFlow", "BeeswarmSettle",
    // MARK-ANNOTATION (3)
    "BracketDraw", "DropRuleExtend", "LeaderDraw",
    // CONTAINER (5)
    "ScaleIn", "ClipReveal", "SlideInFromSide", "FlipReorder", "ChartDrawMask",
    // AMBIENT (2) — retired-to-parked under ActiveRim
    "MarkBreath", "AmbientPulse",
    // INTERACTION / AFFORDANCE (11)
    "MarkEmphasis", "SelectRing", "PrimaryGilt", "DimVeil", "HoverTrace",
    "RaiseOnly", "ActiveRim", "DragGrip", "DisabledVeil", "FocusHalo", "AffordanceHint",
] as const);

/** The count that matters. 16 presets / 9 mechanism names — down from 57 names / 11 declared mechanisms. */
export const LEAN_METRICS = {
    presetCount: Object.keys(LEAN_CATALOG).length, // 16
    mechanismCount: LEAN_MECHANISMS.length, // 9 (the union; the catalog binds 8 live, `path` reserved)
    kNamesSubsumed: new Set(Object.values(LEAN_CATALOG).flatMap((p) => p.subsumes)).size, // 57
} as const;

/** The preset → valid-trigger map (the `PRESET_TRIGGERS` membership contract G-N6 checks: a
    `MotionSegment.on` MUST be in `PRESET_TRIGGERS[segment.use]`). Derived from `LEAN_CATALOG` so the two
    can never drift. */
const _presetTriggers = {} as Record<LeanPresetName, readonly MotionTrigger[]>;
for (const name of Object.keys(LEAN_CATALOG) as LeanPresetName[])
    _presetTriggers[name] = LEAN_CATALOG[name].on;
export const PRESET_TRIGGERS: Record<LeanPresetName, readonly MotionTrigger[]> =
    Object.freeze(_presetTriggers);

/** The pure preset resolver — the single read a host makes. Total over the closed roster. */
export function resolveLeanPreset(name: LeanPresetName): LeanPreset {
    return LEAN_CATALOG[name];
}
