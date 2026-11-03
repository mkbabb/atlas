// U/B8 A4 — the one atlas table sort. The figure's table view sorts the export rows, whose values are
// formatted strings, so "$730M" must sort below "$1.86B" and a blank must stay last in both
// directions. Fails before: lib/compareCells.ts did not exist.
import { describe, expect, it } from "vitest";
import { cellSortKey, compareCells, sortRowsBy } from "../../src/lib/compareCells";

describe("cellSortKey", () => {
    it("reads the atlas formatter shapes back to their magnitude", () => {
        expect(cellSortKey("$1.86B")).toBe(1.86e9);
        expect(cellSortKey("$730M")).toBe(7.3e8);
        expect(cellSortKey("$48K")).toBe(48e3);
        expect(cellSortKey("$1,816")).toBe(1816);
        expect(cellSortKey("52%")).toBe(52);
        expect(cellSortKey("3.15×")).toBe(3.15);
        expect(cellSortKey("160,429")).toBe(160429);
        expect(cellSortKey("7 Gbps")).toBe(7e9);
        expect(cellSortKey("500 Mbps")).toBe(5e8);
        expect(cellSortKey("134 kbps/student")).toBe(134e3);
        expect(cellSortKey("−$1.2M")).toBe(-1.2e6);
        expect(cellSortKey("+4%")).toBe(4);
        expect(cellSortKey("3 schools")).toBe(3);
    });
    it("reads blanks as null and other text as text", () => {
        for (const blank of [null, undefined, "", " ", "—", "–", "-", "n/a", "N/A", NaN]) {
            expect(cellSortKey(blank)).toBeNull();
        }
        expect(cellSortKey("Wake County")).toBe("Wake County");
        expect(cellSortKey("FY2024")).toBe("FY2024");
        expect(cellSortKey("12abc")).toBe("12abc");
        expect(cellSortKey(42)).toBe(42);
    });
});

describe("compareCells and sortRowsBy", () => {
    const rows = [
        { name: "Ashe", value: "$730M" },
        { name: "Bladen", value: "—" },
        { name: "Wake", value: "$1.86B" },
        { name: "Clay", value: "" },
        { name: "Dare", value: "$48K" },
    ];
    it("sorts formatted money by magnitude with blanks last, ascending", () => {
        expect(sortRowsBy(rows, (r) => r.value, "asc").map((r) => r.name)).toEqual([
            "Dare",
            "Ashe",
            "Wake",
            "Bladen",
            "Clay",
        ]);
    });
    it("keeps blanks last descending too", () => {
        expect(sortRowsBy(rows, (r) => r.value, "desc").map((r) => r.name)).toEqual([
            "Wake",
            "Ashe",
            "Dare",
            "Bladen",
            "Clay",
        ]);
    });
    it("reads numeric runs in text as numbers", () => {
        const d = ["District 10", "District 9", "District 100"].map((name) => ({ name }));
        expect(sortRowsBy(d, (r) => r.name, "asc").map((r) => r.name)).toEqual([
            "District 9",
            "District 10",
            "District 100",
        ]);
    });
    it("is stable and never mutates its input", () => {
        const input = [{ v: 1, i: 0 }, { v: 1, i: 1 }, { v: 0, i: 2 }];
        const out = sortRowsBy(input, (r) => r.v, "asc");
        expect(out.map((r) => r.i)).toEqual([2, 0, 1]);
        expect(input.map((r) => r.i)).toEqual([0, 1, 2]);
        expect(compareCells(null, null, "asc")).toBe(0);
    });
});
