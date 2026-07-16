// platform/data/contract.ts — the ONE feed envelope every dashboard shares (INV-3).
//
// `{meta, rows}`, tidy-long, one row per `(meta.keyField, year)`. The pipeline
// (B1) emits this shape; the data layer (`loadFeed`) reads it; USF, SCI, and ECF
// all project to it and diverge only in their `keyField` + `measures`. No
// god-manifest — a dashboard declares its key, grain, and reduce spec in `meta`.

/** The entity a dashboard's rows are grained on. */
export type EntityGrain = "state" | "district" | "school" | "entity" | "year";

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

const ENTITY_GRAINS = new Set<EntityGrain>([
    "state",
    "district",
    "school",
    "entity",
    "year",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

/** The shared v2 metadata law for row and columnar envelopes. */
function isAggregateRule(value: unknown, measures: ReadonlySet<string>): value is AggregateRule {
    if (value === "sum" || value === "latest" || value === "mean") return true;
    if (!isRecord(value) || Object.keys(value).length !== 1) return false;
    if ("weightedAvg" in value) {
        return isNonEmptyString(value.weightedAvg) && measures.has(value.weightedAvg);
    }
    if (!("ratio" in value) || !Array.isArray(value.ratio) || value.ratio.length !== 2) {
        return false;
    }
    return value.ratio.every((measure) =>
        isNonEmptyString(measure) && measures.has(measure),
    );
}

/** The shared v2 metadata law for row and columnar envelopes. */
function isFeedMeta(value: unknown): value is FeedMeta {
    if (!isRecord(value) || value.schemaVersion !== 2 || "year" in value) return false;
    if (
        !isNonEmptyString(value.dataset) ||
        !isNonEmptyString(value.keyField) ||
        !isNonEmptyString(value.generatedAt) ||
        Number.isNaN(Date.parse(value.generatedAt)) ||
        !ENTITY_GRAINS.has(value.entityGrain as EntityGrain) ||
        !Array.isArray(value.years) ||
        value.years.length === 0 ||
        !Array.isArray(value.measures) ||
        !isRecord(value.aggregable)
    ) {
        return false;
    }

    let previous = -Infinity;
    for (const year of value.years) {
        if (typeof year !== "number" || !Number.isInteger(year) || year <= previous) {
            return false;
        }
        previous = year;
    }

    const measures = new Set<string>();
    for (const measure of value.measures) {
        if (!isNonEmptyString(measure) || measure === "year" || measure === value.keyField || measures.has(measure)) {
            return false;
        }
        measures.add(measure);
    }
    const aggregable = value.aggregable as Record<string, unknown>;
    const aggregateKeys = Object.keys(aggregable);
    if (aggregateKeys.length !== measures.size || aggregateKeys.some((key) => !measures.has(key))) {
        return false;
    }
    if (aggregateKeys.some((key) => !isAggregateRule(aggregable[key], measures))) {
        return false;
    }

    const optional = [
        ["populationYear", (v: unknown) => typeof v === "number" && Number.isInteger(v)],
        ["frozen", (v: unknown) => typeof v === "boolean"],
        ["frozenAsOf", isNonEmptyString],
        ["extractAsOf", isNonEmptyString],
        ["updateCadence", isNonEmptyString],
        ["programStatus", isNonEmptyString],
        ["fidelity", isNonEmptyString],
        ["sourcePath", (v: unknown) => v === null || isNonEmptyString(v)],
    ] as const;
    if (optional.some(([key, valid]) => key in value && !valid(value[key]))) return false;

    return value.latestYear === value.years[value.years.length - 1];
}

function isCell(value: unknown): value is ColumnarCell {
    return value === null || typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value));
}

