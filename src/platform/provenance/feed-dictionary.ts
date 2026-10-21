// feed-dictionary.ts — the per-measure source record a snapshot carries (U/B7 O-19, PLAN §5.4,
// R-SOURCES §3.1).
//
// The producer (`tools/atlas_data/feeds/snapshot.py`) stamps three records into every snapshot's
// `meta`: `dictionary[column]` (what the column is and which vintage it comes from), `vintages[]`
// (each source's publisher, period, status and the input files it was built from) and
// `coverage[column]` (how many rows carry a value, over which years). No dictionary text is typed
// in TypeScript: every surface that names a column's source resolves it here, from the feed.

/** One column's record. `label` and `definition` follow the register (R-LABELS). */
export interface FeedDictionaryEntry {
    label: string;
    /** "Mbps", "kbps", "%", "$", "students", or "" for a bare count or a name. */
    unit: string;
    /** One plain sentence. */
    definition: string;
    /** "district per school year". */
    grain: string;
    /** The id of the vintage the column comes from (`FeedVintage.id`). */
    vintage: string;
    /** How the value is built from the source rows, when it is not read as filed. */
    derivation?: string;
    /** Set when one value is repeated across periods ("every year"). */
    appliesTo?: string;
}

/** One input file a vintage was built from. `published` is the served path, or null when the file
    is not published (it carries person-level columns, or the owner export is pending). */
export interface FeedInputFile {
    name: string;
    sha256: string;
    rows: number;
    published: string | null;
}

export type FeedVintageStatus = "final" | "preliminary" | "carried" | "frozen" | "live";

/** One source as the build read it. A vintage with no public address says why (`urlAbsentReason`). */
export interface FeedVintage {
    id: string;
    publisher: string;
    dataset: string;
    url: string | null;
    urlAbsentReason?: string;
    /** "FY2025", "2025–26", "June 2026". */
    period: string;
    /** The date the source was read (ISO date). */
    asOf: string;
    status: FeedVintageStatus;
    files: FeedInputFile[];
}

/** How much of a column carries a value. `years` is the first and last period with its own source. */
export interface FeedCoverage {
    rows: number;
    nonNull: number;
    years: [first: string, last: string];
}

/** The three records, as they ride a snapshot's `meta`. */
export interface FeedDictionary {
    dictionary: Record<string, FeedDictionaryEntry>;
    vintages: FeedVintage[];
    coverage: Record<string, FeedCoverage>;
}

/** One column resolved against its feed: the entry, its vintage and its coverage. */
export interface ResolvedColumn extends FeedDictionaryEntry {
    key: string;
    source: FeedVintage | null;
    coverage: FeedCoverage | null;
}

/** Resolve one column key, or null when the feed has no entry for it. */
export function resolveColumn(feed: FeedDictionary | null | undefined, key: string): ResolvedColumn | null {
    const entry = feed?.dictionary[key];
    if (!entry) return null;
    return {
        ...entry,
        key,
        source: feed.vintages.find((v) => v.id === entry.vintage) ?? null,
        coverage: feed.coverage[key] ?? null,
    };
}

/** The keys among `keys` the feed has no entry for (the dictionary-resolves test reads it). */
export function unresolvedColumns(feed: FeedDictionary | null | undefined, keys: readonly string[]): string[] {
    return keys.filter((k) => !feed?.dictionary[k]);
}

/** A column's header text: its label with its unit ("Contracted bandwidth (Mbps)"). */
export function columnHeading(entry: Pick<FeedDictionaryEntry, "label" | "unit">): string {
    return entry.unit && entry.unit !== "$" ? `${entry.label} (${entry.unit})` : entry.label;
}

/** One source as a reader names it ("NC SVF, FY2025"). */
export function vintageLabel(v: FeedVintage): string {
    const name = v.dataset.startsWith(v.publisher) ? v.dataset : `${v.publisher} ${v.dataset}`;
    return v.period ? `${name}, ${v.period}` : name;
}

/** The sources a set of columns reads, once each, in dictionary order, joined by semicolons. A
    preliminary or carried source says so after its period. Null when no key resolves. */
export function sourcesLine(feed: FeedDictionary | null | undefined, keys?: readonly string[]): string | null {
    if (!feed) return null;
    const wanted = keys ?? Object.keys(feed.dictionary);
    const ids: string[] = [];
    for (const k of wanted) {
        const id = feed.dictionary[k]?.vintage;
        if (id && !ids.includes(id)) ids.push(id);
    }
    const parts = ids
        .map((id) => feed.vintages.find((v) => v.id === id))
        .filter((v): v is FeedVintage => Boolean(v))
        .map((v) => (v.status === "preliminary" || v.status === "carried" ? `${vintageLabel(v)} (${v.status})` : vintageLabel(v)));
    return parts.length ? parts.join("; ") : null;
}

const COUNT = new Intl.NumberFormat("en-US");

/** "3,143 of 3,267 rows". */
export function coverageText(c: FeedCoverage): string {
    return `${COUNT.format(c.nonNull)} of ${COUNT.format(c.rows)} rows`;
}
