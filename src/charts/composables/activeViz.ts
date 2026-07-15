// platform/composables/activeViz.ts — THE SINGLE-READER ACTIVE-VIZ REGISTRY (K-ACTIVE · R-E/D17).
//
// ONE module-level `RAFPlayback.loop` reads every registered scrub host ONCE per frame and does
// THREE jobs with that one read:
//   (1) DRIVES each host's facet pipeline (`advance`) — the host's own story scrub;
//   (2) COMPUTES the centre-argmin SINGLETON (`activeVizId`, the deft golden rim's subject) + the
//       IN-VIEWPORT SET (`activeVizIds`, D1's filter-panel union);
//   (3) CACHES `lastProgress` for the K-B cover-host walk (the A8 forward-seam — read back via
//       `readScrubHostProgress`, NO second poll).
//
// This FOLDS the per-instance `sampleNative` rAF `useScrollTimeline` used to run: the `--scroll-tl`
// double-poll the K-FRAMEWORK D17 delta names cannot exist BY CONSTRUCTION — there is exactly ONE
// `RAFPlayback.loop` and exactly ONE `getComputedStyle(--scroll-tl)` reader (`readNativeProgress`
// below). `useScrollTimeline` now REGISTERS a host + supplies `advance()`; it no longer polls. The
// `k0-active-single-reader` gate seals both facts (the reader census + the no-rAF-in-useScrollTimeline
// fence).
//
// SINGLE-SOURCE (one reader per signal): this module is the SOLE writer of the store's
// `activeVizId`/`activeVizIds` (via `setActiveViz`) and the SOLE reader of the native `--scroll-tl`
// custom property. The dock keeps writing `activeBeatId` — the two grains stay disjoint.
//
// ZERO 5.x DEPENDENCY: `RAFPlayback` is keyframes.js 4.1.0-shipped (the generation-guarded,
// re-arm-idempotent self-rescheduling loop owner that HALTS on a `false` return). The draft's 5.x
// `Oscillator` ambient breath is CUT (deferred to D4) — this registry is pure 4.1.0.
//
// ZERO-IDLE-rAF HALT (O-A4 · AG1 · a11y PLAT-7). The loop is a SCROLL clock, not a heartbeat: it
// exists to react to movement, so it must not schedule a frame when nothing moves. Before O-A4
// `frame()` returned `true` for as long as ANY host was registered, so on the morph routes (`/sci`,
// `/usf`) a registered-but-idle host burned a core forever (`frame` measured 2768 ms / 764 rAF per
// 3 s idle window — the generation-guard re-arm never returned `false` while the centre-argmin was
// stable). Now `frame()` returns `false` (HALTING the driver) once the scene has been QUIESCENT — no
// host progress delta AND no store commit — for {@link IDLE_HALT_FRAMES} consecutive frames (any
// smoothing tail settled). The loop RE-ARMS the moment the story clock can move again: a `scroll`
// (the sole driver of `--scroll-tl`) / `resize` / pointer / key / touch interaction wakes it via
// {@link startLoop}, which is itself PRM-gated so reduced-motion keeps the scheduler parked (PLAT-7:
// the CSS `@media (prefers-reduced-motion)` guard never reaches this JS rAF — the gate lives here).

import { RAFPlayback } from "@mkbabb/keyframes.js";
import { useActiveBeat } from "@/platform/stores/useActiveBeat";
import type { RevealCuePump } from "@/motion/reveal-score";

/** The registered custom property the native `view()` host animates `0 → 1` (declared
    `@property --scroll-tl` in scroll-driven.css). The ONE name read here — the sole `--scroll-tl`
    `getComputedStyle` site in the whole tree (the single-reader law, sealed by k0-active-single-reader). */
const NATIVE_PROGRESS_VAR = "--scroll-tl";

/** The IN-BAND fence (charter D3 verbatim): a host within this centre-distance (`|progress − 0.5|`)
    is eligible to wear the rim. Outside the band → nobody is centred enough (the rim is absent). */
export const CENTRE_BAND = 0.18;

/** The anti-chatter HAND-OFF margin: the incumbent keeps the crown unless a challenger beats its
    centre-distance by MORE than this — so a near-equidistant hand-off never flickers (hysteresis). */
export const SWITCH_MARGIN = 0.03;

/** The idle-halt hysteresis (O-A4): the loop STOPS scheduling after this many CONSECUTIVE frames in
    which nothing moved — no host progress delta beyond {@link PROGRESS_EPSILON} and no store commit.
    A small window (not 1) lets any smoothing/settle tail converge before the halt so the morph lands
    on its true resting frame; a `scroll`/interaction re-arms it instantly (zero felt latency). */
export const IDLE_HALT_FRAMES = 3;

/** The movement threshold: a host whose master position changes by ≤ this since last frame counts as
    STILL. `1e-4` sits far below any real per-frame scroll delta yet above smoothing's settle noise —
    and a genuine sub-epsilon drift still wakes the loop through the `scroll` re-arm, so the pair is
    robust in both directions. */
export const PROGRESS_EPSILON = 1e-4;

