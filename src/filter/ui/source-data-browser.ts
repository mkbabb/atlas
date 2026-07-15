import type { ExportPayload } from "@/charts/lib/source-data";
import type { AtlasEventContract, EventScope } from "@/events";
import type { ExportGrain, RowsReader } from "@/filter/engine/rows";
import type { VirtualKey } from "@/filter/composables/useVirtualWindow";

export interface SourceDataColumn<Row> {
    readonly key: string;
    readonly label: string;
    readonly value: (row: Row) => unknown;
}

export interface SourceDataGrainOption<Scope = unknown> {
    readonly grain: ExportGrain<Scope>;
    readonly label?: string;
}

export type SourceDataAvailableGrain<Scope = unknown> =
    | ExportGrain<Scope>
    | SourceDataGrainOption<Scope>;

export type SourceDataExportFactory<Row, Scope = unknown> = (
    rows: readonly Row[],
    grain: ExportGrain<Scope>,
) => ExportPayload<Row, Scope>;

export interface SourceDataBrowserProps<
    Row,
    Scope = unknown,
    Key extends VirtualKey = VirtualKey,
> {
    readonly rowsReader: RowsReader<Row, Scope>;
    readonly availableGrains: readonly SourceDataAvailableGrain<Scope>[];
    readonly columns: readonly SourceDataColumn<Row>[];
    readonly rowKey: (row: Row, index: number) => Key;
    readonly exportPayload:
        | ExportPayload<Row, Scope>
        | SourceDataExportFactory<Row, Scope>;
    readonly eventHub?: AtlasEventContract;
    readonly vizId?: string;
    readonly eventScope?: EventScope;
    readonly ariaLabel?: string;
}
