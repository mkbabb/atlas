// A small served snapshot with its dictionary (U/B7 O-19 tests): 40 districts over three school
// years, one key column (`lea`) and three dictionary columns.
import type { FeedDictionary } from "../../src/platform/provenance/feed-dictionary";

export const FIXTURE_DICTIONARY: FeedDictionary = {
    dictionary: {
        name: { label: "District", unit: "", definition: "The district's name as filed.", grain: "district", vintage: "svf-fy2025" },
        year: { label: "School year", unit: "", definition: "The school year the row describes.", grain: "district per school year", vintage: "svf-fy2025" },
        bandwidth: {
            label: "Contracted bandwidth",
            unit: "Mbps",
            definition: "The bandwidth the district contracts for.",
            grain: "district per school year",
            vintage: "mcnc-2026-06",
            derivation: "largest month, sum of circuits",
        },
    },
    vintages: [
        { id: "svf-fy2025", publisher: "NC", dataset: "SVF", url: null, urlAbsentReason: "owner export pending", period: "FY2025", asOf: "2025-10-01", status: "final", files: [{ name: "svf_nslp.csv", sha256: "ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12", rows: 120, published: "data/inputs/2026/svf_nslp.csv" }] },
        { id: "mcnc-2026-06", publisher: "MCNC", dataset: "MCNC", url: "https://example.org/mcnc/2026-06", period: "June 2026", asOf: "2026-06-30", status: "preliminary", files: [] },
    ],
    coverage: {
        name: { rows: 120, nonNull: 120, years: ["2023", "2025"] },
        year: { rows: 120, nonNull: 120, years: ["2023", "2025"] },
        bandwidth: { rows: 120, nonNull: 117, years: ["2023", "2025"] },
    },
};

export const FIXTURE_COLUMNS = ["lea", "name", "year", "bandwidth"];

export const FIXTURE_ROWS: Record<string, unknown>[] = Array.from({ length: 40 }, (_, i) =>
    ["2023", "2024", "2025"].map((year, j) => ({
        lea: String(i + 1).padStart(4, "0"),
        name: `District ${i + 1}`,
        year,
        bandwidth: i % 13 === 0 && j === 0 ? null : 500 + i * 10 + j * 100,
    })),
).flat();
