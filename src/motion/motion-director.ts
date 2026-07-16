// platform/motion/motion-director.ts — THE MOTION DIRECTOR (N.WC1 · N.md §4.C · KS3 purge-and-replace).
//
// The trigger dispatcher the K-arc taxonomy was built to serve but never got. A viz DECLARES its motion
// as a `MotionDeclaration` (segments = preset · target · trigger); the director resolves each trigger to
// ONE scalar (the DriverEdge keystone — N-R3 §5c, proven) and hands it back as a Vue signal. The whole
// "D4 runtime" is `buildMarkAnimation`: a ~10-line-per-mechanism adapter over the keyframes.js 5.1.0
// primitives that ALREADY ship on disk (the KS3 finding — the engine exists; only the catalog was inert).
//
// RC3 (the director-surface corrections — re-typed OFF the purge set):
//   1. ZERO purge-set imports. `styleFor` returns a plain `ComputedRef<Record<string,string>>` (the KEPT
//      reveal register's `{opacity, transform}` shape), NOT the deleted `SegmentRender[]`.
//   2. `MarkTarget` = host | marks{within} — the `stack` arm (a `MotionStack`) is GONE (the stack tier
//      folds into `host`, the reveal register's DOM seam).
//   3. ONE director surface: `scalarFor` + `styleFor` + `idle` + `dispose`. The director hands a SCALAR;
//      seam routing is PLATE-render-typed — a CANVAS plate owns its `optionAt(scalars)` (rebuilds the
//      ECharts option); an SVG plate scrubs `buildMarkAnimation` off the same scalar. NO `optionFor`/
//      `textFor` on the interface (the P2-D witness's stale calls are corrected here).

import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from "vue";
import { SpringProgress, NumericAnimation } from "@mkbabb/keyframes.js";
import { clamp, easeOutExpo } from "@mkbabb/value.js";
import type { MotionTrigger } from "./triggers.js";
import type { VariantSpec } from "./variant-spec.js";
import {
    LEAN_CATALOG,
    type LeanPreset,
    type LeanPresetName,
} from "./lean-catalog.js";
import { useCoverProgress } from "./useCoverProgress.js";
import { useReducedMotion } from "./useReducedMotion.js";

const clamp01 = (x: number): number => clamp(x, 0, 1);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1 · THE DRIVER EDGE — the one scalar every trigger collapses to
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The universal shape a resolved trigger presents to a mechanism: ONE scalar ∈ [0,1]. Scrubbed for
    `scroll` (position IS the value; reverses on scroll-up); a spring/one-shot output for the impulse
    triggers. Mechanism code never knows which trigger it rode — it reads a number. */
export type DriverEdge = () => number;

/** The six injected driver SOURCES. `filter` reads the coordinator's monotone change EPOCH (NOT a
    drawer boolean); `active` reads the activeViz centre-argmin edge. Injected so the director stays pure
    + unit-testable (`createDirectorCore` takes these directly; `useMotionDrivers` wires them from the
    KEPT primitives until WD1's `useVizContext` lands — the §10 coordination seam). */
