// data-scope.ts — THE FUSED SCOPE (A-33 · S1 · CO7). One authored object, three faces.
//
// The arm-swap this type exists for: `VizContract.sourceData` used to be a `{ panel: Component }`
// — a RENDER FACTORY on a declaration contract, so every browsable plate hand-rolled the same
// reader/columns/CSV boilerplate around one generic browser. `sourceData` is now a DataScope: what
// the data IS (`source`), how it is QUERIED (the scope face — the shipped `RowsQueryPlan` seams,
// verbatim), and which attributes are READ (`columns`). No Component ever re-enters. The three
// surfaces — the attribution whisper, the browsable/exportable viewer, and the scope statement —
// all derive from this one declaration; a viz that declares no scope has no viewer by construction.

import type { MeasureKind } from "./aggregate-contract.js";
import type { ExactSource } from "./source-registry.js";
import type { RouteUniverse } from "../../data/routeUniverse.js";
import type { Predicate } from "../../filter/engine/predicate.js";
import type { RowsGrouping } from "../../filter/engine/rows.js";

/** One read attribute, authored ONCE: it is the table header, the CSV column, AND the provenance
    attribute. A numeric column names its physical law (`measure`) so the pooled aggregate cannot
    silently mean-a-mean; an intensive measure carries the weight it pools by. */
export interface DataScopeColumn<Row> {
    readonly key: string;
    readonly label: string;
    readonly value: (row: Row) => unknown;
    readonly measure?: { kind: MeasureKind; weight?: (row: Row) => number | null };
}

/** THE PER-VIZ DATA SCOPE — source ⊕ query ⊕ columns, declared, never rendered. */
export interface DataScope<Row, Scope = unknown> {
    /** ── source ── the EXACT-tier registry RECORD this viz reads (W-21). The record itself, not an
        id to look up: the declaration site is where the author knows which snapshot they are
        reading, and a record cannot go stale or dangle the way a loose key can. It carries no
        href — the viewer IS its link (`?browse=<vizId>`). */
    readonly source: ExactSource;
    /** ── scope ── the MEASURE rung: what is read against what. */
    readonly encoding: { x: string; y: string };
    /** The METHOD rung — how source rows become the rendered measure. Omit for a direct read. */
    readonly analysis?: string;
    /** The grain's noun ("districts" / "schools" / "hex cells") — the count and the statement. */
    readonly grainNoun: string;
    readonly dataset: () => readonly Row[];
    readonly filterPredicate: () => Predicate<Row>;
    /** The canonical `{kind}:{id}` SELECTION key this row represents — what the reader intersects
        with the route's selected keys, and the only key `parseSelKey` ever sees. It names the
        ENTITY, not the row: a district-year dataset repeats one district's key across its years,
        so this is non-unique by construction and must never be made unique to satisfy a table. */
    readonly selectionKey: (row: Row) => string;
    readonly routeUniverse: (row: Row) => RouteUniverse;
    /** The grain toggle AND the aggregation reader — one list, two readers. */
    readonly grains: readonly RowsGrouping<Row, Scope>[];
    /** ── browse ── the columns the table, the CSV, and `provenance.attributes` all read. */
    readonly columns: readonly DataScopeColumn<Row>[];
    /** The browse table's ROW IDENTITY — unique across `dataset()` and across the aggregate shells
        every grain creates, because the virtualized grid keys its rows by it and throws on a
        collision. It names the ROW, not the entity: where `selectionKey` says "district 010", this
        says "district 010, 2014". The two are separate declarations because they answer separate
        questions — fusing them is the duplicate-identity defect waiting to fire. */
    readonly browseKey: (row: Row) => string;
}
