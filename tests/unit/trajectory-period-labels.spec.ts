// U/B7 S4 · R-TAB26-PAGE M-6: the trajectory plate's data table and key stats printed the raw year
// key ("2014" … "2025") where the plate's axis printed the consumer's period label ("2014–15").
// Every reader-facing year on the plate goes through the same `xFormat`.
import { describe, expect, it } from "vitest";
import { trajectoryDescription, trajectoryExportRows } from "../../src/charts/marks/trajectory-marks";

const sy = (y: number) => `${y}–${String((y + 1) % 100).padStart(2, "0")}`;

describe("trajectory period labels", () => {
    it("labels the export rows with the consumer's period label", () => {
        const rows = trajectoryExportRows(
            [
                { year: 2014, values: { peak: 110.8 } },
                { year: 2015, values: { peak: null } },
                { year: 2025, values: { peak: 671.3 } },
            ],
            "peak",
            (v) => `${v} Gb/s`,
            sy,
        );
        expect(rows).toEqual([
            { name: "2014–15", value: "110.8 Gb/s" },
            { name: "2025–26", value: "671.3 Gb/s" },
        ]);
    });

    it("keeps the raw year when the consumer gives no label", () => {
        const rows = trajectoryExportRows([{ year: 2016, values: { a: 1 } }], "a", String);
        expect(rows).toEqual([{ name: "2016", value: "1" }]);
    });

    it("spans labelled periods with 'to'", () => {
        expect(trajectoryDescription(2014, 2025, sy).span).toBe("2014–15 to 2025–26");
        expect(trajectoryDescription(2016, 2025).span).toBe("2016–2025");
        expect(trajectoryDescription(2025, 2025, sy).span).toBe("2025–26");
    });
});
