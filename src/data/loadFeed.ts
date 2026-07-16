// platform/data/loadFeed.ts — the ONE client loader every dashboard reads through
// (INV-3). It generalizes the USF-bound `src/data/usf.ts`: instead of the hardcoded
// `/api/usf` → `/data/usf.snapshot.json` pair, it takes a `slug` and derives both
// URLs from it, so USF, SCI, and ECF all load through the same door. The live CF
// Function is tried first with a 4s timeout; on any non-200, parse error, or
// timeout it falls back to the build-time snapshot — the resilience floor (G6 §6).
//
// The shape is validated with `isFeed` from the shared contract (do not redefine
// it here), and the key column is coerced per `meta.keyField`: a state-grain feed's
// key is a zero-padded FIPS string (us-atlas `f.id` is "06", and the Sheet
// round-trip drops the leading zero — the bug `usf.ts:10-13` fixes, generalized).
//
// THE WORKER PARSE (I-PERF-DATA.a · T-PERF-3a): the heavy slugs' parse is the
// uncounted TBT driver (fb-perf P-3) — `res.json()` on 3.1 MB ran the JSON.parse on
// the MAIN thread behind the 2399ms /sci mobile TBT. The fix, root-homed at this ONE
// loader (INV-3): the main thread does the (non-blocking) `fetch`, then hands the raw
// TEXT to a Web Worker that JSON.parses + validates OFF-thread and posts the parsed
// ENVELOPE back. `res.json()` (the blocking parse) leaves the main thread.
//
// THE DOUBLE-MATERIALIZE TRANSPOSE (J-DATA arm e · j2 P8 · j-data-worker-clone): the
// worker posts the COLUMNAR envelope back (the field-name-written-once form), NOT a
// re-inflated row graph — so the structured-clone moves the compact columnar bytes and
// the 3.1 MB SCI feeds are materialized as rows EXACTLY ONCE, here on the main side
// (`materializeValidated` decodes and normalizes the already-validated envelope without a
// second strict scan). The decode is the SAME `decodeColumnar` the contract owns;
// only WHERE it runs moved (worker → main), so the consumers receive the IDENTICAL Feed.
// Light slugs (usf/ecf/speedtest — small, row-shaped) stay synchronous: the worker
// round-trip is not worth its postMessage clone for a cheap parse.
import {
    decodeColumnar,
    type Feed,
    type FeedColumnar,
    type FeedRow,
} from "./contract.js";
import type { FeedParseReply, FeedParseRequest } from "./feedParse.worker.js";
import { parseFeedBody } from "./feedParse.js";
import { prefersReducedData } from "./dataSaver.js";

const TIMEOUT_MS = 4000;

/**
 * The heavy slugs whose 3.1 MB parse MUST run off the main thread (fb-perf P-3).
 * `sci` (1.99 MB) + `sci-schools` (1.12 MB) are the only feeds large enough that the
 * worker round-trip pays for itself; light slugs parse synchronously.
 */
const HEAVY_SLUGS = new Set(["sci", "sci-schools"]);

/** The live CF Pages Function route for a dashboard slug (e.g. `/api/usf`). */
export function apiUrl(slug: string): string {
    return `/api/${slug}`;
}

/** The committed build-time snapshot for a slug (the fallback floor). */
export function snapshotUrl(slug: string): string {
    return `/data/${slug}.snapshot.json`;
}

/**
 * Normalize the key column per the feed's grain. State-grain feeds join geometry on
 * zero-padded 2-char FIPS, so the key field is coerced to a left-padded string; other
 * grains (district `leaNumber`, entity `ben`) carry their own padding rule and are
 * left untouched here until their dashboards land (G6 §6.1).
 *
 * Kept at the shared materialization boundary so worker-parsed and synchronously parsed
 * envelopes receive the identical main-thread coercion.
 */
export function normalize<Row extends FeedRow>(feed: Feed<Row>): Feed<Row> {
    const { keyField, entityGrain } = feed.meta;
    if (entityGrain !== "state") return feed;
    const rows = feed.rows.map((r) => ({
        ...r,
        [keyField]: String(r[keyField] ?? "").padStart(2, "0"),
    }));
    return { meta: feed.meta, rows };
}

// ── The worker singleton + the in-flight request registry ───────────────────────────
// ONE module-scoped worker handles every heavy parse (the parses are quick and serial
// per route — a single worker avoids spinning a thread per fetch). Each request carries
// a monotonic id so a reply routes to its awaiting promise. The worker is created LAZILY
// on the first heavy parse so light-only routes (gallery, usf, ecf) never spin a thread.
let worker: Worker | null = null;
let nextId = 0;
// The registry resolves with the PARSED ENVELOPE the worker posts back (columnar for a heavy
// slug, a row Feed for a light one) — NOT a decoded row graph. `parseInWorker` runs the
// columnar→row decode + `normalize` main-side, so the heavy feeds materialize as rows once.
const pending = new Map<
    number,
    {
        text: string;
        url: string;
        resolve: (envelope: FeedColumnar | Feed) => void;
        reject: (err: Error) => void;
    }
>();

/** Retire only the failed singleton, then finish its fetched bodies on this thread. */
function retireWorker(failed: Worker | null): void {
    if (failed ? worker !== failed : worker !== null) return;
    failed?.terminate();
    worker = null;

    const entries = [...pending.values()];
    pending.clear();
    for (const entry of entries) {
        try {
            entry.resolve(parseFeedBody(entry.text, entry.url));
        } catch (error) {
            entry.reject(error instanceof Error ? error : new Error(String(error)));
        }
    }
}

