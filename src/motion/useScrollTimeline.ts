// platform/composables/useScrollTimeline.ts — the SCROLL TIMELINE engine (H.W11.a).
// ONE keyframes.js `ManualTimeline` slaved to a section's scroll-progress, exposing an
// ordered FACET MAP API so each viz draws THROUGH its story as the reader scrolls — and
// REVERSES on scroll-up, for free, because a `ManualTimeline` is settable to ANY position
// (`set(p)` → `tick()` pulls the value through the easing+boundary pipeline → `progress`).
// The whole story is a pure function of scroll: bi-directional BY CONSTRUCTION, no
// per-facet timeline, no one-shot IntersectionObserver toggle.
//
// ── ONE CLOCK, MANY FACES (the H-INV-3 one-convention rule, extended to motion) ──────────
// A viz declares an ordered list of FACETS — `(from, to) → state` tracks on the ONE
// timeline: `year`, `mark`, `lettering`, `figure`, `annotation`, `forecast`. Each facet is
// a window `[from, to]` of the master 0..1 scroll position; the facet's local `t` is the
// master position re-normalized into that window (and eased). No facet mints a second
// timeline; the facets are READERS of the one `progress` scalar (the dual-path
// single-writer rule — one writer per target, here the writer is the ONE timeline).
//
// ── THE DUAL-PATH SINGLE-WRITER FENCE (C.W5.1, carried) ──────────────────────────────────
// The master position has TWO possible sources, never both:
//   • NATIVE — when `supportsViewTimeline()`, the section's `--beat-tl` `view()` axis runs
//     on the compositor (scroll-driven.css) and writes `--scroll-tl` (a 0..1 registered
//     custom property the engine READS off the host each rAF, NO getBoundingClientRect).
//   • FALLBACK — Firefox/jsdom/SSR: `useScrollProgress` supplies the scalar (its
//     `useElementBounding` is the sole geometry read), fed straight into `seek`.
// Exactly one path drives `seek` per environment; the timeline is the lone writer of every
// facet target downstream (the H-gate: zero scroll listeners on the hot path under native).
//
// ── THE THREE FENCES (designed, not degraded) ────────────────────────────────────────────
//   • reduced-motion → the timeline BINDS TO ITS TERMINAL position (`seek(1)`, frozen): the
//     full story renders instantly, every facet at its end state. Information parity, NO scrub.
//   • touch / keyboard → handled by the visible scrubber (ScrollTimeline.vue), which calls
//     `seek(p)` directly (a drag / arrow-key operator) — the SAME engine, a second writer of
//     the master position ONLY while the user grabs it (a manual override that releases back
//     to scroll). The engine exposes `seek` + `release` for that operator.

import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
    type ComputedRef,
    type Ref,
} from "vue";
import { ManualTimeline, type TimingFunction } from "@mkbabb/keyframes.js";
import { clamp, smoothStep3 } from "@mkbabb/value.js";
import {
    supportsViewTimeline,
    useScrollProgress,
} from "@/motion/useScrollProgress";
import { useReducedMotion } from "@/motion/useReducedMotion";
import { onNarrativeRestoreSettled } from "@/motion/narrative-restore";
import { useViewParams } from "@/platform/stores/useViewParams";
import {
    bindRevealGoLive,
    createRevealCuePump,
    projectRevealScore,
    type RevealRestoreEdge,
    type RevealScore,
} from "@/motion/reveal-score";
import {
    registerScrubHost,
    type ScrubHostRecord,
} from "@/charts/composables/activeViz";

/** The facet kinds a viz's nature picks from (the H-INV-3 vocabulary). Free-form `string`
    is also accepted so a viz can name a bespoke track, but the named kinds carry intent.
    `reveal` (J-SCROLL §7) is the chapter/figure-stage ENTER facet — the tight entry window the
    @supports fallback reveal retires into (the per-chapter `useScrollScene` reveal becomes a
    `kind:"reveal"` facet of the one timeline, so there is ONE reveal engine on ONE clock). */
export type FacetKind =
    | "year"
    | "mark"
    | "lettering"
    | "figure"
    | "annotation"
    | "forecast"
    | "reveal"
    | (string & {});