/** One scrub host's per-frame sample for the argmin: its viz id + its master position [0, 1]. */
export interface ScrubSample {
    id: string;
    progress: number;
}

/** The resolved centre-grain signal: the singleton winner (`""` when nobody is centred) + the
    in-viewport set (the hosts mid-transit) — both committed to the store in ONE write. */
export interface ActiveVizResolution {
    /** The centre-most in-band viz, or `""` when no host sits within the band. */
    id: string;
    /** The hosts mid-transit (`0 < progress < 1`) this frame — D1's panel union. */
    inViewport: ReadonlySet<string>;
}

/**
 * `resolveActive` — PURE + TOTAL. The banded centre-argmin under {@link CENTRE_BAND} + the
 * {@link SWITCH_MARGIN} hysteresis. Given this frame's samples + the incumbent id, returns the
 * single winner (`""` if none is within the band) + the in-viewport set. Never mutates its inputs;
 * deterministic on a tie (the first in array order wins, so a tie cannot oscillate). No DOM, no rAF,
 * no store — unit-testable in isolation (the `k0-active-resolve-purity` gate).
 *
 * The hysteresis: an in-band incumbent KEEPS the crown unless a challenger is closer to centre by
 * MORE than {@link SWITCH_MARGIN}. So a steady scroll past the midpoint does not chatter, and the
 * incumbent leaving the band (or the band emptying) drops cleanly to the in-band argmin (or `""`).
 */
export function resolveActive(
    samples: readonly ScrubSample[],
    incumbentId: string,
): ActiveVizResolution {
    const inView = samples.filter((s) => s.progress > 0 && s.progress < 1);
    const inViewport: ReadonlySet<string> = new Set(inView.map((s) => s.id));

    const dist = (s: ScrubSample): number => Math.abs(s.progress - 0.5);
    const inBand = inView.filter((s) => dist(s) <= CENTRE_BAND);
    if (inBand.length === 0) return { id: "", inViewport };

    // the centre-most in-band host (a tie resolves to the first in array order — no oscillation).
    let best = inBand[0];
    for (const s of inBand) if (dist(s) < dist(best)) best = s;

    // hysteresis: an in-band incumbent holds unless the challenger is decisively closer.
    const inc = inBand.find((s) => s.id === incumbentId);
    if (inc && dist(best) >= dist(inc) - SWITCH_MARGIN) {
        return { id: inc.id, inViewport };
    }
    return { id: best.id, inViewport };
}

/**
 * A registered scrub host — the registry reads each ONCE per frame. The host owns its facet
 * pipeline; the registry owns the clock + the argmin + the cache.
 */
export interface ScrubHostRecord {
    /** The host's viz id (a getter). `""` opts OUT of the argmin (the host still drives its facets
        but never wears the rim — the §4.D grain knob omitted). */
    vizId: () => string;
    /** The native host element the registry reads `--scroll-tl` off — `null` on the fallback / PRM
        path (those hosts push their scalar reactively; `advance()` returns it for the argmin). The
        typed field (NOT a cast) the K-B cover-host lookup keys on (the A8 seam). */
    el: HTMLElement | null;
    /** Drive the host's pipeline one frame from the native progress (`null` on the fallback path) +
        return the host's master position [0, 1] for the argmin — or `null` to opt OUT (a held seek /
        PRM / no element). */
    advance: (nativeProgress: number | null) => number | null;
    /** The K-B cover-host cache (the A8 forward-seam): the host's last master position [0, 1]. */
    lastProgress: number;
    /** Optional RevealScore once-cue projection. The registry advances it from this host's already
        sampled position, so cue delivery adds no observer, rAF, clock, or native-style read. */
    reveal?: RevealCuePump;
}

/** The registered hosts (the registry iterates this set once per frame). */
const hosts = new Set<ScrubHostRecord>();
/** The ONE rAF owner — keyframes.js `RAFPlayback` (4.1.0), generation-guarded + re-arm-idempotent. */
const driver = new RAFPlayback();
/** The store, resolved lazily (SPA-safe — the active pinia is set after `app.use(createPinia())`). */
let store: ReturnType<typeof useActiveBeat> | null = null;
/** The last COMMITTED winner — the incumbent the hysteresis reads + the id-change dedupe compares. */
let currentId = "";
/** Consecutive still frames observed (O-A4) — once this reaches {@link IDLE_HALT_FRAMES} the loop
    returns `false` and the driver stops scheduling. Reset to 0 on any movement / commit / re-arm. */
let quiescentFrames = 0;

/** The JS-side reduced-motion fence for the SCHEDULER (a11y PLAT-7). The CSS `@media
    (prefers-reduced-motion)` guard never reaches this rAF, so the loop must read the preference
    itself and refuse to arm under it. Read live off `matchMedia` (this is a plain module, not a Vue
    setup scope — no composable); SSR-safe (no `window` ⇒ treated as reduced, never schedules). */
function prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The SOLE `getComputedStyle(--scroll-tl)` read (the single-reader law). Returns the host's native
    progress [0, 1], or `null` when the property is absent / non-finite (a held / not-yet-animating host). */
