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
import { csvCell, exportPrint, triggerDownload } from "../../charts/lib/vizExport.js";
import type { ExportFormat, ExportPayload } from "../../charts/lib/source-data.js";
import type { DataScope } from "../../platform/provenance/data-scope.js";
import type { SourceDataBrowserProps } from "../ui/source-data-browser.js";
import type { SourcePanelProps } from "../../charts/contract/viz-contract.js";

/** The scope-built half of the browser's props — the host supplies the `SourcePanelProps` half. */
export type ScopeBrowserBinding<Row, Scope> = Omit<
    SourceDataBrowserProps<Row, Scope, string>,
    keyof SourcePanelProps
>;

/** The exported grain, as one word a reader of the file can act on. */
function grainText<Scope>(grain: ExportGrain<Scope>): string {
    return grain.kind === "aggregation" ? `${grain.kind}:${String(grain.scope)}` : grain.kind;
}

/** The generic serializer: the PROVENANCE PREAMBLE, then one header row off the declared columns,
    then the projected rows.

    THE FILE CARRIES ITS OWN PROVENANCE. A downloaded slice that begins at the column header cannot
    say where it came from, when, or under what filter — it is a table of numbers with no record,
    which is the exact disease this family exists to cure, re-committed in the one artifact that
    leaves the site. So the meta the payload already builds LEADS the file: the source record's own
    name, the grain, the round-trippable query, its prose reading, and the resolved vintage; the
    blank line then keeps the data header + rows byte-for-byte tabular for any reader. JSON says the
    same thing structurally — `{ meta, rows }`, never a bare array. */
function serializeRows<Row, Scope>(
    scope: DataScope<Row, Scope>,
    rows: readonly Row[],
    meta: ExportPayload<Row, Scope>["meta"],
    format: ExportFormat,
): string | null {
    const projected = () =>
        rows.map((row) =>
            Object.fromEntries(scope.columns.map((c) => [c.key, c.value(row)])),
        );
    if (format === "json") return JSON.stringify({ meta, rows: projected() }, null, 2);
    if (format !== "csv") return null;
    const cell = (v: unknown): string => csvCell(v == null ? "" : String(v));
    const rung = (label: string, value: string): string =>
        [label, value].map(cell).join(",");
    return [
        rung("Source", meta.source.label),
        rung("Grain", grainText(meta.grain)),
        rung("Filter query", meta.filter),
        rung("Filter", meta.filterExplain),
        rung("As of", meta.asOf),
        "",
        scope.columns.map((c) => cell(c.label)).join(","),
        ...rows.map((row) => scope.columns.map((c) => cell(c.value(row))).join(",")),
    ].join("\r\n");
}

/** Fold a declared scope into the generic browser's props. `asOf` reads the host plate's RESOLVED
    vintage — the stamp derived off the served feed. It is a getter because the feed can land after
    the binding is built, and it is a PARAMETER because the registry is the wrong home for a date: a
    date copied into a static module drifts from the bake it describes, which is the very disease
    this family is curing. */
export function createBrowserFromScope<Row, Scope>(
    scope: DataScope<Row, Scope>,
    asOf: () => string,
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
        ): ExportPayload<Row, Scope> => {
            const meta = {
                grain: projection.grain,
                filter: encodeFilter(projection.filterPredicate),
                filterExplain: explain(projection.filterPredicate),
                asOf: asOf(),
                source: { label: scope.source.label },
            };
            return {
                rows: projection.rows,
                meta,
                serialize(format) {
                    // PRINT is a rendering of the open panel, not a serialization of it — the
                    // browser's own dialog over the `@media print` layer, exactly as the
                    // per-viz instance this builder replaces did it. A control the toolbar
                    // offers must keep what it says.
                    if (format === "print") return exportPrint();
                    const text = serializeRows(scope, projection.rows, meta, format);
                    if (text == null) return;
                    triggerDownload(
                        text,
                        `${vizId}.${format}`,
                        format === "json"
                            ? "application/json;charset=utf-8"
                            : "text/csv;charset=utf-8",
                    );
                },
            };
        },
    };
}
