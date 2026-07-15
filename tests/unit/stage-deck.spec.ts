import { describe, expect, it } from "vitest";
import { useStageDeck, type StageStep } from "@/stage/useStageDeck";

describe("useStageDeck", () => {
    it("advances one detent at a time and reverses an in-flight target", () => {
        const steps: StageStep[] = [];
        const stage = useStageDeck(4, (step) => steps.push(step));

        stage.request(3);
        expect(stage.activeIndex.value).toBe(1);
        stage.settle();
        expect(stage.activeIndex.value).toBe(2);

        stage.request(0);
        expect(stage.activeIndex.value).toBe(2);
        stage.settle();
        expect(stage.activeIndex.value).toBe(1);
        stage.settle();
        expect(stage.activeIndex.value).toBe(0);
        stage.settle();

        expect(stage.inFlight.value).toBeNull();
        expect(steps).toEqual([
            { from: 0, to: 1, direction: "forward" },
            { from: 1, to: 2, direction: "forward" },
            { from: 2, to: 1, direction: "back" },
            { from: 1, to: 0, direction: "back" },
        ]);
    });
});
