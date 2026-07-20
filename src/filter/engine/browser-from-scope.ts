// browser-from-scope.ts — THE ONE BROWSER BINDING (A-33 · S1).
//
// `SourceDataBrowser.vue` is already generic over its props; the only per-viz code was ever the
// CONSTRUCTION of those props, and every line of it is mechanical. This folds a declared
// `DataScope` into them once: the reader from the query seams, the measures DERIVED from the
// columns (no second list), the grain options from the declared groupings, and the export
// generically over the same columns. A plate declares the scope; nothing hand-rolls a panel.
//
// TWO KEYS, TWO CONSUMERS. The reader keys by the ENTITY (`selectionKey`) so a grain projection can
// intersect it with the route's selection; the table keys by the ROW (`browseKey`) so its virtual
// window can identify what it recycles. Over any dataset with more than one row per entity — the
// district-YEAR feed /sci declares — those are different functions, and handing the table the
// entity key is a duplicate-identity throw. The scope declares both; this binding fans them out.

import { createRowsReader, type ExportGrain, type RowsProjection } from "./rows.js";
import { encodeFilter } from "./filter-codec.js";
import { explain } from "./predicate.js";
import { csvCell, triggerDownload } from "../../charts/lib/vizExport.js";
import type { ExportFormat, ExportPayload } from "../../charts/lib/source-data.js";
import type { DataScope } from "../../platform/provenance/data-scope.js";
import type { SourceDataBrowserProps } from "../ui/source-data-browser.js";
import type { SourcePanelProps } from "../../charts/contract/viz-contract.js";

/** The scope-built half of the browser's props — the host supplies the `SourcePanelProps` half. */
export type ScopeBrowserBinding<Row, Scope> = Omit<
    SourceDataBrowserProps<Row, Scope, string>,
    keyof SourcePanelProps
>;

/** The generic serializer: one header row off the declared columns, then the projected rows. */
function serializeRows<Row>(
    scope: DataScope<Row, unknown>,
    rows: readonly Row[],
    format: ExportFormat,
): string | null {
    if (format === "json")
        return JSON.stringify(
            rows.map((row) =>
                Object.fromEntries(scope.columns.map((c) => [c.key, c.value(row)])),
            ),
        );
    if (format !== "csv") return null;
    const cell = (v: unknown): string => csvCell(v == null ? "" : String(v));
    return [
        scope.columns.map((c) => cell(c.label)).join(","),
        ...rows.map((row) => scope.columns.map((c) => cell(c.value(row))).join(",")),
    ].join("\r\n");
}

/** Fold a declared scope into the generic browser's props. */
export function createBrowserFromScope<Row, Scope>(
    scope: DataScope<Row, Scope>,
): ScopeBrowserBinding<Row, Scope> {
    const rowsReader = createRowsReader<Row, Scope>({
        dataset: scope.dataset,
        filterPredicate: scope.filterPredicate,
        // The reader's key is the SELECTION key — the entity, repeated across the grain.
        rowKey: scope.selectionKey,
        routeUniverse: scope.routeUniverse,
        groupings: scope.grains,
        // The measures DERIVE from the columns — a numeric column IS its own measure declaration.
        measures: scope.columns
            .filter((column) => column.measure)
            .map((column) => ({
                key: column.key as keyof Row,
                kind: column.measure!.kind,
                value: (row: Row) => {
                    const v = column.value(row);
                    return typeof v === "number" ? v : null;
                },
                weight: column.measure!.weight,
            })),
    });
    const availableGrains: readonly ExportGrain<Scope>[] = [
        { kind: "dataset" },
        ...scope.grains.map((g) => ({ kind: "aggregation", scope: g.scope }) as const),
        { kind: "selection" },
    ];
    return {
        rowsReader,
        availableGrains,
        columns: scope.columns.map(({ key, label, value }) => ({ key, label, value })),
        // The table's key is the BROWSE identity — one per rendered row, never the entity key.
        rowKey: scope.browseKey,
        exportPayload: (
            projection: RowsProjection<Row, Scope>,
            vizId: string,
        ): ExportPayload<Row, Scope> => ({
            rows: projection.rows,
            meta: {
                grain: projection.grain,
                filter: encodeFilter(projection.filterPredicate),
                filterExplain: explain(projection.filterPredicate),
                // The vintage rides the source registry; "" is its pre-resolution face.
                asOf: "",
                source: { label: scope.source },
            },
            serialize(format) {
                const text = serializeRows(scope, projection.rows, format);
                if (text == null) return;
                triggerDownload(
                    text,
                    `${vizId}.${format}`,
                    format === "json"
                        ? "application/json;charset=utf-8"
                        : "text/csv;charset=utf-8",
                );
            },
        }),
    };
}
