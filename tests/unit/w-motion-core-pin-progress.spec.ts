// The pin-clock harness (W-MOTION-CORE · spec-motion §b.2). This REPLACES the KILL-M1 parity
// tautology — a proto that compared `stage.getBoundingClientRect()` to a SECOND
// `stage.getBoundingClientRect()` and reported `max|Δ| = 0`, a gate that could not fail.
//
// What makes this one falsifiable: every FAIL path below is a REACHABLE state of the same registry.
// The harness registers genuine `ScrubHostRecord`s through the real `registerScrubHost`, reads them
// back only through the real `readScrubHostProgress` Set lookup, and drives them over the RECORDED
// shipped geometry (EVIDENCE §2): N = 4 viewport-height steps under `animation-range: cover 0% cover
// 100%`, sampled at the 0.025 grain. Two of the three FAILs reproduce the exact measured numbers.
//
//   FAIL-A  register the stage ROOT instead of the per-step hosts → the lookup returns null → the
//           pass-2 composition pins at a constant 1 (born settled). The KILL-M2 regression guard.
//   FAIL-B  compose the RAW overlapping cover (no declared-window remap) → the boundary jumps
//           0.1375 per 0.025 sample — the measured naive discontinuity.
//   FAIL-C  read geometry per frame instead of the cache → the poll/layout counter increments.
import { effectScope, ref, type ComputedRef, type Ref } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    registerScrubHost,
    readScrubHostProgress,
    type ScrubHostRecord,
} from "../../src/charts/composables/activeViz";
import {
    PIN_STEP_WINDOW,
    composePinT,
    remapStepProgress,
    usePinProgress,
} from "../../src/motion/usePinProgress";

// ── THE RECORDED GEOMETRY (EVIDENCE §2) ──────────────────────────────────────────────────────────
const N = 4;
const GRAIN = 0.025;
/** The 41 sample positions of the stage transit, at the recorded 0.025 grain. */
const SWEEP = Array.from({ length: Math.round(1 / GRAIN) + 1 }, (_, i) => i * GRAIN);
/** The deck's active step at transit position `s` (the centre-band flip, one step per 1/N). */
const activeIndexAt = (s: number): number => Math.min(Math.floor(N * s), N - 1);
/** Step `k`'s `view()` COVER progress at `s`. Adjacent full-height steps overlap by construction: a
    step reads 0.5 as its block crosses the viewport centre and 1 as its successor does, so at any
    instant TWO hosts are mid-cover — the §b.1·iii fact this geometry exists to carry. */
const coverAt = (s: number, k: number): number =>
    Math.max(0, Math.min(1, (N * s - k + 1) / 2));

/** A fake element identity — `readScrubHostProgress` keys on reference, and the counters below make
    a layout read observable. */
function makeEl(): HTMLElement & { rectReads: number } {
    const el = {
        rectReads: 0,
        getBoundingClientRect(): { top: number; height: number } {
            el.rectReads++;
            return { top: 0, height: 0 };
        },
    };
    return el as unknown as HTMLElement & { rectReads: number };
}

/** Register N per-step hosts the way `StickyScene` does, plus an UN-registered stage root. Returns
    the disposer so the module-singleton registry never leaks between specs. */
function mountStage(): {
    stepEls: (HTMLElement & { rectReads: number })[];
    root: HTMLElement & { rectReads: number };
    driveTo: (s: number) => void;
    dispose: () => void;
} {
    const stepEls = Array.from({ length: N }, makeEl);
    const root = makeEl(); // the stage root — deliberately NEVER registered (as shipped)
    const records: ScrubHostRecord[] = stepEls.map((el) => ({
        vizId: () => "sci-stage",
        el,
        advance: (p) => p,
        lastProgress: 0,
        informationOnly: false,
    }));
    const offs = records.map((r) => registerScrubHost(r));
    return {
        stepEls,
        root,
        // The ONE registry reader writes `lastProgress` for every host each frame; the harness plays
        // that writer so the composition reads exactly the cache it reads in the app.
        driveTo: (s) => records.forEach((r, k) => (r.lastProgress = coverAt(s, k))),
        dispose: () => offs.forEach((off) => off()),
    };
}

