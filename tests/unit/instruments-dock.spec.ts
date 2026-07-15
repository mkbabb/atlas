import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDismissArbiter } from "@/platform/interaction/dismiss-arbiter";
import { createHoverBridge } from "@/interaction/hover-bridge";
import { instrumentSpringStyle } from "@/motion/instrument-spring";
import { resolveDockCollapse, type DockCollapseSource } from "@/platform/chrome/dock/composables/useDockCollapse";

const root = fileURLToPath(new URL("../..", import.meta.url));
const source = (path: string) => readFileSync(`${root}/${path}`, "utf8");

afterEach(() => vi.useRealTimers());

describe("instrument ownership", () => {
    it("keeps one expand affordance and one shared spring family", () => {
        expect(source("src/charts/frame/ChartFrame.vue")).toContain("<template #expand-trigger />");
        expect(source("src/charts/frame/VizPlate.vue")).toContain("<VizGearDock");
        expect(source("src/charts/frame/VizPlate.vue").match(/data-viz-dock-enlarge/g)).toHaveLength(1);
        expect(source("src/filter/ui/FilterContinuum.vue")).toContain("data-selection-count");
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
