import { parseSelKey } from "../../charts/contract/selection-contract.js";
import {
    reduceExtensive,
    reduceIntensive,
} from "../../charts/contract/aggregate.js";
import {
    keyInUniverse,
    type RouteUniverse,
} from "../../data/routeUniverse.js";
import type { MeasureKind } from "../../platform/provenance/aggregate-contract.js";
import { compile, normalize, type Predicate } from "./predicate.js";

/** The three resolutions of one query. Aggregation scopes stay consumer-defined domain values. */
export type ExportGrain<Scope = unknown> =
    | { readonly kind: "selection" }
    | { readonly kind: "aggregation"; readonly scope: Scope }
    | { readonly kind: "dataset" };

export interface RowsGrouping<Row, Scope> {
    readonly scope: Scope;
    readonly by: (row: Row) => string | number;
    readonly create: (key: string | number, representative: Row) => Row;
    readonly compare?: (a: string | number, b: string | number) => number;
}

/** A numeric field and its physical law. Intensive values require their pooling weight. */
export interface RowsMeasure<Row> {
    readonly key: keyof Row;
    readonly kind: MeasureKind;
    readonly value: (row: Row) => number | null;
    readonly weight?: (row: Row) => number | null;
}

/** Domain data and accessors; Atlas owns every query operation performed over them. */
export interface RowsQueryPlan<Row, Scope = unknown> {
    readonly dataset: () => readonly Row[];
    /** The route-owned filter applied once before any grain projection. */
    readonly filterPredicate: () => Predicate<Row>;
    /** The canonical `{kind}:{id}` key represented by this row. */
    readonly rowKey: (row: Row) => string;
    readonly routeUniverse: (row: Row) => RouteUniverse;
    readonly groupings: readonly RowsGrouping<Row, Scope>[];
    readonly measures: readonly RowsMeasure<Row>[];
}

export interface RowsProjection<Row, Scope = unknown> {
    readonly grain: ExportGrain<Scope>;
    readonly rows: readonly Row[];
    /** Canonical keys that exist in the route-filtered dataset and pass its universe fence. */
    readonly selectedKeys: readonly string[];
    /** The grain-local predicate: selection for selection, identity otherwise. */
    readonly predicate: Predicate<Row>;
    /** The route-owned predicate already applied to the projection base rows. */
    readonly filterPredicate: Predicate<Row>;
}

export interface RowsReader<Row, Scope = unknown> {
    /** Resolve one grain once; rows, counts, and export metadata share this projection. */
    project(
        grain: ExportGrain<Scope>,
        selectedKeys: readonly string[],
    ): RowsProjection<Row, Scope>;
}

/** Build the sovereign reader from a declarative domain plan. */
export function createRowsReader<Row, Scope = unknown>(
    plan: RowsQueryPlan<Row, Scope>,
): RowsReader<Row, Scope> {
    const selectionField = (row: Row): string | null => {
        const key = plan.rowKey(row);
        return keyInUniverse(key, plan.routeUniverse(row)) ? key : null;
    };
    return {
        project(grain, selectedKeys) {
            const filterPredicate = normalize(plan.filterPredicate());
            const base = plan.dataset().filter(compile(filterPredicate));
            const universesByKey = new Map<string, Set<RouteUniverse>>();
            for (const row of base) {
                const key = plan.rowKey(row);
                parseSelKey(key);
                const universes = universesByKey.get(key) ?? new Set<RouteUniverse>();
                universes.add(plan.routeUniverse(row));
                universesByKey.set(key, universes);
            }

            const accepted = [...new Set(selectedKeys)].filter((key) => {
                try {
                    parseSelKey(key);
                } catch {
                    return false;
                }
                const universes = universesByKey.get(key);
                return (
                    universes != null &&
                    [...universes].some((universe) => keyInUniverse(key, universe))
                );
            });
            const predicate =
                grain.kind === "selection"
                    ? selectionPredicate(selectionField, accepted)
                    : normalize<Row>({ op: "any" });

            return {
                grain,
                rows:
                    grain.kind === "selection"
                        ? base.filter(compile(predicate))
                        : grain.kind === "aggregation"
                          ? aggregateRows(base, grain.scope, plan)
                          : base,
                selectedKeys: Object.freeze(accepted),
                predicate,
                filterPredicate,
            };
        },
    };
}

function selectionPredicate<Row>(
    field: (row: Row) => string | null,
    selectedKeys: readonly string[],
): Predicate<Row> {
    if (selectedKeys.length === 0) return normalize({ op: "or", kids: [] });
    return normalize({
        op: "oneOf",
        key: "selection",
        field,
        values: new Set(selectedKeys),
    });
}

function aggregateRows<Row, Scope>(
    rows: readonly Row[],
    scope: Scope,
    plan: RowsQueryPlan<Row, Scope>,
): readonly Row[] {
    const grouping = plan.groupings.find((candidate) =>
        Object.is(candidate.scope, scope),
    );
    if (!grouping) throw new Error("unknown aggregation scope");

    const groups = new Map<string | number, Row[]>();
    for (const row of rows) {
        const key = grouping.by(row);
        const members = groups.get(key) ?? [];
        members.push(row);
        groups.set(key, members);
    }
    const entries = [...groups.entries()];
    if (grouping.compare)
        entries.sort(([a], [b]) => grouping.compare!(a, b));

    return entries.map(([key, members]) => {
        const values: Partial<Row> = {};
        for (const measure of plan.measures) {
            (values as Record<PropertyKey, unknown>)[measure.key] = reduceMeasure(
                measure,
                members,
            );
        }
        return Object.assign({}, grouping.create(key, members[0]!), values);
    });
}

function reduceMeasure<Row>(
    measure: RowsMeasure<Row>,
    rows: readonly Row[],
): number | null {
    if (measure.kind === "extensive") {
        const values = rows
            .map(measure.value)
            .filter((value): value is number => value != null && Number.isFinite(value));
        return values.length === 0 ? null : reduceExtensive(values).value;
    }
    if (!measure.weight)
        throw new Error(`intensive measure ${String(measure.key)} requires a weight`);
    const members = rows.flatMap((row) => {
        const ratio = measure.value(row);
        const weight = measure.weight!(row);
        return ratio == null ||
            weight == null ||
            !Number.isFinite(ratio) ||
            !Number.isFinite(weight)
            ? []
            : [{ ratio, numerator: ratio * weight, denominator: weight }];
    });
    if (members.length === 0) return null;
    const value = reduceIntensive(members).value;
    return Number.isFinite(value) ? value : null;
}