/** One FACET on the master timeline — a `[from, to]` window of the 0..1 scroll position. */
export interface FacetSpec {
    /** The facet's stable id (the key its consumer reads `facet(id)` by). */
    id: string;
    /** The facet's intent (drives the rail's label + the recommended easing). */
    kind?: FacetKind;
    /** The window start on the master 0..1 timeline (default 0). */
    from?: number;
    /** The window end on the master 0..1 timeline (default 1). */
    to?: number;
    /** Per-facet easing for the local `t` (default `smoothStep3`). A spring/overshoot lives
        HERE (on the facet reveal), never on the master position scalar (a ringing master
        scrub fights the scroll). */
    ease?: TimingFunction;
    /** Human label for the visible rail's active-facet readout (default the `id`). */
    label?: string;
}

/** A facet's live reactive state — what a consumer binds to. */
export interface FacetState {
    /** The facet's local progress, [0, 1] — 0 before its window, 1 after, eased within. */
    t: ComputedRef<number>;
    /** True while the master position sits inside `[from, to]` (the facet is "live"). */
    active: ComputedRef<boolean>;
    /** The facet's normalized centre on the master timeline — the rail marks its stop here. */
    readonly at: number;
    /** The facet's window `[from, to]` (resolved with defaults) — the rail draws its span. */
    readonly window: readonly [number, number];
    /** The facet's intent + label (the rail's readout). */
    readonly kind: FacetKind;
    readonly label: string;
}

export interface UseScrollTimelineOptions {
    /** The ordered facet map declared by the viz's nature. Order is the read order (the
        rail's stop sequence); windows may overlap (concurrent reveals) under the budget. */
    facets?: FacetSpec[];
    /** Optional named reveal cues projected onto this same facet map and activeViz pump. */
    revealScore?: RevealScore;
    /** Override the shared narrative restore ordering used by RevealScore. */
    restore?: RevealRestoreEdge;
    /**
     * THE PER-SECTION MOTION BUDGET (the cardinal law — mark-scarcity extended to motion).
     * The max number of facets allowed to be *mid-reveal* (0 < t < 1) at once. When more
     * than `budget` windows overlap at a position, only the `budget` NEAREST-to-centre are
     * driven; the rest SNAP to their boundary (0 or 1) so the scene reads composed, never
     * busy. Default 2 — a small fixed cap. Set higher only with a named reason.
     */
    budget?: number;
    /** Easing applied to the MASTER position as it pulls through the pipeline. A gentle
        monotone settle (default: none → exact 1:1 follow, the truest bi-directional scrub).
        NEVER a spring here (it would ring the whole story off the scroll). */
    masterEase?: TimingFunction;
    /**
     * THE ARGMIN GRAIN KNOB (K-ACTIVE §4.D). When set, this host JOINS the centre-argmin: its viz
     * id (a constant or a getter) is the `[data-viz-id]` the rim lights when this host is nearest
     * viewport-centre. OMITTED ⇒ the host drives its facets but does NOT join the argmin (it never
     * wears the rim). MUST equal the `fig-id`/`VIZ_ID` the host's inner plate renders as
     * `[data-viz-id]` (the `k0-active-vizid-resolves` seal — a wrong id lights no medal).
     */
    vizId?: string | (() => string);
    /** A private identity for this concrete conductor host. Defaults to `vizId`. A persistent stage
        gives each scene step a unique key while every step retains the stage's public `vizId`. */
    hostKey?: string | (() => string);
    /** Keep this host eligible for discrete centre/membership wayfinding under reduced motion.
        The returned timeline remains terminal and no animation is driven. */
    informationOnly?: boolean;
}

/** The engine's reactive surface. */
export interface UseScrollTimeline {
    /** The master eased scroll position, [0, 1] — the ONE clock every facet reads. */
    progress: ComputedRef<number>;
    /** Resolve a facet's live state by id (reactive). Unknown id → a settled terminal facet. */
    facet: (id: string) => FacetState;
    /** Every facet's state, in declared order — the rail iterates this for its stops. */
    facets: ComputedRef<FacetState[]>;
    /** The index of the facet whose window the master position currently sits nearest — the
        rail's lit stop + the "deck position" readout. -1 before any facet is reached. */
    activeIndex: ComputedRef<number>;
    /** True under reduced-motion: the timeline is bound to its terminal position, no scrub. */
    terminal: ComputedRef<boolean>;
    /**
     * The MANUAL OVERRIDE operator (the visible scrubber's drag / arrow-key seek). While a
     * seek is held the engine ignores scroll and reports the seeked position — the touch +
     * keyboard fence. Call `release()` to hand the master position back to scroll.
     */
    seek: (p: number) => void;
    /** Release a held `seek` — the master position resumes following scroll. */
    release: () => void;
    /** True while a `seek` override is held (the rail shows it is being grabbed). */
    seeking: ComputedRef<boolean>;
}

