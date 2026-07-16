import { describe, expect, it } from "vitest";
import { rowsToCsv } from "../../src/charts/lib/vizExport";

describe("rowsToCsv", () => {
    const rows = [{ name: "North Carolina", value: "42%" }];

    it("preserves the plain two-column export when provenance is absent", () => {
        expect(rowsToCsv(rows, "State", "Connected")).toBe(
            "State,Connected\r\nNorth Carolina,42%",
        );
    });

    it("embeds the live filter query, drawn-of-total, and as-of so a filtered export is reproducible", () => {
        const full = rowsToCsv(rows, "State", "Connected", null, {
            query: "",
            explain: "",
            total: 1,
            asOf: "May 27, 2022",
        });
        const filtered = rowsToCsv(rows, "State", "Connected", null, {
            query: "kind=receiver;year>=2020",
            explain: "receivers only · year ≥ 2020",
            total: 50,
            asOf: "May 27, 2022",
            secondaryAsOf: "FY2023",
        });
        // The full export shows the count + as-of but no filter clause.
        expect(full).toContain("# Rows,1 of 1");
        expect(full).toContain('# As of,"May 27, 2022"'); // the comma forces RFC-4180 quoting
        expect(full).not.toContain("# Filter query");
        // The filtered export is byte-DISTINCT: it carries the round-trip query, the human
        // explanation, the drawn-of-total, and the explicit secondary as-of.
        expect(filtered).toContain("# Filter query,kind=receiver;year>=2020");
        expect(filtered).toContain("# Filter,receivers only · year ≥ 2020");
        expect(filtered).toContain("# Rows,1 of 50");
        expect(filtered).toContain("# Secondary as of,FY2023");
        expect(filtered).not.toBe(full);
    });

    it("prepends declared provenance without changing the data table", () => {
        expect(
            rowsToCsv(rows, "State", "Connected", {
                dataset: "USAC, Open Data",
                sections: ["Schools", "Funding"],
                attributes: ["state", "connected"],
                analysis: "Share of schools connected",
                yearRange: "2024–2025",
                encoding: { x: "state", y: "connected share" },
            }),
        ).toBe(
            [
                '# Source,"USAC, Open Data"',
                "# Sections,Schools · Funding",
                "# Attributes,state · connected",
                "# Analysis,Share of schools connected",
                "# Data range,2024–2025",
                "# Encoding,connected share vs state",
                "",
                "State,Connected",
                "North Carolina,42%",
            ].join("\r\n"),
        );
    });
});