function getWorker(): Worker {
    if (worker) return worker;
    // Vite resolves `new Worker(new URL(…, import.meta.url), {type:"module"})` natively —
    // it bundles `feedParse.worker.ts` into its own module-worker chunk (ZERO new dep, no
    // `?worker` suffix, no comlink). The worker imports the shared envelope parser, but neither
    // decodes columnar rows nor normalizes them; row materialization stays main-side.
    const candidate = new Worker(new URL("./feedParse.worker.ts", import.meta.url), {
        type: "module",
    });
    worker = candidate;
    candidate.onmessage = (e: MessageEvent<FeedParseReply>) => {
        const reply = e.data;
        const entry = pending.get(reply.id);
        if (!entry) return;
        pending.delete(reply.id);
        if (reply.ok) entry.resolve(reply.envelope);
        else entry.reject(new Error(reply.error));
    };
    candidate.onerror = () => retireWorker(candidate);
    candidate.onmessageerror = () => retireWorker(candidate);
    return candidate;
}

/**
 * Post one raw body to the worker, await its parsed ENVELOPE, then decode+normalize it to
 * rows MAIN-SIDE — exactly once. The worker did the blocking JSON.parse + validate and posted
 * the COLUMNAR envelope back (the field-name-written-once form); `materializeValidated` runs the
 * columnar→row decode + key normalization without repeating the worker's strict validation.
 * This is the double-materialize transpose: the 3.1 MB feed is materialized as rows ONCE (no
 * worker-side decode + clone double-allocation).
 */
function parseInWorker<Row extends FeedRow>(
    text: string,
    url: string,
): Promise<Feed<Row>> {
    const id = nextId++;
    return new Promise<FeedColumnar | Feed>((resolve, reject) => {
        pending.set(id, { text, url, resolve, reject });
        const req: FeedParseRequest = { id, url, text };
        let w: Worker | null = null;
        try {
            w = getWorker();
            w.postMessage(req);
        } catch {
            retireWorker(w);
        }
    }).then((envelope) => materializeValidated<Row>(envelope));
}

/**
 * Parse a heavy slug OFF the main thread: the main thread does the (non-blocking)
 * `fetch` + `res.text()`, the worker does the (blocking) JSON.parse + validate and posts
 * the validated COLUMNAR envelope back; `parseInWorker` materializes it main-side once.
 * If Worker is absent, or its constructor/message channel fails, parse the already-fetched body
 * synchronously so infrastructure failure does not force a second network request.
 */
async function fetchHeavy<Row extends FeedRow>(
    url: string,
    signal?: AbortSignal,
): Promise<Feed<Row>> {
    const res = await fetch(url, { signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const text = await res.text();
    // The ordinary browser path parses off-thread. No-Worker environments parse here; worker
    // infrastructure failures are recovered from in `retireWorker` using the same fetched text.
    if (typeof Worker === "undefined") {
        return materializeValidated<Row>(parseFeedBody(text, url));
    }
    return parseInWorker<Row>(text, url);
}

/** Materialize an envelope already validated by the shared parser. The boundary is trusted:
    decoding and state-key normalization run once without repeating the strict O(n) guards. */
function materializeValidated<Row extends FeedRow>(
    envelope: FeedColumnar | Feed,
): Feed<Row> {
    const feed = "columnar" in envelope ? decodeColumnar(envelope) : envelope;
    return normalize(feed as Feed<Row>);
}

async function fetchFeed<Row extends FeedRow>(
    slug: string,
    url: string,
    signal?: AbortSignal,
): Promise<Feed<Row>> {
    // Heavy slugs route the shared parser through the worker; light slugs run that same parser
    // synchronously because the worker round-trip is not worth its postMessage clone.
    if (HEAVY_SLUGS.has(slug)) return fetchHeavy<Row>(url, signal);
    const res = await fetch(url, { signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return materializeValidated<Row>(parseFeedBody(await res.text(), url));
}

/**
 * Load a dashboard's feed by slug. The live Function first, the snapshot as the
 * fallback floor; always resolves with a key-normalized `Feed`, or rejects only if
 * both transports fail. Generic over the dashboard's concrete row type.
 */
export async function loadFeed<Row extends FeedRow = FeedRow>(
    slug: string,
): Promise<Feed<Row>> {
    // THE DATA-SAVER SEAM (N.WF2 · B7): under `Save-Data` / `prefers-reduced-data`, skip the
    // speculative live round-trip (+ its 4s timeout) and load the committed snapshot directly —
    // the leaner transport (a static, long-cache, WF1-minified asset) the user's frugality signal
    // asks for. The snapshot is ALWAYS a valid Feed (it is the resilience floor), so this trades
    // live-freshness for bytes without degrading correctness; a snapshot-fetch failure still
    // surfaces as a reject exactly as the live path's would.
    if (prefersReducedData()) {
        return await fetchFeed<Row>(slug, snapshotUrl(slug));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetchFeed<Row>(slug, apiUrl(slug), controller.signal);
    } catch {
        // The live path is unavailable (timeout / non-200 / parse) — fall to the
        // committed snapshot so the dashboard renders regardless (G6 §6 floor).
        return await fetchFeed<Row>(slug, snapshotUrl(slug));
    } finally {
        clearTimeout(timer);
    }
}
