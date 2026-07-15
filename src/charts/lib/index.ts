// charts/lib/index.ts — the chart LIB family barrel (§A.1) · PARTIAL at O-B4.
//
// Framework-free chart helpers. Query algebra lives with the filter engine.
export * from "./grid";
export * from "./format";

// v1.0.1 (O-B10 re-cut) — the `DataUrlSource` contract (the `{ filename, rows, chartEl }` payload a
// plate hands the CSV/image export seam). Type-only: the `vizExport` runtime download helpers stay
// family-internal (the plate furniture consumes them; a consumer authors the source, not the sink).
export type { DataUrlSource } from "./vizExport";
