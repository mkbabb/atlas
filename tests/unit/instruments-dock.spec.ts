import { afterEach, describe, expect, it, vi } from "vitest";
import { createDismissArbiter } from "../../src/platform/interaction/dismiss-arbiter";
import { createHoverBridge } from "../../src/interaction/hover-bridge";
import { resolveDockCollapse, type DockCollapseSource } from "../../src/platform/chrome/dock/composables/useDockCollapse";
import { watchNarrativeAnchorLayout } from "../../src/motion/narrative-restore";
import {
    FILTER_SNAP,
    filterRegisterFor,
    filterSnapFor,
    filterSnapPoints,
} from "../../src/filter/ui/filter-continuum";

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("dock posture", () => {
    it("resolves every Atlas-owned intent by priority and returns to no intent", () => {
        const intents = new Map<DockCollapseSource, boolean>([
            ["scroll", true],
            ["register", true],
            ["manual", false],
        ]);
        expect(resolveDockCollapse(intents)).toBe(false);
        intents.delete("manual");
        expect(resolveDockCollapse(intents)).toBe(true);
        intents.delete("register");
        expect(resolveDockCollapse(intents)).toBe(true);
        intents.clear();
        expect(resolveDockCollapse(intents)).toBeNull();
    });
});

describe("filter continuum register", () => {
    it("maps the one active snap model to the TWO-state ladder — the tab and the full drawer", () => {
        // OF-23/28 — the intermediary ledger detent is abrogated wholesale: ONE ladder at every
        // viewport, EXACTLY two registers. No snap value resolves to a third, half-open state.
        expect(filterSnapPoints()).toEqual([0.12, 1]);
        expect(filterRegisterFor(FILTER_SNAP.pip)).toBe("pip");
        expect(filterRegisterFor(FILTER_SNAP.drawer)).toBe("drawer");
        // a mid-drag scalar resolves to the NEARER of the two registers — never a ledger.
        expect(filterRegisterFor(0.3)).toBe("pip");
        expect(filterRegisterFor(0.7)).toBe("drawer");
        expect(filterSnapFor("pip")).toBe(0.12);
        expect(filterSnapFor("drawer")).toBe(1);
    });

    it("keeps the resting pip near the 44px touch target", () => {
        expect(FILTER_SNAP.pip * 24 * 16).toBeCloseTo(46.08);
        expect(FILTER_SNAP.pip * 390 * 0.92).toBeCloseTo(43.056);
    });
});

describe("bounded narrative restore", () => {
    it("re-anchors only after target movement and stops on quiet", () => {
        vi.useFakeTimers();
        let deliver: ResizeObserverCallback = () => undefined;
        const disconnect = vi.fn();
        vi.stubGlobal(
            "ResizeObserver",
            class {
                constructor(callback: ResizeObserverCallback) { deliver = callback; }
                observe() {}
                disconnect() { disconnect(); }
            },
        );
        vi.stubGlobal("window", { scrollY: 0 });
        let top = 100;
        const target = {
            getBoundingClientRect: () => ({ top }),
        } as unknown as HTMLElement;
        const reanchor = vi.fn();
        const stopped = vi.fn();
        const heal = watchNarrativeAnchorLayout({
            target,
            root: {} as HTMLElement,
            reanchor,
            onStop: stopped,
            quietMs: 40,
            deadlineMs: 200,
        });
        heal.settle();
        deliver([], {} as ResizeObserver);
        expect(reanchor).not.toHaveBeenCalled();
        top = 180;
        deliver([], {} as ResizeObserver);
        expect(reanchor).toHaveBeenCalledOnce();
        top = 260;
        deliver([], {} as ResizeObserver);
        expect(reanchor).toHaveBeenCalledOnce();
        vi.advanceTimersByTime(40);
        expect(stopped).toHaveBeenCalledWith("quiet");
        expect(disconnect).toHaveBeenCalledOnce();
    });

    it("re-anchors movement observed before the smooth restore settles", () => {
        vi.useFakeTimers();
        let deliver: ResizeObserverCallback = () => undefined;
        vi.stubGlobal(
            "ResizeObserver",
            class {
                constructor(callback: ResizeObserverCallback) { deliver = callback; }
                observe() {}
                disconnect() {}
            },
        );
        vi.stubGlobal("window", { scrollY: 0 });
        let top = 100;
        const reanchor = vi.fn();
        const heal = watchNarrativeAnchorLayout({
            target: { getBoundingClientRect: () => ({ top }) } as unknown as HTMLElement,
            root: {} as HTMLElement,
            reanchor,
            onStop: () => undefined,
        });
        top = 180;
        deliver([], {} as ResizeObserver);
        expect(reanchor).not.toHaveBeenCalled();
        heal.settle();
        expect(reanchor).toHaveBeenCalledOnce();
    });
});

