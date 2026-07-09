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
import { effectScope, nextTick, ref, watch } from "vue";
import { useLineBoil } from "@mkbabb/pencil-boil";
import { clockAnimation, type MarkAnimation } from "@/motion/useHandMarkClock";

// EX-44 · THE RE-ARM EXTENSION (Part C, below) — the EX-43 verifier PACK found the O-A4-R park is
// NOT reversible: glass-ui's `InkMark` clears `boilArmed` in its OWN `watch(() => animation, …)` on
// EVERY `draw-on ↔ draw-then-boil` flip — including the flip BACK on re-entry — and `appear:"manual"`
// (`clock="load"`'s mapping) has no auto-replay, so nothing ever re-fires the masthead's one-shot
// `play()`. Parts A/B (above) predate that fix and still hold (the atlas clock gate + the raw
// pencil-boil enrol/withdraw mechanics are unchanged). Part C proves the CURE: `HandMark.vue` now
// watches `boilLive` and re-fires `play()` on the false→true (re-entry) edge — the lawful lever
// within the pinned glass-ui 4.2.0 API — against a faithful `InkMark` play/armBoil/animation-watch
// emulation (cross-checked byte-for-byte against the INSTALLED `dist/handmark.js`) wired to the
// REAL pencil-boil singleton.

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

// ── Part C — THE RE-ARM (O-A4-R's RED, now cured): the reverse edge Part B's raw frameCount toggle
// bypassed. glass-ui's `InkMark` resets `boilArmed` on EVERY animation flip (not just the park), so
// the frame-count getter (`boils && boilArmed ? BOIL_FRAMES : 1`) stays pinned at 1 forever after the
// first park unless something RE-FIRES `play()` on re-entry — no matter how many times `boilLive`
// flips back to true. This is the EX-43 verifier's exact finding. The two tests below share ONE
// faithful `InkMark` emulation and diverge on a single axis: whether a re-arm watch is wired.

/** A minimal, faithful replica of glass-ui 4.2.0 `InkMark`'s play/armBoil/onDrawEnd/animation-watch
 *  — cross-checked byte-for-byte against the INSTALLED `node_modules/@mkbabb/glass-ui/dist/handmark.js`
 *  (`P()` = play, `N()` = armBoil, `F()` = onDrawEnd, and the trailing
 *  `watch(() => animation, () => { drawn.value = false; boilArmed.value = false })`). `draws` is
 *  `animation !== "none"`; `boils` is `animation === "boil" || animation === "draw-then-boil"`. The
 *  CSS `@transitionend` is emulated by `finishDraw()` — this file's established node-safe idiom
 *  drives the LOGICAL chain, never real DOM/CSS timing (Part B's `pumpFrame`, above, is the same
 *  idea one layer down). `finishDraw()` is called SEPARATELY from `play()` (not chained
 *  synchronously) precisely because the real `@transitionend` lands a full `drawMs` AFTER glass-ui's
 *  own (synchronous, same-flush) animation-watch has already settled the reset — the real timing
 *  gap that makes the re-arm race-free; collapsing the two into one synchronous call would test a
 *  watcher-registration-order accident, not the actual mechanism. */
function makeInkMarkStub(animation: () => MarkAnimation) {
    const boilArmed = ref(false);
    const drawn = ref(false);
    // glass-ui's `boils` is `animation === "boil" || animation === "draw-then-boil"`; the atlas
    // clock map (`clockAnimation`) never yields `"boil"` (useHandMarkClock's own comment: that value
    // is a resting-clock non-value, `draw-then-boil` is the ONE hero exception) — narrowed to the
    // value this stub's `animation` getter can actually produce.
    const boils = () => animation() === "draw-then-boil";
    const draws = () => animation() !== "none";
    function armBoil(): void {
        if (!boils()) return;
        boilArmed.value = true;
    }
    function play(): void {
        if (!draws()) {
            armBoil();
            return;
        }
        drawn.value = false; // the reflow-restart; finishDraw() below is the (later) @transitionend
    }
    function finishDraw(): void {
        drawn.value = true;
        if (animation() === "draw-then-boil") armBoil();
    }
    // glass-ui's OWN watch (installed dist, confirmed byte-for-byte): ANY animation flip clears
    // drawn + boilArmed — INCLUDING the flip BACK to draw-then-boil on re-entry (the exact defect).
    watch(animation, () => {
        drawn.value = false;
        boilArmed.value = false;
    });
    return { play, finishDraw, boilArmed };
}

