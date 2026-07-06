// charts/composables/echart-pumps.ts — the two MODULE-SCOPED frame-budgeted pumps that
// serve every live `useEChart` instance (O-B4R god-split of `useEChart.ts`, §A.9 — a pure
// no-op extract of the module-level lifecycle machinery, zero closure capture). ONE retint
// pump + ONE paint pump drain across the whole app: the composable enqueues, these spread the
// heavy `setOption` work across animation frames so no single main-thread task exceeds one
// phase's cost (the E9b/I-PERF-DATA.d / N.WF2 · G-N5a levers). See `useEChart.ts` for the full
// rationale of each pump; this file holds only the shared drain machinery.

import type { EChartsOption } from "echarts";

// E9b — the stable sentinel the gated data watch returns while a theme flip is in flight. A
// unique frozen object so it can never equal a real option/fingerprint value; identity-compared.
export const RETINTING = Object.freeze({ __retinting: true });

// E9b/E4-integration — THE FRAME-BUDGETED RETINT PUMP. The 3.11 settle hook coalesces every
// chart's flip callback into ONE task — correct for batching, but on a chart-DENSE route the
// drain itself became the long task (the /sci profile: 9 canvases × ~100ms option-derive +
// merge ≈ 937ms in the one settle task — the G-E9b.1 residual after the VT died). The pump
// spreads the same work across FRAMES: each rAF pops retint jobs until the frame budget is
// spent, then yields. The charts cascade over a few frames (the chrome has ALREADY flipped —
// the canvases tween in their own plane), and no single task exceeds the budget plus one
// chart's own derive cost. Module-scoped: ONE pump serves every live chart.
//
// I-PERF-DATA.d — THE FIRST-DERIVE SLICE (T-PERF-5, the 178ms born-RED head task). The pump
// spread the CASCADE (chart-to-chart) across frames but never the FIRST derive: the OLD loop
// checked the budget only BEFORE shifting a job, so the very first job — a chart-dense
// `opts.option()` re-derive (the ~178ms /sci scatter) PLUS its merge — ran un-sliced as ONE
// head task, and a cheap second job could even pack in behind it within the same frame. The
// slice is two moves, both at the pump (no consumer/option-factory patch):
//   1. EACH chart's retint is enqueued as TWO phases — a DERIVE phase (`opts.option()`, the
//      heavy re-resolve) and an APPLY phase (`setOption` merge) — so the pump yields BETWEEN
//      them; the derive and the merge never coalesce into one head task (see `scheduleRetint`).
//   2. The pump yields AFTER any phase that overran the budget (a post-job budget check), so a
//      heavy derive runs ALONE in its frame and NEVER drags a sibling phase in behind it. No
//      single head task exceeds one phase's own irreducible cost — the cascade absorbs the rest.
// A `performance.measure("retint-derive")` mark fences the heavy derive phase on the timeline so
// the head-task is MEASURABLE (the i0-perf first-derive ≤50ms arm reads it).
const RETINT_FRAME_BUDGET_MS = 32;
const RETINT_DERIVE_MARK = "retint-derive";
const retintQueue: (() => void)[] = [];
let retintPumpArmed = false;
function pumpRetints(): void {
    const t0 = performance.now();
    // Always run at least one phase per frame (else a phase heavier than the budget could
    // never drain). After EACH phase, re-check the budget and YIELD if it is spent — so a heavy
    // derive that overruns never starts a second phase in the same head task (the slice lever).
    do {
        retintQueue.shift()!();
    } while (retintQueue.length > 0 && performance.now() - t0 < RETINT_FRAME_BUDGET_MS);
    if (retintQueue.length > 0) afterPaint(pumpRetints);
    else retintPumpArmed = false;
}
/** Run `fn` AFTER the next frame has painted (rAF marks the frame; the timeout lands past its
    commit). Running the pump in a bare rAF put it BEFORE style/paint — the first palette read
    then FORCED the whole-document post-flip recalc synchronously inside the JS task (the
    ~190ms long-task residual). After paint, the compositor has already paid that recalc on
    its own (un-tasked) clock and every token read is a clean-tree lookup. */
