// lib/compareCells.ts — THE ONE TABLE SORT (U/B8 A4). Every atlas table that sorts a column sorts
// through this comparator: the figure's table view (`PlateTable`) and the data viewer
// (`DataViewerRoute`). A blank cell stays last in both directions; two numbers compare as numbers;
// anything else compares as text with numeric runs read as numbers ("District 9" before "District 10").
//
// The figure's table rows are the export rows, which carry FORMATTED values ("$1.86B", "134 kbps",
// "52%", "7 Gbps"). `cellSortKey` reads such a string back to the magnitude it states, so "$730M"
// sorts below "$1.86B" and "500 Mbps" below "7 Gbps". It reads only the shapes the atlas formatters
// write (charts/lib/format.ts); a string it cannot read whole sorts as text.

/** The words a formatter or a feed writes for "no value". */
const BLANK = new Set(["", "—", "–", "-", "n/a", "na", "none", "null", "not reported"]);

/** A magnitude suffix the formatters write (`$1.1B`, `48K`, `3.2M`). */
const MAGNITUDE: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9, bn: 1e9, t: 1e12 };
/** A bandwidth unit, re-united at magnitude by `formatBandwidth` (bits per second). */
const BANDWIDTH: Record<string, number> = { kbps: 1e3, mbps: 1e6, gbps: 1e9, tbps: 1e12 };

// sign · currency · sign · digits · suffix · the rest (a unit word, `%`, `×`, "/student").
const NUMERIC = /^([+−-])?\s*[$€£]?\s*([+−-])?\s*(\d[\d,]*(?:\.\d+)?|\.\d+)(\s*)([a-z]+)?(.*)$/i;

/** The key a cell sorts by: a number, a string, or `null` for a blank. */
export type CellSortKey = number | string | null;

/** Read one cell to its sort key. Numbers pass through (NaN is blank); a formatted number string
    reads back to its magnitude; any other string is its trimmed text. */
export function cellSortKey(value: unknown): CellSortKey {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "bigint") return Number(value);
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    const text = String(value).trim();
    if (BLANK.has(text.toLowerCase())) return null;
    const m = NUMERIC.exec(text);
    if (!m) return text;
    const [, lead, inner, digits, gap, word] = m;
    let n = Number(digits!.replace(/,/g, ""));
    if (!Number.isFinite(n)) return text;
    const unit = word?.toLowerCase();
    if (unit && BANDWIDTH[unit]) n *= BANDWIDTH[unit];
    else if (unit && MAGNITUDE[unit]) n *= MAGNITUDE[unit];
    // A word glued to the digits that is no suffix we know ("12abc") is not a number; a spaced word
    // is the unit the number counts ("3 schools").
    else if (unit && !gap) return text;
    const sign = lead ?? inner;
    return sign === "-" || sign === "−" ? -n : n;
}

/** Compare two cells under a sort direction. Blanks are last whatever the direction. */
export function compareCells(a: unknown, b: unknown, direction: "asc" | "desc"): number {
    const x = cellSortKey(a);
    const y = cellSortKey(b);
    if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
    const dir = direction === "asc" ? 1 : -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y), "en-US", { numeric: true, sensitivity: "base" }) * dir;
}

/** Sort a row set by one column, stable, blanks last. Returns a new array. */
export function sortRowsBy<Row>(
    rows: readonly Row[],
    read: (row: Row) => unknown,
    direction: "asc" | "desc",
): Row[] {
    return rows
        .map((row, index) => ({ row, index, key: read(row) }))
        .sort((p, q) => compareCells(p.key, q.key, direction) || p.index - q.index)
        .map((entry) => entry.row);
}
