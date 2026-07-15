import { describe, expect, it } from "vitest";
import { rowsToCsv } from "@/charts/lib/vizExport";

describe("rowsToCsv", () => {
    const rows = [{ name: "North Carolina", value: "42%" }];

    it("preserves the plain two-column export when provenance is absent", () => {
        expect(rowsToCsv(rows, "State", "Connected")).toBe(
            "State,Connected\r\nNorth Carolina,42%",
        );
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
