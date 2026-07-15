import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
    bindRevealGoLive,
    countAt,
    createRevealCuePump,
    projectRevealScore,
    type RevealCueContext,
    type RevealScore,
} from "@/motion";

function score(calls: RevealCueContext[]): RevealScore {
    return {
        cues: [
            {
                id: "lede",
                kind: "reveal",
                window: [0.1, 0.3],
                fire: (cue) => calls.push(cue),
            },
            {
                id: "rule",
                kind: "rule",
                window: [0.4, 0.6],
                fire: (cue) => calls.push(cue),
            },
            {
                id: "exit",
                kind: "recede",
                window: [0.8, 1],
                fire: (cue) => calls.push(cue),
            },
        ],
    };
}

describe("RevealScore", () => {
    it("projects the named vocabulary onto the incumbent facet map", () => {
        const calls: RevealCueContext[] = [];
        expect(projectRevealScore(score(calls))).toEqual([
            { id: "lede", kind: "reveal", from: 0.1, to: 0.3, label: undefined },
            { id: "rule", kind: "rule", from: 0.4, to: 0.6, label: undefined },
            { id: "exit", kind: "recede", from: 0.8, to: 1, label: undefined },
        ]);
    });

    it("waits for restore-settled go-live and fires every crossed cue once", () => {
        const calls: RevealCueContext[] = [];
        const pump = createRevealCuePump(score(calls));
        let settle: (() => void) | undefined;
        const release = vi.fn();
        const stop = bindRevealGoLive(pump, {
            deepLink: () => true,
            onRestoreSettled: (callback) => {
                settle = callback;
                return release;
            },
        });

        pump.advance(0.65);
        expect(calls).toEqual([]);
        settle?.();
        expect(calls.map((cue) => cue.id)).toEqual(["lede", "rule"]);
        pump.advance(0.95);
        pump.advance(1);
        expect(calls.map((cue) => cue.id)).toEqual(["lede", "rule", "exit"]);
        stop();
        expect(release).toHaveBeenCalledOnce();
    });

    it("settles all cues once for reduced-motion/no-SDA parity", () => {
        const calls: RevealCueContext[] = [];
        const pump = createRevealCuePump(score(calls));
        expect(pump.settle()).toBe(true);
        expect(pump.settle()).toBe(false);
        expect(calls).toHaveLength(3);
        expect(calls.every((cue) => cue.terminal && cue.progress === 1)).toBe(true);
    });

    it("preserves integer counts and exposes the fractional count dial", () => {
        expect(countAt(2.73, 0.5)).toBe(3);
        expect(countAt(2.73, 0.5, { round: false })).toBeCloseTo(2.73, 12);
        expect(countAt(318.47, 0.5, { decimals: 2 })).toBe(318.47);
    });

    it("adds no observer, animation-frame loop, or native progress reader", () => {
        const source = readFileSync(
            new URL("../../src/motion/reveal-score.ts", import.meta.url),
            "utf8",
        );
        expect(source).not.toMatch(/new\s+IntersectionObserver/);
        expect(source).not.toMatch(/requestAnimationFrame\s*\(/);
        expect(source).not.toMatch(/getComputedStyle\s*\(/);
    });
});
