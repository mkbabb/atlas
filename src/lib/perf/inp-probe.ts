// src/lib/perf/inp-probe.ts — THE INP MEASUREMENT SEAM (N.W0 · N.md §7 G-N5a/G-N5b · wave-doc §3.B).
//
// Net-new instrumentation: no `PerformanceObserver`/event-timing/longtask existed anywhere in `src`
// before this seam (NP6, code-verified: `grep -rn PerformanceObserver|event-timing|first-input|longtask
// atlas/src` returned empty; the atlas measured LCP only). Transcribed VERBATIM from the proven NP6
// runnable module `inp-probe.mjs` (session `pass1/proto/NP6/`), preserving the INP decomposition
// arithmetic; the ONE faithful adaptation is the BORN-RED `pass` semantics (see `inpReport` below).
//
// It installs the measurement seam for INP on the interaction that matters for the N-arc: a filter
// change → the coordinator's Selection dispatch → the N-plate `setOption(notMerge:true)` raster. Three
// cooperating observers + two marks bracket that path.
//
// WHERE INP GETS MEASURED (the seam):
//   1. Event Timing API (`type:'event'` + `first-input`) → the OFFICIAL INP number:
//      duration = presentationTime − eventTimestamp (input-delay + processing + presentation).
//   2. `longtask` observer → attributes any >50ms task blocking the interaction.
//   3. `performance.measure` marks bracketing the filter→painted path → the ATTRIBUTABLE processing
//      slice (which plate/derive/raster ate the budget).
// The coordinator's change edge calls `markFilterStart()`; a post-`setOption` double-rAF (after the
// deferred `lazyUpdate` raster) records the `filter→painted` measure.
//
// W0 lands the SEAM ONLY. It does NOT wire any component to it (N.WA1/N.WF2 own that — the WA1
// coordinator Selection edge calls `markFilterStart`, N.WF2 drives the throttled `/sci` filter and
// ratchets G-N5a to the measured value). W0's DONE is the born-RED shape: with no drive, `inpReport()`
// reports `{ pass:false, n:0 }` (no interaction recorded ⇒ RED — never vacuously green, per N.md §N4/§7
// G-N10).

/** The N4 leader-tier INP budget (N.md §7 G-N5a "INP ≤200ms"; §N4 leader-tier budgets). */
export const INP_BUDGET_MS = 200;

/** One recorded interaction, decomposed into the three INP components (input delay + processing +
    presentation delay). `dur` is the Event-Timing `duration` (the whole interaction). */
export interface InpInteraction {
    /** the Event-Timing entry name (`pointerup`, `keydown`, `click`, …). */
    name: string;
    /** the interaction `duration` (ms) — the OFFICIAL INP contribution of this interaction. */
    dur: number;
    /** input delay = `processingStart − startTime` (time queued before the handler ran). */
    inputDelay: number;
    /** processing = `processingEnd − processingStart` (the synchronous handler work). */
    processing: number;
    /** presentation delay = `startTime + duration − processingEnd` (handler-end → next paint). */
    presentation: number;
    /** the `data-testid` (or tagName) of the interaction target, for attribution. */
    target: string;
}

/** The `onReport` event union — the three cooperating observers each emit one shape. `INP-VIOLATION`
    fires when an interaction's `duration` exceeds the budget; `LONGTASK` attributes a >50ms blocking
    task; `MEASURE` reports a `filter→painted[…]` bracket's duration (the attributable slice). */
export type InpReportEvent =
    | {
          kind: "INP-VIOLATION";
          event: string;
          durationMs: number;
          inputDelayMs: number;
          processingMs: number;
          presentationMs: number;
          budget: number;
      }
    | { kind: "LONGTASK"; durationMs: number; start: number }
    | { kind: "MEASURE"; name: string; ms: number };

/** `installInpProbe` options. `onReport` receives every live violation / longtask / measure. */
export interface InpProbeOptions {
    onReport?: (event: InpReportEvent) => void;
}