function hasValidRows(
    meta: FeedMeta,
    rowCount: number,
    cellAt: (row: number, field: string) => unknown,
): boolean {
    const years = new Set<number>();
    const identities = new Set<string>();
    for (let row = 0; row < rowCount; row++) {
        const key = cellAt(row, meta.keyField);
        const year = cellAt(row, "year");
        if (
            !((typeof key === "string" && key.trim().length > 0) ||
                (typeof key === "number" && Number.isFinite(key))) ||
            typeof year !== "number" ||
            !Number.isInteger(year)
        ) {
            return false;
        }
        if (meta.measures.some((measure) => {
            const value = cellAt(row, measure);
            return value !== null && (typeof value !== "number" || !Number.isFinite(value));
        })) {
            return false;
        }
        const identityKey = meta.entityGrain === "state"
            ? String(key).padStart(2, "0")
            : key;
        const identity = JSON.stringify([identityKey, year]);
        if (identities.has(identity)) return false;
        identities.add(identity);
        years.add(year);
    }
    const actualYears = [...years].sort((a, b) => a - b);
    return actualYears.length === meta.years.length &&
        actualYears.every((year, index) => year === meta.years[index]);
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
// key-string bytes. The worker validates that compact envelope off-thread;
// `loadFeed` decodes it once on the consumer thread and every dashboard still
// receives the identical `Feed<Row>` it reads today.
//
// THE PARITY LAW (the wave's hard gate): the columnar form is a FORMAT change,
// never a CONTENT change. The sole producer preserves field order, nulls, numbers,
// and values; this seam validates that transport and decodes it without mutation.
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
export interface FeedColumnar<Row extends FeedRow = FeedRow> {
    meta: FeedMeta;
    columnar: true;
    rowCount: number;
    fields: Array<Extract<keyof Row, string>>;
    columns: Record<Extract<keyof Row, string>, ColumnarCell[]>;
}

/** Validate a columnar envelope against the same v2 metadata law as a row feed. */
export function isColumnarFeed<Row extends FeedRow = FeedRow>(
    x: unknown,
): x is FeedColumnar<Row> {
    if (
        !isRecord(x) ||
        x.columnar !== true ||
        !isFeedMeta(x.meta) ||
        Object.keys(x).some((key) =>
            !["meta", "columnar", "rowCount", "fields", "columns"].includes(key),
        )
    ) {
        return false;
    }
    const rowCount = x.rowCount;
    if (typeof rowCount !== "number" || !Number.isInteger(rowCount) || rowCount < 0) {
        return false;
    }
    const rawFields = x.fields;
    const columns = x.columns;
    if (!Array.isArray(rawFields) || rawFields.length === 0 || !isRecord(columns)) {
        return false;
    }

    const fields: string[] = [];
    const seen = new Set<string>();
    for (const field of rawFields) {
        if (!isNonEmptyString(field) || seen.has(field)) return false;
        seen.add(field);
        fields.push(field);
    }

    const keys = Object.keys(columns);
    if (keys.length !== fields.length || keys.some((key, index) => key !== fields[index])) {
        return false;
    }
    if (
        !fields.includes(x.meta.keyField) ||
        !fields.includes("year") ||
        x.meta.measures.some((measure) => !fields.includes(measure)) ||
        !fields.every((field) => {
            const column = columns[field];
            return Array.isArray(column) &&
                column.length === rowCount &&
                column.every(isCell);
        })
    ) {
        return false;
    }
    return hasValidRows(x.meta, rowCount, (row, field) =>
        (columns[field] as unknown[])[row],
    );
}

/**
 * Decode a columnar envelope back into the row `Feed<Row>` the consumers expect.
 * Rebuilds each row's keys in the recorded `fields` order without changing values.
 */
export function decodeColumnar<Row extends FeedRow = FeedRow>(
    columnar: FeedColumnar<Row>,
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
 * Validate the sole row-feed envelope: strict v2 metadata plus object rows. A
 * value carrying columnar transport members cannot also pass as a row envelope.
 */
export function isFeed(x: unknown): x is Feed {
    if (
        !isRecord(x) ||
        "columnar" in x ||
        "rowCount" in x ||
        "fields" in x ||
        "columns" in x
    ) {
        return false;
    }
    if (!isFeedMeta(x.meta) || !Array.isArray(x.rows) || !x.rows.every(isRecord)) {
        return false;
    }
    const rows = x.rows as Record<string, unknown>[];
    if (rows.some((row) => Object.values(row).some((value) => !isCell(value)))) {
        return false;
    }
    return hasValidRows(x.meta, rows.length, (row, field) => rows[row][field]);
}