/** Resolve a facet's window `[from, to]` with defaults + a guaranteed-positive span. */
function resolveWindow(spec: FacetSpec): [number, number] {
    const from = clamp(spec.from ?? 0, 0, 1);
    const to = clamp(spec.to ?? 1, 0, 1);
    // A degenerate (from ≥ to) window collapses to an instant at `from` — give it a hair of
    // span so the local `t` is never a divide-by-zero (it then reads as a step at `from`).
    return from < to ? [from, to] : [from, Math.min(1, from + 1e-4)];
}

// ── D30-LIB · THE STANDALONE-HOST REGISTRATION SEAM (the scroll-driven.css enumerated-allowlist
// cure) ───────────────────────────────────────────────────────────────────────────────────────
// `scroll-driven.css`'s standalone scrub-host rule binds the native `--scroll-tl` `view()`
// animation ONLY to a hard-coded class enumeration (`.decade-beat`, `.sci-chase-beat`, the two
// lettering titles — its own "I17 CLOSE" comment: "A FUTURE standalone scrub host must add BOTH
// its `data-scroll-tl` attribute AND its root class to this enumerated list"). A consumer OUTSIDE
// this published package cannot add its class to that list without a library edit — the D30
// vft-germination find (`useFaultBeatScroll.ts`'s documented local substitute: "`@mkbabb/atlas` is
// a read-only published package … `.curves-plate` cannot be added there … BOTH atlas paths read a
// frozen 0 for a host outside the allowlist").
//
// Since `useScrollTimeline` already owns `target` and already knows the native path is live
// (`native`), it REGISTERS the identical binding directly as inline style on mount — a consumer
// registers simply by CALLING this composable, no CSS enumeration, no library edit, ever again.
// The declarations are byte-identical to the enumerated CSS rule's own (`scroll-tl-pos auto linear
// both` / `view()` / `cover 0% cover 100%`); inline style wins the cascade over any class-based
// rule, so the two mechanisms never double-bind — a PRE-enumerated host (`.decade-beat` etc.) is
// simply re-asserted to the same values, not doubled. Skipped when `target` ALSO carries
// `data-reveal-beat` (the COMBINED CSS rule owns that host, riding the beat's own named
// `--beat-tl` timeline — never a fresh anonymous `view()` mint). PRM is inherited for free: the
// caller (below) only invokes this after the `reduced.value` early-return, mirroring the CSS
// rule's own outer `@media (prefers-reduced-motion: no-preference)` fence; `native` mirrors the
// CSS rule's own `@supports ((animation-timeline: view()) and (animation-range: entry))` fence.
function bindStandaloneScrollHost(el: HTMLElement): void {
    if (el.hasAttribute("data-reveal-beat")) return; // the combined CSS rule owns this host.
    el.style.setProperty("animation", "scroll-tl-pos auto linear both");
    el.style.setProperty("animation-timeline", "view()");
    el.style.setProperty("animation-range", "cover 0% cover 100%");
}

/** Undo {@link bindStandaloneScrollHost} on unmount — never leaves a stray inline animation on a
    recycled element. A no-op on a fallback/PRM host (never bound) or a null target. */
function unbindStandaloneScrollHost(el: HTMLElement | null): void {
    if (!el) return;
    el.style.removeProperty("animation");
    el.style.removeProperty("animation-timeline");
    el.style.removeProperty("animation-range");
}

/**
 * Bind a keyframes.js `ManualTimeline` to a section's scroll-progress, exposing the ordered
 * FACET MAP. `target` is the section element (the `[data-reveal-beat]` host) the timeline
 * scrubs over. The engine picks its master-position SOURCE by environment (native `view()`
 * custom-property read XOR the `useScrollProgress` fallback), drives ONE `ManualTimeline`,
 * and re-normalizes that position into each facet's window — so a viz draws through its
 * facets as the reader scrolls and reverses cleanly on scroll-up.
 *
 * Under reduced motion the timeline is pinned to `seek(1)` (the terminal story) and the rAF
 * sampler never arms — information parity, no scrub, no per-frame work.
 */