/** The SHIPPED composition — the declared-window remap over the already-registered per-step host. */
const pinTAt = (
    stage: ReturnType<typeof mountStage>,
    s: number,
    window: readonly [number, number] = PIN_STEP_WINDOW,
): number => {
    const k = activeIndexAt(s);
    const cover = readScrubHostProgress(stage.stepEls[k]!);
    return composePinT(k, cover === null ? 0 : remapStepProgress(cover, window), N);
};

const maxStep = (xs: number[]): number =>
    xs.slice(1).reduce((m, x, i) => Math.max(m, Math.abs(x - xs[i]!)), 0);
const maxBackward = (xs: number[]): number =>
    xs.slice(1).reduce((m, x, i) => Math.max(m, xs[i]! - x), 0);

let live: ReturnType<typeof mountStage> | null = null;
// The registry commits its (empty) resolution to the shared beat store as the last host leaves.
beforeEach(() => setActivePinia(createPinia()));
afterEach(() => {
    live?.dispose();
    live = null;
    vi.unstubAllGlobals();
});

describe("usePinProgress over the recorded /sci stage geometry", () => {
    it("P1 — every sample reads a NON-NULL per-step host (the seam is live, not born-settled)", () => {
        const stage = (live = mountStage());
        for (const s of SWEEP) {
            stage.driveTo(s);
            expect(readScrubHostProgress(stage.stepEls[activeIndexAt(s)]!)).not.toBeNull();
        }
    });

    it("P2/P3 — the remapped composition is monotone and steps by the grain, never the naive 0.1375", () => {
        const stage = (live = mountStage());
        const trace = SWEEP.map((s) => {
            stage.driveTo(s);
            return pinTAt(stage, s);
        });
        expect(trace[0]).toBeCloseTo(0, 10);
        expect(trace.at(-1)).toBeGreaterThanOrEqual(0.99);
        expect(maxBackward(trace)).toBe(0);
        expect(maxStep(trace)).toBeCloseTo(GRAIN, 10); // 0.025 — the DELTA of record
    });

    it("FAIL-A — the stage-root read (the deleted seam) is reachable and pins at a constant 1", () => {
        const stage = (live = mountStage());
        const dead = SWEEP.map((s) => {
            stage.driveTo(s);
            return readScrubHostProgress(stage.root) ?? 1; // the pass-2 composition, verbatim
        });
        expect(new Set(dead)).toEqual(new Set([1])); // constant — no transit at all
        // and the shipped path over the SAME registry genuinely transits
        stage.driveTo(1);
        expect(pinTAt(stage, 1)).toBeGreaterThan(0.99);
        stage.driveTo(0);
        expect(pinTAt(stage, 0)).toBeLessThan(0.01);
    });

    it("FAIL-B — composing the RAW overlapping cover jumps 0.1375, the measured naive discontinuity", () => {
        const stage = (live = mountStage());
        const naive = SWEEP.map((s) => {
            stage.driveTo(s);
            return pinTAt(stage, s, [0, 1]); // no remap — the forbidden formula
        });
        expect(maxStep(naive)).toBeCloseTo(0.1375, 10);
        expect(maxStep(naive) / GRAIN).toBeCloseTo(5.5, 10); // 5.5× the clean grain
    });

    it("FAIL-B' — a single NON-ABUTTING declared window re-opens a boundary jump", () => {
        const stage = (live = mountStage());
        const gapped = SWEEP.map((s) => {
            stage.driveTo(s);
            return pinTAt(stage, s, [0.5, 0.9]); // the window closes before its neighbour opens
        });
        expect(maxStep(gapped)).toBeGreaterThan(GRAIN);
    });

    it("P4/FAIL-C — the composition adds zero polls and zero layout reads; the rect path does not", () => {
        const stage = (live = mountStage());
        const getComputedStyle = vi.fn(() => ({ getPropertyValue: () => "0" }));
        vi.stubGlobal("getComputedStyle", getComputedStyle);
        for (let i = 0; i < 200; i++) pinTAt(stage, SWEEP[i % SWEEP.length]!);
        expect(getComputedStyle).toHaveBeenCalledTimes(0);
        expect(stage.stepEls.reduce((n, el) => n + el.rectReads, 0)).toBe(0);
        // FAIL-C: a composition that measures geometry per frame increments the counter every read.
        for (let i = 0; i < 200; i++) stage.stepEls[0]!.getBoundingClientRect();
        expect(stage.stepEls[0]!.rectReads).toBe(200);
    });
});