function readNativeProgress(el: HTMLElement): number | null {
    const raw = getComputedStyle(el).getPropertyValue(NATIVE_PROGRESS_VAR);
    const p = Number.parseFloat(raw);
    return Number.isFinite(p) ? p : null;
}

/** Membership-equality for the in-viewport set — so a steady-state scroll does NOT swap a fresh `Set`
    ref into the store every frame (the reactivity that would re-run D1's panel projection per-frame —
    the I17 starvation guard). */
function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false;
    for (const m of a) if (!b.has(m)) return false;
    return true;
}

/** Commit to the store ONLY when the winner id CHANGED **or** the set membership CHANGED. Returns
    `true` iff it actually wrote — the idle-halt reads this as the "the argmin moved" signal. */
function commit(next: ActiveVizResolution): boolean {
    store ??= useActiveBeat();
    const idChanged = next.id !== currentId;
    const setChanged = !sameSet(next.inViewport, store.activeVizIds);
    if (!idChanged && !setChanged) return false;
    currentId = next.id;
    store.setActiveViz(next.id, next.inViewport);
    return true;
}

/**
 * One frame of the ONE reader: advance every host off its single native read, collect the argmin
 * samples (only hosts that joined the argmin via a non-empty `vizId`) + the in-viewport set, commit
 * the dedupe. Returns `false` (HALTING the loop) when the registry is empty — ZERO idle cost on a
 * route with no scrub host (`/home`, `/demand`) — AND (O-A4) when the scene has been QUIESCENT for
 * {@link IDLE_HALT_FRAMES} consecutive frames: no host progress moved beyond {@link PROGRESS_EPSILON}
 * and no store commit fired, so there is nothing left to drive. A `scroll`/interaction re-arms the
 * loop through {@link startLoop} the instant the story clock can move again.
 */
function frame(): boolean {
    if (hosts.size === 0) return false;
    const samples: ScrubSample[] = [];
    let moved = false;
    for (const h of hosts) {
        const native = h.el ? readNativeProgress(h.el) : null;
        const p = h.advance(native);
        if (p === null) continue;
        // Compare against the CACHED position from the prior frame BEFORE we overwrite it — any
        // host whose master position shifted keeps the loop live (the morph is still in flight).
        if (Math.abs(p - h.lastProgress) > PROGRESS_EPSILON) moved = true;
        h.lastProgress = p;
        h.reveal?.advance(p);
        const id = h.vizId();
        if (id !== "") samples.push({ id, progress: p });
    }
    const committed = commit(resolveActive(samples, currentId));
    if (moved || committed) {
        quiescentFrames = 0;
        return true;
    }
    // Nothing moved this frame. Hold for a few settle frames, then STOP scheduling (the idle halt).
    return ++quiescentFrames < IDLE_HALT_FRAMES;
}

/**
 * (Re-)arm the driver — the SINGLE scheduler door. Idempotent (the running driver is left alone; the
 * generation guard makes a redundant call a no-op) and GATED: it refuses to schedule when the
 * registry is empty or under reduced motion (a11y PLAT-7 — the loop stays parked, matching the CSS
 * PRM guard). Resets the quiescent counter so a fresh wake gets its full settle window.
 */
function startLoop(): void {
    if (driver.running || hosts.size === 0 || prefersReducedMotion()) return;
    quiescentFrames = 0;
    driver.loop(frame);
}

/** Bind the wake interactions ONCE (the registry is a module singleton; the listeners persist for the
    app lifetime and no-op via {@link startLoop}'s empty-registry guard whenever no host is mounted).
    `scroll` (capture, so nested scrollers count too) is the sole driver of `--scroll-tl`; `resize`
    re-lays the ranges; pointer/key/touch cover a scrubber drag or keyboard seek. All passive — the
    wake never blocks the compositor's scroll. */
let interactionsBound = false;
function bindWakeInteractions(): void {
    if (interactionsBound || typeof window === "undefined") return;
    interactionsBound = true;
    const opts: AddEventListenerOptions = { passive: true, capture: true };
    for (const type of ["scroll", "resize", "wheel", "pointerdown", "keydown", "touchstart"]) {
        window.addEventListener(type, startLoop, opts);
    }
}

/**
 * Register a scrub host. Arms the loop on the empty → non-empty edge via {@link startLoop} (idempotent
 * + PRM-gated) and installs the wake interactions on first use. Returns the unregister thunk; the
 * registry SELF-HALTS on the next frame once the last host leaves (the empty check returns `false`),
 * and thereafter stays parked at idle until a scroll/interaction re-arms it (O-A4 zero-idle-rAF).
 */
export function registerScrubHost(record: ScrubHostRecord): () => void {
    hosts.add(record);
    bindWakeInteractions();
    startLoop();
    return () => {
        hosts.delete(record);
    };
}

/**
 * The K-B cover-host FORWARD-SEAM (A8): read a host's last master position off the SAME cache the
 * registry already wrote this frame — NO second `getComputedStyle(--scroll-tl)` poll (R-E stays
 * closed, not transiently re-opened). `null` when the element is not a registered scrub host.
 */
export function readScrubHostProgress(el: HTMLElement): number | null {
    for (const h of hosts) if (h.el === el) return h.lastProgress;
    return null;
}
