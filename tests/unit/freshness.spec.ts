import { describe, expect, it } from "vitest";
import { resolveAsOf } from "../../src/platform/chrome/freshness";
import type { FeedMeta } from "../../src/data/contract";

/** A minimal frozen ECF-shaped meta — resolveAsOf reads only the vintage fields. */
function meta(partial: Partial<FeedMeta>): FeedMeta {
    return { years: [2021, 2022, 2023], generatedAt: "2026-06-16T00:00:00Z", ...partial } as FeedMeta;
}

describe("resolveAsOf", () => {
    it("stamps a FROZEN feed by its extract vintage, never the emit stamp (the ECF dual-as-of cure)", () => {
        const asOf = resolveAsOf(meta({ frozen: true, extractAsOf: "2022-05-27" }));
        expect(asOf).toContain("2022");
        expect(asOf).not.toContain("2026");
    });

    it("falls back to the terminal FY when a frozen feed has no extract date", () => {
        expect(resolveAsOf(meta({ frozen: true, frozenAsOf: "2023" }))).toBe("FY2023");
    });

    it("reads generatedAt for a LIVE feed", () => {
        expect(resolveAsOf(meta({ frozen: false, years: [2025] }))).toContain("2026");
    });

    it("returns the empty stamp before a feed lands", () => {
        expect(resolveAsOf(null)).toBe("");
    });
});