describe("the usePinProgress seam itself", () => {
    /** Drive the real composable over a real deck; `stepIndex` is the reactive input, exactly as
        `useStageDeck(N).activeIndex` is in `StickyScene`. */
    function runDeck(makeRecords: (els: HTMLElement[]) => ScrubHostRecord[]): {
        pinT: ComputedRef<number>;
        stepIndex: Ref<number>;
        els: HTMLElement[];
        records: ScrubHostRecord[];
        stop: () => void;
    } {
        const els = Array.from({ length: N }, makeEl) as HTMLElement[];
        const records = makeRecords(els);
        const offs = records.map((r) => registerScrubHost(r));
        const stepIndex = ref(0);
        const scope = effectScope();
        const pinT = scope.run(() =>
            usePinProgress({
                stepIndex,
                activeStepEl: () => els[stepIndex.value] ?? null,
                stepCount: N,
            }).pinT,
        )!;
        return {
            pinT,
            stepIndex,
            els,
            records,
            stop: () => {
                scope.stop();
                offs.forEach((off) => off());
            },
        };
    }

    it("composes the registered per-step host through the declared window at every deck position", () => {
        const deck = runDeck((els) =>
            els.map((el) => ({ vizId: () => "sci-stage", el, advance: (p) => p, lastProgress: 0 })),
        );
        // A step half-way through its declared [0.5,1] window reads within = 0.5.
        for (let k = 0; k < N; k++) {
            deck.records[k]!.lastProgress = 0.75;
            deck.stepIndex.value = k;
            expect(deck.pinT.value).toBeCloseTo((k + 0.5) / N, 10);
        }
        deck.stop();
    });

    it("dial 15 — a fallback host (no element registered) quantizes to the discrete stepper", () => {
        // `useScrollTimeline.ts:383-386` — on the JS-fallback path `record.el` is null, so the
        // el-keyed lookup misses and `within` collapses to 0. RATIFIED: ship the stepper.
        const deck = runDeck((els) =>
            els.map(() => ({ vizId: () => "sci-stage", el: null, advance: () => 0, lastProgress: 0.75 })),
        );
        for (let k = 0; k < N; k++) {
            deck.stepIndex.value = k;
            expect(deck.pinT.value).toBeCloseTo(k / N, 10); // stepIndex/stepCount — no intra-step scrub
        }
        deck.stop();
    });
});

describe("the pin composition's pure core", () => {
    it("clamps out of range and reads terminal on an empty deck", () => {
        expect(composePinT(0, 0, 0)).toBe(1);
        expect(composePinT(9, 0.5, 4)).toBeCloseTo(0.875, 10); // index clamped to the last step
        expect(composePinT(-3, 0.5, 4)).toBeCloseTo(0.125, 10);
        expect(composePinT(1, 5, 4)).toBeCloseTo(0.5, 10);
    });

    it("remaps a degenerate window to a step at `from` rather than dividing by zero", () => {
        expect(remapStepProgress(0.7, [0.5, 0.5])).toBe(1);
        expect(remapStepProgress(0.4, [0.5, 0.5])).toBe(0);
        expect(remapStepProgress(0.75)).toBeCloseTo(0.5, 10); // the default [0.5, 1] window
    });
});