describe("dismiss and hover interaction cores", () => {
    it("dismisses only the topmost eligible claim", () => {
        vi.useFakeTimers();
        const doc = new EventTarget() as Document;
        const dismissed: string[] = [];
        const arbiter = createDismissArbiter(doc, { gestureEpsilonMs: 8 });
        arbiter.claim({ id: "dock", priority: 10, outsidePointer: true, onDismiss: () => dismissed.push("dock") });
        arbiter.claim({ id: "drawer", priority: 30, outsidePointer: true, onDismiss: () => dismissed.push("drawer") });
        doc.dispatchEvent(new Event("pointerdown"));
        vi.advanceTimersByTime(8);
        expect(dismissed).toEqual(["drawer"]);
        arbiter.destroy();
    });

    it("does not retarget one pointer gesture after its winning claim leaves", () => {
        vi.useFakeTimers();
        const doc = new EventTarget() as Document;
        const dismissed: string[] = [];
        const arbiter = createDismissArbiter(doc, { gestureEpsilonMs: 8 });
        arbiter.claim({
            id: "dock",
            priority: 10,
            outsidePointer: true,
            onDismiss: () => dismissed.push("dock"),
        });
        const releaseDrawer = arbiter.claim({
            id: "drawer",
            priority: 30,
            outsidePointer: true,
            onDismiss: () => dismissed.push("old-drawer"),
        });

        doc.dispatchEvent(new Event("pointerdown"));
        releaseDrawer();
        arbiter.claim({
            id: "drawer",
            priority: 30,
            outsidePointer: true,
            onDismiss: () => dismissed.push("new-drawer"),
        });
        vi.advanceTimersByTime(8);

        expect(dismissed).toEqual([]);
        arbiter.destroy();
    });

    it("holds the convex transit and tears down with zero grace", () => {
        vi.useFakeTimers();
        const released = vi.fn();
        const bridge = createHoverBridge({
            anchor: () => ({ left: 0, right: 10, top: 0, bottom: 10 }),
            card: () => ({ left: 20, right: 40, top: 0, bottom: 20 }),
            pointer: () => null,
            graceMs: 160,
            onRelease: released,
        });
        bridge.engage();
        expect(bridge.holdsPoint(15, 8)).toBe(true);
        bridge.release();
        bridge.destroy();
        expect(bridge.held).toBe(false);
        expect(released).toHaveBeenCalledOnce();
    });

    it("A-18 (β-gate F6): the dwell outlives the grace and only leaving the hull releases", () => {
        vi.useFakeTimers();
        const released = vi.fn();
        let pointer: readonly [number, number] | null = [15, 8]; // inside the anchor∪card transit
        const bridge = createHoverBridge({
            anchor: () => ({ left: 0, right: 10, top: 0, bottom: 10 }),
            card: () => ({ left: 20, right: 40, top: 0, bottom: 20 }),
            pointer: () => pointer,
            graceMs: 160,
            onRelease: released,
        });
        bridge.engage();
        bridge.release();
        vi.advanceTimersByTime(1600); // the grace expires ten times over — the card PERSISTS
        expect(released).not.toHaveBeenCalled();
        expect(bridge.held).toBe(true);
        pointer = [500, 500]; // the pointer leaves the hull
        vi.advanceTimersByTime(160);
        expect(released).toHaveBeenCalledOnce();
        expect(bridge.held).toBe(false);
        bridge.destroy();
    });
});
