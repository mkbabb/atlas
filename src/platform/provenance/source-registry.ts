// platform/provenance/source-registry.ts — THE TWO-TIER EXACT⊕REFERENCE SOURCE REGISTRY (W-21).
//
// The flat record said ONE thing about every source: here is a link. It could not tell the
// snapshot WE serve from somebody else's website, so a corporate homepage and the extract a
// figure actually reads sat at the same rank and the appendix's "Link ↗" pointed at a front
// door as readily as at data. The tier IS the distinction:
//
//   EXACT      OUR served snapshot. It carries NO `href` — the link is our own viewer
//              (`?browse=<vizId>`), so a served record cannot be mis-cited to a web page.
//   REFERENCE  an outside authority, CITATION only. Its `href` MUST resolve to the extract or
//              the document; an org-homepage root is refused by `isHomepageRoot` — a record
//              that can only say "this agency exists" tells the reader nothing about the data.
//
// EXACT-FIRST RECORD LAW. A browsable viz names an `ExactSource`; the upstream authority it was
// derived from demotes to the secondary "originally from ‹…›" line inside the record. What we
// actually read outranks what it came from — the reverse is how a marketing page ends up
// standing in for a dataset.

/** THE EXACT TIER — a snapshot this atlas serves and can therefore show you, row by row. */
export interface ExactSource {
    readonly id: string;
    readonly kind: "exact";
    /** the record's own name, as the appendix and the export preamble print it. */
    readonly label: string;
    /** the served artifact this record IS — the vintage root every "data as of" derives from. */
    readonly snapshot: string;
    /** the sections of the served snapshot this record covers, when it carries more than one. */
    readonly sections?: readonly string[];
    /** the REFERENCE id this snapshot was derived FROM — the demoted "originally from ‹…›". */
    readonly reference?: string;
    /** R5 — aggregate-only: the row viewer is refused for this source. A DEFENSIVE assertion,
        never the fence: the fence is that a fenced viz declares no scope at all, so nothing ever
        reaches this flag (guard-3 absence). It fires only if a fenced source is wrongly named. */
    readonly fenced?: boolean;
}

/** THE REFERENCE TIER — an outside authority we cite but do not serve. */
export interface ReferenceSource {
    readonly id: string;
    readonly kind: "reference";
    readonly label: string;
    /** MUST resolve to the extract or the document — never an org homepage root. */
    readonly href: string;
}

/** One registry record, either tier. */
export type DataSource = ExactSource | ReferenceSource;

/** Narrow to the served tier. */
export function isExact(source: DataSource): source is ExactSource {
    return source.kind === "exact";
}

/**
 * The REFERENCE-tier invariant, as a predicate so the law is one derivation: a citation that
 * addresses nothing but an origin — `https://www.mcnc.org/`, `https://opendata.usac.org/` — is
 * a front door, not a record. Anything with a real path, query, or fragment addresses something.
 * Unparseable text is refused too: a citation nobody can follow is not a citation.
 */
export function isHomepageRoot(href: string): boolean {
    let url: URL;
    try {
        url = new URL(href);
    } catch {
        return true;
    }
    return url.pathname.replace(/\/+$/, "") === "" && !url.search && !url.hash;
}
