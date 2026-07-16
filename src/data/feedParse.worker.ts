// platform/data/feedParse.worker.ts — the OFF-thread feed parse (I-PERF-DATA.a · T-PERF-3a).
//
// The `/sci` route's data-parse is the uncounted TBT driver (fb-perf P-3): `loadFeed`'s
// `res.json()` ran the 3.1 MB JSON.parse on the MAIN thread — `sci.snapshot.json`
// (1.99 MB) + `sci-schools.snapshot.json` (1.12 MB) — a multi-hundred-ms blocking task
// behind the 2399ms mobile TBT, named by no prior audit. This worker moves that BLOCKING
// JSON.parse + validate OFF the main thread (the columnar→row decode + the key-`normalize`
// run ONCE main-side after the transpose — the double-materialize fix below).
//
// THE SEAM (Disjointness): this unit (a) OWNS the worker + loadFeed; unit (b) OWNS the
// columnar contract. The worker imports ONLY the pure type guards `isColumnarFeed` /
// `isFeed` from contract.ts (b's types) — it validates the parsed envelope, then posts the
// COLUMNAR envelope back; the row materialization (`decodeColumnar` + `normalize`) lives
// main-side in loadFeed, so the worker chunk stays minimal (no decode, no clone of rows).
//
// THE PARITY LAW (the wave's hard gate): the envelope this worker posts back decodes to a
// `Feed<Row>` IDENTICAL to the pre-worker main-thread parse. `JSON.parse` → validate is the
// blocking work this worker relocates; the columnar→row `decodeColumnar` + `normalize` run
// ONCE on the main side that owns the row consumers (`materializeValidated`). The worker
// is a transport relocation, not a transform; a datum changing fails the wave.
//
// THE DOUBLE-MATERIALIZE TRANSPOSE (J-DATA arm e · j2 P8 · j-data-worker-clone): the worker
// MUST NOT `decodeColumnar` the heavy columnar envelope to a full object-row graph on the
// worker AND THEN structured-clone that re-inflated graph back — that allocates the 3.1 MB SCI
// feeds TWICE (the worker-side decoded rows + the structured-clone copy) and re-serializes the
// very key strings the columnar form exists to compress. Instead the worker posts the COLUMNAR
// envelope back UNTOUCHED (the field-name-written-once form), and the main side decodes to rows
// exactly once on the consumer thread. A row feed (light slug) flows back as-is. The reply is a
// post-boundary CONSUME-CONTRACT: the worker NEVER emits a decoded row graph for a columnar
// input — it emits the columnar envelope, the consumer decodes (the structural law the gate
// predicates over, not a magic byte-count).
//
// THE MEASURE: a `performance.measure("feed-parse")` mark lands on the WORKER timeline
// (the structural proof the parse left the main thread — the gate-integrity arm, distinct
// from the TBT-outcome arm). The main thread, awaiting the posted message, carries ZERO
// Long-Tasks attribution for the parse.

import {
    isColumnarFeed,
    isFeed,
    type Feed,
    type FeedColumnar,
} from "./contract";

/** The request the main thread posts: the raw response text + the source URL (for errors). */
export interface FeedParseRequest {
    /** A correlation id so loadFeed can match a reply to its in-flight request. */
    id: number;
    /** The source URL — carried only for legible error messages. */
    url: string;
    /** The raw JSON body the main thread fetched (the parse is what we move off-thread). */
    text: string;
}

/**
 * The reply the worker posts back: the PARSED-AND-VALIDATED envelope (NOT a decoded row
 * graph), or an error. `envelope` is the COLUMNAR form for a heavy slug (the field-name-
 * written-once transport) or the row `Feed` for a light/row feed — the main side decodes
 * to rows exactly once (`loadFeed.materializeValidated`). Posting the columnar envelope (rather
 * than a re-inflated row graph) is the double-materialize transpose: the 3.1 MB SCI feeds
 * cross the boundary in their compact columnar form, materialized as rows once main-side.
 */
export type FeedParseReply =
    | { id: number; ok: true; envelope: FeedColumnar | Feed }
    | { id: number; ok: false; error: string };

/**
 * Parse one raw body OFF the main thread — the BLOCKING JSON.parse + the validate, relocated.
 * It does NOT `decodeColumnar` (the row materialization) on the worker: a columnar envelope is
 * validated (its decoded shape would round-trip a Feed) and posted back COLUMNAR; a row feed is
 * posted back as-is. The main side decodes+normalizes once. A `performance.measure("feed-parse")`
 * mark brackets the parse so the worker timeline carries the proof.
 */
function parse(text: string, url: string): FeedColumnar | Feed {
    const startMark = "feed-parse:start";
    const endMark = "feed-parse:end";
    performance.mark(startMark);

    const json: unknown = JSON.parse(text);

    // Validate the envelope on the worker (fail-loud parity — a hostile body rejects here so
    // the main thread falls to the snapshot floor), but do NOT decode the columnar rows: the
    // heavy columnar envelope rides the boundary in its compact form and the consumer side
    // (`loadFeed.materializeValidated`) materializes the rows ONCE. A light/row feed flows through.
    let envelope: FeedColumnar | Feed;
    if (isColumnarFeed(json)) {
        envelope = json;
    } else if (isFeed(json)) {
        envelope = json;
    } else {
        performance.mark(endMark);
        throw new Error(`${url} → not a Feed envelope`);
    }

    performance.mark(endMark);
    // The MEASURABLE proof (hard gate arm 2): the parse mark on the worker timeline.
    performance.measure("feed-parse", startMark, endMark);
    return envelope;
}

self.onmessage = (e: MessageEvent<FeedParseRequest>) => {
    const { id, url, text } = e.data;
    try {
        const envelope = parse(text, url);
        // Post the parsed-and-validated envelope back — the COLUMNAR form for a heavy slug, a
        // row Feed for a light one. The worker NEVER decodes a columnar input to a row graph
        // before posting (the consume-contract): the compact columnar bytes cross the boundary,
        // the main side decodes to rows once (no double-materialization of the 3.1 MB feeds).
        const reply: FeedParseReply = { id, ok: true, envelope };
        self.postMessage(reply);
    } catch (err) {
        const reply: FeedParseReply = {
            id,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        };
        self.postMessage(reply);
    }
};
