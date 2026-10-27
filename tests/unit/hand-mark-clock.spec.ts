import { describe, expect, it } from "vitest";
import { clockDraws } from "../../src/motion/useHandMarkClock";

// glass-ui 9.0.0's `<HandMark>` has one draw switch (`draw`); the atlas clock reduces to whether the
// library draws the mark on. The `draw-then-boil` living line retired with the brush continuum.
describe("hand-mark clock", () => {
    it("draws on only on the load clock", () => {
        expect(clockDraws("load")).toBe(true);
        expect(clockDraws("static")).toBe(false);
    });
});
