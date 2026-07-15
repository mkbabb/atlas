import { compile, type Predicate } from "./predicate";

/** The three resolutions of one query. The aggregation scope stays consumer-defined because year,
    geography, and cohort scopes are domain data rather than framework vocabulary. */
export type ExportGrain<Scope = unknown> =
    | { readonly kind: "selection" }
    | { readonly kind: "aggregation"; readonly scope: Scope }
    | { readonly kind: "dataset" };

export interface RowsSource<Row, Scope = unknown> {
    /** The sovereign base frame. Every grain starts here; no grain owns a second fetch. */
    dataset(): readonly Row[];
    /** The current selection as predicate data. `null` means no selected members. */
    selection(): Predicate<Row> | null;
    /** Domain-specific honest reduction of the base frame at `scope`. */
    aggregate(rows: readonly Row[], scope: Scope): readonly Row[];
}

export interface RowsReader<Row, Scope = unknown> {
    rowsAt(grain: ExportGrain<Scope>): readonly Row[];
}

/** Build the sovereign three-grain reader. Reads are pure: selection compiles against the base frame,
    aggregation receives that same frame, and dataset returns it directly. */
export function createRowsReader<Row, Scope = unknown>(
    source: RowsSource<Row, Scope>,
): RowsReader<Row, Scope> {
    return {
        rowsAt(grain) {
            const base = source.dataset();
            switch (grain.kind) {
                case "selection": {
                    const predicate = source.selection();
                    return predicate == null ? [] : base.filter(compile(predicate));
                }
                case "aggregation":
                    return source.aggregate(base, grain.scope);
                case "dataset":
                    return base;
            }
        },
    };
}

/** Functional form for consumers that do not need to retain a reader object. */
export function rowsAt<Row, Scope>(
    source: RowsSource<Row, Scope>,
    grain: ExportGrain<Scope>,
): readonly Row[] {
    return createRowsReader(source).rowsAt(grain);
}