export function useScrollTimeline(
    target: Ref<HTMLElement | null>,
    options: UseScrollTimelineOptions,
): UseScrollTimeline {
    const reduced = useReducedMotion();
    const native = supportsViewTimeline();
    const budget = options.budget ?? 2;
    const revealPump = options.revealScore
        ? createRevealCuePump(options.revealScore)
        : undefined;
    const view = revealPump && !options.restore ? useViewParams() : null;
    const restore =
        options.restore ??
        (view
            ? {
                  deepLink: () => view.narrativeAt != null,
                  onRestoreSettled: (callback: () => void) =>
                      onNarrativeRestoreSettled(() => callback()),
              }
            : undefined);
    let stopRestoreEdge: (() => void) | null = null;
    let deferredGoLive: (() => void) | null = null;
    /** W-L2's top-load double-rAF fallback, counted on the incumbent central conductor. */
    let goLiveFrames = 0;

    // ── THE ONE TIMELINE ─────────────────────────────────────────────────────────────────
    // Smoothing OFF: the master position IS the scroll position (already a settled scalar);
    // a smoother would lag the scrub behind the scroll and fight the 1:1 bi-directional
    // follow. `masterEase` (default identity) is the only shaping — a gentle monotone settle
    // is acceptable, a ringing spring is NOT (it would oscillate the whole story off scroll).
    const timeline = new ManualTimeline({
        smoothing: false,
        easing: options.masterEase,
    });

    // The reactive mirror of the timeline's processed `progress` (the eased master position).
    // A `ref` (not `computed`) because the value is PUSHED by the rAF sampler / the fallback
    // watcher / the manual `seek` — the three writers all funnel through `pushProgress`.
    const rawProgress = ref(reduced.value ? 1 : 0);

    /** Pull a raw 0..1 source value through the timeline pipeline + mirror the result. */
    function pushProgress(p: number): void {
        timeline.set(clamp(p, 0, 1));
        // `tick()` runs sample → clamp → easing → boundary-snap and returns the processed
        // progress (smoothing off → an exact pass-through bar the optional `masterEase`).
        rawProgress.value = timeline.tick();
    }

    // ── THE MANUAL OVERRIDE (the visible scrubber's drag / keyboard seek) ──────────────────
    const held = ref(false);
    function seek(p: number): void {
        held.value = true;
        pushProgress(p);
    }
    function release(): void {
        held.value = false;
        // Resume from wherever scroll currently is (the next sampler tick re-pushes it); on
        // the fallback path re-push immediately so release doesn't wait for a scroll event.
        if (!native && !reduced.value) pushProgress(fallback.progress.value);
    }

    // ── SOURCE A: the native compositor path (zero geometry on the hot path) ───────────────
    // THE FOLD (K-ACTIVE §4.C — the R-E/D17 discharge): the per-instance `sampleNative` rAF that
    // used to read this host's `--scroll-tl` is GONE. The host now REGISTERS with the module-level
    // `activeViz.ts` registry, which runs the ONE `RAFPlayback.loop` for every scrub host and reads
    // `--scroll-tl` ONCE per host per frame (the SOLE `getComputedStyle(--scroll-tl)` site in the
    // tree). `advance()` is the host's per-frame callback the registry invokes: it pushes the native
    // progress through the pipeline (native path) and RETURNS the host's master position for the
    // argmin — or `null` to opt OUT (a held seek / PRM). The double-poll cannot exist by construction.
    function advance(nativeProgress: number | null): number | null {
        if (held.value) return null;
        // Information-only hosts remain geometrically eligible under PRM, but the ManualTimeline
        // stays terminal at 1: the registry supplies a cover sample solely to the discrete argmin.
        if (reduced.value) return options.informationOnly ? nativeProgress : null;
        // Native: the registry handed us this host's `--scroll-tl` read — push it through the
        // pipeline. Fallback: `nativeProgress` is null and the reactive watcher below already pushed
        // the geometry scalar; either way `rawProgress` is the current master position to argmin on.
        if (native && nativeProgress !== null) pushProgress(nativeProgress);
        if (deferredGoLive && --goLiveFrames === 0) {
            const goLive = deferredGoLive;
            deferredGoLive = null;
            goLive();
        }
        return rawProgress.value;
    }

    /** Resolve the argmin grain knob: a constant id, a getter, or `""` (opt out of the argmin). */
    const vizIdOf = (): string => {
        const v = options.vizId;
        return typeof v === "function" ? v() : (v ?? "");
    };
    const hostKeyOf = (): string => {
        const key = options.hostKey;
        return typeof key === "function" ? key() : (key ?? vizIdOf());
    };

    // The host's registry record — `el` is wired at mount (native hosts only; the fallback host
    // pushes reactively, so it carries no element to poll). `lastProgress` is the K-B cover-host
    // cache (the A8 forward-seam) the registry updates each frame.
    const record: ScrubHostRecord = {
        hostKey: hostKeyOf,
        vizId: vizIdOf,
        el: null,
        advance,
        lastProgress: 0,
        reveal: revealPump,
        informationOnly: options.informationOnly,
    };
    let unregister: (() => void) | null = null;

    // ── SOURCE B: the @supports fallback (the sole geometry read) ──────────────────────────
    const fallback = useScrollProgress(target);
    // Feed the fallback scalar into `seek`'s pipeline whenever it changes (and no override is
    // held). The watcher is the fallback's sole writer of the master position; its push now ALSO
    // feeds `advance()`'s return for the argmin (one mechanism, both paths).
    const stopFallbackWatch = watch(
        () => fallback.progress.value,
        (p) => {
            if (!held.value && !reduced.value && !native) pushProgress(p);
        },
        { immediate: true },
    );

    onMounted(() => {
        if (revealPump) {
            if (reduced.value || !native) revealPump.settle();
            else
                stopRestoreEdge = bindRevealGoLive(revealPump, restore, (goLive) => {
                    deferredGoLive = goLive;
                    goLiveFrames = 2;
                    return () => {
                        deferredGoLive = null;
                    };
                });
        }
        if (reduced.value && !options.informationOnly) {
            // TERMINAL BIND: the full story, frozen at its end — no sampler, no scrub, never
            // registered (the registry is inert under PRM, so the rim is naturally absent).
            pushProgress(1);
            return;
        }
        if (reduced.value) {
            // Register the element for information-only cover sampling. No CSS animation is bound,
            // and `advance` never pushes the sample into the terminal ManualTimeline.
            record.el = target.value;
            unregister = registerScrubHost(record);
            return;
        }
        // Native hosts expose their element so the registry can read `--scroll-tl`; the fallback
        // host carries no element (it pushes reactively) but still registers so it feeds the argmin.
        record.el = native ? target.value : null;
        if (native && target.value) bindStandaloneScrollHost(target.value);
        unregister = registerScrubHost(record);
    });

    onBeforeUnmount(() => {
        // The registry self-halts on the next frame once its last host leaves (the empty check).
        unregister?.();
        stopRestoreEdge?.();
        stopFallbackWatch();
        unbindStandaloneScrollHost(target.value);
    });

    // ── THE FACET MAP (readers of the one progress scalar) ─────────────────────────────────
    // Each facet re-normalizes the master position into its `[from, to]` window + eases the
    // local `t`. The MOTION BUDGET gates concurrency: a facet mid-reveal counts against the
    // budget; when more than `budget` windows are simultaneously open, the ones FURTHEST from
    // the master position snap to their nearest boundary (0/1) so the scene reads composed.
    const facetSpecs = [
        ...(options.facets ?? []),
        ...(options.revealScore ? projectRevealScore(options.revealScore) : []),
    ];
    const revealCueIds = new Set(options.revealScore?.cues.map((cue) => cue.id) ?? []);
    const resolved = facetSpecs.map((spec, index) => {
        const [from, to] = resolveWindow(spec);
        const ease = spec.ease ?? smoothStep3;
        const at = (from + to) / 2;
        const kind: FacetKind = spec.kind ?? "mark";
        const label = spec.label ?? spec.id;

        /** The facet's RAW local t (pre-budget) — the master position into `[from,to]`, eased. */
        const rawT = computed(() => {
            // NO_SDA: RevealScore's DOM once-cues settle at mount. Other facets retain the existing
            // geometry fallback; only the named score projection is terminal and motionless.
            if (!native && revealCueIds.has(spec.id)) return 1;
            const p = rawProgress.value;
            if (p <= from) return 0;
            if (p >= to) return 1;
            return ease((p - from) / (to - from));
        });

        return { spec, index, from, to, at, kind, label, rawT };
    });

    /** Which facet ids are mid-reveal (0 < rawT < 1) right now, nearest-to-position first —
        the budget keeps only the first `budget`; the rest are SNAPPED to their boundary. */
    const liveOrder = computed<Set<string>>(() => {
        const p = rawProgress.value;
        const mid = resolved
            .filter((f) => f.rawT.value > 0 && f.rawT.value < 1)
            .sort((a, b) => Math.abs(a.at - p) - Math.abs(b.at - p))
            .slice(0, Math.max(0, budget))
            .map((f) => f.spec.id);
        return new Set(mid);
    });

    const states = new Map<string, FacetState>();
    for (const f of resolved) {
        const t = computed(() => {
            const raw = f.rawT.value;
            // Within-window AND inside the budget → the eased reveal. Over budget → snap to
            // the nearest boundary (the master position past the window-centre ⇒ 1, else 0):
            // the facet still LANDS its end state, it just doesn't animate while crowded.
            if (raw <= 0 || raw >= 1) return raw;
            if (liveOrder.value.has(f.spec.id)) return raw;
            return rawProgress.value >= f.at ? 1 : 0;
        });
        const active = computed(() => {
            const p = rawProgress.value;
            return p > f.from && p < f.to;
        });
        states.set(f.spec.id, {
            t,
            active,
            at: f.at,
            window: [f.from, f.to] as const,
            kind: f.kind,
            label: f.label,
        });
    }

    /** A settled terminal facet — the answer for an unknown id (degrades, never throws). */
    const terminalFacet: FacetState = {
        t: computed(() => 1),
        active: computed(() => false),
        at: 1,
        window: [0, 1] as const,
        kind: "mark",
        label: "",
    };

    function facet(id: string): FacetState {
        return states.get(id) ?? terminalFacet;
    }

    const facetsList = computed<FacetState[]>(() =>
        resolved.map((f) => states.get(f.spec.id) as FacetState),
    );

    /** The facet nearest the master position — the rail's lit "deck position" stop. */
    const activeIndex = computed<number>(() => {
        const p = rawProgress.value;
        if (resolved.length === 0) return -1;
        let best = -1;
        let bestDist = Infinity;
        for (const f of resolved) {
            const d = Math.abs(f.at - p);
            if (d < bestDist) {
                bestDist = d;
                best = f.index;
            }
        }
        return best;
    });

    return {
        progress: computed(() => rawProgress.value),
        facet,
        facets: facetsList,
        activeIndex,
        terminal: computed(() => reduced.value),
        seek,
        release,
        seeking: computed(() => held.value),
    };
}

