// O-14 (PLAN §5.8, R-LABELS §5): bandwidth prints "Gbps"; a per-student measure stays in kbps with a
// thousands separator and is never re-united to Mbps; one period formatter names school years
// "2025–26" and funding years "FY2026".
import { describe, expect, it } from "vitest";
import * as format from "../../src/charts/lib/format";
import { formatGbpsAxis } from "../../src/charts/lib/format";
import { tierLabel } from "../../src/charts/scale/ColorScale";

describe("number formats (R-LABELS §5)", () => {
    it("bandwidth: Mbps below 1,000, else Gbps with one decimal only when non-zero", () => {
        expect(format.formatBandwidth(500)).toBe("500 Mbps");
        expect(format.formatBandwidth(192.56)).toBe("193 Mbps");
        expect(format.formatBandwidth(7000)).toBe("7 Gbps");
        expect(format.formatBandwidth(7500)).toBe("7.5 Gbps");
        expect(format.formatBandwidth(743_550)).toBe("743.6 Gbps");
        expect(formatGbpsAxis(630_800)).toBe("630.8 Gbps");
    });

    it("per-student kbps: integer, thousands separator, never Mbps", () => {
        const f = (format as Record<string, unknown>).formatKbpsPerStudent as (v: number | null) => string;
        expect(typeof f).toBe("function");
        expect(f(134.4)).toBe("134 kbps");
        expect(f(1250)).toBe("1,250 kbps");
        expect(f(7000)).toBe("7,000 kbps");
        expect(f(null)).toBe("—");
        expect((format as Record<string, unknown>).formatKbps).toBeUndefined();
    });

    it("formatPeriod: school year, funding year, calendar year", () => {
        const f = (format as Record<string, unknown>).formatPeriod as (k: number, kind: string) => string;
        expect(typeof f).toBe("function");
        expect(f(2025, "school-year")).toBe("2025–26");
        expect(f(2099, "school-year")).toBe("2099–00");
        expect(f(2026, "funding-year")).toBe("FY2026");
        expect(f(2024, "year")).toBe("2024");
    });

    it("the bandwidth tier label reads Gbps", () => {
        expect(tierLabel(1000, "bandwidth")).toBe("1 Gbps");
        expect(tierLabel(2500, "bandwidth")).toBe("2.5 Gbps");
        expect(tierLabel(500, "bandwidth")).toBe("500 Mbps");
    });
});
