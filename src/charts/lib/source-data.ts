export {
    createRowsReader,
    type ExportGrain,
    type RowsProjection,
    type RowsReader,
    type RowsGrouping,
    type RowsMeasure,
    type RowsQueryPlan,
} from "../../filter/engine/rows.js";

export type ExportFormat = "csv" | "json" | "png" | "svg" | "print";

export interface ExportSource {
    readonly label: string;
    readonly href?: string;
}

export interface ExportPayload<Row, Scope = unknown> {
    readonly rows: readonly Row[];
    readonly meta: {
        readonly grain: import("../../filter/engine/rows.js").ExportGrain<Scope>;
        /** Normalized, machine-readable query for reproducing this exact row slice. */
        readonly filter: string;
        readonly filterExplain: string;
        readonly asOf: string;
        readonly source: ExportSource;
    };
    serialize(format: ExportFormat): Blob | void;
}