export interface MotionDrivers {
    /** `useCoverProgress(host).t` — the ONE page-clock cover band [0,1] (0.50 ≡ viewport centre). */
    readonly scroll: () => number;
    /** `useSelection`: is the host's key ∈ selectedKeys (or its child mark's key)? */
    readonly selected: () => boolean;
    /** the emphasis-policy pointer edge for the host / hovered mark. */
    readonly hovered: () => boolean;
    /** the activeViz centre-argmin edge: is THIS host the in-viewport-centre viz? */
    readonly active: () => boolean;
    /** the coordinator's change epoch (a monotone counter) — a tick re-arms a one-shot filter pulse. */
    readonly filterEpoch: () => number;
    /** `useReducedMotion()` — settles REVEAL edges at their terminal (no per-frame work) and binds
        INTERACTION edges to their live driver state (a discrete on/off, no spring); see `scalarFor`. */
    readonly reducedMotion: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2 · THE DECLARATION
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** WHERE a segment writes. `host` = the whole plate (the reveal register's DOM styleFor seam). `marks` =
    a mark SET resolved by selector within the host (the draw/morph/emphasis primitive tier). The `stack`
    arm is GONE (RC3-2) — it folded into `host`. */
export type MarkTarget =
    | { readonly kind: "host" }
    | { readonly kind: "marks"; readonly within: string };

/** The CSS LOCUS a segment composes on (O-A1 · story-sota §4.2). Each maps to an INDIVIDUAL CSS
    property (`translate`/`scale`/`opacity`/`filter`/a tint var), NEVER the `transform` shorthand — so
    two same-plate segments never fight one transform slot (the Motion `MotionValue` / CSS individual-
    transform-property SOTA basis). Default is derived from the mechanism (reveal ⇒ opacity+translate). */
export type MotionChannel = "opacity" | "translate" | "scale" | "filter" | "tint";

/** How same-channel segments REDUCE when they stack on one host (O-A1). `add` Σ (the translate deltas
    sum), `multiply` Π (opacity/scale fold), `max` (the strongest tint wins), `replace` (last-writer —
    filter). Per-channel defaults: `multiply(opacity)`, `add(translate)` (§4.2), `multiply(scale)`,
    `replace(filter)`, `max(tint)`. A segment's `compose` overrides its channel's default. */
export type ComposePolicy = "add" | "multiply" | "max" | "replace";

/** ONE declared animation — WHAT (preset) · WHERE (target) · ON WHICH trigger (the singular pick) · the
    variant bag. `on` MUST be in `PRESET_TRIGGERS[use]` (gate-checked — G-N6). `channel`/`compose` name
    the blend locus + policy when the segment stacks on a host with others (O-A1 SegmentBlend); both are
    optional — omitted ⇒ the mechanism's natural channel(s) + the per-channel default policy. */
export interface MotionSegment {
    readonly id: string;
    readonly use: LeanPresetName;
    readonly target: MarkTarget;
    readonly on: MotionTrigger;
    readonly variant?: VariantSpec;
    readonly channel?: MotionChannel;
    readonly compose?: ComposePolicy;
}

/** A viz's whole declared motion — the single facet a plate carries. Empty ⇒ the plate animates nothing
    (byte-identical to a static plate). */
export interface MotionDeclaration {
    readonly segments: readonly MotionSegment[];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 3 · THE DIRECTOR SURFACE (RC3-3 — scalarFor + styleFor + idle + dispose, NOTHING else)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface MotionDirector {
    /** The resolved scalar for a trigger (reactive) — the DriverEdge as a Vue signal. Scrubbed for
        `scroll`; the live spring/one-shot value for impulse triggers. The CANVAS plate reads this and
        rebuilds its ECharts option (`optionAt(scalars)`); an SVG plate scrubs `buildMarkAnimation`. */
    scalarFor(on: MotionTrigger): ComputedRef<number>;
    /** The COMPOSED host style (O-A1 · replaces per-segment `styleFor`): every `host`-target segment's
        per-channel contribution reduced by its `compose` policy into ONE inline style, written as
        INDIVIDUAL transform properties (`translate:`/`scale:`) so a reveal-lift + a hover-raise + a
        select-ring stack without the last writer clobbering the transform slot. A plate with no
        host-target segment gets `{}`. Terminal under reduced motion (opacity 1, no lift). */
    composedStyleFor(): ComputedRef<Record<string, string>>;
    /** True once every live impulse spring has settled + every one-shot completed (the e2e wait handle).
        Scrubbed segments are always "settled" (position-driven). */
    readonly idle: ComputedRef<boolean>;
    /** Tear down the rAF loop + springs (onScopeDispose / onUnmounted). */
    dispose(): void;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 3.5 · THE SEGMENT-BLEND ALGEBRA (O-A1 · story-sota §4.2 · animation-taxonomy §B4 — stacking restored)
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The one genuine motion regression the ledger flagged: two host segments both wrote `transform`, so
// the last writer CLOBBERED the slot (a hover-raise ate a scroll-reveal's lift). The lean restore — a
// per-channel blend reducer, NOT the deleted 582L catalog: each segment contributes a numeric value on
// one-or-more CHANNELS; same-channel contributions REDUCE by policy; each channel emits its OWN CSS
// property, so they never collide (the CSS individual-transform-property SOTA basis).

/** The per-channel DEFAULT compose (§4.2 emission line): opacity Π · translate Σ · scale Π · filter
    last · tint max. A segment's `compose` overrides only its own declared `channel`. */
export const CHANNEL_COMPOSE: Record<MotionChannel, ComposePolicy> = {
    opacity: "multiply",
    translate: "add",
    scale: "multiply",
    filter: "replace",
    tint: "max",
};

/** The identity each policy folds from (an empty/absent channel is a no-op: ×1, +0, max 0, replace 1). */
const COMPOSE_IDENTITY: Record<ComposePolicy, number> = { add: 0, multiply: 1, max: 0, replace: 1 };

/** Reduce a channel's stacked contributions by its policy — the PURE core the unit witness proves
    (opacity Π, translate Σ, tint max, filter last). Total over the closed `ComposePolicy` union. */
export function reduceChannel(values: readonly number[], compose: ComposePolicy): number {
    if (values.length === 0) return COMPOSE_IDENTITY[compose];
    switch (compose) {
        case "add":
            return values.reduce((a, b) => a + b, 0);
        case "multiply":
            return values.reduce((a, b) => a * b, 1);
        case "max":
            return values.reduce((a, b) => Math.max(a, b), -Infinity);
        case "replace":
            return values[values.length - 1];
        default: {
            const _exhaustive: never = compose;
            return _exhaustive;
        }
    }
}

/** The tasteful blend magnitudes (director-local render constants — the seam a fable design consult
    tunes, like `IMPULSE_CONFIGS`; NOT catalog entries). `raiseEm` a hover lift-UP; `ringPx` a select
    halo radius. The reveal's own lift reads the KEPT preset's `defaults.liftEm`. `ringPx` is a TIGHT
    2.5px (O-DIR-1): a 6px halo over a whole plate host read as mud even when legitimately selected;
    the restraint re-register pairs this tight radius with the house selection ACCENT at low alpha
    (the emit line below), so a selected plate wears a subtle ring, never a bloom. */
const BLEND = { liftEm: 0.5, raiseEm: 0.3, ringPx: 2.5 } as const;

/** A segment's per-channel numeric contribution at resolved scalar `t` (before compose). A `reveal`
    fades + lifts (opacity + translate — the KEPT reveal-register math, numeric form); an `emphasis`
    writes ONE channel (its declared `channel`, defaulting by trigger: hover ⇒ translate raise, select/
    active ⇒ filter ring). Every other mechanism writes via `scalarFor` (canvas/SVG/count), not a host
    style, so it contributes nothing here. Pure. */
function channelContribution(seg: MotionSegment, t: number): Partial<Record<MotionChannel, number>> {
    const s = clamp01(t);
    const preset: LeanPreset = LEAN_CATALOG[seg.use];
    switch (preset.mechanism) {
        case "reveal": {
            const e = easeOutExpo(s); // opacity climbs eased; the host settles its lift to 0 as e → 1
            return { opacity: e, translate: (1 - e) * (preset.defaults.liftEm ?? BLEND.liftEm) };
        }
        case "emphasis":
            switch (seg.channel ?? (seg.on === "hover" ? "translate" : "filter")) {
                case "translate":
                    return { translate: -BLEND.raiseEm * s }; // a hover RAISE (up ⇒ negative Y)
                case "scale":
                    return { scale: 1 + 0.06 * s };
                case "opacity":
                    return { opacity: s };
                case "tint":
                    return { tint: s };
                case "filter":
                default:
                    return { filter: BLEND.ringPx * s }; // a select/active RING (drop-shadow bloom)
            }
        default:
            return {};
    }
}

/** THE PER-HOST BLEND (O-A1) — gather every segment's per-channel contribution at its resolved scalar,
    group by channel, reduce each group by its `compose` policy, and emit ONE inline style. Individual
    transform properties (`translate:`/`scale:`) keep the channels from colliding; a segment's `compose`
    overrides its declared channel's default. Pure + unit-testable (`scalarOf` is injected). */
export function composedStyleFor(
    segments: readonly MotionSegment[],
    scalarOf: (on: MotionTrigger) => number,
): Record<string, string> {
    const buckets = new Map<MotionChannel, { values: number[]; compose: ComposePolicy }>();
    for (const seg of segments) {
        const contrib = channelContribution(seg, scalarOf(seg.on));
        for (const ch of Object.keys(contrib) as MotionChannel[]) {
            const b = buckets.get(ch) ?? { values: [], compose: CHANNEL_COMPOSE[ch] };
            b.values.push(contrib[ch] as number);
            if (seg.channel === ch && seg.compose) b.compose = seg.compose; // per-segment override
            buckets.set(ch, b);
        }
    }
    const style: Record<string, string> = {};
    for (const [ch, b] of buckets) {
        const v = reduceChannel(b.values, b.compose);
        if (ch === "opacity") style.opacity = v.toFixed(4);
        else if (ch === "translate") style.translate = `0 ${v.toFixed(4)}em`;
        else if (ch === "scale") style.scale = v.toFixed(4);
        else if (ch === "filter") {
            // THE SELECT RING (O-DIR-1 restraint re-register) — the house selection register
            // (`--sel-selected-ring`, the promoted discrete-select ink the geo/scatter marks stroke
            // with) at low alpha + the tight `ringPx` radius, NOT the old solid `var(--foreground)`
            // 6px bloom that read as mud over a whole plate host. The compose algebra is untouched:
            // this is a BLEND-constant + emit change (the `filter` channel still last-writer replaces).
            if (v > 1e-3)
                style.filter = `drop-shadow(0 0 ${v.toFixed(2)}px color-mix(in oklab, var(--sel-selected-ring) 55%, transparent))`;
        } else if (v > 1e-3) style["--motion-tint"] = v.toFixed(4);
    }
    return style;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 4 · THE IMPULSE RESOLVER (director-core — the C.1b physics, verbatim; framework-agnostic + tickDt-driven)
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const LOAD_MS = 1000;

/** One shared `SpringProgress` per impulse trigger (the §4.3 one-engine law — shared across every
    segment that rides it). The verbatim C.1b configs. */
const IMPULSE_CONFIGS = {
    select: { response: 0.28, dampingFraction: 0.55 }, // underdamped → a visible pulse (overshoots >1)
    hover: { response: 0.16, dampingFraction: 0.8 },
    active: { response: 0.4, dampingFraction: 0.7 },
    filter: { response: 0.36, dampingFraction: 0.6 },
} as const;

type ImpulseTrigger = keyof typeof IMPULSE_CONFIGS;
const IMPULSE_TRIGGERS = ["select", "hover", "active", "filter"] as const;

/** The framework-agnostic director core — the resolution the Vue composable is a thin reactive shell
    over. Driven by `step(dt)` so a node/vitest test can frame-sample it deterministically (never a rAF
    shim — headless Playwright throttles `RAFPlayback.loop`; unit tests own the clock via `tickDt`). */
export interface DirectorCore {
    /** Advance every live impulse spring one frame (dt in ms). No-op under reduced motion. */
    step(dt: number): void;
    /** The resolved scalar for a trigger — `scroll` scrubbed, impulse the live spring value, `load` the
        one-shot. Under reduced motion (O-DIR-1): REVEAL/progress triggers (`scroll`/`filter`/`load`)
        settle at `1` (terminal — information parity); INTERACTION triggers (`select`/`hover`/`active`)
        bind the LIVE driver edge (0 at rest, 1 while genuinely engaged — a state change, not a tween). */
    scalarFor(on: MotionTrigger): number;
    /** Every live impulse spring settled + the one-shot complete (or reduced motion). */
    idle(): boolean;
}

/** Build the director core for a set of ACTIVE triggers (the declaration's `segment.on` set). Only the
    active impulse springs are polled for `idle`; a plate with only `scroll` segments is idle immediately
    (the composable never starts a rAF for it). */
export function createDirectorCore(
    drivers: MotionDrivers,
    active: ReadonlySet<MotionTrigger>,
): DirectorCore {
    const impulse: Record<ImpulseTrigger, SpringProgress> = {
        select: new SpringProgress(IMPULSE_CONFIGS.select),
        hover: new SpringProgress(IMPULSE_CONFIGS.hover),
        active: new SpringProgress(IMPULSE_CONFIGS.active),
        filter: new SpringProgress(IMPULSE_CONFIGS.filter),
    };
    let lastEpoch = drivers.filterEpoch();
    const loadAnim = new NumericAnimation([{ p: 0 }, { p: 1 }]);
    let loadClock = 0;

    function step(dt: number): void {
        if (drivers.reducedMotion()) return; // PRM: edges pinned at their terminal via scalarFor()
        impulse.select.target = drivers.selected() ? 1 : 0;
        impulse.hover.target = drivers.hovered() ? 1 : 0;
        impulse.active.target = drivers.active() ? 1 : 0;
        impulse.select.tickDt(dt);
        impulse.hover.tickDt(dt);
        impulse.active.tickDt(dt);
        // filter: a fresh 0→1 pulse re-armed on each epoch delta (a re-settle flash).
        const ep = drivers.filterEpoch();
        if (ep !== lastEpoch) {
            lastEpoch = ep;
            impulse.filter.reset(0, 0);
            impulse.filter.target = 1;
        }
        impulse.filter.tickDt(dt);
        if (active.has("load")) loadClock = Math.min(loadClock + dt, LOAD_MS);
    }

    function scalarFor(on: MotionTrigger): number {
        if (drivers.reducedMotion()) {
            // PRM SPLITS THE TRIGGER TAXONOMY (O-DIR-1 · the shadow-directive cure). REVEAL/progress
            // triggers settle at their TERMINAL (information parity — the content is fully revealed,
            // there is simply no tween). INTERACTION triggers bind the LIVE driver edge INSTANTLY (0 at
            // rest, 1 the instant the plate is genuinely hovered/selected/active) — a discrete STATE
            // CHANGE, which PRM neither exempts from firing NOR forces permanently on. The old
            // blanket `return 1` pinned select/hover/active ON forever, so an emphasis segment
            // contributed its terminal ring at REST (the whole-plate drop-shadow mud the owner flagged).
            switch (on) {
                case "select":
                    return drivers.selected() ? 1 : 0;
                case "hover":
                    return drivers.hovered() ? 1 : 0;
                case "active":
                    return drivers.active() ? 1 : 0;
                default:
                    return 1; // scroll / filter / load — the reveal/progress terminal
            }
        }
        switch (on) {
            case "scroll":
                return clamp01(drivers.scroll()); // RAW position — the mechanism eases (no double-ease)
            case "select":
                return impulse.select.value;
            case "hover":
                return impulse.hover.value;
            case "active":
                return impulse.active.value;
            case "filter":
                return impulse.filter.value;
            case "load":
                return loadAnim.at(clamp01(loadClock / LOAD_MS)).p;
            default: {
                const _exhaustive: never = on;
                return _exhaustive;
            }
        }
    }

    function idle(): boolean {
        if (drivers.reducedMotion()) return true;
        for (const t of IMPULSE_TRIGGERS) if (active.has(t) && !impulse[t].settled) return false;
        if (active.has("load") && loadClock < LOAD_MS) return false;
        return true;
    }

    return { step, scalarFor, idle };
}

// buildMarkAnimation (the D4 primitive runtime) lives in its own module (O-B4R god-split); re-
// exported so the `@/motion` surface is unchanged (an SVG plate imports it from `@/motion`).
export * from "./buildMarkAnimation.js";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 6 · THE DRIVER BUILDER + THE COMPOSABLE
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The plate-supplied driver overrides (each an OPTIONAL edge; `scroll`/`reducedMotion` default to the
    KEPT primitives, the rest to an inert `false`/`0`). A plate wires only the edges its declaration
    rides — e.g. a scroll-only plate passes nothing; a hover/select plate passes `hovered`/`selected`. */
export interface MotionDriverSources {
    readonly scroll?: () => number;
    readonly selected?: () => boolean;
    readonly hovered?: () => boolean;
    readonly active?: () => boolean;
    readonly filterEpoch?: () => number;
}

/** Wire `MotionDrivers` from the KEPT reveal register + the plate's supplied edges. `scroll` reads
    `useCoverProgress(host).t` (0.50 ≡ centre); `reducedMotion` reads `useReducedMotion`. The §10 seam:
    when WD1's `useVizContext(vizId)` lands, it supersedes this by supplying all six edges — the director
    signature is unchanged (it takes `MotionDrivers`, not a hub). */
export function useMotionDrivers(
    host: Ref<HTMLElement | null>,
    sources: MotionDriverSources = {},
): MotionDrivers {
    const cover = useCoverProgress(host);
    const reduced = useReducedMotion();
    return {
        scroll: sources.scroll ?? ((): number => cover.t.value),
        selected: sources.selected ?? ((): boolean => false),
        hovered: sources.hovered ?? ((): boolean => false),
        active: sources.active ?? ((): boolean => false),
        filterEpoch: sources.filterEpoch ?? ((): number => 0),
        reducedMotion: (): boolean => reduced.value,
    };
}

/**
 * Wire a viz's declared motion. `host` is the plate element (the reserved primitive-runtime anchor for a
 * `marks` target's selector resolution + the cover clock the drivers read). `decl` is the declared
 * segments. `drivers` are the six injected edges. The impulse springs advance on a plain-rAF loop that
 * SELF-SUSPENDS when idle (no standing rAF at rest — G-N2); an edge change re-arms it. A scroll-only
 * declaration needs NO rAF (the `scroll` scalar is reactive off the cover clock).
 */
export function useMotionDirector(
    host: Ref<HTMLElement | null>,
    decl: MotionDeclaration,
    drivers: MotionDrivers,
): MotionDirector {
    void host; // reserved: a `marks` target resolves its selector within this anchor (the SVG-seam plate)
    const activeTriggers = new Set<MotionTrigger>(decl.segments.map((s) => s.on));
    const core = createDirectorCore(drivers, activeTriggers);
    const hasImpulse = [...activeTriggers].some((t) => t !== "scroll");
    const canRaf = typeof requestAnimationFrame === "function";

    // The reactive tick — bumped each rAF frame so the impulse `scalarFor` computeds re-evaluate. The
    // `scroll` scalar tracks the cover clock directly (reactive), so a scroll-only plate never ticks.
    const tick = ref(0);
    let raf = 0;
    let last = 0;

    function loop(now: number): void {
        const dt = last ? now - last : 16;
        last = now;
        core.step(dt);
        tick.value++;
        raf = core.idle() ? 0 : requestAnimationFrame(loop);
    }
    function kick(): void {
        if (!hasImpulse || !canRaf || raf !== 0 || drivers.reducedMotion()) return;
        last = 0;
        raf = requestAnimationFrame(loop);
    }

    if (hasImpulse) {
        // Re-arm the loop whenever an impulse edge changes (the spring then chases + settles + stops).
        watch(
            () => [drivers.selected(), drivers.hovered(), drivers.active(), drivers.filterEpoch()],
            () => kick(),
            { flush: "post" },
        );
        if (activeTriggers.has("load")) kick(); // the mount-once one-shot
    }

    const scalarCache = new Map<MotionTrigger, ComputedRef<number>>();
    function scalarFor(on: MotionTrigger): ComputedRef<number> {
        let c = scalarCache.get(on);
        if (!c) {
            c = computed(() => {
                void tick.value; // impulse re-eval dep; `scroll` tracks the cover clock inside core
                return core.scalarFor(on);
            });
            scalarCache.set(on, c);
        }
        return c;
    }

    // THE COMPOSED HOST STYLE (O-A1) — every `host`-target segment blended into ONE style off the live
    // scalars (memoized once; the reducer is pure, so this computed re-evaluates only when a rode scalar
    // moves). `marks`-target segments write via `scalarFor` (the canvas/SVG seam), never this host style.
    const hostSegments = decl.segments.filter((s) => s.target.kind === "host");
    const hostStyle = computed(() => composedStyleFor(hostSegments, (on) => scalarFor(on).value));

    const idle = computed(() => {
        void tick.value;
        return core.idle();
    });

    function dispose(): void {
        if (raf !== 0) cancelAnimationFrame(raf);
        raf = 0;
    }
    onScopeDispose(dispose);

    return { scalarFor, composedStyleFor: () => hostStyle, idle, dispose };
}
