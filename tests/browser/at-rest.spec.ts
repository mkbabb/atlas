// atRest must report a sheet that never settles. The seat spec asserts its return, so a false here
// is what turns a sheet still moving after 4 s into a failed cell.
import { afterEach, describe, expect, it, vi } from "vitest";
import { atRest } from "./at-rest.js";

type Anim = { playState: string; effect: { getComputedTiming: () => { iterations: number } } };
const running = (iterations = 1): Anim => ({ playState: "running", effect: { getComputedTiming: () => ({ iterations }) } });

function stubPage(boxes: () => DOMRect[], animations: () => Anim[] = () => []) {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 1));
    vi.stubGlobal("document", {
        querySelectorAll: () => boxes().map((r) => ({ getBoundingClientRect: () => r, getAnimations: animations })),
    });
}

const rect = (top: number) => ({ left: 0, top, width: 390, height: 400 }) as DOMRect;

afterEach(() => vi.unstubAllGlobals());

describe("atRest", () => {
    it("is true once a box holds still", async () => {
        stubPage(() => [rect(300)]);
        expect(await atRest("x", 500)).toBe(true);
    });

    it("is false while a box keeps moving", async () => {
        let top = 0;
        stubPage(() => [rect(top++)]);
        expect(await atRest("x", 100)).toBe(false);
    });

    it("waits out a running animation while the box holds still", async () => {
        // The 390 detail held 171 px for several frames before its rise began, then settled at 422.
        let frames = 0;
        stubPage(
            () => [rect(300)],
            () => (++frames <= 20 ? [running()] : []),
        );
        expect(await atRest("x", 1000)).toBe(true);
        expect(frames).toBeGreaterThan(20);
    });

    it("ignores an infinite animation", async () => {
        stubPage(() => [rect(300)], () => [running(Infinity)]);
        expect(await atRest("x", 500)).toBe(true);
    });

    it("is true when nothing matches", async () => {
        stubPage(() => []);
        expect(await atRest("x", 500)).toBe(true);
    });
});