/** The `inpReport()` gate arm — the shape G-N5a/G-N5b assert against. `pass` is BORN-RED: it is `false`
    until at least one interaction is recorded AND its worst is under budget (a report with `n:0` — no
    drive — is RED, never vacuously green). */
export interface InpReport {
    /** the worst interaction `duration` recorded (ms), rounded — the INP proxy on a short session. */
    worstINP: number;
    /** the ~98th-percentile interaction `duration` (ms) — the CWV INP estimator; `worstINP` on a
        short session. */
    inp: number;
    /** the budget the report is graded against (`INP_BUDGET_MS`). */
    budget: number;
    /** BORN-RED: `n > 0 && worstINP <= budget`. No interaction recorded ⇒ `false` (N4/G-N10 honesty —
        an un-driven gate is RED, not silently green). */
    pass: boolean;
    /** the count of interactions recorded (the non-vacuous-drive signal; `0` before any drive). */
    n: number;
    /** the three worst interactions (rounded `dur`) — the attribution for a violation. */
    worst3: InpInteraction[];
}

/** `PerformanceObserverInit` extended with `durationThreshold` (the Event-Timing sub-frame catch; not
    in every lib.dom). */
interface EventObserverInit extends PerformanceObserverInit {
    durationThreshold?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · THE MEASUREMENT STATE (module-scoped — the seam is a singleton per document)
// ─────────────────────────────────────────────────────────────────────────────
let worstINP = 0;
const interactions: InpInteraction[] = [];

/** The `data-testid` (or tagName) of an Event-Timing target, defensively — the entry's `target` is a
    `Node | null` and only an `Element` carries `getAttribute`. */
function targetLabel(target: unknown): string {
    const el = target as { getAttribute?: (n: string) => string | null; tagName?: string } | null;
    return el?.getAttribute?.("data-testid") ?? el?.tagName ?? "?";
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · THE OBSERVERS (install once, at app boot — N.WA1/N.WF2 wire the call site)
// ─────────────────────────────────────────────────────────────────────────────

/** Install the three cooperating observers; returns a teardown that disconnects all of them. In a host
    without `PerformanceObserver` (a bare node run / a limited jsdom) the seam installs nothing and the
    teardown is a no-op — the born-RED `inpReport()` still reports `{ pass:false, n:0 }`. */
export function installInpProbe({ onReport = () => {} }: InpProbeOptions = {}): () => void {
    if (typeof PerformanceObserver === "undefined") return () => {};

    // (a) Event Timing → the real INP. durationThreshold:16 catches sub-frame jank too.
    const evtObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            const e = entry as PerformanceEventTiming;
            // INP components: input delay | processing | presentation delay.
            const inputDelay = e.processingStart - e.startTime;
            const processing = e.processingEnd - e.processingStart;
            const presentation = e.startTime + e.duration - e.processingEnd;
            if (e.duration > worstINP) worstINP = e.duration;
            interactions.push({
                name: e.name,
                dur: e.duration,
                inputDelay,
                processing,
                presentation,
                target: targetLabel(e.target),
            });
            if (e.duration > INP_BUDGET_MS) {
                onReport({
                    kind: "INP-VIOLATION",
                    event: e.name,
                    durationMs: Math.round(e.duration),
                    inputDelayMs: Math.round(inputDelay),
                    processingMs: Math.round(processing),
                    presentationMs: Math.round(presentation),
                    budget: INP_BUDGET_MS,
                });
            }
        }
    });
    evtObs.observe({ type: "event", durationThreshold: 16, buffered: true } as EventObserverInit);
    evtObs.observe({ type: "first-input", buffered: true });

    // (b) Long tasks → what blocked the main thread during the interaction.
    let ltObs: PerformanceObserver | undefined;
    try {
        ltObs = new PerformanceObserver((list) => {
            for (const t of list.getEntries())
                if (t.duration > 50)
                    onReport({
                        kind: "LONGTASK",
                        durationMs: Math.round(t.duration),
                        start: Math.round(t.startTime),
                    });
        });
        ltObs.observe({ type: "longtask", buffered: true });
    } catch {
        /* longtask unsupported on this host */
    }

    // (c) Our own filter→paint measures → the attributable processing slice.
    const measObs = new PerformanceObserver((list) => {
        for (const m of list.getEntries())
            if (m.name.startsWith("filter→"))
                onReport({ kind: "MEASURE", name: m.name, ms: Math.round(m.duration) });
    });
    measObs.observe({ type: "measure", buffered: true });

    return () => {
        evtObs.disconnect();
        ltObs?.disconnect();
        measObs.disconnect();
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · THE COORDINATOR-EDGE MARK (called from the Selection dispatch edge)
//     N-FILTER §4.1b: the coordinator's Selection change edge is the ONE seam that fires when a filter
//     cell / selection / year-scope moves — `sel.update({ source, predicate })` (proto-seeds/coordinator/
//     port/coordinator-store.ts:131). `markFilterStart` brackets it. Its `reason` receives that clause's
//     `source` (a `string` — `Clause<Row>['source']` in proto-seeds/coordinator/selection.ts:32), so the
//     WA1 call site `markFilterStart(clause.source)` type-checks against the dispatch edge unchanged.
// ─────────────────────────────────────────────────────────────────────────────
let tick = 0;

/** Bracket the coordinator's Selection dispatch edge: mark `filter:start`, then a double-rAF later
    (rAF #1 after the synchronous derive + `setOption` flush; rAF #2 after the deferred `lazyUpdate`
    raster paints) mark `filter:painted` and emit the `filter→painted[reason]` measure the `MEASURE`
    observer attributes. Returns the monotone interaction id. `reason` is the clause `source`/label; it
    binds the WA1 edge (see the header). Feature-detects `performance.mark`/`requestAnimationFrame` so a
    non-browser host (the born-RED node/vitest run) no-ops gracefully while still returning the id. */
export function markFilterStart(reason: string = "filter"): number {
    const id = ++tick;
    if (typeof performance === "undefined" || typeof performance.mark !== "function") return id;
    performance.mark(`filter:start:${id}`);
    if (typeof requestAnimationFrame !== "function") return id;
    requestAnimationFrame(() =>
        requestAnimationFrame(() => {
            performance.mark(`filter:painted:${id}`);
            performance.measure(
                `filter→painted[${reason}]`,
                `filter:start:${id}`,
                `filter:painted:${id}`,
            );
        }),
    );
    return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · THE GATE ARM (the e2e drives a filter, asserts the worst INP under budget)
// ─────────────────────────────────────────────────────────────────────────────

/** The G-N5a/G-N5b report. BORN-RED: `pass` requires at least one recorded interaction (`n > 0`) whose
    worst is within budget — an un-driven seam reports `{ pass:false, n:0 }` (N4/G-N10: a gate with no
    measurement is RED, never vacuously green). N.WF2 drives the throttled `/sci` filter and ratchets the
    committed budget to the measured value. */
export function inpReport(): InpReport {
    const sorted = [...interactions].sort((a, b) => b.dur - a.dur);
    // INP ≈ the 98th-percentile interaction (or worst, on a short session).
    const p98 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.02))];
    const n = interactions.length;
    return {
        worstINP: Math.round(worstINP),
        inp: p98 ? Math.round(p98.dur) : 0,
        budget: INP_BUDGET_MS,
        // BORN-RED: no interaction recorded (n === 0) ⇒ pass:false. This is the one faithful adaptation
        // of the NP6 arithmetic — the decomposition is verbatim; the gate is honest-RED until driven.
        pass: n > 0 && worstINP <= INP_BUDGET_MS,
        n,
        worst3: sorted.slice(0, 3).map((i) => ({ ...i, dur: Math.round(i.dur) })),
    };
}

/** Reset the measurement state — for a test that drives the seam and asserts a fresh report (the seam is
    a document singleton; a driven spec resets between cases). Not called in production. */
export function __resetInpProbe(): void {
    worstINP = 0;
    interactions.length = 0;
    tick = 0;
}
