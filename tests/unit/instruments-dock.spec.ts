import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDismissArbiter } from "@/platform/interaction/dismiss-arbiter";
import { createHoverBridge } from "@/interaction/hover-bridge";
import { instrumentSpringStyle } from "@/motion/instrument-spring";
import { resolveDockCollapse, type DockCollapseSource } from "@/platform/chrome/dock/composables/useDockCollapse";
import {
    FILTER_SNAP,
    filterRegisterFor,
    filterSnapFor,
    filterSnapPoints,
} from "@/filter/ui/filter-continuum";

const root = fileURLToPath(new URL("../..", import.meta.url));
const source = (path: string) => readFileSync(`${root}/${path}`, "utf8");

afterEach(() => vi.useRealTimers());

describe("instrument ownership", () => {
    it("keeps one expand affordance and one shared gear spring", () => {
        expect(source("src/charts/frame/ChartFrame.vue")).toContain("<template #expand-trigger />");
        expect(source("src/charts/frame/VizPlate.vue")).toContain("<VizGearDock");
        expect(source("src/charts/frame/VizPlate.vue").match(/data-viz-dock-enlarge/g)).toHaveLength(1);
        expect(source("src/platform/chrome/dock/components/DockFoot.vue")).not.toContain("data-selection-count");
        expect(instrumentSpringStyle(true)["--instrument-spring-duration"]).toBe("0ms");
    });

    it("folds dock intents through one deterministic authority", () => {
        const intents = new Map<DockCollapseSource, boolean>([["scroll", true], ["manual", false]]);
        expect(resolveDockCollapse(intents)).toBe(false);
        intents.delete("manual");
        expect(resolveDockCollapse(intents)).toBe(true);
    });
});

describe("filter continuum register", () => {
    it("maps one active snap model to the desktop and phone ladders", () => {
        expect(filterSnapPoints(false)).toEqual([0.12, 0.5, 1]);
        expect(filterSnapPoints(true)).toEqual([0.12, 1]);
        expect(filterRegisterFor(FILTER_SNAP.ledger, false)).toBe("ledger");
        expect(filterRegisterFor(FILTER_SNAP.ledger, true)).toBe("pip");
        expect(filterSnapFor("pip")).toBe(0.12);
        expect(filterSnapFor("ledger")).toBe(0.5);
        expect(filterSnapFor("drawer")).toBe(1);
    });

    it("keeps the resting pip near the 44px touch target at both registers", () => {
        expect(FILTER_SNAP.pip * 24 * 16).toBeCloseTo(46.08);
        expect(FILTER_SNAP.pip * 390 * 0.92).toBeCloseTo(43.056);
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

    it("holds the convex transit and tears down with zero grace", () => {
        vi.useFakeTimers();
        const released = vi.fn();
        const bridge = createHoverBridge({
            anchor: () => ({ left: 0, right: 10, top: 0, bottom: 10 }),
            card: () => ({ left: 20, right: 40, top: 0, bottom: 20 }),
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
});