/**
 * The YEAR SCROLL-FACE binding (the H-INV "one clock, many faces" seam). Maps the master
 * scroll position of a TEMPORAL viz onto a year in `[firstYear, lastYear]` — a SECOND READER
 * of the one `useYearScope`, never a second store. The caller wires the returned `scrollYear`
 * into `useYearScope`'s scroll face (`useYearScope` exposes `bindScrollYear` for exactly this;
 * see useYearScope.ts). The mapping floors to a whole year (the rivet lands on real years,
 * not fractional ones) and is monotone in the scroll position, so scroll-up rewinds the year.
 *
 * Returns `null` when the year domain is degenerate (a single year — nothing to scrub).
 */
export function scrollYearFace(
    progress: ComputedRef<number>,
    years: readonly number[],
): ComputedRef<number | null> {
    return computed(() => {
        if (years.length < 2) return null;
        const first = years[0];
        const last = years[years.length - 1];
        const span = last - first;
        if (span <= 0) return null;
        // Floor onto a whole year, clamped to the domain — the rivet lands on a real year.
        const y = first + Math.round(clamp(progress.value, 0, 1) * span);
        return clamp(y, first, last);
    });
}

// useSectionReveal (the thin page-clock subscriber) lives in its own module (O-B4R god-split);
// re-exported so the `@/motion` surface is unchanged.
export * from "./useSectionReveal";
