import { describe, expect, it } from "vitest";
import { hexToOklchStop } from "@mkbabb/glass-ui/aurora";
import { toOklchStop } from "../../src/platform/chrome/background/composables/useAuroraConfig";

// W-ATMOS · THE COLOUR-SPACE BRIDGE. `toOklchStop` is the ONE door every aurora pole passes
// through on its way from the live cascade to `AuroraConfig.palette`, so whatever it decides is
// what all seven routes composite. It shipped with two new parse arms and a polar identity and NO
// spec — the cure for a defect that had been repainting the flagship's pole mid-grey in silence.
// This binds it: the SHIPPED function is imported and CALLED, and the sRGB arm is checked against
// glass-ui's own `hexToOklchStop` rather than against numbers typed in here, so no assertion below
// can be satisfied by editing this file alone.

/** OKLab → OKLCh is a coordinate change, not a colour change: the round trip must be lossless. */
function oklabToPolar(a: number, b: number): { C: number; h: number } {
    const h = (Math.atan2(b, a) * 180) / Math.PI;
    return { C: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

describe("the oklab arm (the live defect this bridge was cut to cure)", () => {
    // The measured token: Chrome serialises `color-mix(in oklab, …)` in the MIXING space, so
    // `AMERICA.chrome.accentWarm` arrived at the bridge as this, not as any `rgb(…)`.
    const AMERICA_WARM_SERIALISED = "oklab(0.68 0.049882 -0.0211891)";

    it("parses what Chrome actually serialises for a `color-mix(in oklab, …)` pole", () => {
        const stop = toOklchStop(AMERICA_WARM_SERIALISED);
        const polar = oklabToPolar(0.049882, -0.0211891);
        expect(stop.L).toBeCloseTo(0.68, 10);
        expect(stop.C).toBeCloseTo(polar.C, 10);
        expect(stop.h).toBeCloseTo(polar.h, 10);
    });

    it("does NOT fall through to the unparseable-token grey — the whole defect", () => {
        // Pre-cure this token missed every arm and landed on `rgbToHex`'s `#808080`. Grey is
        // C ≈ 0: a pole with no chroma paints no aurora, which is what /usf was doing.
        const stop = toOklchStop(AMERICA_WARM_SERIALISED);
        const grey = hexToOklchStop("#808080");
        expect(stop.C).toBeGreaterThan(grey.C);
        expect(stop.C).toBeGreaterThan(0.01);
    });

    it("carries a NEGATIVE b into the fourth quadrant, not a negative hue", () => {
        // atan2 returns (−180, 180]; a hue below 0 is not a legal OKLCh angle.
        const stop = toOklchStop("oklab(0.5 0.1 -0.1)");
        expect(stop.h).toBeCloseTo(315, 6);
        expect(stop.h).toBeGreaterThanOrEqual(0);
    });

    it("keeps the polar identity exact around the hue circle", () => {
        const cases: ReadonlyArray<[number, number, number]> = [
            [0.1, 0, 0], // +a  → red axis
            [0, 0.1, 90], // +b  → yellow axis
            [-0.1, 0, 180], // −a  → green axis
            [0, -0.1, 270], // −b  → blue axis
        ];
        for (const [a, b, hue] of cases) {
            const stop = toOklchStop(`oklab(0.6 ${a} ${b})`);
            expect(stop.h).toBeCloseTo(hue, 6);
            expect(stop.C).toBeCloseTo(0.1, 10);
        }
    });

    it("reads a fully achromatic oklab pole as chroma 0", () => {
        expect(toOklchStop("oklab(0.42 0 0)").C).toBe(0);
    });
});

describe("the oklch arm (an oklch value IS an OklchStop — no conversion to invent)", () => {
    it("takes L, C and h straight off the token", () => {
        expect(toOklchStop("oklch(0.68 0.14 245)")).toEqual({
            L: 0.68,
            C: 0.14,
            h: 245,
        });
    });

    it("reads the PERCENTAGE forms the route themes are authored in", () => {
        // `--route-accent` is declared `oklch(68% .14 245)`; percent L is a fraction, and percent
        // C is a fraction of the 0.4 reference chroma.
        const declared = toOklchStop("oklch(68% .14 245)");
        expect(declared.L).toBeCloseTo(0.68, 10);
        expect(declared.C).toBeCloseTo(0.14, 10);
        expect(toOklchStop("oklch(50% 50% 120)").C).toBeCloseTo(0.2, 10);
    });

    it("accepts a comma-separated token as readily as a space-separated one", () => {
        expect(toOklchStop("oklch(0.5, 0.1, 30)")).toEqual(toOklchStop("oklch(0.5 0.1 30)"));
    });

    it("keeps a negative hue angle legal", () => {
        expect(toOklchStop("oklch(0.5 0.1 -30)").h).toBe(-30);
    });
});

describe("the sRGB arms (pre-existing — the cure may not have moved them)", () => {
    it("routes `rgb(r g b)` through the library converter, unchanged", () => {
        expect(toOklchStop("rgb(172 63 48)")).toEqual(hexToOklchStop("#ac3f30"));
    });

    it("routes the comma form and rounds fractional channels the same way", () => {
        expect(toOklchStop("rgb(172, 63, 48)")).toEqual(hexToOklchStop("#ac3f30"));
        expect(toOklchStop("rgba(172.4, 62.5, 47.7, 0.5)")).toEqual(
            hexToOklchStop("#ac3f30"),
        );
    });

    it("passes a hex token (the SSR/jsdom fallback shape) straight to the door", () => {
        expect(toOklchStop("#ac3f30")).toEqual(hexToOklchStop("#ac3f30"));
    });

    it("still lands an unparseable token on mid-grey — never an invalid stop", () => {
        for (const junk of ["", "var(--nope)", "transparent"]) {
            expect(toOklchStop(junk)).toEqual(hexToOklchStop("#808080"));
        }
    });

    it("clamps an over-range channel instead of emitting a malformed hex", () => {
        expect(toOklchStop("rgb(300 20 48)")).toEqual(hexToOklchStop("#ff1430"));
    });

    it("treats a NEGATIVE channel as unparseable, not as 0", () => {
        // The rgb arm's channel class carries no sign, so `-20` fails the match outright and the
        // token takes the grey door. Pinned as the shipped behaviour, not endorsed as the ideal:
        // no live cascade emits a negative channel, so widening the class would be dead code.
        expect(toOklchStop("rgb(300 -20 48)")).toEqual(hexToOklchStop("#808080"));
    });
});

describe("the bridge total — every arm returns a usable stop", () => {
    it("never emits NaN on any shape the cascade can hand it", () => {
        const tokens = [
            "oklab(0.68 0.049882 -0.0211891)",
            "oklch(68% .14 245)",
            "rgb(54 116 83)",
            "#e7dcd0",
            "not-a-colour",
        ];
        for (const token of tokens) {
            const stop = toOklchStop(token);
            for (const key of ["L", "C", "h"] as const) {
                expect(Number.isFinite(stop[key]), `${token} → ${key}`).toBe(true);
            }
            expect(stop.C).toBeGreaterThanOrEqual(0);
        }
    });
});
