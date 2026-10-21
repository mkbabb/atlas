// U/B7 · the root grammar strings: the trajectory plate's description read "How {lead} tracks
// across the year span." with the lead lowercased ("How e-rate requests tracks ..."). It now names
// the lead as declared and the real span: "{lead} by year, 2016–2025."
import { describe, expect, it } from "vitest";
import { trajectoryDescription } from "../../src/charts/marks/trajectory-marks";

describe("trajectoryDescription", () => {
    it("names the lead by year across its real span", () => {
        expect(trajectoryDescription(2016, 2025)).toEqual({
            prose: "{lead} by year, {span}.",
            span: "2016–2025",
        });
    });
    it("reads a one-year span as that year", () => {
        expect(trajectoryDescription(2024, 2024).span).toBe("2024");
    });
    it("falls back when the lead has no real years", () => {
        expect(trajectoryDescription(undefined, undefined).span).toBe("across the years");
    });
});
