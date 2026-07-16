import { describe, expect, it } from "vitest";
import { clockAnimation } from "../../src/motion/useHandMarkClock";

describe("hand-mark clock", () => {
    it("boils only a live load-clock mark", () => {
        expect(clockAnimation("load", true)).toBe("draw-then-boil");
        expect(clockAnimation("load", false)).toBe("draw-on");
        expect(clockAnimation("scroll", true)).toBe("none");
        expect(clockAnimation("static", true)).toBe("none");
    });
});
