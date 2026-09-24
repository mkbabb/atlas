import { describe, expect, it } from "vitest";
import { clockDraws } from "@/motion/useHandMarkClock";

describe("hand-mark clock", () => {
    it("draws on only the load clock", () => {
        expect(clockDraws("load")).toBe(true);
        expect(clockDraws("scroll")).toBe(false);
        expect(clockDraws("static")).toBe(false);
    });
});
