// charts/lib/index.ts — the chart LIB family barrel (§A.1) · PARTIAL at O-B4.
//
// The framework-free chart helpers. This wave lands the two SELF-CONTAINED, clean members
// (`format`, `grid`); `filter-algebra` (stores/composables closure) + `vizExport` (component
// closure) are DEFERRED to their resolving waves (see the O-B4 PACK deferral ledger).
export * from "./grid";
export * from "./format";

// v1.0.1 (O-B10 re-cut) — the `DataUrlSource` contract (the `{ filename, rows, chartEl }` payload a
// plate hands the CSV/image export seam). Type-only: the `vizExport` runtime download helpers stay
// family-internal (the plate furniture consumes them; a consumer authors the source, not the sink).
export type { DataUrlSource } from "./vizExport";