function afterPaint(fn: () => void): void {
    requestAnimationFrame(() => setTimeout(fn, 0));
}
/** Enqueue ONE chart's retint as TWO budget-yielded phases (the I-PERF-DATA.d slice). `derive`
    re-resolves the dark-palette option (the heavy ~178ms re-derive on a dense chart) and returns
    it; `apply` takes that derived option and merges it into the live instance. The pump runs the
    two phases in SEPARATE frame slices, so the derive and the merge never coalesce into one head
    task — and because the pump yields after any phase that overruns the budget, a heavy derive
    runs alone in its frame instead of dragging the next chart's phase in behind it. The derive
    phase is fenced by a `performance.measure("retint-derive")` mark so the head task is
    measurable (the i0-perf first-derive ≤50ms arm). The result of `derive` is threaded to `apply`
    through a closure captured at enqueue, so a chart only re-derives ONCE per flip. */
export function scheduleRetint(
    derive: () => EChartsOption,
    apply: (option: EChartsOption) => void,
): void {
    let derived: EChartsOption | null = null;
    retintQueue.push(() => {
        // Phase 1 — the heavy re-derive, fenced for the timeline. `performance.measure` over a
        // start/end mark pair records this phase as its own entry, so the gate reads the FIRST
        // derive's duration directly (it must clear the one-frame ≤50ms budget after the slice).
        const startMark = `${RETINT_DERIVE_MARK}-start`;
        try {
            performance.mark(startMark);
        } catch {
            /* performance.mark unsupported — the slice still works, just unmeasured */
        }
        derived = derive();
        try {
            performance.measure(RETINT_DERIVE_MARK, startMark);
            performance.clearMarks(startMark);
        } catch {
            /* measure unsupported — no-op */
        }
    });
    retintQueue.push(() => {
        // Phase 2 — the merge, in its OWN slice (the pump yielded after phase 1). `derived` is
        // never null here (phase 1 always runs first, in queue order).
        if (derived !== null) apply(derived);
    });
    if (!retintPumpArmed) {
        retintPumpArmed = true;
        afterPaint(pumpRetints);
    }
}

// N.WF2 · G-N5a — THE FRAME-BUDGETED FILTER-PAINT PUMP (H2, the retint pump generalized to the
// DATA/FILTER path). A filter change fires the data watch on EVERY live plate in ONE reactive flush;
// the old path called `paint()` → `setOption(notMerge:true)` SYNCHRONOUSLY per plate, so 6–9 plates'
// option re-parse ran as ONE ~300–460ms main-thread task INSIDE the interaction's window (measured on
// the 4×-CPU throttled `/sci` filter drive, N.WF2 readback) — the INP tank the `:238` comment names.
// `lazyUpdate:true` deferred only the RASTER; the `notMerge:true` re-parse stayed synchronous. This
// pump spreads those re-parses across animation frames: each plate's `setOption` runs in its OWN frame
// slice, so no single task exceeds one plate's parse (~60ms throttled) and the heavy work LEAVES the
// interaction's synchronous window (the input handler only ENQUEUES). The paints are COALESCED per
// chart — a pending paint reads the LATEST option when it runs, so rapid filter ticks collapse to one
// re-parse — and the pump is module-scoped (ONE pump drains every live plate). The pump runs in a bare
// rAF (BEFORE the frame's paint, unlike the retint pump's after-paint) so the plate actually rasters
// that frame. A host without rAF (jsdom/SSR) paints synchronously — behaviour-identical to the old path.
const PAINT_FRAME_BUDGET_MS = 24;
const paintQueue: (() => void)[] = [];
let paintPumpArmed = false;
function pumpPaints(): void {
    const t0 = performance.now();
    // Always drain at least one job per frame (else a single plate heavier than the budget could
    // never paint). After each job re-check the budget and yield if it is spent, so one plate's
    // re-parse never drags the next plate's into the same task — the per-task cap is one plate.
    do {
        paintQueue.shift()!();
    } while (paintQueue.length > 0 && performance.now() - t0 < PAINT_FRAME_BUDGET_MS);
    if (paintQueue.length > 0) requestAnimationFrame(pumpPaints);
    else paintPumpArmed = false;
}
/** Enqueue one plate's coalesced paint into the frame-budgeted pump. Off a host without rAF (the
    jsdom/SSR path) the job runs synchronously so the composable stays behaviour-identical there. */
export function enqueuePaint(job: () => void): void {
    if (typeof requestAnimationFrame !== "function") {
        job();
        return;
    }
    paintQueue.push(job);
    if (!paintPumpArmed) {
        paintPumpArmed = true;
        requestAnimationFrame(pumpPaints);
    }
}
