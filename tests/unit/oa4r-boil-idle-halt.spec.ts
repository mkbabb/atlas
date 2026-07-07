// tests/unit/oa4r-boil-idle-halt.spec.ts — O-A4-R · the idle-rAF-heartbeat regression fix
// (RED-LEDGER B.11 · the O-A4 idle-zero bar re-opened by the EX-39 A18 verifier).
//
// THE FIND (measured on the v1.0.12 prod build): a continuous ~98 fps rAF heartbeat runs at IDLE on
// the data routes — the `@mkbabb/pencil-boil` singleton frame scheduler (`useLineBoil`) reschedules
// `requestAnimationFrame` while its module-level subscriber Set is non-empty. A `draw-then-boil`
// living-line mark (the sci masthead) is a PERPETUAL subscriber: it never withdraws, so the shared
// loop never halts — even when the hero mark is scrolled off-screen.
//
// THE CURE (atlas-side, lawful — pencil-boil is READ-ONLY family): `HandMark.vue` PARKS the boil off
// the viewport. When the mark leaves view its clock resolves `draw-on` instead of `draw-then-boil`,
// which collapses glass-ui's boil frame count to 1 → `useLineBoil` WITHDRAWS its subscriber → the Set
// EMPTIES → the singleton rAF chain HALTS to zero. This spec proves BOTH halves against the REAL
// installed pencil-boil singleton (no mock of the scheduler): (1) the atlas clock parks to `draw-on`
// off-screen; (2) driving the true `useLineBoil` with a spied `requestAnimationFrame`, an enrolled
// player runs EXACTLY one loop, and the instant its frame count collapses the subscriber withdraws
// and NO further rAF is scheduled — the loop dies to zero.
//
// Node-safe (the atlas vitest env is `node`): no DOM, no component mount. `window` +
// `requestAnimationFrame`/`cancelAnimationFrame` are stubbed and the frame loop is pumped by hand, so
// the single-chain invariant + the empty-set halt are asserted deterministically.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useLineBoil } from "@mkbabb/pencil-boil";
import { clockAnimation } from "@/motion/useHandMarkClock";

// ── Part A — the atlas clock parks the boil off-screen ───────────────────────────────────────────
//
// `HandMark.vue` feeds `useHandMarkClock` a `boilLive = boilActive && boilVisible` edge; the clock
// maps it through `clockAnimation`. Off-screen (`boilLive === false`) MUST resolve `draw-on` — the
// value that collapses glass-ui's boil frame count and withdraws the pencil-boil subscriber — never a
// `draw-then-boil` that would keep the mark enrolled.
describe("O-A4-R · the boil clock parks off-screen (the atlas idle-zero gate)", () => {
    it("resolves draw-then-boil ONLY while live; parks to draw-on when off-screen", () => {
        // boilLive true (on-screen, budgeted hero) → the living line.
        expect(clockAnimation("load", true)).toBe("draw-then-boil");
        // boilLive false (off-screen park) → present + fully DRAWN, but NOT boiling: the frame count
        // collapses to 1 and the singleton subscriber withdraws.
        expect(clockAnimation("load", false)).toBe("draw-on");
        // The boil is meaningful ONLY on the load clock — scroll/static never enrol regardless.
        expect(clockAnimation("scroll", true)).toBe("none");
        expect(clockAnimation("static", true)).toBe("none");
    });
});

// ── Part B — the REAL pencil-boil singleton halts to zero rAF when the set empties ────────────────

/** The hand-pumped rAF queue — every scheduled callback is captured so the test drives frames
    deterministically and reads the OUTSTANDING chain count (the single-loop invariant). */
let queue: Map<number, FrameRequestCallback>;
let nextRafId: number;
let rafSpy: ReturnType<typeof vi.fn>;
let cancelSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
    queue = new Map();
    nextRafId = 1;
    rafSpy = vi.fn((cb: FrameRequestCallback) => {
        const id = nextRafId++;
        queue.set(id, cb);
        return id;
    });
    cancelSpy = vi.fn((id: number) => {
        queue.delete(id);
    });
    // `useLineBoil` gates on `typeof window` (the scheduler refuses to arm off-DOM) and reads
    // `window.matchMedia(...).matches` for its PRM check — stub a non-reduced window so the loop runs.
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal("requestAnimationFrame", rafSpy);
    vi.stubGlobal("cancelAnimationFrame", cancelSpy);
    // `useLineBoil` registers `onUnmounted` with no active component instance (we drive it in a bare
    // effect scope) — silence that one benign Vue warning; the park path we exercise is the reactive
    // frame-count watch, not unmount.
    vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

