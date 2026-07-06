// platform/data/contract.ts — the ONE feed envelope every dashboard shares (INV-3).
//
// `{meta, rows}`, tidy-long, one row per `(meta.keyField, year)`. The pipeline
// (B1) emits this shape; the data layer (`loadFeed`) reads it; USF, SCI, and ECF
// all project to it and diverge only in their `keyField` + `measures`. No
// god-manifest — a dashboard declares its key, grain, and reduce spec in `meta`.

/** The entity a dashboard's rows are grained on. */
export type EntityGrain = "state" | "district" | "entity";

/**
 * How a measure folds across years when the year-scope is `aggregate` (INV-4's
 * four-type taxonomy). No viz computes its own aggregate; `multiYear` reads this.
 *
 * - `sum` — magnitude: add across the selected years (dollars, counts).
 * - `latest` — carry the newest year's value (stable attributes: area, lat/lon).
 * - `mean` — simple average (a rate with uniform weight).
 * - `{ weightedAvg }` — a rate averaged weighted by another measure key.
 * - `{ ratio }` — recompute from the summed `[numerator, denominator]` measures.
 */
export type AggregateRule =
    | "sum"
    | "latest"
    | "mean"
    | { weightedAvg: string }
    | { ratio: [string, string] };

export interface FeedMeta {
    schemaVersion: 2;
    /** The dashboard slug this feed belongs to: "usf" | "sci" | "ecf". */
    dataset: string;
    /** The row field that identifies an entity: "fips" | "leaNumber" | "entityId". */
    keyField: string;
    entityGrain: EntityGrain;
    /** Sorted, unique years the feed carries. */
    years: number[];
    latestYear: number;
    /** ISO-8601 UTC build stamp. */
    generatedAt: string;
    /** The numeric measure columns (everything aggregable / colorable). */
    measures: string[];
    aggregable: Record<string, AggregateRule>;
    // v1-compat carry so older readers keep working through the migration:
    /** Equals `latestYear`; the single-year readers' `meta.year`. */
    year?: number;
    /** USF only — the Census vintage behind `population`. */
    populationYear?: number;

    // The FROZEN marker — set by a closed-program feed (ECF). A live feed omits these.
    /** True when the program is closed and the feed never bumps a year (ECF). */
    frozen?: boolean;
    /** The terminal vintage of a frozen extract (ECF: `"2023"`) — the PROGRAM's last
        filing window (a terminal-FY fact), NOT the date the extract was taken. */
    frozenAsOf?: string;
    /** The extract VINTAGE — the ISO date the frozen workbook/`.hyper` was stamped
        (ECF: `"2022-05-27"`, the "2022 ECF Dashboard v3.2" workbook's "as of" date).
        DISTINCT from `frozenAsOf` (the program-terminal FY): the colophon reads this as
        the "Data as of …" date so the extract vintage is never hand-typed nor conflated
        with the terminal FY. */
    extractAsOf?: string;
    /** The refresh cadence — `"none"` for a frozen program. */
    updateCadence?: string;
    /** The program lifecycle status — `"closed"` for ECF. */
    programStatus?: string;
    /** Provenance fidelity — `"full"` (preferred extract) or `"degraded"` (fallback). */
    fidelity?: string;
    /** The origin path recorded when `fidelity` is `"degraded"`. */
    sourcePath?: string | null;
}

/** A tidy-long row: at minimum its year; the key field + measures are dataset-specific. */
export interface FeedRow {
    year: number;
    [field: string]: string | number | null;
}