describe("O-A4-R · the re-arm — a re-fired play() is the ONLY lawful lever (glass-ui 4.2.0 API)", () => {
    it("WITHOUT a re-fired play(), re-entry never re-arms — the RED reproduces (0 rAF, permanently)", async () => {
        const scope = effectScope();
        const boilLive = ref(true);
        let ink!: ReturnType<typeof makeInkMarkStub>;
        let boil!: ReturnType<typeof useLineBoil>;
        scope.run(() => {
            const animation = () => clockAnimation("load", boilLive.value);
            ink = makeInkMarkStub(animation);
            boil = useLineBoil(
                () => (ink.boilArmed.value ? 3 : 1),
                () => 100,
            );
        });

        // MOUNT — the masthead's one onMounted play(); the draw completes, the boil arms.
        ink.play();
        ink.finishDraw();
        await nextTick();
        expect(queue.size).toBe(1); // enrolled

        // PARK — off-screen (the O-A4-R cure, unaffected by this fix).
        boilLive.value = false;
        await nextTick();
        expect(queue.size).toBe(0);

        // RE-ENTRY — animation flips back to draw-then-boil, but NOTHING re-fires play() (the
        // pre-EX-44 HandMark.vue: appear="manual" has no auto-replay, and MastheadTitle's onMounted
        // play() already fired once, at mount). glass-ui's own watch still resets boilArmed on the
        // flip; nothing ever sets it again.
        boilLive.value = true;
        await nextTick();
        expect(ink.boilArmed.value).toBe(false); // disarmed, permanently — the EX-43 finding
        expect(queue.size).toBe(0); // 0 rAF — the living line is dead until a full reload

        // Settling further changes nothing — no @transitionend will ever arrive (play() was never
        // re-invoked to schedule one).
        await nextTick();
        expect(queue.size).toBe(0);

        boil.stop();
        scope.stop();
    });

    it("WITH the atlas re-arm edge (boilLive false→true ⇒ play()), re-entry RE-ARMS — rAF resumes", async () => {
        const scope = effectScope();
        const boilLive = ref(true);
        let ink!: ReturnType<typeof makeInkMarkStub>;
        let boil!: ReturnType<typeof useLineBoil>;
        scope.run(() => {
            const animation = () => clockAnimation("load", boilLive.value);
            ink = makeInkMarkStub(animation);
            boil = useLineBoil(
                () => (ink.boilArmed.value ? 3 : 1),
                () => 100,
            );
            // THE ACTUAL HandMark.vue PREDICATE under test: `watch(boilLive, (isLive, wasLive) => {
            // if (isLive && !wasLive) void play(); })` — registered here (inside the SAME scope,
            // AFTER `ink`'s own internal animation-watch, mirroring the real parent-setup-before-
            // child-setup registration order) so it fires play() on exactly the re-entry edge.
            watch(boilLive, (isLive, wasLive) => {
                if (isLive && !wasLive) ink.play();
            });
        });

        // MOUNT.
        ink.play();
        ink.finishDraw();
        await nextTick();
        expect(queue.size).toBe(1);

        // PARK.
        boilLive.value = false;
        await nextTick();
        expect(queue.size).toBe(0);

        // RE-ENTRY — the re-arm watch fires play() on this exact flush; glass-ui's own
        // animation-watch (registered first) has ALREADY reset boilArmed=false by the time
        // `nextTick()` resolves — armBoil() has NOT run yet (it awaits the draw transition, below),
        // so the boil is not yet re-enrolled.
        boilLive.value = true;
        await nextTick();
        expect(ink.boilArmed.value).toBe(false); // not yet — armBoil() awaits @transitionend
        expect(queue.size).toBe(0); // not yet scheduled

        // THE @transitionend, a `drawMs` later (well past the watch flush above) — glass-ui's
        // onDrawEnd fires, arming the boil exactly as the first mount did.
        ink.finishDraw();
        await nextTick();

        expect(ink.boilArmed.value).toBe(true); // RE-ARMED
        expect(queue.size).toBe(1); // the rAF chain RESUMES — the boil visibly resumes

        boil.stop();
        scope.stop();
    });
});