/** Consume the ONE outstanding scheduled frame (as the browser would) and run it at `ts`; the
    scheduler reschedules exactly one on its way out while it is still running. */
function pumpFrame(ts: number): void {
    const entries = [...queue.entries()];
    // Invariant: at rest there is AT MOST one outstanding rAF (the single-chain law).
    expect(entries.length).toBeLessThanOrEqual(1);
    const next = entries[0];
    if (!next) return;
    queue.delete(next[0]);
    next[1](ts);
}

describe("O-A4-R · the pencil-boil singleton halts to zero rAF on an empty set", () => {
    it("an enrolled boil runs EXACTLY one loop; parking empties the set and stops the rAF", async () => {
        const scope = effectScope();
        // The reactive boil frame count — glass-ui feeds `useLineBoil` a getter of the SAME shape:
        // `boils && boilArmed ? boilFrames : 1`. The atlas park drops it to 1 (animation → draw-on).
        const frameCount = ref(3);
        let boil!: ReturnType<typeof useLineBoil>;
        scope.run(() => {
            boil = useLineBoil(
                () => frameCount.value,
                () => 100,
            );
        });

        // ENROL — the frame-count watch fires synchronously on creation → the scheduler arms exactly
        // one rAF (the shared chain), no more.
        expect(rafSpy).toHaveBeenCalledTimes(1);
        expect(queue.size).toBe(1);

        // NEG — an ACTIVE player keeps EXACTLY one loop: each pumped frame reschedules precisely one,
        // never a second parallel chain, across many frames.
        pumpFrame(0); // seeds lastTick
        expect(queue.size).toBe(1);
        pumpFrame(150); // ≥ interval → the frame index advances
        expect(queue.size).toBe(1);
        pumpFrame(300);
        expect(queue.size).toBe(1);
        expect(boil.currentFrame.value).toBeGreaterThan(0); // the loop is genuinely live

        const scheduledWhileLive = rafSpy.mock.calls.length;

        // PARK — the mark leaves the viewport: the atlas flips animation → draw-on, collapsing the
        // boil frame count to 1. `useLineBoil`'s watch withdraws the subscriber and stops the chain.
        frameCount.value = 1;
        await nextTick();

        // The set EMPTIED → the outstanding rAF was cancelled and none was rescheduled: ZERO rAF.
        expect(cancelSpy).toHaveBeenCalled();
        expect(queue.size).toBe(0);
        const frozenFrame = boil.currentFrame.value;

        // The loop is truly dead — no new frame is ever scheduled, and a would-be pump is inert.
        pumpFrame(450);
        pumpFrame(600);
        expect(queue.size).toBe(0);
        expect(rafSpy.mock.calls.length).toBe(scheduledWhileLive); // frozen — no post-park schedules
        expect(boil.currentFrame.value).toBe(frozenFrame); // the index stopped advancing

        boil.stop(); // idempotent cleanup (already withdrawn)
        scope.stop();
    });

    it("re-arms when the mark returns to view (park = unregister, resume = re-register)", async () => {
        const scope = effectScope();
        const frameCount = ref(3);
        let boil!: ReturnType<typeof useLineBoil>;
        scope.run(() => {
            boil = useLineBoil(
                () => frameCount.value,
                () => 100,
            );
        });
        expect(queue.size).toBe(1); // enrolled

        frameCount.value = 1; // park (off-screen)
        await nextTick();
        expect(queue.size).toBe(0); // the singleton halted

        frameCount.value = 3; // re-enter the viewport
        await nextTick();
        expect(queue.size).toBe(1); // the shared chain re-armed — exactly one loop

        boil.stop();
        scope.stop();
    });
});