/** The wire/file envelope. Generic over the dashboard's concrete row type. */
export interface Feed<Row extends FeedRow = FeedRow> {
    meta: FeedMeta;
    rows: Row[];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE COLUMNAR ENVELOPE (I-PERF-DATA.b · T-PERF-3b) — a transport-only transpose.
//
// The heavy /sci snapshots ship as `{meta, rows:[…]}` — a row-object-PER-CELL
// envelope where every key string ("leaNumber","contractedBandwidthMbps",…)
// repeats once per row. On sci.snapshot.json that is 3,243 rows × 19 keys of
// re-serialized field names — the bulk of the 1.99 MB, and the bulk of the
// main-thread JSON.parse cost behind the /sci TBT (fb-perf P-3).
//
// The columnar envelope inverts the axis: ONE `columns` map of parallel arrays,
// one array per field, the field-name written ONCE. Same data, a fraction of the
// key-string bytes — and the worker (I-PERF-DATA.a) decodes it OFF the main
// thread, so the consumers (loadFeed's `normalize`, every dashboard store) still
// receive the IDENTICAL `Feed<Row>` they read today.
//
// THE PARITY LAW (the wave's hard gate): the columnar form is a FORMAT change,
// never a CONTENT change — `decodeColumnar(encodeColumnar(feed))` round-trips the
// rows byte-equal (same field ORDER, same null-vs-number, same value). I10 owns
// the CONTENT (the rows/numbers); this seam owns only the ENVELOPE FORMAT. The
// `columnar` discriminator + `schemaVersion` carry through untouched so `isFeed`
// still adjudicates the decoded envelope.
// ─────────────────────────────────────────────────────────────────────────────

/** A single columnar value — the same scalar union a row cell carries. */
export type ColumnarCell = string | number | null;

/**
 * The columnar transport envelope. `meta` is carried verbatim from the row feed;
 * `rowCount` is the array length every column must match; `fields` records the
 * row-key ORDER so decode rebuilds each object's keys in the SAME order the row
 * feed serialized them (the byte-equal round-trip law); `columns` holds one
 * parallel array per field. A `columnar: true` discriminator lets a reader (the
 * worker / loadFeed) branch on the file shape without sniffing for `rows`.
 */
export interface FeedColumnar {
    meta: FeedMeta;
    columnar: true;
    rowCount: number;
    fields: string[];
    columns: Record<string, ColumnarCell[]>;
}

/**
 * Type guard — a parsed JSON value is a columnar envelope (vs a `{meta, rows}`
 * row feed). The worker and loadFeed branch on this to decide whether to decode.
 */
export function isColumnarFeed(x: unknown): x is FeedColumnar {
    if (typeof x !== "object" || x === null) return false;
    const d = x as Record<string, unknown>;
    return (
        d.columnar === true &&
        typeof d.meta === "object" &&
        d.meta !== null &&
        Array.isArray(d.fields) &&
        typeof d.columns === "object" &&
        d.columns !== null &&
        typeof d.rowCount === "number"
    );
}

/**
 * Transpose a row feed into the columnar envelope (the SOURCE step — runs in the
 * snapshot bake, NOT at read time). The `fields` order is taken from the FIRST
 * row so decode can restore key order exactly; every row MUST carry the same key
 * set (the snapshot bake asserts this — sci/sci-schools rows are uniform). A cell
 * absent on a row decodes back to `null` (parity with a JSON-missing key reading
 * `undefined`), but uniform feeds never hit that path.
 */
export function encodeColumnar<Row extends FeedRow>(feed: Feed<Row>): FeedColumnar {
    const { rows } = feed;
    const fields = rows.length > 0 ? Object.keys(rows[0]) : [];
    const columns: Record<string, ColumnarCell[]> = {};
    for (const f of fields) columns[f] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i] as Record<string, ColumnarCell>;
        for (const f of fields) columns[f][i] = r[f] ?? null;
    }
    return { meta: feed.meta, columnar: true, rowCount: rows.length, fields, columns };
}

/**
 * Decode a columnar envelope back into the row `Feed<Row>` the consumers expect
 * (the READ step — runs in the worker, OFF the main thread). Rebuilds each row's
 * keys in the recorded `fields` ORDER so the result round-trips byte-equal with
 * the pre-transpose row feed (the parity law). Generic over the concrete row.
 */
export function decodeColumnar<Row extends FeedRow = FeedRow>(
    columnar: FeedColumnar,
): Feed<Row> {
    const { fields, columns, rowCount } = columnar;
    const rows = new Array<Row>(rowCount);
    for (let i = 0; i < rowCount; i++) {
        const row: Record<string, ColumnarCell> = {};
        for (const f of fields) row[f] = columns[f][i];
        rows[i] = row as Row;
    }
    return { meta: columnar.meta, rows };
}

/**
 * Schema guard — a parsed JSON value is a well-formed Feed envelope, FAIL-LOUD
 * (C8.3 / pf-hardening M1). The pre-C8 guard was SHALLOW — it asserted only that
 * `rows` is an array and `meta` is a non-null object, so a v1-usf envelope read as
 * v2, a `{meta:{}}` with no `keyField`, or a garbled upstream body all PASSED, and
 * downstream `normalize` then wrote `r[undefined]` — corrupting the geometry join
 * SILENTLY rather than rejecting. This guard validates the envelope's load-bearing
 * meta so the live→snapshot fallback (loadFeed.ts) engages on a hostile body.
 *
 * Two envelopes are valid — the byte-stable v1-usf live shape AND the v2 platform
 * shape (the committed snapshots are all v2; only the live `/api/usf` read emits v1).
 * Rejecting v1 outright would break the live usf route (the edge's `x-usf-schema`
 * header catches a v1↔v2 MISMATCH; this is the body-level twin):
 *
 *   • schemaVersion MUST be 1 or 2 (a missing/garbled version → reject; a v3 we do
 *     not understand → reject loud, not silently mis-read).
 *   • v2 additionally REQUIRES `keyField` (a non-empty string — the join column
 *     `normalize` writes; an undefined key is the silent-corruption seam) and `years`
 *     (a number array — the multi-year scrubber reads it). v1-usf carries neither.
 *   • rows MUST be an array AND (if non-empty) its first element an object — a
 *     `rows:[42]` primitive-row body is rejected before a viz reads `.x` off a number.
 */
export function isFeed(x: unknown): x is Feed {
    if (typeof x !== "object" || x === null) return false;
    const d = x as Record<string, unknown>;
    if (!Array.isArray(d.rows)) return false;
    // A non-empty rows array must carry object rows (reject `rows:[42]`/`rows:["x"]`).
    if (d.rows.length > 0 && (typeof d.rows[0] !== "object" || d.rows[0] === null)) {
        return false;
    }
    if (typeof d.meta !== "object" || d.meta === null) return false;
    const meta = d.meta as Record<string, unknown>;
    const ver = meta.schemaVersion;
    if (ver !== 1 && ver !== 2) return false;
    // The v1-usf envelope carries no keyField/years — the byte-stable live shape.
    if (ver === 1) return true;
    // v2 REQUIRES the join + year-scope fields normalize/the scrubber read.
    return (
        typeof meta.keyField === "string" &&
        meta.keyField.length > 0 &&
        Array.isArray(meta.years)
    );
}
