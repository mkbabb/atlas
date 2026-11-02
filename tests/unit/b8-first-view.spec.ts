// U/B8 A9 — the entrance law's first view. An entrance plays after 130 ms of real visibility, a
// pass-through does not use it up, a tall element counts once it fills half the viewport, and on a
// page opened on a deep link nothing starts watching until the restore has settled. Fails before:
// the only form was AnimatedRule's own IntersectionObserver, which drew on the first intersection.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_VIEW_DWELL_MS, observeFirstView } from "../../src/motion/useFirstView";
import {
    beginNarrativeRestore,
    markNarrativeRestoreAbsent,
    narrativeLandingHeld,
    resetNarrativeLanding,
    settleNarrativeRestore,
} from "../../src/motion/narrative-restore";

type Entry = Partial<IntersectionObserverEntry>;
let observers: Array<{ cb: (e: Entry[]) => void; observed: Element[]; disconnected: boolean }> = [];

beforeEach(() => {
    vi.useFakeTimers();
    observers = [];
    vi.stubGlobal("window", { innerHeight: 800 });
    vi.stubGlobal(
        "IntersectionObserver",
        class {
            rec = { cb: (_: Entry[]) => {}, observed: [] as Element[], disconnected: false };
            constructor(cb: (e: Entry[]) => void) {
                this.rec.cb = cb;
                observers.push(this.rec);
            }
            observe(el: Element) {
                this.rec.observed.push(el);
            }
            disconnect() {
                this.rec.disconnected = true;
            }
        },
    );
    resetNarrativeLanding(false);
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

const el = {} as Element;
const seen = (ratio: number, height = 100): Entry => ({
    isIntersecting: ratio > 0,
    intersectionRatio: ratio,
    intersectionRect: { height } as DOMRectReadOnly,
});

describe("observeFirstView", () => {
    it("fires once, only after the dwell", () => {
        const onView = vi.fn();
        observeFirstView(el, onView);
        observers[0]!.cb([seen(0.5)]);
        vi.advanceTimersByTime(FIRST_VIEW_DWELL_MS - 1);
        expect(onView).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(onView).toHaveBeenCalledTimes(1);
        expect(observers[0]!.disconnected).toBe(true);
        observers[0]!.cb([seen(1)]);
        vi.advanceTimersByTime(1000);
        expect(onView).toHaveBeenCalledTimes(1);
    });

    it("a pass-through shorter than the dwell does not use the entrance up", () => {
        const onView = vi.fn();
        observeFirstView(el, onView);
        observers[0]!.cb([seen(0.6)]);
        vi.advanceTimersByTime(60);
        observers[0]!.cb([seen(0)]);
        vi.advanceTimersByTime(1000);
        expect(onView).not.toHaveBeenCalled();
        observers[0]!.cb([seen(0.3)]);
        vi.advanceTimersByTime(FIRST_VIEW_DWELL_MS);
        expect(onView).toHaveBeenCalledTimes(1);
    });

    it("below the share is not in view; a tall element counts once it fills half the viewport", () => {
        const onView = vi.fn();
        observeFirstView(el, onView);
        observers[0]!.cb([seen(0.1, 200)]);
        vi.advanceTimersByTime(1000);
        expect(onView).not.toHaveBeenCalled();
        observers[0]!.cb([seen(0.1, 400)]);
        vi.advanceTimersByTime(FIRST_VIEW_DWELL_MS);
        expect(onView).toHaveBeenCalledTimes(1);
    });

    it("on a page opened on a deep link, waits for the restore to settle", () => {
        resetNarrativeLanding(true);
        expect(narrativeLandingHeld()).toBe(true);
        const onView = vi.fn();
        observeFirstView(el, onView);
        expect(observers).toHaveLength(0);
        beginNarrativeRestore();
        expect(observers).toHaveLength(0);
        settleNarrativeRestore({ beatId: "crossover" }, { aborted: false });
        expect(narrativeLandingHeld()).toBe(false);
        expect(observers).toHaveLength(1);
        observers[0]!.cb([seen(1)]);
        vi.advanceTimersByTime(FIRST_VIEW_DWELL_MS);
        expect(onView).toHaveBeenCalledTimes(1);
    });

    it("a link the restorer finds no anchor for releases the hold", () => {
        resetNarrativeLanding(true);
        observeFirstView(el, vi.fn());
        expect(observers).toHaveLength(0);
        markNarrativeRestoreAbsent();
        expect(observers).toHaveLength(1);
    });

    it("a stop before the landing leaves nothing behind", () => {
        resetNarrativeLanding(true);
        const stop = observeFirstView(el, vi.fn());
        stop();
        markNarrativeRestoreAbsent();
        expect(observers).toHaveLength(0);
    });
});
